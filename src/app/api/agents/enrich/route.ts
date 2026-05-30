import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { fetchWebsiteContent } from '@/lib/scraper'
import type { EnrichedData } from '@/lib/types'

// Vercel Pro: allow long enrichment batches
export const maxDuration = 60

interface EnrichResult {
  contact_name: string | null
  linkedin: string | null
  bio: string
  fit_score: number
  fit_reason: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Call Claude Haiku to enrich a single lead */
async function enrichLead(
  client: Anthropic,
  lead: {
    company: string
    industry: string | null
    city: string | null
    phone: string | null
    raw_data: Record<string, unknown> | null
  },
  websiteContent: string,
  icpPrompt: string,
): Promise<EnrichResult> {
  const address  = (lead.raw_data?.address  as string | undefined) ?? '—'
  const rating   = (lead.raw_data?.rating   as number | undefined) ?? null
  const reviews  = (lead.raw_data?.reviews  as number | undefined) ?? 0

  const userPrompt = `Empresa: ${lead.company}
Industria Maps: ${lead.industry ?? 'desconocida'}
Ciudad: ${lead.city ?? '—'}
Teléfono: ${lead.phone ?? '—'}
Dirección: ${address}
Rating: ${rating !== null ? `${rating} (${reviews} reviews)` : '—'}

Contenido del website:
${websiteContent || 'Sin website accesible'}

ICP buscado por el equipo: ${icpPrompt}

Devolvé EXACTAMENTE este JSON sin markdown ni texto extra:
{
  "contact_name": "Nombre del contacto principal o null",
  "linkedin": "URL LinkedIn de la empresa o null",
  "bio": "Descripción breve en 1 línea máx 120 chars",
  "fit_score": 7,
  "fit_reason": "max 80 chars explicando el score"
}

Criterios fit_score:
- 9-10: ICP exacto + datos de contacto completos + web profesional + rating 4+
- 6-8: Coincide con ICP, faltan algunos datos de contacto
- 3-5: Parcialmente relevante o información muy limitada
- 0-2: No coincide con el ICP o información insuficiente`

  const msg = await client.messages.create({
    model:  'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: 'Sos agente enriquecedor B2B. Devolvés SOLO JSON válido sin markdown ni texto extra.',
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : ''

  // Strip markdown code fences if model adds them despite the system prompt
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = JSON.parse(cleaned) as Partial<EnrichResult>

  return {
    contact_name: parsed.contact_name ?? null,
    linkedin:     typeof parsed.linkedin === 'string' && parsed.linkedin.startsWith('http')
      ? parsed.linkedin : null,
    bio:          (parsed.bio ?? '').slice(0, 120),
    fit_score:    Math.min(10, Math.max(0, Math.round(Number(parsed.fit_score ?? 0)))),
    fit_reason:   (parsed.fit_reason ?? '').slice(0, 80),
  }
}

// ── Route Handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Body
    const body = await req.json() as {
      campaignId?: string
      max?: number
      leadIds?: string[]
    }
    const { campaignId, max: rawMax = 20, leadIds } = body

    if (!campaignId || typeof campaignId !== 'string') {
      return NextResponse.json({ error: 'campaignId requerido' }, { status: 400 })
    }

    const max = Math.min(Math.max(1, rawMax), 50)

    // Fetch campaign for icp_prompt
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, icp_prompt')
      .eq('id', campaignId)
      .single()

    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    // Fetch leads to enrich
    let leadsQuery = supabase
      .from('leads')
      .select('id, company, industry, city, phone, website, raw_data')
      .eq('campaign_id', campaignId)

    if (leadIds && leadIds.length > 0) {
      leadsQuery = leadsQuery.in('id', leadIds)
    } else {
      leadsQuery = leadsQuery.eq('status', 'raw').limit(max)
    }

    const { data: leads, error: leadsError } = await leadsQuery

    if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 })
    if (!leads || leads.length === 0) {
      return NextResponse.json({ enriched: 0, failed: 0, message: 'Sin leads raw para enriquecer' })
    }

    // Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY_AGENTS
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY_AGENTS no configurada' }, { status: 500 })

    const anthropic = new Anthropic({ apiKey })

    let enrichedCount = 0
    let failedCount   = 0
    const errors: string[] = []

    for (const lead of leads) {
      try {
        // 1. Scrape website (if available)
        let websiteContent = ''
        if (lead.website) {
          const scrapeResult = await fetchWebsiteContent(lead.website)
          if ('content' in scrapeResult) {
            websiteContent = scrapeResult.content
          } else {
            console.log(`[enrich] scrape failed for ${lead.website}: ${scrapeResult.error}`)
          }
        }

        // 2. Call Claude Haiku
        const result = await enrichLead(
          anthropic,
          {
            company:  lead.company,
            industry: lead.industry,
            city:     lead.city,
            phone:    lead.phone,
            raw_data: lead.raw_data as Record<string, unknown> | null,
          },
          websiteContent,
          campaign.icp_prompt,
        )

        // 3. Build enriched_data object
        const enrichedData: EnrichedData = {
          contact_name: result.contact_name,
          linkedin:     result.linkedin,
          bio:          result.bio,
          fit_score:    result.fit_score,
          fit_reason:   result.fit_reason,
        }

        // 4. Update lead
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            enriched_data:    enrichedData,
            fit_score:        result.fit_score,
            status:           'enriched',
            enriched_at:      new Date().toISOString(),
            enrichment_error: null,
          })
          .eq('id', lead.id)

        if (updateError) throw new Error(updateError.message)

        enrichedCount++
        console.log(`[enrich] ✓ ${lead.company} → score=${result.fit_score}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        failedCount++
        errors.push(`${lead.company}: ${msg.slice(0, 80)}`)
        console.error(`[enrich] ✗ ${lead.company}: ${msg}`)

        // Save error without changing status
        await supabase
          .from('leads')
          .update({ enrichment_error: msg.slice(0, 200) })
          .eq('id', lead.id)
      }

      // 200ms courtesy sleep — stays well under 5 req/s with Haiku
      if (leads.indexOf(lead) < leads.length - 1) {
        await sleep(200)
      }
    }

    return NextResponse.json({
      enriched: enrichedCount,
      failed:   failedCount,
      total:    leads.length,
      errors:   errors.slice(0, 5),   // first 5 errors for diagnostics
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[enrich] Unexpected error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
