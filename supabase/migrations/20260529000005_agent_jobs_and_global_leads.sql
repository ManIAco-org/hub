-- Marketing: agent_jobs + campaigns.category + leads_global + campaign_leads

CREATE TABLE agent_jobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL,
  status      text DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  params      jsonb NOT NULL DEFAULT '{}',
  result      jsonb,
  started_at  timestamptz,
  finished_at timestamptz,
  created_by  text NOT NULL,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX agent_jobs_status_idx ON agent_jobs(status, created_at DESC);
ALTER TABLE agent_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full" ON agent_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS category text DEFAULT 'Otras';

CREATE TABLE leads_global (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id          text UNIQUE,
  website           text,
  company           text NOT NULL,
  phone             text,
  email             text,
  industry          text,
  city              text,
  raw_data          jsonb,
  enriched_data     jsonb DEFAULT '{}'::jsonb,
  fit_score         int2 CHECK (fit_score IS NULL OR (fit_score BETWEEN 0 AND 10)),
  enrichment_error  text,
  enriched_at       timestamptz,
  first_seen_at     timestamptz DEFAULT now(),
  last_updated_at   timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX leads_global_website_idx ON leads_global(website) WHERE website IS NOT NULL;
ALTER TABLE leads_global ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full" ON leads_global FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE campaign_leads (
  campaign_id    uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_global_id uuid REFERENCES leads_global(id) ON DELETE CASCADE,
  status         text DEFAULT 'raw' CHECK (status IN ('raw','enriched','approved','sent','replied','closed','rejected')),
  added_at       timestamptz DEFAULT now(),
  PRIMARY KEY (campaign_id, lead_global_id)
);
CREATE INDEX campaign_leads_campaign_idx ON campaign_leads(campaign_id);
CREATE INDEX campaign_leads_status_idx   ON campaign_leads(status);
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full" ON campaign_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
