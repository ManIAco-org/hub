# Data Model: Hub ManIAcos V1 — Departamento Marketing

**Branch**: `001-hub-marketing-v1` | **Date**: 2026-05-24

Schema completo de Postgres para `supabase/migrations/0001_initial_schema.sql`. Todas las tablas tienen RLS habilitado. Los agentes usan service role key (bypasea RLS).

---

## Enums

```sql
CREATE TYPE lead_status AS ENUM (
  'new', 'enriched', 'approved', 'sent', 'replied', 'qualified', 'closed', 'dead'
);

CREATE TYPE lead_channel AS ENUM ('whatsapp', 'email');

CREATE TYPE lead_source AS ENUM ('google_maps', 'manual', 'referral');

CREATE TYPE draft_status AS ENUM (
  'pending', 'approved', 'rejected', 'sent', 'expired'
);

CREATE TYPE message_delivery_status AS ENUM (
  'queued', 'sent', 'delivered', 'read', 'failed', 'blocked'
);

CREATE TYPE reply_classification AS ENUM (
  'interested', 'question', 'objection', 'not_interested',
  'unsubscribe', 'needs_human_review'
);

CREATE TYPE agent_run_status AS ENUM (
  'success', 'error', 'override', 'blocked', 'running'
);

CREATE TYPE cost_cap_status AS ENUM ('ok', 'warning', 'override_needed', 'blocked');
```

---

## Tabla: users (view de auth.users)

> Los usuarios son los 3 socios. Supabase maneja auth en `auth.users`. Creamos una tabla `public.users` para metadata adicional.

```sql
CREATE TABLE public.users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL UNIQUE,       -- debe ser @maniaco.online
  full_name   text NOT NULL,
  role        text NOT NULL DEFAULT 'admin',
  telegram_chat_id  text NULL,           -- para notificaciones Telegram (FR-088)
  gitconfig_name    text NOT NULL,       -- 'Franco', 'Lucho', 'Noe' (para commits vault)
  totp_secret       text NULL,           -- encriptado en Vaultwarden, solo referenciado
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: los 3 socios pueden ver todos los usuarios
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_all" ON public.users FOR SELECT USING (
  auth.uid() IS NOT NULL
);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (
  auth.uid() = id
);
```

---

## Tabla: leads

```sql
CREATE TABLE public.leads (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                  text NOT NULL,
  industria               text NULL,
  telefono                text NULL,                    -- raw, puede ser null
  telefono_normalizado    text NULL,                    -- E.164, para dedup
  email                   text NULL,
  sitio_web               text NULL,
  dominio_web_normalizado text NULL,                    -- para dedup
  nombre_normalizado      text NULL,                    -- unaccent(lower(nombre)), dedup
  direccion               text NULL,
  ciudad                  text NULL,
  pais                    text NOT NULL DEFAULT 'AR',
  status                  lead_status NOT NULL DEFAULT 'new',
  channel_preference      lead_channel NOT NULL DEFAULT 'whatsapp',
  language                text NOT NULL DEFAULT 'es',
  fuente                  lead_source NOT NULL DEFAULT 'manual',
  score                   smallint NULL CHECK (score BETWEEN 0 AND 100),
  reasoning               text NULL,                    -- 2-4 líneas del Enrichment Agent
  -- dimensiones intermedias de scoring
  industry_classification text NULL,
  company_size_estimate   text NULL,                    -- 'micro'|'small'|'medium'|'large'
  digital_maturity        text NULL,                    -- 'none'|'basic'|'medium'|'advanced'
  fit_with_maniacos       text NULL,                    -- 'low'|'medium'|'high'
  -- metadata de fuente
  google_place_id         text NULL,
  rating_maps             numeric(3,1) NULL,
  num_reseñas             int NULL,
  -- assignación y estado
  assigned_to             uuid NULL REFERENCES public.users(id),
  tags                    text[] NOT NULL DEFAULT '{}',
  deal_value_usd          numeric(10,2) NULL,
  closed_at               timestamptz NULL,
  -- mensajes counter para warning de multi-mensaje (FR-082)
  messages_sent_count     int NOT NULL DEFAULT 0,
  -- auditoría
  created_by              uuid NOT NULL REFERENCES public.users(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- Indexes para búsqueda y dedup
CREATE INDEX leads_status_idx ON public.leads(status);
CREATE INDEX leads_telefono_normalizado_idx ON public.leads(telefono_normalizado) WHERE telefono_normalizado IS NOT NULL;
CREATE INDEX leads_dominio_idx ON public.leads(dominio_web_normalizado) WHERE dominio_web_normalizado IS NOT NULL;
CREATE INDEX leads_assigned_idx ON public.leads(assigned_to);
CREATE INDEX leads_tags_idx ON public.leads USING GIN(tags);
CREATE INDEX leads_score_idx ON public.leads(score) WHERE score IS NOT NULL;
CREATE INDEX leads_created_at_idx ON public.leads(created_at DESC);

-- Full-text search en nombre
CREATE INDEX leads_nombre_fts_idx ON public.leads USING GIN(to_tsvector('spanish', nombre));

-- RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_select" ON public.leads FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "leads_insert" ON public.leads FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "leads_update" ON public.leads FOR UPDATE USING (auth.uid() IS NOT NULL);
-- DELETE prohibido; usar status='dead' en su lugar

-- Trigger: updated_at auto-update
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql;
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Tabla: lead_history

```sql
CREATE TABLE public.lead_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  moved_by    text NOT NULL,           -- email del usuario O nombre del agente ('enrichment_agent')
  from_status lead_status NULL,        -- NULL si es la primera entrada
  to_status   lead_status NOT NULL,
  note        text NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lead_history_lead_idx ON public.lead_history(lead_id, created_at DESC);

ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_history_select" ON public.lead_history FOR SELECT USING (auth.uid() IS NOT NULL);
-- INSERT solo via service role (agentes) o usuarios autenticados
CREATE POLICY "lead_history_insert" ON public.lead_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

