# Research: Hub ManIAcos V1 — Departamento Marketing

**Branch**: `001-hub-marketing-v1` | **Date**: 2026-05-24

Resuelve todos los NEEDS CLARIFICATION técnicos del plan. Cada decisión está ratificada para uso en `data-model.md`, `contracts/`, y `tasks.md`.

---

## R-001: Supabase RLS + agentes IA escribiendo desde Server

**Pregunta**: Los agentes (Enrichment, Writer, Sender) ejecutan writes a Postgres desde Route Handlers de Next.js en Vercel. ¿Cómo se manejan los RLS policies para que los agentes tengan permisos sin romper la seguridad de sesión de usuario?

**Decision**: Usar **service role key** exclusivamente en Route Handlers de agentes (`/api/agents/*`). El cliente Supabase con service role bypasea RLS. Las Route Handlers de agentes NO son accesibles por el usuario final — están protegidas por middleware de auth (solo sesión válida `@maniaco.online` puede invocarlas). La service role key se almacena en Vaultwarden, inyectada como env var en Vercel (no commiteada).

Para operaciones de usuario (UI), usar siempre `createServerClient` con la session cookie — RLS aplica normalmente. Separación clara: `lib/supabase/server.ts` (user client, RLS on) vs `lib/supabase/admin.ts` (service role, RLS bypass).

**Rationale**: Patrón estándar en Supabase para operaciones de sistema que necesitan writes privilegiados. Alternativa (SECURITY DEFINER functions) agrega complejidad de SQL innecesaria para V1.

**Alternatives considered**: SECURITY DEFINER SQL functions (rechazado — más complejidad, mismo resultado), Row-level grants por agent (rechazado — sobre-ingenierizando V1).

---

## R-002: Evolution API — formato de webhook y estructura de mensaje

**Pregunta**: ¿Qué formato exacto tiene el webhook de Evolution API cuando llega un WhatsApp inbound? ¿Qué campos son necesarios para correlacionar con el `Message` original?

**Decision**: Evolution API v2 (self-hosted) envía webhooks POST a la URL configurada en el panel. Payload estructura:

```json
{
  "event": "messages.upsert",
  "instance": "maniaco-main",
  "data": {
    "key": {
      "remoteJid": "5491123456789@s.whatsapp.net",
      "fromMe": false,
      "id": "ABCDEF123456"
    },
    "message": {
      "conversation": "texto del mensaje"
    },
    "pushName": "Juan Perez",
    "messageTimestamp": 1716580000
  }
}
```

Campos relevantes:
- `data.key.remoteJid` → teléfono del lead (normalizar a E.164: quitar `@s.whatsapp.net`)
- `data.key.fromMe` → debe ser `false` para inbound
- `data.key.id` → ID único del mensaje en WhatsApp (usar como `external_message_id` en Reply)
- `data.message.conversation` → texto plano del reply

Correlación con `Message`: buscar `messages WHERE delivery_status='delivered' AND lead_id=(SELECT id FROM leads WHERE telefono=<remoteJid_normalizado>) ORDER BY sent_at DESC LIMIT 1`.

Webhook endpoint: `/api/webhooks/evolution`. Validación: header `apikey` configurado en Evolution panel, verificado en el route handler antes de procesar.

**Rationale**: Evolution API v2 es el estándar de facto para WhatsApp Business self-hosted. El webhook es simple HTTP POST sin firma HMAC (diferente a WhatsApp Business API oficial), por eso usamos API key en header.

---

## R-003: Cloudflare Email Routing → webhook formato

**Pregunta**: ¿Cómo implementar el webhook de Cloudflare Email Routing para recibir replies de email y parsear el `In-Reply-To` header?

**Decision**: Cloudflare Email Routing tiene un Worker de Email que se puede configurar para reenviar emails a un HTTP endpoint usando la API de `EmailMessage`. El flujo:

