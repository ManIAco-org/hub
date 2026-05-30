-- Migrate existing leads → leads_global + campaign_leads, then drop leads

INSERT INTO leads_global (
  id, place_id, website, company, phone, email, industry, city,
  raw_data, enriched_data, fit_score, enrichment_error, enriched_at,
  first_seen_at, last_updated_at
)
SELECT DISTINCT ON (COALESCE(place_id, website, id::text))
  id, place_id, website, company, phone, email, industry, city,
  raw_data, COALESCE(enriched_data, '{}'::jsonb),
  fit_score, enrichment_error, enriched_at,
  created_at, created_at
FROM leads
ORDER BY COALESCE(place_id, website, id::text), created_at DESC
ON CONFLICT DO NOTHING;

INSERT INTO campaign_leads (campaign_id, lead_global_id, status, added_at)
SELECT l.campaign_id, lg.id, l.status, l.created_at
FROM leads l
JOIN leads_global lg ON lg.id = l.id
ON CONFLICT DO NOTHING;

INSERT INTO campaign_leads (campaign_id, lead_global_id, status, added_at)
SELECT l.campaign_id, lg.id, l.status, l.created_at
FROM leads l
JOIN leads_global lg ON (
  (l.place_id IS NOT NULL AND lg.place_id = l.place_id) OR
  (l.place_id IS NULL AND l.website IS NOT NULL AND lg.website = l.website)
)
WHERE l.id NOT IN (SELECT id FROM leads_global)
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS leads CASCADE;
