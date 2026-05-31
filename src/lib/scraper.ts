import * as cheerio from 'cheerio'

const BOT_UA = 'Mozilla/5.0 (compatible; ManIAcosBot/1.0; +https://hub.maniaco.online)'
const MAX_CONTENT_CHARS = 4000

export interface ScrapeSuccess {
  content: string
}

export interface ScrapeError {
  error: string
}

export type ScrapeResult = ScrapeSuccess | ScrapeError

/**
 * Fetch a website and extract clean text content for Claude enrichment.
 * Never throws — always returns { content } or { error }.
 */
export async function fetchWebsiteContent(
  rawUrl: string,
  timeoutMs = 3000,
): Promise<ScrapeResult> {
  // Normalise URL
  let url: string
  try {
    const u = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`)
    url = u.toString()
  } catch {
    return { error: `URL inválida: ${rawUrl}` }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': BOT_UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-AR,es;q=0.9',
      },
      redirect: 'follow',
    })

    clearTimeout(timer)

    if (!res.ok) {
      return { error: `HTTP ${res.status}` }
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('html')) {
      return { error: `Content-type no HTML: ${contentType.split(';')[0]}` }
    }

    const html = await res.text()
    const $ = cheerio.load(html)

    // Remove noise
    $('script, style, nav, footer, header, aside, iframe, noscript, [aria-hidden="true"]').remove()

    const parts: string[] = []

    // Title
    const title = $('title').first().text().trim()
    if (title) parts.push(`Título: ${title}`)

    // Meta description
    const metaDesc =
      $('meta[name="description"]').attr('content') ??
      $('meta[property="og:description"]').attr('content') ?? ''
    if (metaDesc.trim()) parts.push(`Descripción: ${metaDesc.trim()}`)

    // Headings (h1–h3, max 6 total)
    const headings: string[] = []
    $('h1, h2, h3').each((_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim()
      if (t && headings.length < 6) headings.push(t)
    })
    if (headings.length) parts.push(`Títulos: ${headings.join(' | ')}`)

    // First 3 paragraphs with meaningful content
    const paras: string[] = []
    $('p').each((_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim()
      if (t.length > 40 && paras.length < 3) paras.push(t)
    })
    if (paras.length) parts.push(paras.join('\n'))

    // About / contact page text as fallback
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
    if (parts.length === 0 && bodyText) {
      parts.push(bodyText.slice(0, 1000))
    }

    const content = parts.join('\n').slice(0, MAX_CONTENT_CHARS)

    if (!content.trim()) return { error: 'Página sin contenido legible' }

    return { content }
  } catch (err) {
    clearTimeout(timer)
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('aborted') || msg.includes('timeout')) {
      return { error: `Timeout (${timeoutMs}ms)` }
    }
    if (msg.includes('CERT') || msg.includes('certificate') || msg.includes('SSL')) {
      return { error: `SSL inválido` }
    }
    return { error: msg.slice(0, 120) }
  }
}
