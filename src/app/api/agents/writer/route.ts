import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeDrafts } from '@/lib/agents/writeDrafts'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json() as {
      campaignId?: string
      leadIds?: string[]
      signedByEmail?: string
      max?: number
    }
    const { campaignId, leadIds, signedByEmail = user.email!, max: rawMax = 20 } = body
    if (!campaignId) return NextResponse.json({ error: 'campaignId requerido' }, { status: 400 })

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, icp_prompt, channel')
      .eq('id', campaignId)
      .single()
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    const result = await writeDrafts({
      supabase,
      campaignId,
      icpPrompt:      campaign.icp_prompt,
      channel:        campaign.channel,
      signedByEmail,
      max:            Math.min(Math.max(1, rawMax), 50),
      leadIds,
    })

    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[writer]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