1. Crear **Cloudflare Email Worker** en `maniaco.online` que capture todos los mails entrantes a `*@maniaco.online`
2. El Worker parsea el raw email y hace `fetch()` POST al Hub (`/api/webhooks/email-inbound`)
3. Payload que envía el Worker:
```json
{
  "from": "lead@empresa.com",
  "to": "franco@maniaco.online",
  "subject": "Re: [asunto del outreach]",
  "text": "cuerpo del reply",
  "html": "<p>cuerpo del reply</p>",
  "headers": {
    "In-Reply-To": "<message-id-del-outreach-original@maniaco.online>",
    "References": "<message-id-del-outreach-original@maniaco.online>"
  },
  "messageId": "<reply-message-id@lead-domain.com>"
}
```
4. El Hub usa `headers['In-Reply-To']` para buscar `messages WHERE resend_message_id = <in_reply_to_value>`

**Implementación del Email Worker**:
```javascript
// Cloudflare Email Worker
export default {
  async email(message, env, ctx) {
    const rawEmail = await new Response(message.raw).text();
    // parse headers
    const inReplyTo = message.headers.get('In-Reply-To');
    const payload = {
      from: message.from,
      to: message.to,
      subject: message.headers.get('Subject'),
      text: /* parse text body */,
      inReplyTo,
      messageId: message.headers.get('Message-ID')
    };
    await fetch(env.HUB_WEBHOOK_URL + '/api/webhooks/email-inbound', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + env.WEBHOOK_SECRET },
      body: JSON.stringify(payload)
    });
  }
}
```

**Nota**: Resend asigna `Message-ID` con formato `<resend-uuid@resend.dev>`. Al enviar con Resend, guardar ese ID en `messages.resend_message_id`. El `In-Reply-To` del reply contendrá ese mismo valor.

**Rationale**: Es la solución más liviana — no requiere servidor de correo propio, no usa IMAP polling, cero latencia. El Cloudflare Worker es gratuito para este volumen.

---

## R-004: serpapi — estructura de respuesta Google Maps

**Pregunta**: ¿Qué campos exactos retorna serpapi para Google Maps y cómo se mapean a la entidad `Lead`?

**Decision**: serpapi endpoint: `GET https://serpapi.com/search?engine=google_maps&q={query}&type=search&api_key={key}`

Respuesta simplificada:
```json
{
  "local_results": [
    {
      "title": "Panadería La Esquina",
      "place_id": "ChIJ...",
      "address": "Av. Corrientes 1234, Buenos Aires",
      "phone": "+54 11 1234-5678",
      "website": "https://panaderiaesquina.com",
      "rating": 4.2,
      "reviews": 87,
      "hours": {
        "schedule": {...},
        "currently_open": true
      },
      "type": "Bakery",
      "gps_coordinates": {
        "latitude": -34.603,
        "longitude": -58.381
      }
    }
  ]
}
```

Mapping a `Lead`:
```typescript
const lead = {
  nombre: result.title,
  telefono: normalizePhone(result.phone),  // → E.164
  sitio_web: result.website ?? null,
  direccion: result.address,
  ciudad: extractCity(result.address),     // simple regex
  pais: 'AR',
  fuente: 'google_maps',
  // campos de enrichment serpapi (no score, eso es Enrichment Agent)
  rating_maps: result.rating,
  num_reseñas: result.reviews,
  google_place_id: result.place_id,
}
```

Paginación: serpapi maneja paginación con `start` param (0, 20, 40...). El Lead Scraper itera hasta `target_count` leads o hasta que no haya más resultados.

**Costo estimado**: 1 búsqueda = hasta 20 resultados = 1 crédito serpapi (~$0.002). Para 200 leads/día = 10 búsquedas = $0.02/día = ~$0.60/mes. Muy por debajo del soft cap.

**Rationale**: serpapi abstrae detección de bots, rotación de IPs, y parsing de HTML. Costo predecible. Alternativa (Playwright headless propio) requería mantener infra de browser en Oracle ARM, riesgo de ban directo, y complejidad operacional.

---

## R-005: Next.js App Router + Supabase Realtime

**Pregunta**: ¿Cómo implementar real-time (presencia online de socios, notificaciones de nuevos drafts, progreso de scraper) con Next.js 15 App Router y Supabase?

**Decision**: Usar **Supabase Realtime** con canales. Client Components suscritos a cambios de tablas específicas:

```typescript
// hooks/useRealtime.ts
const channel = supabase.channel('marketing-updates')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'drafts' },
    (payload) => { /* toast + badge update */ })
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' },
    (payload) => { /* kanban update */ })
  .subscribe()
```

