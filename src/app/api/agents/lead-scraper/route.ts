import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const SERPAPI_URL = 'https://serpapi.com/search'

// ── City coordinates for Google Maps search ───────────────────────────────────
const CITY_COORDS: Record<string, string> = {
  'córdoba':                  '-31.4201,-64.1888',
  'cordoba':                  '-31.4201,-64.1888',
  'córdoba argentina':        '-31.4201,-64.1888',
  'cordoba argentina':        '-31.4201,-64.1888',
  'buenos aires':             '-34.6037,-58.3816',
  'caba':                     '-34.6037,-58.3816',
  'ciudad de buenos aires':   '-34.6037,-58.3816',
  'rosario':                  '-32.9442,-60.6505',
  'rosario argentina':        '-32.9442,-60.6505',
  'mendoza':                  '-32.8908,-68.8272',
  'mendoza argentina':        '-32.8908,-68.8272',
  'la plata':                 '-34.9215,-57.9545',
  'mar del plata':            '-38.0055,-57.5426',
  'tucumán':                  '-26.8083,-65.2176',
  'tucuman':                  '-26.8083,-65.2176',
  'salta':                    '-24.7821,-65.4232',
  'santa fe':                 '-31.6333,-60.7000',
  'san juan':                 '-31.5375,-68.5364',
  'resistencia':              '-27.4513,-58.9862',
  'neuquén':                  '-38.9516,-68.0591',
  'neuquen':                  '-38.9516,-68.0591',
  'posadas':                  '-27.3661,-55.8961',
  'bahía blanca':             '-38.7196,-62.2724',
  'bahia blanca':             '-38.7196,-62.2724',
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface IcpParsed {
  query:    string
  location: string
}

interface MapsPlace {
  title?:            string
  address?:          string
  phone?:            string
  website?:          string
  rating?:           number
  reviews?:          number
  type?:             string
  place_id?:         string
  gps_coordinates?:  { latitude: number; longitude: number }
}

interface MapsResponse {
  local_results?: MapsPlace[]
  error?:         string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract city name from a full address string */
function extractCity(address: string | undefined): string | null {
  if (!address) return null
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean)
  // "Calle 123, Barrio, Ciudad, Provincia, País" → take second-to-last (Ciudad)
  return parts.length >= 2 ? (parts[parts.length - 2] ?? null) : (parts[0] ?? null)
}

/** Normalize a website URL to its origin+path (strips query string, trailing slash) */
function normalizeWebsite(url: string | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.origin + u.pathname.replace(/\/$/, '')
  } catch {
    return null
  }
}

/**
 * Use Claude Haiku to extract { query, location } from a free-text ICP prompt.
 * Falls back gracefully if the API key is missing or the call fails.
 */
async function parseIcp(icpPrompt: string): Promise<IcpParsed> {
  const apiKey = process.env.ANTHROPIC_API_KEY_AGENTS
  if (!apiKey) {
    console.warn('[lead-scraper] ANTHROPIC_API_KEY_AGENTS not set — using raw prompt as query')
    return { query: icpPrompt, location: '' }
  }

  try {
    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [{
        role:    'user',
        content: `Extrae de este texto de búsqueda B2B: "${icpPrompt}"
Devolvé SOLO JSON (sin markdown ni explicación): {"query":"qué tipo de negocio","location":"ciudad y país"}
Ejemplos:
"inmobiliarias en Córdoba Argentina" → {"query":"inmobiliarias","location":"córdoba argentina"}
"agencias de marketing CABA" → {"query":"agencias de marketing","location":"buenos aires"}
"estudios jurídicos Rosario" → {"query":"estudios jurídicos","location":"rosario argentina"}`,
      }],
    })

    const text = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : ''
    const parsed = JSON.parse(text) as { query?: string; location?: string }
    return {
      query:    parsed.query?.trim()    || icpPrompt,
      location: parsed.location?.trim() || '',
    }
  } catch (err) {
    console.warn('[lead-scraper] ICP parse failed, using raw prompt:', err instanceof Error ? err.message : err)
    return { query: icpPrompt, location: '' }
  }
}

