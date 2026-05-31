/**
 * Core enrichment logic shared by enrich route and campaigns/run background job.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchWebsiteContent } from '@/lib/scraper'
import type { EnrichedData } from '@/lib/types'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface LeadRow {
  id: string
  company: string
  industry: string | null
  city: string | null
  phone: string | null
  website: string | null
  raw_data: Record<string, unknown> | null
  enriched_at: string | null
}

export interface EnrichLeadsOptions {
  supabase: SupabaseClient
  campaignId: string
  icpPrompt: string
  max: number
  leadGlobalIds?: string[]   // specific IDs; if omitted, fetch raw leads of campaign
}

export interface EnrichLeadsResult {
  enriched: number
  failed: number
  total: number
  errors: string[]
}

async function callHaiku(client: Anthropic, lead: LeadRow, websiteContent: string, icpPrompt: string): Promise<EnrichedData> {
  const raw     = lead.raw_data ?? {}
  const address = (raw.address  as string | undefined) ?? '—'
  const rating  = raw.rating  !== undefined ? String(raw.rating)  : '—'
  const reviews = raw.reviews !== undefined ? String(raw.reviews) : '0'

  const prompt = `Empresa: ${lead.company}
Industria Maps: ${lead.industry ?? 'desconocida'}
Ciudad: ${lead.city ?? '—'}
Teléfono: ${lead.phone ?? '—'}
Dirección: ${address}
Rating: ${rating} (${reviews} reseñas)

Contenido del website:
${websiteContent || 'Sin website accesible'}

ICP buscado: ${icpPrompt}

Devolvé EXACTAMENTE este JSON sin markdown:
{"contact_name":null,"linkedin":null,"bio":"descripción max 120 chars","fit_score":7,"fit_reason":"razón detallada max 200 chars — explicá qué tiene y qué falta del ICP"}

Criterios fit_score: 9-10=ICP exacto+web profesional+datos completos, 6-8=coincide ICP datos limitados, 3-5=parcialmente relevante, 0-2=no coincide`

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: 'Sos agente enriquecedor B2B. Devolvés SOLO JSON válido sin markdown ni texto extra.',
    messages: [{ role: 'user', content: prompt }],
  })

  const text    = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : ''
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed  = JSON.parse(cleaned) as Partial<EnrichedData & { fit_score: number; fit_reason: string }>

  return {
    contact_name: parsed.contact_name ?? null,
    linkedin:     typeof parsed.linkedin === 'string' && parsed.linkedin.startsWith('http') ? parsed.linkedin : null,
    bio:          (parsed.bio ?? '').slice(0, 120),
    fit_score:    Math.min(10, Math.max(0, Math.round(Number(parsed.fit_score ?? 0)))),
    fit_reason:   (parsed.fit_reason ?? '').slice(0, 200),
  }
}

export async function enrichLeads(opts: EnrichLeadsOptions): Promise<EnrichLeadsResult> {
  const { supabase, campaignId, icpPrompt, max, leadGlobalIds } = opts

  const apiKey = process.env.ANTHROPIC_API_KEY_AGENTS
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY_AGENTS no configurada')

  const client = new Anthropic({ apiKey })

  // Fetch leads to enrich
  let leadsQuery = supabase
    .from('leads_global')
    .select('id, company, industry, city, phone, website, raw_data, enriched_at')

  if (leadGlobalIds && leadGlobalIds.length > 0) {
    leadsQuery = leadsQuery.in('id', leadGlobalIds)
  } else {
    // Get lead_global_ids where campaign_leads.status = 'raw' for this campaign
    const { data: clRows } = await supabase
      .from('campaign_leads')
      .select('lead_global_id')
      .eq('campaign_id', campaignId)
      .eq('status', 'raw')
      .limit(max)

    const ids = clRows?.map((r) => r.lead_global_id) ?? []
    if (ids.length === 0) return { enriched: 0, failed: 0, total: 0, errors: [] }
    leadsQuery = leadsQuery.in('id', ids)
  }

  const { data: leads } = await leadsQuery
  if (!leads || leads.length === 0) return { enriched: 0, failed: 0, total: 0, errors: [] }

  let enriched = 0, failed = 0
  const errors: string[] = []

  for (const lead of leads as LeadRow[]) {
    try {
      // Skip already enriched global leads — update campaign_leads status for free
      if (lead.enriched_at) {
        const existingData = await supabase
          .from('leads_global').select('enriched_data, fit_score, enriched_at').eq('id', lead.id).single()
        if (existingData.data?.enriched_at) {
          await supabase.from('campaign_leads')
            .update({ status: 'enriched' })
            .eq('campaign_id', campaignId).eq('lead_global_id', lead.id)
          enriched++
          continue
        }
      }

      // Scrape website
      let websiteContent = ''
      if (lead.website) {
        const scraped = await fetchWebsiteContent(lead.website)
        if ('content' in scraped) websiteContent = scraped.content
      }

      // Call Claude Haiku
      const result = await callHaiku(client, lead, websiteContent, icpPrompt)

      // Update leads_global
      await supabase.from('leads_global').update({
        enriched_data:    result,
        fit_score:        result.fit_score as number,
        enriched_at:      new Date().toISOString(),
        last_updated_at:  new Date().toISOString(),
        enrichment_error: null,
      }).eq('id', lead.id)

      // Update campaign_leads status
      await supabase.from('campaign_leads')
        .update({ status: 'enriched' })
        .eq('campaign_id', campaignId).eq('lead_global_id', lead.id)

      enriched++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      failed++
      errors.push(`${lead.company}: ${msg.slice(0, 80)}`)
      await supabase.from('leads_global')
        .update({ enrichment_error: msg.slice(0, 200) })
        .eq('id', lead.id)
    }

    if (leads.indexOf(lead) < leads.length - 1) await sleep(200)
  }

  return { enriched, failed, total: leads.length, errors: errors.slice(0, 5) }
}
