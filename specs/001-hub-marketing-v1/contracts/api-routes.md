# Contracts: API Routes — Hub ManIAcos V1

**Branch**: `001-hub-marketing-v1` | **Date**: 2026-05-24

Define todas las Route Handlers (`app/api/`) del Hub. Todas las rutas bajo `/api/agents/` requieren sesión válida `@maniaco.online`. Las rutas bajo `/api/webhooks/` tienen auth propia por secret header.

---

## Auth guard

Todas las rutas (excepto webhooks) pasan por `middleware.ts`:
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(...)
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session && !request.nextUrl.pathname.startsWith('/api/webhooks')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Verificar dominio @maniaco.online
  if (session && !session.user.email?.endsWith('@maniaco.online')) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=unauthorized_domain', request.url))
  }
  
  return NextResponse.next()
}
```

---

## POST /api/agents/scraper

**Auth**: Session cookie (`@maniaco.online`)

**Request**:
```typescript
{
  campaignId: string,
  brief: string,
  targetCount: number  // 1-200
}
```

**Response**:
```typescript
{
  jobStarted: true,
  campaignId: string
}
```

Invoca `runLeadScraper()` de forma asíncrona (no bloquea). El progreso se sigue via Supabase Realtime en `campaigns.progress_count`.

---

## POST /api/agents/enrichment

**Auth**: Session cookie

**Request**:
```typescript
{
  leadId?: string,        // enriquecer un lead específico
  batchAll?: boolean      // enriquecer todos los leads 'new' pendientes
}
```

**Response**:
```typescript
{
  queued: number          // cantidad de leads encolados para enrichment
}
```

---

## POST /api/agents/writer

**Auth**: Session cookie

**Request**:
```typescript
{
  leadIds: string[],      // UUIDs de leads a draftear
  signedByUserId: string  // UUID del socio firmante
}
```

**Response**:
```typescript
{
  draftsCreated: number,
  draftsSkipped: number   // leads en do_not_contact o messages_sent_count >= 2
}
```

---

## POST /api/agents/sender

**Auth**: Session cookie

**Request**:
```typescript
{
  draftIds: string[]      // UUIDs de drafts aprobados a enviar
}
```

**Response**:
```typescript
{
  sent: number,
  scheduled: number,
  failed: number
}
```

---

## POST /api/agents/coordinator

**Auth**: Session cookie

**Request**:
```typescript
{
  request: string,        // pedido en lenguaje natural
  sessionId?: string      // para retomar sesión existente
}
```

**Response** (streaming con Server-Sent Events):
```
data: {"type":"plan","steps":[...]}
data: {"type":"step_start","stepNumber":1,"description":"Scrapeando leads..."}
data: {"type":"step_progress","stepNumber":1,"progress":7,"total":20}
data: {"type":"step_complete","stepNumber":1,"result":{"inserted":18}}
data: {"type":"approval_required","stepNumber":4,"message":"¿Enviar 15 drafts aprobados?"}
data: {"type":"done","summary":"..."}
```

---

## PATCH /api/drafts/[draftId]/approve

**Auth**: Session cookie

**Request**: `{}` (body vacío)

**Response**:
```typescript
{
  ok: true,
  draftId: string,
  approvedBy: string,     // email del socio
  approvedAt: string      // ISO 8601
}
```

Idempotente: si ya estaba aprobado, retorna 200 con los datos del primer approval.

---

## PATCH /api/drafts/[draftId]/reject

**Auth**: Session cookie

**Request**:
```typescript
{
  reason?: string         // 1-100 chars (FR-038)
}
```

**Response**:
```typescript
{ ok: true }
```

---

## POST /api/drafts/batch-approve

**Auth**: Session cookie

**Request**:
```typescript
{
  draftIds: string[]      // máximo 100 por batch
}
```

**Response**:
```typescript
{
  approved: number,
  alreadyApproved: number,
  failed: number
}
```

Con confirmación forzada desde el cliente si `draftIds.length >= 5` (FR-037).

---

## POST /api/vault/save

**Auth**: Session cookie

**Request**:
```typescript
{
  filePath: string,       // 'clientes/rc-repuestos.md'
  content: string,        // contenido markdown
  title: string
}
```

**Response**:
```typescript
{
  commitHash: string,
  savedAt: string
}
```

1. Upsert `vault_notes` en Postgres (índice de búsqueda)
2. Invocar vault-write API en Oracle ARM para git commit+push
3. Actualizar `vault_notes.git_commit_hash`

---

## GET /api/vault/search

**Auth**: Session cookie

**Query params**: `?q=<query>&limit=20`

**Response**:
```typescript
{
  results: Array<{
    id: string,
    title: string,
    filePath: string,
    snippet: string,    // ts_headline de Postgres
    lastEditedAt: string
  }>
}
```

---

## GET /api/cost/current

**Auth**: Session cookie

**Response**:
```typescript
{
  totalCostUsd: number,
  softCap: number,           // 200
  hardCeiling: number,       // 400
  percentage: number,        // 0-∞ (puede superar 100 si hay override)
  status: 'ok' | 'warning' | 'override_needed' | 'blocked',
  breakdown: Array<{
    agentName: string,
    costUsd: number,
    runs: number
  }>
}
```

---

## POST /api/cost/override

**Auth**: Session cookie

**Request**:
```typescript
{
  reason?: string           // motivo opcional en texto libre
}
```

**Response**:
```typescript
{
  ok: true,
  expiresAt: string         // now() + 12h (ISO 8601)
}
```

Inserta un `agent_runs` especial con `status='override'` y `human_approved_by=<email>`. El sistema verifica la existencia de un override activo (últimas 12h) antes de bloquear agentes.
