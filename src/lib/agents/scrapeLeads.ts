/**
 * Core scraping logic.
 * ICP natural language → multiple query variants → exhaustive SerpAPI pagination.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

const SERPAPI_URL = 'https://serpapi.com/search'

// Pre-mapped city coordinates — SerpAPI `ll` parameter format
const CITY_COORDS: Record<string, string> = {
  'córdoba':                '-31.4201,-64.1888',
  'cordoba':                '-31.4201,-64.1888',
  'córdoba capital':        '-31.4201,-64.1888',
  'cordoba capital':        '-31.4201,-64.1888',
  'córdoba argentina':      '-31.4201,-64.1888',
  'cordoba argentina':      '-31.4201,-64.1888',
  'buenos aires':           '-34.6037,-58.3816',
  'caba':                   '-34.6037,-58.3816',
  'ciudad de buenos aires': '-34.6037,-58.3816',
  'rosario':                '-32.9442,-60.6505',
  'rosario argentina':      '-32.9442,-60.6505',
  'mendoza':                '-32.8908,-68.8272',
  'la plata':               '-34.9215,-57.9545',
  'mar del plata':          '-38.0055,-57.5426',
  'tucumán':                '-26.8083,-65.2176',
  'tucuman':                '-26.8083,-65.2176',
  'salta':                  '-24.7821,-65.4232',
  'santa fe':               '-31.6333,-60.7000',
  'neuquén':                '-38.9516,-68.0591',
  'neuquen':                '-38.9516,-68.0591',
  'bahía blanca':           '-38.7196,-62.2724',
  'bahia blanca':           '-38.7196,-62.2724',
}

// Radius km → SerpAPI zoom level (higher zoom = smaller area = more precise)
export function radiusToZoom(km: number): number {
  if (km <= 2)  return 15
  if (km <= 5)  return 14
  if (km <= 10) return 13
  if (km <= 20) return 12
  return 11
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

interface SearchQuery { query: string; location: string; coords: string | null }

/**
 * ICP natural language → 2-3 Google Maps search query variants.
 * Returns immediately with a fallback if Claude is unavailable.
 */
async function generateSearchQueries(icpPrompt: string, apiKey: string): Promise<SearchQuery[]> {
  try {
    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 350,
      messages: [{
        role: 'user',
        content: `ICP del usuario: "${icpPrompt}"

Generá exactamente 3 variantes de búsqueda para Google Maps Argentina para ese ICP.
Cada variante debe usar diferentes términos o focos (ej: una por nombre del rubro, una por actividad, una más específica).
Devolvé SOLO un JSON array sin markdown:
[
  {"query":"término búsqueda 1","location":"ciudad argentina"},
  {"query":"término búsqueda 2","location":"ciudad argentina"},
  {"query":"término búsqueda 3","location":"ciudad argentina"}
]

Reglas:
- "location" debe ser solo ciudad + "argentina" (ej: "córdoba argentina", "buenos aires argentina")
- Si no hay ciudad clara en el ICP, usá "córdoba argentina" como default
- "query" debe ser el tipo de negocio en español, máximo 4 palabras
- Variá el enfoque: rubro genérico, nombre alternativo, segmento específico

Ejemplo para "inmobiliarias chicas en córdoba dentro de la circunvalación":
[
  {"query":"inmobiliaria barrios córdoba","location":"córdoba argentina"},
  {"query":"agencia inmobiliaria pequeña córdoba","location":"córdoba argentina"},
  {"query":"real estate local córdoba capital","location":"córdoba argentina"}
]`,
      }],
    })
    const text = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : '[]'
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(cleaned) as Array<{ query?: string; location?: string }>
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('bad response')
    return parsed.slice(0, 3).map((q) => {
      const loc = q.location?.trim().toLowerCase() ?? ''
      return {
        query:    q.query?.trim() || icpPrompt,
        location: loc,
        coords:   CITY_COORDS[loc] ?? null,
      }
    })
  } catch {
    // Fallback: parse manually
    const lower = icpPrompt.toLowerCase()
    let loc = 'córdoba argentina'
    for (const city of Object.keys(CITY_COORDS)) {
      if (lower.includes(city)) { loc = city; break }
    }
    const business = icpPrompt.replace(/en .*/i, '').trim().slice(0, 40)
    return [
      { query: business,                        location: loc, coords: CITY_COORDS[loc] ?? null },
      { query: `${business} local`,             location: loc, coords: CITY_COORDS[loc] ?? null },
      { query: `${business} pequeño`,           location: loc, coords: CITY_COORDS[loc] ?? null },
    ]
  }
}

