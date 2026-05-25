# Contracts: Agent I/O — Hub ManIAcos V1

**Branch**: `001-hub-marketing-v1` | **Date**: 2026-05-24

Define los contratos de input/output de cada agente IA. Todos los outputs están validados con Zod antes de retornar. Todos los agentes reciben `supabaseAdmin` (service role client) como inyección de dependencia.

---

## Agent: Lead Scraper (`src/agents/lead-scraper.ts`)

**Claude**: No usa LLM. Es un agente de integración puro (serpapi → Postgres).

### Input
```typescript
interface LeadScraperInput {
  campaignId: string          // UUID de la campaña
  brief: string               // 'panaderías en Córdoba con >5 empleados, 20 leads'
  targetCount: number         // max leads a scrapear
  supabaseAdmin: SupabaseClient
}
```

### Output (Zod schema)
```typescript
const LeadScraperOutputSchema = z.object({
  leadsInserted: z.number(),
  leadsSkipped: z.number(),    // duplicados detectados
  leads: z.array(z.object({
    id: z.string().uuid(),
    nombre: z.string(),
    telefono_normalizado: z.string().nullable(),
    ciudad: z.string().nullable(),
  })),
  error: z.string().nullable(),
  serpapi_queries_used: z.number(),
})
```

### Behavior
1. Parsear `brief` con regex simple para extraer query para serpapi (ej: "panaderías Córdoba")
2. Llamar serpapi en loop hasta `targetCount` resultados (paginando de 20 en 20)
3. Por cada resultado: normalizar teléfono, extraer dominio, `check_lead_duplicate()` en Postgres
4. INSERT solo los no-duplicados, UPDATE `campaigns.progress_count` cada 10 inserts
5. Registrar `agent_runs` con `agent_name='lead_scraper'`, `cost_usd=<serpapi_cost>`
6. **No usa Claude** — no hay tokens LLM en este agente

### Error handling
- Bloqueo serpapi (429): mark campaign as `blocked`, wait 24h (via DB flag, no sleep)
- Fallo de DB: reintentar 3 veces con backoff 1s/5s/15s

---

## Agent: Enrichment (`src/agents/enrichment.ts`)

**Claude**: `claude-sonnet-4-5` con prompt caching.

### Input
```typescript
interface EnrichmentInput {
  leadId: string
  leadData: {
    nombre: string
    industria: string | null
    telefono: string | null
    sitio_web: string | null
    direccion: string | null
    ciudad: string | null
    rating_maps: number | null
    num_reseñas: number | null
    fuente: string
  }
  supabaseAdmin: SupabaseClient
}
```

### Output (Zod schema)
```typescript
const EnrichmentOutputSchema = z.object({
  score: z.number().int().min(0).max(100),
  reasoning: z.string().min(10).max(500),
  industry_classification: z.string(),
  company_size_estimate: z.enum(['micro', 'small', 'medium', 'large']),
  digital_maturity: z.enum(['none', 'basic', 'medium', 'advanced']),
  fit_with_maniacos: z.enum(['low', 'medium', 'high']),
})
```

### System Prompt (con cache_control)
```
Sos un analista de negocios especializado en evaluar el fit de empresas argentinas con ManIAcos,
una consultora de automatización con IA. Tu trabajo es analizar datos de un lead y devolver
un objeto JSON estructurado con score y análisis.

Criterios de scoring:
- Score 70-100 (verde): empresa mediana-grande con stack digital, presupuesto estimado >$500/mes, problema claro de automatización
- Score 40-69 (amarillo): empresa pequeña-mediana con algo de presencia digital, potencial con trabajo de qualification
- Score 0-39 (rojo): empresa muy chica, sin presencia digital, o en industria donde IA no agrega valor claro

ManIAcos se especializa en: automatización de procesos repetitivos, chatbots y agentes de atención,
análisis de datos con IA, outreach y ventas automatizadas.

IMPORTANTE: Devolvé SOLO el JSON válido con la estructura requerida. Sin texto adicional.
[cache_control: ephemeral]
```

### Behavior
1. Verificar costo cap antes de llamar Claude
2. Build prompt con datos del lead
3. Llamar Claude con system prompt cacheado
4. Validar output con Zod — si falla, INSERT incident + return `score=null`
5. UPDATE `leads` con score/reasoning/dimensiones, `status='enriched'`
6. INSERT `lead_history` (from: 'new', to: 'enriched', moved_by: 'enrichment_agent')
7. INSERT `agent_runs` con tokens + costo

---

## Agent: Outreach Writer (`src/agents/writer.ts`)

**Claude**: `claude-sonnet-4-5` con prompt caching.

### Input
```typescript
interface WriterInput {
  leadId: string
  lead: {
    nombre: string
    industria: string | null
    score: number
    reasoning: string
    digital_maturity: string
    channel_preference: 'whatsapp' | 'email'
    language: string
    ciudad: string | null
    sitio_web: string | null
  }
  signedByUserId: string      // UUID del socio firmante
  signedByName: string        // 'Franco' | 'Lucho' | 'Noe'
  supabaseAdmin: SupabaseClient
}
```

### Output (Zod schema)
```typescript
const WriterOutputSchema = z.object({
  body: z.string()
    .max(300, 'WhatsApp draft exceeds 300 chars')  // solo para WA
    .refine(text => !containsPricing(text), 'Draft contains pricing information'),
  subject: z.string().optional(),  // solo para email
  language: z.enum(['es', 'en']),
  angle: z.string(),               // descripción de la angle usada
})
```

