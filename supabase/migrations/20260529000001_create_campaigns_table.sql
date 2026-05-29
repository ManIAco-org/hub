-- T040 Lead Scraper — campaigns table
CREATE TABLE campaigns (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  icp_prompt  text NOT NULL,
  channel     text CHECK (channel IN ('whatsapp', 'email', 'both')),
  owner_email text NOT NULL,
  status      text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full" ON campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