export interface ScrapeLeadsOptions {
  supabase: SupabaseClient
  campaignId: string
  icpPrompt: string
  radiusZoom?: number    // SerpAPI zoom level (11-15). Default 14 (~2-5km)
  maxResults?: number    // Hard cap on total results. Default 300
  serpApiKey: string
}

export interface ScrapeLeadsResult {
  inserted: number
  skipped: number
  reusedFromCache: number
  requests: number
  queries: string[]
  insertedIds: string[]
}

export async function scrapeLeads(opts: ScrapeLeadsOptions): Promise<ScrapeLeadsResult> {
  const {
    supabase, campaignId, icpPrompt, serpApiKey,
    radiusZoom = 14,
    maxResults = 300,
  } = opts

  const apiKey = process.env.ANTHROPIC_API_KEY_AGENTS ?? ''

  // ── 1. Generate search query variants ────────────────────────────────────────
  const queries = await generateSearchQueries(icpPrompt, apiKey)

  // ── 2. Fetch existing dedup keys ──────────────────────────────────────────────
  const { data: existingGlobal } = await supabase.from('leads_global').select('id, place_id, website')
  const existingPlaceIds = new Set(existingGlobal?.map((r) => r.place_id).filter(Boolean) ?? [])
  const existingWebsites  = new Set(existingGlobal?.map((r) => r.website).filter(Boolean) ?? [])

  // ── 3. Call SerpAPI for each query variant, exhaustive pagination ─────────────
  const seenPlaceIds = new Set<string>()
  const allValidPlaces: MapsPlace[] = []
  let totalRequests = 0

  for (const sq of queries) {
    if (allValidPlaces.length >= maxResults) break
    const ll = sq.coords ? `@${sq.coords},${radiusZoom}z` : null
    const baseQ = sq.coords ? sq.query : `${sq.query} ${sq.location}`.trim()

    for (let page = 0; page < 6; page++) {  // max 6 pages × 20 = 120 per query
      if (allValidPlaces.length >= maxResults) break
      const params = new URLSearchParams({
        engine: 'google_maps', q: baseQ, type: 'search',
        api_key: serpApiKey, hl: 'es', start: String(page * 20),
      })
      if (ll) params.set('ll', ll)

      try {
        const res = await fetch(`${SERPAPI_URL}?${params.toString()}`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(20_000),
        })
        if (!res.ok) break
        const data = await res.json() as MapsResponse
        if (data.error || !data.local_results?.length) break

        totalRequests++
        const places = data.local_results
        let foundNew = false

        for (const p of places) {
          if (!p.title) continue
          if (allValidPlaces.length >= maxResults) break
          // Cross-query dedup by place_id
          const pid = p.place_id ?? `${p.title}-${p.address}`
          if (seenPlaceIds.has(pid)) continue
          seenPlaceIds.add(pid)
          // Filter: must have website or phone
          if (!p.website && !p.phone) continue
          allValidPlaces.push(p)
          foundNew = true
        }

        // If no new results in this page, stop paginating this query
        if (!foundNew) break
        if (page < 5) await sleep(300)
      } catch {
        break
      }
    }
    if (queries.indexOf(sq) < queries.length - 1) await sleep(500)
  }

  // ── 4. Further filter: already in leads_global → skip ────────────────────────
  const newPlaces = allValidPlaces.filter((p) => {
    if (p.place_id && existingPlaceIds.has(p.place_id)) return false
    const web = normalizeWebsite(p.website)
    if (web && existingWebsites.has(web)) return false
    return true
  })

  // ── 5. Insert one by one to avoid batch constraint failures ──────────────────
  const insertedIds: string[] = []
  let skipped = allValidPlaces.length - newPlaces.length

  for (const p of newPlaces) {
    const row = {
      company:  p.title!,
      industry: p.type ?? null,
      city:     extractCity(p.address),
      website:  normalizeWebsite(p.website),
      phone:    p.phone ?? null,
      place_id: p.place_id ?? null,
      raw_data: { address: p.address, rating: p.rating, reviews: p.reviews, type: p.type, gps: p.gps_coordinates, place_id: p.place_id },
    }
    const { data, error } = await supabase
      .from('leads_global').insert(row).select('id').maybeSingle()
    if (!error && data?.id) {
      insertedIds.push(data.id)
    } else {
      skipped++  // unique constraint or other error → skip
    }
  }

  // ── 6. Link new leads to campaign ────────────────────────────────────────────
  if (insertedIds.length > 0) {
    await supabase.from('campaign_leads').insert(
      insertedIds.map((id) => ({ campaign_id: campaignId, lead_global_id: id, status: 'raw' }))
    )
  }

  return {
    inserted:        insertedIds.length,
    skipped,
    reusedFromCache: 0,
    requests:        totalRequests,
    queries:         queries.map((q) => q.query),
    insertedIds,
  }
}
