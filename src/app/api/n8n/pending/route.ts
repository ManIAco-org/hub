/**
 * GET /api/n8n/pending?campaignId=X
 *
 * Devuelve drafts aprobados listos para enviar.
 * Autenticación: header X-Api-Key con el valor de N8N_API_KEY (env var).
 *
 * Uso en n8n: HTTP Request node → GET hub.maniaco.online/api/n8n/pending
 * Headers: X-Api-Key: {{$env.N8N_API_KEY}}
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

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.N8N_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get('campaignId')

  const supabase = getServiceClient()
  let query = supabase
    .from('drafts')
    .select(`
      id, body, subject, channel, signed_by_email, campaign_id, lead_global_id,
      approved_by, approved_at,
      leads_global ( id, company, phone, email, city, website )
    `)
    .eq('status', 'approved')
    .order('approved_at', { ascending: true })
    .limit(50)

  if (campaignId) query = query.eq('campaign_id', campaignId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    drafts: (data ?? []).map((d) => {
      const lead = d.leads_global as unknown as Record<string, unknown> | null
      return {
        draftId:       d.id,
        channel:       d.channel,
        body:          d.body,
        subject:       d.subject,
        signedBy:      (d.signed_by_email as string).split('@')[0]?.split('.')[0] ?? 'Franco',
        campaignId:    d.campaign_id,
        leadId:        d.lead_global_id,
        lead: {
          company: lead?.company,
          phone:   lead?.phone,
          email:   lead?.email,
          city:    lead?.city,
          website: lead?.website,
        },
      }
    }),
    total: (data ?? []).length,
  })
}