Función `containsPricing(text)`: detecta palabras `precio|costo|tarifa|inversión|$|USD|ARS` (FR-083).

### System Prompt key constraints (resumido)
- Primer persona del socio firmante (nunca mencionar IA/Claude)
- WhatsApp: <300 chars, tono informal-profesional, pregunta de cierre
- Email: asunto + cuerpo, tono profesional, valor específico en primer párrafo
- Prohibido: montos de dinero, rangos de precio, "inversión", "costo" (FR-083)
- Personalizar con observación específica del negocio del lead (FR-031)
- Idioma: español default, inglés si `lead.language = 'en'`

### Behavior
1. Verificar cap
2. Verificar `do_not_contact` para el lead (telefono + email) — si está, abort con error claro
3. Verificar `messages_sent_count` — si ≥2, no generar; informar al caller (FR-082)
4. Llamar Claude con system prompt cacheado
5. Validar con Zod (incluye check de precios) — si falla validación de precios: 1 auto-regeneración
6. Compute `draft_hash = SHA256(leadId + body)`
7. INSERT `drafts` con status='pending'
8. INSERT `agent_runs`

---

## Agent: Reply Handler (`src/agents/reply-handler.ts`)

**Claude**: `claude-sonnet-4-5` — prompts cortos, sin caching necesario.

### Input
```typescript
interface ReplyHandlerInput {
  replyId: string
  replyBody: string
  channel: 'whatsapp' | 'email'
  leadContext: {
    nombre: string
    industria: string | null
    status: string
    last_message_body: string | null
  }
  supabaseAdmin: SupabaseClient
}
```

### Output (Zod schema)
```typescript
const ReplyHandlerOutputSchema = z.object({
  classification: z.enum([
    'interested', 'question', 'objection',
    'not_interested', 'unsubscribe', 'needs_human_review'
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(200),
})
```

### Behavior
1. Llamar Claude para clasificar el reply
2. Si `confidence < 0.70` → forzar `classification = 'needs_human_review'` (FR-051)
3. UPDATE `replies` con clasificación
4. Si `unsubscribe`: INSERT `do_not_contact`, UPDATE lead `status='dead'`
5. Si `interested/question/objection`: UPDATE lead `status='replied'`, crear notificación (Supabase Realtime + Telegram si configurado)
6. INSERT `agent_runs`

---

## Agent: Sender (`src/agents/sender.ts`)

**Claude**: No usa LLM. Es un agente de integración puro.

### Input
```typescript
interface SenderInput {
  draftId: string
  supabaseAdmin: SupabaseClient
}
```

### Output (Zod schema)
```typescript
const SenderOutputSchema = z.object({
  sent: z.boolean(),
  externalMessageId: z.string().nullable(),
  scheduledFor: z.string().datetime().nullable(),  // si se programó para más tarde
  error: z.string().nullable(),
})
```

### Behavior
1. Cargar draft + lead desde DB
2. Verificar costo cap (hard ceiling bloquea, FR-048)
3. Verificar `do_not_contact` para lead
4. Verificar idempotencia: `messages WHERE draft_id = draftId AND sent_at IS NOT NULL` → si existe, return con `sent=true` sin reenviar
5. Verificar rate limit: query `SELECT COUNT(*) FROM messages WHERE channel='whatsapp' AND sent_at > NOW() - INTERVAL '1 hour'` — si ≥30, programar para próximo slot
6. Verificar ventana horaria del lead (09:00-21:00 hora del país del lead) — si fuera, programar
7. Verificar quiet time 90s: `SELECT MAX(sent_at) FROM messages WHERE lead_id = ? AND sent_at > NOW() - INTERVAL '90 seconds'` — si hay, programar para después
8. Enviar via Evolution API (WA) o Resend (email) según `draft.channel`
9. INSERT `messages` con external_message_id
10. UPDATE `leads.messages_sent_count += 1`
11. INSERT `agent_runs` (sin tokens LLM, solo costo de API si aplica)
12. Reintentos: 3x con backoff (30s, 2min, 10min) via DLQ en tabla `messages_retry_queue`

---

## Agent: Coordinator (`src/agents/coordinator.ts`)

**Claude**: `claude-opus-4-7` para parsing del pedido, `claude-sonnet-4-5` para steps simples.

### Input
```typescript
interface CoordinatorInput {
  userRequest: string         // lenguaje natural
  userId: string
  supabaseAdmin: SupabaseClient
}
```

### Output (plan, antes de ejecutar)
```typescript
const CoordinatorPlanSchema = z.object({
  steps: z.array(z.object({
    stepNumber: z.number(),
    agentName: z.enum(['lead_scraper', 'enrichment', 'writer', 'sender']),
    description: z.string(),    // descripción legible para el usuario
    params: z.record(z.unknown()),
    requiresHumanApproval: z.boolean(),  // true si el step envía mensajes
  })),
  summary: z.string(),          // "Voy a: 1. scrapear, 2. enriquecer, 3. escribir drafts"
})
```

### Behavior
1. Llamar Claude Opus con el pedido → parse a `CoordinatorPlan`
2. Mostrar plan al usuario via Supabase Realtime (stream de texto)
3. Esperar confirmación humana (INSERT en `coordinator_confirmations`)
4. Ejecutar cada step en orden, streaming progreso
5. En cualquier step `requiresHumanApproval = true`: STOP, notificar al usuario, esperar aprobación explícita (Principio IV)
6. En fallo: INSERT incident, ofrecer opciones (retry/skip/abort)
7. Estado persistente: guardar `coordinator_sessions` en DB para sobrevivir page refresh
