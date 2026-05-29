-- T040 Lead Scraper — leads table
CREATE TABLE leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  company     text NOT NULL,
  industry    text,
  city        text,
  website     text,
  phone       text,
  email       text,
  source      text DEFAULT 'serpapi',
  raw_data    jsonb,
  status      text DEFAULT 'raw' CHECK (status IN ('raw', 'enriched', 'approved', 'sent', 'replied', 'closed', 'rejected')),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (campaign_id, website)
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full" ON leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX leads_campaign_idx ON leads(campaign_id);
CREATE INDEX leads_status_idx ON leads(status);