---

## Tabla: campaigns

```sql
CREATE TABLE public.campaigns (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  brief_text    text NOT NULL,          -- input del usuario para el Lead Scraper
  target_count  int NOT NULL DEFAULT 20,
  progress_count int NOT NULL DEFAULT 0, -- actualizado por el Scraper cada 10 leads
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'running', 'completed', 'failed', 'blocked')),
  created_by    uuid NOT NULL REFERENCES public.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz NULL
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_all" ON public.campaigns FOR ALL USING (auth.uid() IS NOT NULL);
```

---

## Tabla: drafts

```sql
CREATE TABLE public.drafts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  channel           lead_channel NOT NULL,
  body              text NOT NULL,
  subject           text NULL,          -- solo para channel='email'
  language          text NOT NULL DEFAULT 'es',
  signed_by         uuid NOT NULL REFERENCES public.users(id),  -- socio firmante
  agent_run_id      uuid NULL,          -- FK a agent_runs (puede ser null si draft es manual)
  status            draft_status NOT NULL DEFAULT 'pending',
  -- aprobación
  approved_by       uuid NULL REFERENCES public.users(id),
  approved_at       timestamptz NULL,
  rejection_reason  text NULL,
  edited_diff       text NULL,          -- diff entre body original y body editado
  -- dedup
  draft_hash        text NOT NULL,      -- SHA256(lead_id + body) para idempotencia (FR-047)
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX drafts_lead_idx ON public.drafts(lead_id);
CREATE INDEX drafts_status_idx ON public.drafts(status);
CREATE INDEX drafts_signed_by_idx ON public.drafts(signed_by);
CREATE UNIQUE INDEX drafts_dedup_idx ON public.drafts(draft_hash)
  WHERE status NOT IN ('rejected', 'expired');

ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drafts_all" ON public.drafts FOR ALL USING (auth.uid() IS NOT NULL);
```

---

## Tabla: messages

```sql
CREATE TABLE public.messages (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id               uuid NOT NULL REFERENCES public.leads(id),
  draft_id              uuid NOT NULL REFERENCES public.drafts(id),
  channel               lead_channel NOT NULL,
  body                  text NOT NULL,
  subject               text NULL,
  sent_at               timestamptz NULL,
  sent_by               uuid NOT NULL REFERENCES public.users(id),  -- firmante humano
  -- IDs externos para correlación de replies
  evolution_message_id  text NULL,       -- retornado por Evolution API
  resend_message_id     text NULL,       -- retornado por Resend (sin <> ni @resend.dev)
  delivery_status       message_delivery_status NOT NULL DEFAULT 'queued',
  delivered_at          timestamptz NULL,
  -- para rate limiting
  scheduled_for         timestamptz NULL,  -- cuándo debe enviarse si fue programado
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_lead_idx ON public.messages(lead_id, sent_at DESC);
CREATE INDEX messages_resend_id_idx ON public.messages(resend_message_id) WHERE resend_message_id IS NOT NULL;
CREATE INDEX messages_evolution_id_idx ON public.messages(evolution_message_id) WHERE evolution_message_id IS NOT NULL;
CREATE INDEX messages_scheduled_idx ON public.messages(scheduled_for) WHERE scheduled_for IS NOT NULL;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_all" ON public.messages FOR ALL USING (auth.uid() IS NOT NULL);
```

