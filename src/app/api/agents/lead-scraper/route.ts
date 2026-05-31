import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scrapeLeads, radiusToZoom } from '@/lib/agents/scrapeLeads'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json() as { campaignId?: string; radiusKm?: number }
    const { campaignId, radiusKm = 5 } = body
    if (!campaignId) return NextResponse.json({ error: 'campaignId requerido' }, { status: 400 })

    const { data: campaign } = await supabase.from('campaigns').select('id, icp_prompt').eq('id', campaignId).single()
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    const serpApiKey = process.env.SERPAPI_KEY
    if (!serpApiKey) return NextResponse.json({ error: 'SERPAPI_KEY no configurada' }, { status: 500 })

    const result = await scrapeLeads({
      supabase,
      campaignId,
      icpPrompt:  campaign.icp_prompt,
      radiusZoom: radiusToZoom(Math.max(1, Math.min(50, radiusKm))),
      serpApiKey,
    })

    return NextResponse.json({
      inserted:        result.inserted,
      skipped:         result.skipped,
      reusedFromCache: result.reusedFromCache,
      requests:        result.requests,
      queries:         result.queries,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[lead-scraper]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
