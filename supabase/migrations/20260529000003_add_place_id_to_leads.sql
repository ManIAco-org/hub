-- T040 — Google Maps engine: add place_id for dedup, update unique indexes
ALTER TABLE leads ADD COLUMN IF NOT EXISTS place_id text;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_campaign_id_website_key;

CREATE UNIQUE INDEX IF NOT EXISTS leads_campaign_place_idx
  ON leads (campaign_id, place_id)
  WHERE place_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS leads_campaign_website_idx
  ON leads (campaign_id, website)
  WHERE website IS NOT NULL;
