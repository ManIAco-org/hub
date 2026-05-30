import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scrapeLeads } from '@/lib/agents/scrapeLeads'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json() as { campaignId?: string; count?: number; requireWebsite?: boolean }
    const { campaignId, count: rawCount, requireWebsite = true } = body
    if (!campaignId) return NextResponse.json({ error: 'campaignId requerido' }, { status: 400 })

    const { data: campaign } = await supabase.from('campaigns').select('id, icp_prompt').eq('id', campaignId).single()
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    const serpApiKey = process.env.SERPAPI_KEY
    if (!serpApiKey) return NextResponse.json({ error: 'SERPAPI_KEY no configurada' }, { status: 500 })

    const result = await scrapeLeads({
      supabase,
      campaignId,
      icpPrompt: campaign.icp_prompt,
      count: Math.min(Math.max(1, rawCount ?? 20), 100),
      requireWebsite,
      serpApiKey,
    })

    return NextResponse.json({
      inserted:           result.inserted,
      skipped_duplicates: result.skipped,
      reused_from_cache:  result.reusedFromCache,
      requests:           result.requests,
      query:              result.query,
      location:           result.location,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[lead-scraper]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