Presencia online: Supabase Presence channel con heartbeat cada 30s.

```typescript
const presenceChannel = supabase.channel('online-users')
presenceChannel.track({ user_email: session.user.email, online_at: new Date() })
```

Para progreso de scraper (FR-021): el Lead Scraper Agent actualiza un campo `campaigns.progress_count` en Postgres cada 10 leads. El cliente está suscrito a cambios en esa tabla.

**Alternativas consideradas**: Server-Sent Events (SSE) custom (rechazado — más código sin ventaja sobre Supabase Realtime que ya está en el stack), WebSockets propios (rechazado — Principio VII).

---

## R-006: Vault Git Sync — Edge Function vs n8n vs server

**Pregunta**: ¿Cómo implementar el auto-sync del vault a git sin comandos manuales? ¿Edge Function de Supabase, n8n en Oracle, o script en server?

**Decision**: **Supabase Edge Function** `vault-git-sync` usando `isomorphic-git` + `@isomorphic-git/http`. La Edge Function se invoca desde el Hub cuando el usuario guarda una nota.

Flujo:
1. Usuario guarda nota en UI → POST `/api/vault/save`
2. Route Handler hace `upsert` en tabla `vault_notes` (índice de búsqueda)
3. Route Handler invoca Edge Function `vault-git-sync` con `{ path, content, author, message }`
4. Edge Function: clone (si no tiene cache), write file, git add, git commit, git push
5. Response: `{ commit_hash, success }`

**Problema conocido**: Edge Functions son stateless — no pueden mantener el repo clonado entre invocaciones. Solución: usar git sparse checkout + shallow clone del path específico, o configurar el Oracle ARM para exponer una API REST simple de vault-write que la Edge Function invoque. Para V1 la segunda opción es más simple.

**Solución V1 concreta**: Script Node.js corriendo en Oracle ARM escuchando en puerto privado (Caddy reverse proxy con auth interna). Hub invoca `POST https://vault-api.internal.maniaco.online/write` con `{ path, content, author }`. El script hace `git pull`, write, `git add`, `git commit`, `git push`.

**Rationale**: isomorphic-git en Edge Function tiene límites de tiempo (50ms cold, 150ms warm) que pueden no alcanzar para git push. Un servicio liviano en Oracle (ya está el servidor) es más confiable para V1.

---

## R-007: Anthropic Prompt Caching — configuración para agentes

**Pregunta**: ¿Cómo configurar prompt caching en los agentes para minimizar costo cuando el system prompt es >1024 tokens?

**Decision**: Usar `cache_control: { type: "ephemeral" }` en el último bloque del system prompt para todos los agentes con prompts largos (Writer, Enrichment, Coordinator).

```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  system: [
    {
      type: "text",
      text: LONG_SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" }
    }
  ],
  messages: [{ role: "user", content: userInput }]
})
```

El cache tiene TTL de 5 minutos. Para enriquecer 60 leads en batch, el sistema prompt se cachea en el primer request y se reutiliza en los siguientes 59. Ahorro estimado: ~80% de costo en tokens de input para batches.

Tracking de caching en `agent_runs`: guardar `cache_read_input_tokens` y `cache_creation_input_tokens` del response para auditoría.

---

## R-008: Dark Mode con shadcn/ui + Tailwind v4

**Pregunta**: ¿Cómo implementar dark mode exclusivo sin toggle en Tailwind v4 + shadcn/ui?

**Decision**: Tailwind v4 usa CSS variables nativas. Configuración:

```css
/* app/globals.css */
:root {
  color-scheme: dark;
  --background: #0a0a0a;
  --surface: #111111;
  --foreground: #f5f5f5;
  /* shadcn/ui CSS variables overrideadas para dark */
}
```

En `app/layout.tsx`: `<html className="dark">` hardcodeado, sin `ThemeProvider`. shadcn/ui respeta la clase `dark` en el root. Sin `next-themes`, sin toggle — darkmode fijo (Principio VII, FR-086).

---

## R-009: Agent Coordinator — patrón de orquestación

**Pregunta**: ¿El Coordinator es un solo LLM con tool use o es una cadena de llamadas orquestada por lógica de aplicación?

