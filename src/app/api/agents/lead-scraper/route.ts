import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SERPAPI_URL = 'https://serpapi.com/search'

interface SerpApiResult {
  organic_results?: Array<{
    title?: string
    link?: string
    displayed_link?: string
    snippet?: string
    place_results?: {
      title?: string
      phone?: string
      address?: string
    }
  }>
  local_results?: {
    places?: Array<{
      title?: string
      phone?: string
      website?: string
      address?: string
    }>
  }
  error?: string
}

interface ParsedLead {
  company: string
  website: string | null
  phone: string | null
  city: string | null
  industry: string | null
}

/** Extract city from various address formats */
function extractCity(address: string | undefined): string | null {
  if (!address) return null
  // Try to get the first meaningful part before a comma
  const parts = address.split(',').map((s) => s.trim())
  // Return second-to-last part (usually city before country)
  return parts[parts.length - 2] ?? parts[0] ?? null
}

/** Sanitize and normalize a website URL */
function normalizeWebsite(url: string | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.origin + u.pathname.replace(/\/$/, '')
  } catch {
    return null
  }
}

/** Parse SerpAPI response into our Lead shape */
function parseResults(data: SerpApiResult, count: number): ParsedLead[] {
  const leads: ParsedLead[] = []

  // Local (Google Maps) results first — richer data
  if (data.local_results?.places) {
    for (const place of data.local_results.places.slice(0, count)) {
      if (!place.title) continue
      leads.push({
        company:  place.title,
        website:  normalizeWebsite(place.website),
        phone:    place.phone ?? null,
        city:     extractCity(place.address),
        industry: null,
      })
    }
  }

  // Organic results to supplement
  if (data.organic_results && leads.length < count) {
    for (const result of data.organic_results.slice(0, count - leads.length)) {
      if (!result.title) continue
      // Skip results that are clearly not business listings
      const url = result.link ?? ''
      if (
        url.includes('google.com') ||
        url.includes('facebook.com') ||
        url.includes('linkedin.com') ||
        url.includes('youtube.com') ||
        url.includes('wikipedia.org')
      ) continue

      leads.push({
        company:  result.place_results?.title ?? result.title,
        website:  normalizeWebsite(url),
        phone:    result.place_results?.phone ?? null,
        city:     null,
        industry: null,
      })
    }
  }

  return leads.slice(0, count)
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Validate body
    const body = await req.json() as { campaignId?: string; count?: number }
    const { campaignId, count: rawCount } = body

    if (!campaignId || typeof campaignId !== 'string') {
      return NextResponse.json({ error: 'campaignId requerido' }, { status: 400 })
    }

    const count = Math.min(Math.max(1, rawCount ?? 20), 50)

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, icp_prompt')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    }

    const serpApiKey = process.env.SERPAPI_KEY
    if (!serpApiKey) {
      return NextResponse.json({ error: 'SERPAPI_KEY no configurada en el servidor' }, { status: 500 })
    }

    // Call SerpAPI — request more results than needed to account for filtering
    const params = new URLSearchParams({
      q:       campaign.icp_prompt,
      api_key: serpApiKey,
      num:     String(Math.min(count * 2, 100)),   // fetch double, filter down
      hl:      'es',
      gl:      'ar',                               // Argentina results by default
      engine:  'google',
    })

    console.log(`[lead-scraper] Fetching SerpAPI for campaign ${campaignId}: "${campaign.icp_prompt}"`)
    const serpRes = await fetch(`${SERPAPI_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(25_000),
    })

    if (!serpRes.ok) {
      const text = await serpRes.text().catch(() => '')
      console.error(`[lead-scraper] SerpAPI HTTP ${serpRes.status}: ${text}`)
      return NextResponse.json({ error: `Error de SerpAPI: ${serpRes.status}` }, { status: 502 })
    }

    const serpData = await serpRes.json() as SerpApiResult

    if (serpData.error) {
      console.error(`[lead-scraper] SerpAPI error: ${serpData.error}`)
      return NextResponse.json({ error: `SerpAPI: ${serpData.error}` }, { status: 502 })
    }

    const parsed = parseResults(serpData, count)

    if (parsed.length === 0) {
      return NextResponse.json({ inserted: 0, skipped_duplicates: 0, message: 'Sin resultados para ese ICP' })
    }

    // Build rows — store individual result snippet in raw_data (not the full 500KB response)
    const rows = parsed.map((lead) => ({
      campaign_id: campaignId,
      company:     lead.company,
      website:     lead.website,
      phone:       lead.phone,
      city:        lead.city,
      industry:    lead.industry,
      source:      'serpapi',
      status:      'raw',
      raw_data:    { company: lead.company, website: lead.website, phone: lead.phone, city: lead.city },
    }))

    // Upsert with ignoreDuplicates=true → ON CONFLICT (campaign_id, website) DO NOTHING
    const { data: upserted, error: insertError } = await supabase
      .from('leads')
      .upsert(rows, { onConflict: 'campaign_id,website', ignoreDuplicates: true })
      .select('id')

    if (insertError) {
      console.error(`[lead-scraper] Insert error:`, insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const insertedCount = upserted?.length ?? 0
    const skipped = rows.length - insertedCount

    console.log(`[lead-scraper] Done: ${insertedCount} inserted, ${skipped} skipped duplicates`)

    return NextResponse.json({
      inserted:           insertedCount,
      skipped_duplicates: skipped,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[lead-scraper] Unexpected error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
