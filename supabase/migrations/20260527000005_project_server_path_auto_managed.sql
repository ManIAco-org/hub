-- Migration: auto-manage server_path on projects
-- Rule: server_path is SYSTEM-MANAGED. Never set manually from the Hub frontend.
-- On INSERT: auto-generate from client_name slug if null.
-- On UPDATE: prevent Hub from overwriting a previously set path.

-- Helper: generate safe slug from a string
CREATE OR REPLACE FUNCTION slugify(text_input text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  result text;
BEGIN
  result := lower(text_input);
  result := regexp_replace(result, '[^a-z0-9\s\-]', '', 'g');
  result := regexp_replace(result, '\s+', '-', 'g');
  result := trim(both '-' from result);
  RETURN result;
END;
$$;

-- Trigger function
CREATE OR REPLACE FUNCTION trg_project_server_path_fn()
RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_slug text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.server_path IS NULL THEN
      IF NEW.client_name IS NOT NULL AND trim(NEW.client_name) <> '' THEN
        v_slug := slugify(NEW.client_name);
      ELSE
        v_slug := slugify(NEW.name);
      END IF;
      IF v_slug <> '' THEN
        NEW.server_path := '/srv/maniacos/' || v_slug;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.server_path IS NOT NULL AND (NEW.server_path IS NULL OR NEW.server_path <> OLD.server_path) THEN
      NEW.server_path := OLD.server_path;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_server_path ON projects;

CREATE TRIGGER trg_project_server_path
  BEFORE INSERT OR UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION trg_project_server_path_fn();

COMMENT ON FUNCTION trg_project_server_path_fn() IS
  'Auto-generates server_path = /srv/maniacos/<slug> on INSERT (if null). '
  'Guards against Hub overwriting a system-managed path on UPDATE.';