**Decision**: **Lógica de aplicación como orquestador** (NO tool use del LLM para ejecutar agentes). El Coordinator usa Claude para:
1. Parsear el pedido en lenguaje natural → plan estructurado (`[{step, agent, params}]`)
2. Describir el plan al usuario y esperar confirmación
3. Mostrar resultados de cada paso

La ejecución de cada paso es código TypeScript que llama a los agentes directamente. El LLM NO tiene acceso a tools para llamar agentes — el código controla el flujo.

```typescript
// Coordinator pattern
const plan = await parsePlanWithLLM(userRequest) // LLM call 1
await showPlanToUser(plan)
await waitForHumanConfirmation()
for (const step of plan.steps) {
  const result = await executeStep(step)  // código, no LLM
  await streamProgressToUser(step, result)
  if (result.requiresHumanApproval) {
    await waitForHumanApproval(result)  // Principio IV
  }
}
```

**Rationale**: Tool use del LLM para orquestar agentes introduce riesgo de hallucination en la selección de herramientas y hace el flujo impredicable. La lógica de aplicación como orquestador es 100% determinística en qué agente se llama y cuándo — crítico para el HITL de Principio IV.

---

## R-010: WhatsApp Health Score — cálculo e implementación

**Pregunta**: ¿Cómo implementar el health score de WhatsApp (FR-080) de forma práctica?

**Decision**: Cron job en n8n en Oracle ARM ejecutando cada hora:

```sql
-- health_score = delivery_rate * 0.6 + response_rate * 0.4
SELECT
  COUNT(CASE WHEN delivery_status = 'delivered' THEN 1 END)::float /
    NULLIF(COUNT(*), 0) AS delivery_rate,
  COUNT(CASE WHEN lead_id IN (SELECT DISTINCT lead_id FROM replies WHERE received_at > NOW() - INTERVAL '7 days') THEN 1 END)::float /
    NULLIF(COUNT(CASE WHEN delivery_status = 'delivered' THEN 1 END), 0) AS response_rate
FROM messages
WHERE channel = 'whatsapp'
  AND sent_at > NOW() - INTERVAL '7 days'
```

n8n guarda el resultado en tabla `whatsapp_health` (id, score, delivery_rate, response_rate, spam_reports, measured_at). Si score < 0.5 O spam_reports >= 3 en las últimas 24h → n8n llama a `/api/webhooks/whatsapp-health-alert` en el Hub → Hub crea un `Incident` y muestra banner de advertencia.

**Spam reports**: Evolution API no expone spam reports directamente. Proxy: tasa de mensajes con `delivery_status = 'blocked'` en las últimas 24h como estimador de spam reports.

---

## R-011: Phone Normalization E.164

**Pregunta**: ¿Cómo normalizar teléfonos argentinos (diversos formatos) a E.164 confiablemente?

**Decision**: Usar librería `libphonenumber-js` (port JS de libphonenumber de Google). Default country: `AR`. Maneja todos los formatos comunes:

```typescript
import { parsePhoneNumber } from 'libphonenumber-js'

export function normalizePhone(raw: string): string | null {
  try {
    const phone = parsePhoneNumber(raw, 'AR')
    if (phone.isValid()) return phone.format('E.164')
    return null
  } catch { return null }
}
```

Formatos manejados: `011-1234-5678`, `(011) 1234-5678`, `+54 9 11 1234 5678`, `5491112345678`, etc.

---

## R-012: Lead Deduplication — algoritmo concreto

**Pregunta**: FR-013 dice "match en ≥2 de [telefono_normalizado, dominio_web, nombre_normalizado]". ¿Cómo implementarlo eficientemente?

**Decision**: Función Postgres que ejecuta el check en INSERT (via trigger o explicit check en Route Handler):

