import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { enrichLeads } from '@/lib/agents/enrichLeads'

export const maxDuration = 300

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json() as { campaignId?: string; max?: number; leadIds?: string[] }
    const { campaignId, max: rawMax = 50, leadIds } = body
    if (!campaignId) return NextResponse.json({ error: 'campaignId requerido' }, { status: 400 })

    const { data: campaign } = await supabase
      .from('campaigns').select('id, icp_prompt').eq('id', campaignId).single()
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    const max = Math.min(Math.max(1, rawMax), 100)

    const { data: job } = await supabase
      .from('agent_jobs')
      .insert({
        type:       'enrich',
        status:     'queued',
        params:     { campaignId, max },
        created_by: user.email!,
      })
      .select('id').single()

    const jobId = job?.id ?? null

    after(async () => {
      const svc = getServiceClient()
      try {
        if (jobId) await svc.from('agent_jobs')
          .update({ status: 'running', started_at: new Date().toISOString() }).eq('id', jobId)

        const result = await enrichLeads({
          supabase:      svc,
          campaignId,
          icpPrompt:     campaign.icp_prompt,
          max,
          leadGlobalIds: leadIds,
        })

        if (jobId) await svc.from('agent_jobs').update({
          status:      'done',
          finished_at: new Date().toISOString(),
          result:      { enriched: result.enriched, failed: result.failed, total: result.total, campaignId },
        }).eq('id', jobId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[enrich]', msg)
        if (jobId) await svc.from('agent_jobs').update({
          status:      'failed',
          finished_at: new Date().toISOString(),
          result:      { error: msg.slice(0, 300), campaignId },
        }).eq('id', jobId)
      }
    })

    return NextResponse.json({ job_id: jobId, message: 'Enriquecimiento iniciado en background' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[enrich]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
