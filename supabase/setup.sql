-- ════════════════════════════════════════════════════════════════
-- Hub ManIAcos — Sprint 1 Schema Setup
-- Pegar TODO esto en: supabase.com → tu proyecto → SQL Editor → Run
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- 1. Helper: auto-update updated_at en cada cambio
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- 2. team_status — Panel 1 estado del equipo en tiempo real
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_status (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_email    text NOT NULL UNIQUE,
  member_name     text NOT NULL CHECK (member_name IN ('Franco', 'Lucho', 'Noe')),
  current_project text NULL,
  current_task    text NULL CHECK (char_length(current_task) <= 80),
  status          text NOT NULL DEFAULT 'idle'
                  CHECK (status IN ('active', 'idle', 'away')),
  last_active_at  timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER team_status_updated_at
  BEFORE UPDATE ON public.team_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.team_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_status_read_all" ON public.team_status
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "team_status_update_own" ON public.team_status
  FOR UPDATE USING ((auth.jwt() ->> 'email') = member_email);

CREATE POLICY "team_status_insert_own" ON public.team_status
  FOR INSERT WITH CHECK ((auth.jwt() ->> 'email') = member_email);

-- Realtime para Panel 1 (sin polling)
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_status;

-- ────────────────────────────────────────────────────────────
-- 3. projects — Panel 2 dashboard + Panel 3 clientes
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  client_name   text NOT NULL,
  description   text NULL,
  status        text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'paused', 'done')),
  vercel_url    text NULL,
  github_url    text NULL,
  server_path   text NULL,
  owner_email   text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_read_all" ON public.projects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "projects_insert_any" ON public.projects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "projects_update_any" ON public.projects
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Seed: proyectos iniciales para testing de Milestone 1
INSERT INTO public.projects (name, client_name, description, status, server_path, owner_email)
VALUES
  ('RC Repuestos', 'RC Repuestos', 'Automatización procesos internos y web', 'active', '/srv/maniacos/rc-repuestos', 'franco.sanmartin@maniaco.online'),
  ('Landing ManIAcos', 'ManIAcos', 'Sitio web público de la consultora', 'active', '/srv/maniacos/landing', 'franco.sanmartin@maniaco.online')
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 4. agent_runs — Constitution v1.1.0 cost tracking
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name        text NULL,
  input_tokens      integer NULL,
  output_tokens     integer NULL,
  model             text NULL,
  cost_usd          numeric(10, 4) NULL,
  status            text NOT NULL CHECK (status IN ('success', 'error', 'override', 'blocked')),
  human_approved_by text NULL,
  input_payload     jsonb NULL,
  output_payload    jsonb NULL,
  error_msg         text NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
-- Sin políticas públicas: solo service_role puede escribir (terminal-service)

CREATE INDEX IF NOT EXISTS agent_runs_created_at_idx ON public.agent_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS agent_runs_agent_name_idx ON public.agent_runs (agent_name);

-- ════════════════════════════════════════════════════════════════
-- ✅ Listo. Verificar en Table Editor que aparezcan:
--    - team_status (con RLS enabled, publication supabase_realtime)
--    - projects (con 2 rows seed)
--    - agent_runs (con RLS enabled)
-- ════════════════════════════════════════════════════════════════
