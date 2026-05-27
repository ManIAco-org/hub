-- ────────────────────────────────────────────────────────────
-- Migration: agent_runs
-- Hub ManIAcos Sprint 1 — Constitution v1.1.0 cost tracking
-- Sprint 1: table created, no real writes yet (agents → Sprint 2)
-- Terminal sessions write via service_role key
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name        text NULL,
  input_tokens      integer NULL,
  output_tokens     integer NULL,
  model             text NULL,
  cost_usd          numeric(10, 4) NULL,
  status            text NOT NULL
                    CHECK (status IN ('success', 'error', 'override', 'blocked')),
  human_approved_by text NULL,
  input_payload     jsonb NULL,
  output_payload    jsonb NULL,
  error_msg         text NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────
-- No public policies: only service_role can read/write
-- (terminal-service uses service_role key for writes)
-- Sprint 2 will add authenticated read policy for the Hub frontend
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

-- Index for cost aggregation queries (Sprint 2 cost dashboard)
CREATE INDEX IF NOT EXISTS agent_runs_created_at_idx
  ON public.agent_runs (created_at DESC);

CREATE INDEX IF NOT EXISTS agent_runs_agent_name_idx
  ON public.agent_runs (agent_name);
