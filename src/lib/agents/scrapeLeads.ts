/**
 * Core scraping logic shared by lead-scraper route and campaigns/run background job.
 * Returns inserted lead_global IDs so the enricher can process them immediately.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

const SERPAPI_URL = 'https://serpapi.com/search'

const CITY_COORDS: Record<string, string> = {
  'córdoba':               '-31.4201,-64.1888',
  'cordoba':               '-31.4201,-64.1888',
  'córdoba argentina':     '-31.4201,-64.1888',
  'cordoba argentina':     '-31.4201,-64.1888',
  'buenos aires':          '-34.6037,-58.3816',
  'caba':                  '-34.6037,-58.3816',
  'ciudad de buenos aires':'-34.6037,-58.3816',
  'rosario':               '-32.9442,-60.6505',
  'rosario argentina':     '-32.9442,-60.6505',
  'mendoza':               '-32.8908,-68.8272',
  'mendoza argentina':     '-32.8908,-68.8272',
  'la plata':              '-34.9215,-57.9545',
  'mar del plata':         '-38.0055,-57.5426',
  'tucumán':               '-26.8083,-65.2176',
  'tucuman':               '-26.8083,-65.2176',
  'salta':                 '-24.7821,-65.4232',
  'santa fe':              '-31.6333,-60.7000',
  'san juan':              '-31.5375,-68.5364',
  'resistencia':           '-27.4513,-58.9862',
  'neuquén':               '-38.9516,-68.0591',
  'neuquen':               '-38.9516,-68.0591',
  'posadas':               '-27.3661,-55.8961',
  'bahía blanca':          '-38.7196,-62.2724',
  'bahia blanca':          '-38.7196,-62.2724',
}

interface MapsPlace {
  title?: string; address?: string; phone?: string; website?: string
  rating?: number; reviews?: number; type?: string; place_id?: string
  gps_coordinates?: { latitude: number; longitude: number }
}

interface MapsResponse { local_results?: MapsPlace[]; error?: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function extractCity(address: string | undefined): string | null {
  if (!address) return null
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean)
  return parts.length >= 2 ? (parts[parts.length - 2] ?? null) : (parts[0] ?? null)
}

function normalizeWebsite(url: string | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.origin + u.pathname.replace(/\/$/, '')
  } catch { return null }
}

async function parseIcp(icpPrompt: string): Promise<{ query: string; location: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY_AGENTS
  if (!apiKey) return { query: icpPrompt, location: '' }
  try {
    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 80,
      messages: [{ role: 'user', content: `Extrae de este texto B2B: "${icpPrompt}"\nDevolvé SOLO JSON: {"query":"tipo de negocio","location":"ciudad país"}\nEjemplos:\n"inmobiliarias en Córdoba Argentina" → {"query":"inmobiliarias","location":"córdoba argentina"}\n"agencias marketing CABA" → {"query":"agencias de marketing","location":"buenos aires"}` }],
    })
    const text = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : ''
    const parsed = JSON.parse(text) as { query?: string; location?: string }
    return { query: parsed.query?.trim() || icpPrompt, location: parsed.location?.trim() || '' }
  } catch { return { query: icpPrompt, location: '' } }
}

export interface ScrapeLeadsOptions {
  supabase: SupabaseClient
  campaignId: string
  icpPrompt: string
  count: number
  requireWebsite: boolean
  serpApiKey: string
}

export interface ScrapeLeadsResult {
  inserted: number
  skipped: number
  reusedFromCache: number
  requests: number
  query: string
  location: string
  insertedIds: string[]   // lead_global IDs of newly inserted leads
}

export async function scrapeLeads(opts: ScrapeLeadsOptions): Promise<ScrapeLeadsResult> {
  const { supabase, campaignId, icpPrompt, count, requireWebsite, serpApiKey } = opts

  // 1. Parse ICP
  const { query, location } = await parseIcp(icpPrompt)
  const coords = location ? (CITY_COORDS[location.toLowerCase()] ?? null) : null

  // 2. Check global cache — leads already in leads_global from same city/industry
  //    that aren't yet in this campaign
  const { data: alreadyInCampaign } = await supabase
    .from('campaign_leads')
    .select('lead_global_id')
    .eq('campaign_id', campaignId)
  const inCampaignIds = new Set(alreadyInCampaign?.map((r) => r.lead_global_id) ?? [])

  const cityFilter = location.split(' ')[0] ?? ''
  let reusedFromCache = 0
  const reusedIds: string[] = []

  if (cityFilter.length >= 3) {
    const { data: cached } = await supabase
      .from('leads_global')
      .select('id')
      .ilike('city', `%${cityFilter}%`)
      .not('id', 'in', `(${Array.from(inCampaignIds).join(',') || 'null'})`)
      .limit(count)

    if (cached && cached.length > 0) {
      for (const row of cached) {
        if (reusedIds.length >= count) break
        reusedIds.push(row.id)
      }
      if (reusedIds.length > 0) {
        await supabase.from('campaign_leads').insert(
          reusedIds.map((id) => ({ campaign_id: campaignId, lead_global_id: id, status: 'raw' }))
        )
        reusedFromCache = reusedIds.length
      }
    }
  }

  const remaining = count - reusedFromCache
  if (remaining <= 0) {
    return { inserted: 0, skipped: 0, reusedFromCache, requests: 0, query, location, insertedIds: [] }
  }

  // 3. Call SerpAPI Maps (paginated)
  const baseQ  = coords ? query : `${query} ${location}`.trim()
  const baseLL = coords ? `@${coords},14z` : null
  const requestsNeeded = Math.ceil(remaining / 20)
  const allPlaces: MapsPlace[] = []

  for (let page = 0; page < requestsNeeded; page++) {
    const params = new URLSearchParams({
      engine: 'google_maps', q: baseQ, type: 'search',
      api_key: serpApiKey, hl: 'es', start: String(page * 20),
    })
    if (baseLL) params.set('ll', baseLL)

    const res = await fetch(`${SERPAPI_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(25_000),
    })
    if (!res.ok) { if (page === 0) throw new Error(`SerpAPI HTTP ${res.status}`); break }
    const data = await res.json() as MapsResponse
    if (data.error) { if (page === 0) throw new Error(`SerpAPI: ${data.error}`); break }
    const places = data.local_results ?? []
    if (places.length === 0) break
    allPlaces.push(...places)
    if (page < requestsNeeded - 1 && allPlaces.length < remaining) await sleep(500)
  }

  // 4. Filter places
  const validPlaces = allPlaces.slice(0, remaining).filter((p) => {
    if (!p.title) return false
    return requireWebsite ? !!p.website : !!(p.website || p.phone)
  })

  // 5. Fetch existing dedup keys in leads_global
  const { data: existingGlobal } = await supabase
    .from('leads_global').select('id, place_id, website')
  const existingPlaceIds = new Set(existingGlobal?.map((r) => r.place_id).filter(Boolean))
  const existingWebsites  = new Set(existingGlobal?.map((r) => r.website).filter(Boolean))

  const newRows = validPlaces.filter((p) => {
    if (p.place_id && existingPlaceIds.has(p.place_id)) return false
    const web = normalizeWebsite(p.website)
    if (web && existingWebsites.has(web)) return false
    return true
  }).map((p) => ({
    company: p.title!,
    industry: p.type ?? null,
    city: extractCity(p.address),
    website: normalizeWebsite(p.website),
    phone: p.phone ?? null,
    place_id: p.place_id ?? null,
    raw_data: { address: p.address, rating: p.rating, reviews: p.reviews, type: p.type, gps: p.gps_coordinates, place_id: p.place_id },
  }))

  const skipped = validPlaces.length - newRows.length

  if (newRows.length === 0) {
    return { inserted: 0, skipped, reusedFromCache, requests: requestsNeeded, query, location, insertedIds: [] }
  }

  // 6. Insert into leads_global
  const { data: inserted, error } = await supabase
    .from('leads_global').insert(newRows).select('id')
  if (error) throw new Error(error.message)
  const insertedIds = inserted?.map((r) => r.id) ?? []

  // 7. Link to campaign
  if (insertedIds.length > 0) {
    await supabase.from('campaign_leads').insert(
      insertedIds.map((id) => ({ campaign_id: campaignId, lead_global_id: id, status: 'raw' }))
    )
  }

  return { inserted: insertedIds.length, skipped, reusedFromCache, requests: requestsNeeded, query, location, insertedIds }
}
