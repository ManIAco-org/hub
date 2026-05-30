import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enrichLeads } from '@/lib/agents/enrichLeads'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json() as { campaignId?: string; max?: number; leadIds?: string[] }
    const { campaignId, max: rawMax = 20, leadIds } = body
    if (!campaignId) return NextResponse.json({ error: 'campaignId requerido' }, { status: 400 })

    const { data: campaign } = await supabase.from('campaigns').select('id, icp_prompt').eq('id', campaignId).single()
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    const result = await enrichLeads({
      supabase,
      campaignId,
      icpPrompt: campaign.icp_prompt,
      max: Math.min(Math.max(1, rawMax), 50),
      leadGlobalIds: leadIds,
    })

    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[enrich]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
