-- ────────────────────────────────────────────────────────────
-- Migration: team_status
-- Hub ManIAcos Sprint 1 — Panel 1 Team Status
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

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_status_updated_at
  BEFORE UPDATE ON public.team_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.team_status ENABLE ROW LEVEL SECURITY;

-- Any authenticated member can read all rows (Panel 1 shows everyone)
CREATE POLICY "team_status_read_all" ON public.team_status
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- A member can only update their own row
CREATE POLICY "team_status_update_own" ON public.team_status
  FOR UPDATE
  USING ((auth.jwt() ->> 'email') = member_email);

-- A member can only insert their own row (first login upsert)
CREATE POLICY "team_status_insert_own" ON public.team_status
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'email') = member_email);

-- ── Realtime ──────────────────────────────────────────────────
-- Enable Realtime on team_status so Panel 1 updates without polling
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_status;