---

## Tabla: replies

```sql
CREATE TABLE public.replies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id        uuid NULL REFERENCES public.messages(id),  -- puede ser NULL si no correlaciona
  lead_id           uuid NOT NULL REFERENCES public.leads(id),
  channel           lead_channel NOT NULL,
  body              text NOT NULL,
  received_at       timestamptz NOT NULL DEFAULT now(),
  classification    reply_classification NULL,  -- NULL hasta que el handler procesa
  confidence        numeric(4,3) NULL CHECK (confidence BETWEEN 0 AND 1),
  agent_run_id      uuid NULL,
  handled_by        uuid NULL REFERENCES public.users(id),
  handled_at        timestamptz NULL,
  -- para dedup de webhook (mismo mensaje puede llegar dos veces)
  external_reply_id text NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX replies_external_dedup_idx ON public.replies(external_reply_id) WHERE external_reply_id IS NOT NULL;
CREATE INDEX replies_lead_idx ON public.replies(lead_id, received_at DESC);
CREATE INDEX replies_unhandled_idx ON public.replies(classification) WHERE classification = 'needs_human_review';

ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "replies_all" ON public.replies FOR ALL USING (auth.uid() IS NOT NULL);
```

---

## Tabla: agent_runs

```sql
CREATE TABLE public.agent_runs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name              text NOT NULL,    -- 'lead_scraper'|'enrichment'|'writer'|'sender'|'reply_handler'|'coordinator'
  input_tokens            int NOT NULL DEFAULT 0,
  output_tokens           int NOT NULL DEFAULT 0,
  cache_read_tokens       int NOT NULL DEFAULT 0,
  cache_write_tokens      int NOT NULL DEFAULT 0,
  model                   text NOT NULL,    -- 'claude-sonnet-4-5'|'claude-opus-4-7' etc.
  cost_usd                numeric(10,4) NOT NULL DEFAULT 0,
  status                  agent_run_status NOT NULL DEFAULT 'running',
  human_approved_by       text NULL,        -- email del socio si status='override'
  input_payload           jsonb NOT NULL DEFAULT '{}',
  output_payload          jsonb NOT NULL DEFAULT '{}',
  error_msg               text NULL,
  -- referencia al objeto procesado (opcional, para trazabilidad)
  lead_id                 uuid NULL REFERENCES public.leads(id),
  draft_id                uuid NULL REFERENCES public.drafts(id),
  over_cap                boolean NOT NULL DEFAULT false,  -- true si se ejecutó sobre el soft cap
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX agent_runs_agent_idx ON public.agent_runs(agent_name, created_at DESC);
CREATE INDEX agent_runs_created_idx ON public.agent_runs(created_at DESC);
CREATE INDEX agent_runs_lead_idx ON public.agent_runs(lead_id) WHERE lead_id IS NOT NULL;
-- Partitioning not needed V1 (<50k rows/mes)

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_runs_select" ON public.agent_runs FOR SELECT USING (auth.uid() IS NOT NULL);
-- INSERT/UPDATE solo via service role (agentes)
```

---

## Tabla: cost_monthly_summary (materializada via trigger)

```sql
CREATE TABLE public.cost_monthly_summary (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month         date NOT NULL,          -- primer día del mes: date_trunc('month', now())::date
  agent_name    text NOT NULL,
  total_cost_usd numeric(10,4) NOT NULL DEFAULT 0,
  total_runs    int NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month, agent_name)
);

-- Trigger que actualiza el summary en cada INSERT en agent_runs
CREATE OR REPLACE FUNCTION update_cost_monthly_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.cost_monthly_summary (month, agent_name, total_cost_usd, total_runs)
  VALUES (date_trunc('month', NEW.created_at)::date, NEW.agent_name, NEW.cost_usd, 1)
  ON CONFLICT (month, agent_name) DO UPDATE SET
    total_cost_usd = cost_monthly_summary.total_cost_usd + EXCLUDED.total_cost_usd,
    total_runs = cost_monthly_summary.total_runs + 1,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_runs_cost_trigger
AFTER INSERT ON public.agent_runs
FOR EACH ROW EXECUTE FUNCTION update_cost_monthly_summary();

ALTER TABLE public.cost_monthly_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cost_summary_select" ON public.cost_monthly_summary FOR SELECT USING (auth.uid() IS NOT NULL);
```

---

## Tabla: do_not_contact

