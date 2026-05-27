-- ────────────────────────────────────────────────────────────────────────────
-- Migration: clients_schema
-- Hub ManIAcos Sprint 1.5 — T022 Refactor nav + schema
--
-- APPLY MANUALLY via Supabase Dashboard → SQL Editor
-- URL: https://supabase.com/dashboard/project/teyqamjfsfewusqjcfcy/sql
-- ────────────────────────────────────────────────────────────────────────────

-- ── 1. Clients table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  name         text NOT NULL,
  description  text NULL,
  contact_info jsonb NULL DEFAULT '{}'::jsonb,  -- { name, email, phone, role }
  notes_md     text NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_read_all" ON public.clients
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "clients_insert_any" ON public.clients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "clients_update_any" ON public.clients
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ── 2. Add columns to projects ────────────────────────────────────────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes_md  text NULL DEFAULT '';

-- ── 3. MCP config per project ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_mcp_config (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  mcp_name    text NOT NULL,                   -- e.g. "supabase", "vercel", "github"
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, mcp_name)
);

CREATE TRIGGER project_mcp_config_updated_at
  BEFORE UPDATE ON public.project_mcp_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.project_mcp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mcp_config_read_all" ON public.project_mcp_config
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "mcp_config_write_any" ON public.project_mcp_config
  FOR ALL USING (auth.role() = 'authenticated');

-- ── 4. Seed client rows from existing projects.client_name ───────────────────
-- Run after the tables exist to backfill clients from projects data.
-- Adjust slugs if they conflict.
INSERT INTO public.clients (slug, name)
SELECT DISTINCT
  lower(regexp_replace(
    translate(client_name,
      'áéíóúüñÁÉÍÓÚÜÑ',
      'aeiouunAEIOUUN'),
    '[^a-zA-Z0-9]+', '-', 'g')),
  client_name
FROM public.projects
ON CONFLICT (slug) DO NOTHING;

-- Update project.client_id from the newly created clients
UPDATE public.projects p
SET client_id = c.id
FROM public.clients c
WHERE lower(regexp_replace(
    translate(p.client_name,
      'áéíóúüñÁÉÍÓÚÜÑ',
      'aeiouunAEIOUUN'),
    '[^a-zA-Z0-9]+', '-', 'g')) = c.slug;