```sql
-- Dedup check: retorna lead_id si existe duplicado
CREATE OR REPLACE FUNCTION check_lead_duplicate(
  p_telefono text,
  p_dominio text,
  p_nombre text
) RETURNS uuid AS $$
DECLARE
  v_lead_id uuid;
  v_matches int;
BEGIN
  SELECT id INTO v_lead_id
  FROM leads
  WHERE (
    (p_telefono IS NOT NULL AND telefono_normalizado = p_telefono)::int +
    (p_dominio IS NOT NULL AND dominio_web_normalizado = p_dominio)::int +
    (p_nombre IS NOT NULL AND nombre_normalizado = unaccent(lower(p_nombre)))::int
  ) >= 2
  LIMIT 1;
  RETURN v_lead_id; -- NULL si no hay duplicado
END;
$$ LANGUAGE plpgsql;
```

`dominio_web_normalizado`: extraer dominio de URL (`panaderia.com` de `https://www.panaderia.com/home`). Función `extract_domain(url text)` en Postgres.

`nombre_normalizado`: `unaccent(lower(trim(nombre)))`. Requiere extensión Postgres `unaccent` (disponible en Supabase).

---

## R-013: Resend — tracking de delivery y Message-ID

**Pregunta**: ¿Cómo Resend reporta el delivery y qué Message-ID usa para correlacionar replies?

**Decision**: Resend retorna en el response de `emails.send()`:
```json
{ "id": "re_123456789" }
```

Este `id` es el Resend internal ID. El `Message-ID` del email enviado es `<re_123456789@resend.dev>` — este es el valor que aparecerá en el header `In-Reply-To` del reply.

Guardar en `messages.resend_message_id = 're_123456789'` (sin los `<>`). Al procesar el reply, el `In-Reply-To` vendrá como `<re_123456789@resend.dev>` — parsear quitando `<>` y el `@resend.dev`.

Para delivery tracking: Resend tiene webhooks de delivery (`email.delivered`, `email.bounced`, `email.complained`). Configurar webhook en Resend dashboard → `/api/webhooks/resend-delivery`. Actualizar `messages.delivery_status` según el evento.

---

## R-014: Vault Editor — markdown + wikilinks

**Pregunta**: ¿Qué librerías usar para el editor markdown con wikilinks y preview en tiempo real?

**Decision**:
- **Editor**: `@uiw/react-codemirror` con extension de syntax highlighting markdown
- **Preview**: `remark` + `remark-html` + custom remark plugin para `[[wikilinks]]`
- **Wikilink plugin**: parsear `[[nombre-archivo]]` → `<a href="/vault/nombre-archivo">nombre-archivo</a>`
- **Split view**: panel izq editor CodeMirror, panel der preview renderizado, sincronización de scroll

Para búsqueda full-text: Postgres `tsvector` en `vault_notes.content_md`. Función de búsqueda:
```sql
SELECT id, title, ts_headline('spanish', content_md, query) AS snippet
FROM vault_notes, to_tsquery('spanish', $1) AS query
WHERE to_tsvector('spanish', content_md) @@ query
ORDER BY ts_rank(to_tsvector('spanish', content_md), query) DESC
LIMIT 20;
```

---

## R-015: Cost Calculation — cálculo en tiempo real

**Pregunta**: ¿Cómo calcular el costo del mes en tiempo real sin queries lentas sobre `agent_runs`?

**Decision**: Tabla materializada `cost_monthly_summary` con columnas `(month, agent_name, total_cost_usd, total_runs)`. Se actualiza via trigger en `agent_runs` ON INSERT. El `CostChip` del header hace `SELECT total_cost_usd FROM cost_monthly_summary WHERE month = date_trunc('month', now())` — query O(1).

Breakdown por agente: mismo `cost_monthly_summary` agrupado por `agent_name`. Se recalcula con trigger, no con query en tiempo real sobre millones de filas.

La verificación del cap (soft/hard) ocurre en `lib/cost.ts`:
```typescript
export async function checkCostCap(supabase: SupabaseClient): Promise<CostCapStatus> {
  const { data } = await supabase
    .from('cost_monthly_summary')
    .select('total_cost_usd')
    .eq('month', startOfMonth(new Date()))
    .single()
  
  const cost = data?.total_cost_usd ?? 0
  if (cost >= HARD_CEILING) return 'blocked'
  if (cost >= SOFT_CAP) return 'override_needed'
  if (cost >= SOFT_CAP * 0.70) return 'warning'
  return 'ok'
}
```

Los agentes llaman a `checkCostCap()` antes de cada invocación y abortan si `blocked`.