```sql
CREATE TABLE public.do_not_contact (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefono    text NULL,
  email       text NULL,
  reason      text NOT NULL,            -- 'unsubscribe'|'spam_report'|'manual'
  added_by    text NOT NULL,            -- email del socio O 'reply_handler'
  added_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (telefono IS NOT NULL OR email IS NOT NULL)
);

CREATE UNIQUE INDEX dnc_telefono_idx ON public.do_not_contact(telefono) WHERE telefono IS NOT NULL;
CREATE UNIQUE INDEX dnc_email_idx ON public.do_not_contact(email) WHERE email IS NOT NULL;

ALTER TABLE public.do_not_contact ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dnc_select" ON public.do_not_contact FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "dnc_insert" ON public.do_not_contact FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

---

## Tabla: incidents

```sql
CREATE TABLE public.incidents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name       text NOT NULL,
  input_hash       text NOT NULL,       -- SHA256 del input para lookup
  output_snapshot  jsonb NOT NULL DEFAULT '{}',
  confidence       numeric(4,3) NULL,
  error_msg        text NULL,
  resolved_by      uuid NULL REFERENCES public.users(id),
  resolved_at      timestamptz NULL,
  vault_lesson_url text NULL,           -- URL a nota de vault con lesson learned
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX incidents_unresolved_idx ON public.incidents(created_at DESC) WHERE resolved_at IS NULL;

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incidents_all" ON public.incidents FOR ALL USING (auth.uid() IS NOT NULL);
```

---

## Tabla: vault_notes (índice de búsqueda)

```sql
CREATE TABLE public.vault_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path       text NOT NULL UNIQUE,  -- relativo a vault root: 'clientes/rc-repuestos.md'
  title           text NOT NULL,
  content_md      text NOT NULL DEFAULT '',
  last_edited_by  uuid NULL REFERENCES public.users(id),
  last_edited_at  timestamptz NOT NULL DEFAULT now(),
  git_commit_hash text NULL,
  -- full-text search
  content_tsvector tsvector GENERATED ALWAYS AS (
    to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(content_md, ''))
  ) STORED
);

CREATE INDEX vault_notes_fts_idx ON public.vault_notes USING GIN(content_tsvector);
CREATE INDEX vault_notes_path_idx ON public.vault_notes(file_path);

ALTER TABLE public.vault_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vault_notes_all" ON public.vault_notes FOR ALL USING (auth.uid() IS NOT NULL);
```

---

## Tabla: auth_events

```sql
CREATE TABLE public.auth_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  ip          text NULL,
  user_agent  text NULL,
  outcome     text NOT NULL CHECK (outcome IN ('success', 'failed', 'blocked')),
  reason      text NULL,               -- para outcome='failed'|'blocked'
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_events_email_idx ON public.auth_events(email, created_at DESC);

ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_events_select" ON public.auth_events FOR SELECT USING (auth.uid() IS NOT NULL);
-- INSERT via service role únicamente (desde middleware/auth callback)
```

---

## Tabla: whatsapp_health

```sql
CREATE TABLE public.whatsapp_health (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score          numeric(4,3) NOT NULL CHECK (score BETWEEN 0 AND 1),
  delivery_rate  numeric(4,3) NOT NULL,
  response_rate  numeric(4,3) NOT NULL,
  spam_reports   int NOT NULL DEFAULT 0,  -- proxy: mensajes con delivery_status='blocked' últimas 24h
  measured_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX whatsapp_health_measured_idx ON public.whatsapp_health(measured_at DESC);

ALTER TABLE public.whatsapp_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp_health_select" ON public.whatsapp_health FOR SELECT USING (auth.uid() IS NOT NULL);
```

---

## State Transitions: Lead

```
new ──[enrichment]──► enriched ──[approval]──► approved ──[sender]──► sent ──[reply handler]──► replied
                                                                                                    │
                                                                               qualified ◄──[manual]─┤
                                                                               closed    ◄──[manual]─┤
                                                                               dead      ◄──[unsubscribe o manual]
```

Cualquier estado puede ir a `dead` (manual o unsubscribe). `closed` es terminal positivo (deal cerrado).

## State Transitions: Draft

```
pending ──[approve]──► approved ──[sender]──► sent
        ──[reject]───► rejected
        ──[expiry 7d]─► expired
```

## Retención de datos

| Tabla | Retención | Acción |
|-------|-----------|--------|
| `agent_runs` | 90 días | Archive a Supabase Storage, DELETE from tabla |
| `auth_events` | 180 días | Archive mensual |
| `leads` activos | Indefinido | — |
| `leads` dead | 12 meses desde `updated_at` | Mover a `leads_archive` |
| `messages/replies` | Indefinido (pequeño volumen) | — |
| `vault_notes` | Indefinido | Git es el source of truth |
