import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { scrapeLeads } from '@/lib/agents/scrapeLeads'
import { enrichLeads } from '@/lib/agents/enrichLeads'

export const maxDuration = 60

/** Service-role client for background job — runs after response is sent */
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
      count?: number
      requireWebsite?: boolean
      autoEnrich?: boolean
    }
    const { campaignId, count = 20, requireWebsite = true, autoEnrich = true } = body
    if (!campaignId) return NextResponse.json({ error: 'campaignId requerido' }, { status: 400 })

    const { data: campaign } = await supabase
      .from('campaigns').select('id, icp_prompt').eq('id', campaignId).single()
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    const serpApiKey = process.env.SERPAPI_KEY
    if (!serpApiKey) return NextResponse.json({ error: 'SERPAPI_KEY no configurada' }, { status: 500 })

    // Insert job record
    const { data: job, error: jobError } = await supabase
      .from('agent_jobs')
      .insert({
        type:       autoEnrich ? 'scrape_enrich' : 'scrape',
        status:     'queued',
        params:     { campaignId, count, requireWebsite, autoEnrich },
        created_by: user.email!,
      })
      .select('id')
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Error creando job' }, { status: 500 })
    }

    const jobId = job.id

    // Fire-and-forget: continues after response is sent
    after(async () => {
      const svc = getServiceClient()
      try {
        await svc.from('agent_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', jobId)

        // Scrape
        const scrapeResult = await scrapeLeads({
          supabase: svc,
          campaignId,
          icpPrompt: campaign.icp_prompt,
          count: Math.min(Math.max(1, count), 100),
          requireWebsite,
          serpApiKey,
        })

        let enrichResult = { enriched: 0, failed: 0, total: 0 }

        // Enrich newly scraped leads (if autoEnrich)
        if (autoEnrich && scrapeResult.insertedIds.length > 0) {
          enrichResult = await enrichLeads({
            supabase: svc,
            campaignId,
            icpPrompt: campaign.icp_prompt,
            max: Math.min(scrapeResult.insertedIds.length, 30),
            leadGlobalIds: scrapeResult.insertedIds,
          })
        }

        await svc.from('agent_jobs').update({
          status:      'done',
          finished_at: new Date().toISOString(),
          result: {
            scraped:    scrapeResult.inserted,
            reused:     scrapeResult.reusedFromCache,
            enriched:   enrichResult.enriched,
            failed_enrich: enrichResult.failed,
            query:      scrapeResult.query,
            location:   scrapeResult.location,
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

    return NextResponse.json({ job_id: jobId, message: 'Job iniciado en background' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[campaigns/run]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
