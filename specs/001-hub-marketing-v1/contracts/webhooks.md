# Contracts: Webhooks Inbound — Hub ManIAcos V1

**Branch**: `001-hub-marketing-v1` | **Date**: 2026-05-24

Defines the HTTP contracts for all inbound webhooks the Hub exposes.

---

## POST /api/webhooks/evolution

**Descripción**: WhatsApp inbound messages via Evolution API self-hosted.

**Auth**: Header `apikey: <EVOLUTION_WEBHOOK_SECRET>` (configurado en Evolution panel y en Vaultwarden)

**Source**: Evolution API en `evolution.maniaco.online`

**Request Body** (Evolution API v2 format):
```typescript
interface EvolutionWebhookPayload {
  event: 'messages.upsert' | 'messages.update' | 'connection.update'
  instance: string              // 'maniaco-main'
  data: {
    key: {
      remoteJid: string         // '5491123456789@s.whatsapp.net'
      fromMe: boolean           // false para inbound
      id: string                // WA message ID único
    }
    message?: {
      conversation?: string     // texto plano
      extendedTextMessage?: {
        text: string
      }
      // otros tipos: imageMessage, audioMessage, etc. — ignorados en V1
    }
    pushName?: string           // nombre del contacto
    messageTimestamp: number    // unix timestamp
  }
}
```

**Procesamiento**:
1. Validar header `apikey`
2. Filtrar solo eventos `messages.upsert` con `data.key.fromMe = false`
3. Extraer `remoteJid` → normalizar a E.164 (`5491123456789`)
4. Dedup: verificar `replies.external_reply_id = data.key.id` — si existe, 200 sin procesar
5. Buscar lead por `telefono_normalizado`
6. Si lead encontrado: INSERT en `replies` con `classification = null`, invocar Reply Handler Agent async
7. Si lead no encontrado: log en `incidents` como "reply sin lead asociado"

**Response**:
```json
{ "ok": true }
```
Siempre 200. Errores internos se logean sin retornar 5xx (Evolution puede reintentar indefinidamente).

---

## POST /api/webhooks/email-inbound

**Descripción**: Email replies via Cloudflare Email Worker.

**Auth**: Header `Authorization: Bearer <EMAIL_WEBHOOK_SECRET>` (en Vaultwarden, inyectado en Cloudflare Worker como env var `WEBHOOK_SECRET`)

**Source**: Cloudflare Email Worker en `maniaco.online`

**Request Body**:
```typescript
interface EmailInboundPayload {
  from: string              // 'lead@empresa.com'
  to: string                // 'franco@maniaco.online'
  subject: string           // 'Re: [asunto del outreach]'
  text: string              // cuerpo plano del reply
  html?: string             // cuerpo HTML (opcional, usar solo como fallback)
  inReplyTo?: string        // valor del header In-Reply-To: '<re_123456789@resend.dev>'
  messageId: string         // Message-ID del reply: '<xyz@lead-domain.com>'
  receivedAt: string        // ISO 8601 timestamp
}
```

**Procesamiento**:
1. Validar Bearer token
2. Dedup: verificar `replies.external_reply_id = messageId` — si existe, 200 sin procesar
3. Parsear `inReplyTo` → extraer Resend message ID: `inReplyTo.replace('<', '').replace('>', '').replace('@resend.dev', '')`
4. Buscar `messages WHERE resend_message_id = <parsed_id>`
5. Si message encontrado: extraer `lead_id`, INSERT en `replies`, invocar Reply Handler Agent async
6. Si no encontrado: buscar lead por `email = from` como fallback
7. Si aún no correlaciona: log en `incidents`

**Response**: `{ "ok": true }` — siempre 200.

---

## POST /api/webhooks/resend-delivery

**Descripción**: Delivery status updates de Resend (delivered, bounced, spam complaint).

**Auth**: Header `svix-signature` validado con Resend webhook signing secret (Vaultwarden).

**Source**: Resend dashboard → webhook endpoint

**Request Body** (Resend v1 webhook format):
```typescript
interface ResendDeliveryEvent {
  type: 'email.delivered' | 'email.bounced' | 'email.complained' | 'email.opened'
  data: {
    email_id: string        // Resend message ID ('re_123456789')
    to: string[]
    from: string
    created_at: string
  }
}
```

**Procesamiento**:
1. Validar Svix signature
2. Mapear `type` → `delivery_status`: `delivered`→`delivered`, `bounced`→`failed`, `complained`→`blocked`
3. UPDATE `messages SET delivery_status = <mapped>, delivered_at = now() WHERE resend_message_id = data.email_id`
4. Si `complained`: agregar `messages.lead_id.email` a `do_not_contact` con reason='spam_report'

**Response**: `{ "ok": true }`

---

## POST /api/webhooks/whatsapp-health-alert

**Descripción**: Alerta de salud del número WhatsApp enviada por el cron de n8n en Oracle ARM.

**Auth**: Header `X-Internal-Secret: <INTERNAL_WEBHOOK_SECRET>` (Vaultwarden)

**Source**: n8n cron job en Oracle ARM (cada hora)

**Request Body**:
```typescript
interface WhatsAppHealthAlert {
  score: number             // 0.0 - 1.0
  delivery_rate: number
  response_rate: number
  spam_reports: number      // proxy: mensajes blocked últimas 24h
  alert: boolean            // true si score < 0.5 O spam_reports >= 3
}
```

**Procesamiento**:
1. Validar secret header
2. INSERT en `whatsapp_health`
3. Si `alert = true`: INSERT en `incidents` con `agent_name='whatsapp_health_monitor'`
4. (Supabase Realtime notifica al dashboard via subscription en `incidents`)

**Response**: `{ "ok": true }`
