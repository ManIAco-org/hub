/**
 * POST /api/agents/enrich
 * Procesa síncronamente hasta `max` leads (default 30).
 * Retorna { enriched, failed, remaining } para que el cliente haga loop.
 * NO usa after() — procesamiento directo y confiable.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enrichLeads } from '@/lib/agents/enrichLeads'

export const maxDuration = 120  // 30 leads × ~4s = 120s max

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json() as { campaignId?: string; max?: number; leadIds?: string[] }
    const { campaignId, max: rawMax = 30, leadIds } = body
    if (!campaignId) return NextResponse.json({ error: 'campaignId requerido' }, { status: 400 })

    const { data: campaign } = await supabase
      .from('campaigns').select('id, icp_prompt').eq('id', campaignId).single()
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    const max = Math.min(Math.max(1, rawMax), 30)

    const result = await enrichLeads({
      supabase,
      campaignId,
      icpPrompt: campaign.icp_prompt,
      max,
      leadGlobalIds: leadIds,
    })

    // Count remaining raw leads
    const { count: remaining } = await supabase
      .from('campaign_leads')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', 'raw')

    return NextResponse.json({
      enriched:  result.enriched,
      failed:    result.failed,
      total:     result.total,
      remaining: remaining ?? 0,
      errors:    result.errors,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[enrich]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
