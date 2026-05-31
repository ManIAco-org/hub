-- Writer Agent: tabla drafts para borradores HITL
CREATE TABLE IF NOT EXISTS public.drafts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_global_id   uuid NOT NULL REFERENCES public.leads_global(id) ON DELETE CASCADE,
  campaign_id      uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  channel          text NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  body             text NOT NULL,
  subject          text,
  language         text NOT NULL DEFAULT 'es',
  signed_by_email  text NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected', 'sent', 'expired')),
  approved_by      text,
  approved_at      timestamptz,
  rejection_reason text,
  edited_diff      text,
  draft_hash       text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drafts_lead_idx     ON public.drafts(lead_global_id);
CREATE INDEX IF NOT EXISTS drafts_campaign_idx ON public.drafts(campaign_id);
CREATE INDEX IF NOT EXISTS drafts_status_idx   ON public.drafts(status);
CREATE UNIQUE INDEX IF NOT EXISTS drafts_hash_active_idx
  ON public.drafts(draft_hash)
  WHERE status NOT IN ('rejected', 'expired');

ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drafts_auth_full" ON public.drafts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