/** Courtesy sleep between paginated SerpAPI requests */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── Route Handler ─────────────────────────────────────────────────────────────
// Vercel Pro: allow up to 60s for paginated scrapes
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Validate body
    const body = await req.json() as { campaignId?: string; count?: number; requireWebsite?: boolean }
    const { campaignId, count: rawCount, requireWebsite = true } = body

    if (!campaignId || typeof campaignId !== 'string') {
      return NextResponse.json({ error: 'campaignId requerido' }, { status: 400 })
    }

    const count = Math.min(Math.max(1, rawCount ?? 20), 100)

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

    // ── Parse ICP prompt with Claude Haiku ─────────────────────────────────
    const { query, location } = await parseIcp(campaign.icp_prompt)
    const coords = location ? (CITY_COORDS[location.toLowerCase()] ?? null) : null

    console.log(`[lead-scraper] campaign=${campaignId} query="${query}" location="${location}" coords=${coords ?? 'none'}`)

    // ── Call SerpAPI Google Maps (paginated: max 20/request, use 'start' param) ──
    const baseQ   = coords ? query : `${query} ${location}`.trim()
    const baseLL  = coords ? `@${coords},14z` : null
    const requestsNeeded = Math.ceil(count / 20)

    console.log(`[lead-scraper] Maps: q="${baseQ}" ll=${baseLL ?? 'none'} count=${count} → ${requestsNeeded} request(s)`)

    const allPlaces: MapsPlace[] = []

    for (let page = 0; page < requestsNeeded; page++) {
      const start = page * 20
      const params = new URLSearchParams({
        engine:  'google_maps',
        q:       baseQ,
        type:    'search',
        api_key: serpApiKey,
        hl:      'es',
        start:   String(start),
      })
      if (baseLL) params.set('ll', baseLL)

      const serpRes = await fetch(`${SERPAPI_URL}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        signal:  AbortSignal.timeout(25_000),
      })

      if (!serpRes.ok) {
        const text = await serpRes.text().catch(() => '')
        console.error(`[lead-scraper] SerpAPI HTTP ${serpRes.status} (page ${page}): ${text.slice(0, 200)}`)
        // If first page fails hard, abort. If subsequent pages fail, use what we have.
        if (page === 0) {
          return NextResponse.json({ error: `Error de SerpAPI: ${serpRes.status}` }, { status: 502 })
        }
        break
      }

      const mapsData = await serpRes.json() as MapsResponse

      if (mapsData.error) {
        console.error(`[lead-scraper] SerpAPI error (page ${page}): ${mapsData.error}`)
        if (page === 0) return NextResponse.json({ error: `SerpAPI: ${mapsData.error}` }, { status: 502 })
        break
      }

      const pagePlaces = mapsData.local_results ?? []
      console.log(`[lead-scraper] Page ${page} (start=${start}): ${pagePlaces.length} places`)

      if (pagePlaces.length === 0) break  // no more results

      allPlaces.push(...pagePlaces)

      // Courtesy sleep between requests (skip after last page)
      if (page < requestsNeeded - 1 && allPlaces.length < count) {
        await sleep(500)
      }
    }

    console.log(`[lead-scraper] Total fetched: ${allPlaces.length} places`)

    if (allPlaces.length === 0) {
      return NextResponse.json({
        inserted: 0, skipped_duplicates: 0, requests: requestsNeeded,
        query, location,
        message: 'Google Maps no devolvió resultados para ese ICP',
      })
    }

    // ── Filter and build lead rows ──────────────────────────────────────────
    const validPlaces = allPlaces.slice(0, count).filter((p) => {
      if (!p.title) return false
      if (requireWebsite) {
        // Strict: only leads with a real website (best for enrichment + personalized outreach)
        if (!p.website) return false
      } else {
        // Loose: at least one contact vector (phone OR website)
        if (!p.website && !p.phone) return false
      }
      return true
    })

    // Fetch existing place_ids and websites for this campaign (for JS-level dedup)
    const { data: existing } = await supabase
      .from('leads')
      .select('place_id, website')
      .eq('campaign_id', campaignId)

    const existingPlaceIds = new Set(existing?.map((r) => r.place_id).filter(Boolean))
    const existingWebsites  = new Set(existing?.map((r) => r.website).filter(Boolean))

    const newRows = validPlaces
      .filter((p) => {
        // Skip if place_id already in campaign
        if (p.place_id && existingPlaceIds.has(p.place_id)) return false
        // Skip if website already in campaign
        const web = normalizeWebsite(p.website)
        if (web && existingWebsites.has(web)) return false
        return true
      })
      .map((p) => ({
        campaign_id: campaignId,
        company:     p.title!,
        industry:    p.type ?? null,
        city:        extractCity(p.address),
        website:     normalizeWebsite(p.website),
        phone:       p.phone ?? null,
        email:       null,
        source:      'google_maps',
        status:      'raw',
        place_id:    p.place_id ?? null,
        raw_data: {
          address:  p.address,
          rating:   p.rating,
          reviews:  p.reviews,
          type:     p.type,
          gps:      p.gps_coordinates,
          place_id: p.place_id,
        },
      }))

    const skipped = allPlaces.slice(0, count).length - newRows.length

    if (newRows.length === 0) {
      return NextResponse.json({ inserted: 0, skipped_duplicates: skipped, query, location })
    }

    // ── Insert ──────────────────────────────────────────────────────────────
    const { data: inserted, error: insertError } = await supabase
      .from('leads')
      .insert(newRows)
      .select('id')

    if (insertError) {
      console.error(`[lead-scraper] Insert error:`, insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const insertedCount = inserted?.length ?? 0
    console.log(`[lead-scraper] Done: ${insertedCount} inserted, ${skipped} skipped`)

    return NextResponse.json({
      inserted:           insertedCount,
      skipped_duplicates: skipped,
      requests:           requestsNeeded,
      query,
      location,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    console.error('[lead-scraper] Unexpected error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
