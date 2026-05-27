-- ────────────────────────────────────────────────────────────
-- Migration: projects
-- Hub ManIAcos Sprint 1 — Panel 2 Projects Dashboard
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
  server_path   text NULL,  -- /srv/maniacos/<slug> on Oracle ARM (null = terminal disabled)
  owner_email   text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Any authenticated member can read all projects
CREATE POLICY "projects_read_all" ON public.projects
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Any authenticated member can insert projects (team collaboration)
CREATE POLICY "projects_insert_any" ON public.projects
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Any authenticated member can update projects (team collaboration)
CREATE POLICY "projects_update_any" ON public.projects
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ── Seed data — bootstrap projects for Sprint 1 testing ─────
-- (Remove this block once the UI has a "New Project" form)
INSERT INTO public.projects (name, client_name, description, status, server_path, owner_email)
VALUES
  ('RC Repuestos', 'RC Repuestos', 'Automatización procesos internos y web', 'active', '/srv/maniacos/rc-repuestos', 'franco.sanmartin@maniaco.online'),
  ('Landing ManIAcos', 'ManIAcos', 'Sitio web público de la consultora', 'active', '/srv/maniacos/landing', 'franco.sanmartin@maniaco.online')
ON CONFLICT DO NOTHING;
