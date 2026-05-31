import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { scrapeLeads, radiusToZoom } from '@/lib/agents/scrapeLeads'

export const maxDuration = 60

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

    const body = await req.json() as {
      campaignId?: string
      radiusKm?: number
    }
    const { campaignId, radiusKm = 5 } = body
    if (!campaignId) return NextResponse.json({ error: 'campaignId requerido' }, { status: 400 })

    const { data: campaign } = await supabase
      .from('campaigns').select('id, icp_prompt').eq('id', campaignId).single()
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    const serpApiKey = process.env.SERPAPI_KEY
    if (!serpApiKey) return NextResponse.json({ error: 'SERPAPI_KEY no configurada' }, { status: 500 })

    const radiusZoom = radiusToZoom(Math.max(1, Math.min(50, radiusKm)))

    const { data: job, error: jobError } = await supabase
      .from('agent_jobs')
      .insert({
        type:       'scrape',
        status:     'queued',
        params:     { campaignId, radiusKm, radiusZoom },
        created_by: user.email!,
      })
      .select('id').single()

    if (jobError || !job) return NextResponse.json({ error: 'Error creando job' }, { status: 500 })

    const jobId = job.id

    after(async () => {
      const svc = getServiceClient()
      try {
        await svc.from('agent_jobs')
          .update({ status: 'running', started_at: new Date().toISOString() })
          .eq('id', jobId)

        const result = await scrapeLeads({
          supabase:   svc,
          campaignId,
          icpPrompt:  campaign.icp_prompt,
          radiusZoom,
          maxResults: 500,
          serpApiKey,
        })

        await svc.from('agent_jobs').update({
          status:      'done',
          finished_at: new Date().toISOString(),
          result: {
            inserted:        result.inserted,
            reusedFromCache: result.reusedFromCache,
            skipped:         result.skipped,
            requests:        result.requests,
            queries:         result.queries,
            campaignId,
          },
        }).eq('id', jobId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[campaigns/run] job ${jobId} failed:`, msg)
        await svc.from('agent_jobs').update({
          status:      'failed',
          finished_at: new Date().toISOString(),
          result:      { error: msg.slice(0, 300), campaignId },
        }).eq('id', jobId)
      }
    })

    return NextResponse.json({ job_id: jobId, message: 'Búsqueda iniciada en background' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[campaigns/run]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
