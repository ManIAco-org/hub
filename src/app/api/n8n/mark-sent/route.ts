/**
 * POST /api/n8n/mark-sent
 *
 * Marca un draft como enviado después de que n8n lo envió vía Evolution/Resend.
 * Body: { draftId: string, externalMessageId?: string }
 *
 * También actualiza campaign_leads.status → 'sent'
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.N8N_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { draftId?: string; externalMessageId?: string }
  const { draftId, externalMessageId } = body
  if (!draftId) return NextResponse.json({ error: 'draftId requerido' }, { status: 400 })

  const supabase = getServiceClient()

  // Get draft info
  const { data: draft, error: draftErr } = await supabase
    .from('drafts').select('id, campaign_id, lead_global_id, status').eq('id', draftId).single()
  if (draftErr || !draft) return NextResponse.json({ error: 'Draft no encontrado' }, { status: 404 })
  if (draft.status === 'sent') return NextResponse.json({ ok: true, alreadySent: true })

  // Mark draft as sent
  await supabase.from('drafts').update({
    status: 'sent',
    ...(externalMessageId ? { edited_diff: `external_id:${externalMessageId}` } : {}),
  }).eq('id', draftId)

  // Update campaign_leads status → sent
  await supabase.from('campaign_leads')
    .update({ status: 'sent' })
    .eq('campaign_id', draft.campaign_id)
    .eq('lead_global_id', draft.lead_global_id)

  return NextResponse.json({ ok: true, draftId, campaignId: draft.campaign_id })
}
