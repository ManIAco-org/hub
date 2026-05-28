-- Migration: multi-notes system
-- Replaces single notes_md field with a relational notes table.
-- Each note belongs to either a client OR a project (exclusive).

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content_md text NOT NULL DEFAULT '',
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (
    (client_id IS NOT NULL AND project_id IS NULL) OR
    (client_id IS NULL AND project_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS notes_client_id_idx ON notes(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notes_project_id_idx ON notes(project_id) WHERE project_id IS NOT NULL;

-- Migrate existing project notes_md → notes table
INSERT INTO notes (title, content_md, project_id, created_by)
SELECT 'General', notes_md, id, owner_email
FROM projects
WHERE notes_md IS NOT NULL AND trim(notes_md) <> '';

-- Migrate existing client notes_md → notes table
INSERT INTO notes (title, content_md, client_id, created_by)
SELECT 'General', notes_md, id, 'franco.sanmartin@maniaco.online'
FROM clients
WHERE notes_md IS NOT NULL AND trim(notes_md) <> '';

-- RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON notes
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION trg_notes_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notes_updated_at ON notes;
CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION trg_notes_updated_at();
