import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { writeDrafts } from '@/lib/agents/writeDrafts'

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
      leadIds?: string[]
      signedByEmail?: string
      max?: number
    }
    const { campaignId, leadIds, signedByEmail = user.email!, max: rawMax = 50 } = body
    if (!campaignId) return NextResponse.json({ error: 'campaignId requerido' }, { status: 400 })

    const { data: campaign } = await supabase
      .from('campaigns').select('id, icp_prompt, channel').eq('id', campaignId).single()
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    const max = Math.min(Math.max(1, rawMax), 50)

    const { data: job } = await supabase
      .from('agent_jobs')
      .insert({
        type:       'write',
        status:     'queued',
        params:     { campaignId, max, signedByEmail },
        created_by: user.email!,
      })
      .select('id').single()

    const jobId = job?.id ?? null

    after(async () => {
      const svc = getServiceClient()
      try {
        if (jobId) await svc.from('agent_jobs')
          .update({ status: 'running', started_at: new Date().toISOString() }).eq('id', jobId)

        const result = await writeDrafts({
          supabase:     svc,
          campaignId,
          icpPrompt:    campaign.icp_prompt,
          channel:      campaign.channel,
          signedByEmail,
          max,
          leadIds,
        })

        if (jobId) await svc.from('agent_jobs').update({
          status:      'done',
          finished_at: new Date().toISOString(),
          result:      { created: result.created, skipped: result.skipped, failed: result.failed, campaignId },
        }).eq('id', jobId)

        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[writer]', msg)
        if (jobId) await svc.from('agent_jobs').update({
          status:      'failed',
          finished_at: new Date().toISOString(),
          result:      { error: msg.slice(0, 300), campaignId },
        }).eq('id', jobId)
      }
    })

    return NextResponse.json({ job_id: jobId, message: 'Generación de drafts iniciada en background' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[writer]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
