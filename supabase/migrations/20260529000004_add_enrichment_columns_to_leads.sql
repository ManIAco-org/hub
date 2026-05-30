-- T041 Enrichment Agent — add enrichment columns to leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS enriched_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS fit_score int2 CHECK (fit_score IS NULL OR (fit_score BETWEEN 0 AND 10)),
  ADD COLUMN IF NOT EXISTS enrichment_error text,
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz;

CREATE INDEX IF NOT EXISTS leads_fit_score_idx ON leads(fit_score)
  WHERE fit_score IS NOT NULL;
