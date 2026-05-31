import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import type { CampaignChannel, EnrichedData } from '@/lib/types'

const PRICING_REGEX = /precio|costo|tarifa|inversi[oó]n|\$|USD|ARS|honorario|cobr/i

function containsPricing(text: string): boolean {
  return PRICING_REGEX.test(text)
}

function signerNameFromEmail(email: string): string {
  const prefix = email.split('@')[0]?.split('.')[0] ?? 'Franco'
  return prefix.charAt(0).toUpperCase() + prefix.slice(1)
}

interface LeadRow {
  id: string
  company: string
  city: string | null
  website: string | null
  enriched_data: Record<string, unknown> | null
  fit_score: number | null
}

export interface WriteDraftsOptions {
  supabase: SupabaseClient
  campaignId: string
  icpPrompt: string
  channel: CampaignChannel
  signedByEmail: string
  max?: number
  leadIds?: string[]
}

export interface WriteDraftsResult {
  created: number
  skipped: number
  failed: number
  errors: string[]
}

async function generateDraft(
  client: Anthropic,
  signerName: string,
  lead: LeadRow,
  effectiveChannel: 'whatsapp' | 'email',
  icpPrompt: string
): Promise<string> {
  const enriched = lead.enriched_data as EnrichedData | null
  const isWA = effectiveChannel === 'whatsapp'

  const systemPrompt = `Sos ${signerName}, co-fundador de ManIAcos — consultora argentina que implementa soluciones digitales para PyMEs: bots de WhatsApp para atención y captación, sistemas de turnos automáticos, landings que convierten, CRMs con seguimiento automático, paneles de métricas, e-commerce, entre otros.

Tu trabajo es escribir un mensaje de prospección B2B que logre que la persona quiera tener una llamada de 15 minutos. Cada mensaje debe:
1. Arrancar con una observación genuina y específica del negocio (algo que notaste en su web, sus reseñas, su actividad).
2. Nombrar UNA solución concreta que probablemente les falte o les sirva — elegí la más obvia para su rubro (ejemplos: inmobiliaria → bot WA para captar leads de portales o Maps; taller → agenda online con recordatorio automático; restaurante → sistema de reservas sin teléfono; agencia → panel de clientes o automatización de reportes; comercio → chat de ventas o catálogo digital; salud → recordatorios de turno automáticos).
3. Mencionar brevemente un resultado real o esperable con negocios similares (sin números inventados, algo creíble).
4. Terminar con un CTA suave de 15 minutos.
5. Firmar: ${signerName}

REGLAS ABSOLUTAS — violación = draft descartado:
- Cero precios, costos, tarifas, inversión, montos o cifras económicas.
- Cero mención de IA, bot, automatización, software o tecnología explícita en el mensaje.
- El tono es de colega emprendedor, no de vendedor.
- Idioma: español rioplatense informal, voseo.`

  const lines: string[] = [`Empresa: ${lead.company}${lead.city ? ` (${lead.city})` : ''}`]
  if (enriched?.bio)        lines.push(`Perfil: ${enriched.bio}`)
  if (lead.website)         lines.push(`Web: ${lead.website.replace(/^https?:\/\//, '')}`)
  if (enriched?.fit_reason) lines.push(`Análisis: ${enriched.fit_reason}`)
  lines.push(`Nuestro ICP: ${icpPrompt}`)
  lines.push('')

  if (isWA) {
    lines.push('Redactá un mensaje de WhatsApp. MÁXIMO 280 caracteres incluyendo firma. Directo y sin emojis de relleno.')
  } else {
    lines.push('Redactá un email. Primera línea: "Asunto: <asunto breve>". Luego el cuerpo en 3-4 oraciones.')
  }
  lines.push('Devolvé SOLO el texto del mensaje, sin comillas ni explicaciones adicionales.')

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: isWA ? 400 : 700,
    system: [{ type: 'text' as const, text: systemPrompt, cache_control: { type: 'ephemeral' as const } }],
    messages: [{ role: 'user' as const, content: lines.join('\n') }],
  })

  return msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : ''
}

export async function writeDrafts(opts: WriteDraftsOptions): Promise<WriteDraftsResult> {
  const { supabase, campaignId, icpPrompt, channel, signedByEmail, max = 20, leadIds } = opts

  const apiKey = process.env.ANTHROPIC_API_KEY_AGENTS
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY_AGENTS no configurada')

  const client = new Anthropic({ apiKey })
  const signerName = signerNameFromEmail(signedByEmail)
  const effectiveChannel: 'whatsapp' | 'email' = channel === 'email' ? 'email' : 'whatsapp'

  // Step 1: get enriched lead IDs for this campaign
  let clQuery = supabase
    .from('campaign_leads')
    .select('lead_global_id')
    .eq('campaign_id', campaignId)
    .eq('status', 'enriched')
    .limit(max)

  if (leadIds && leadIds.length > 0) {
    clQuery = clQuery.in('lead_global_id', leadIds)
  }

  const { data: clRows } = await clQuery
  const ids = clRows?.map((r) => r.lead_global_id) ?? []
  if (ids.length === 0) return { created: 0, skipped: 0, failed: 0, errors: [] }

  // Step 2: get global leads with fit_score >= 5
  const { data: leads } = await supabase
    .from('leads_global')
    .select('id, company, city, website, enriched_data, fit_score')
    .in('id', ids)
    .gte('fit_score', 5)

  if (!leads || leads.length === 0) return { created: 0, skipped: 0, failed: 0, errors: [] }

  let created = 0, skipped = 0, failed = 0
  const errors: string[] = []

  for (const lead of leads as LeadRow[]) {
    try {
      // Dedup: skip if active draft already exists
      const { data: existing } = await supabase
        .from('drafts')
        .select('id')
        .eq('lead_global_id', lead.id)
        .eq('campaign_id', campaignId)
        .in('status', ['pending', 'approved', 'sent'])
        .maybeSingle()

      if (existing) {
        skipped++
        continue
      }

      // Generate
      let body = await generateDraft(client, signerName, lead, effectiveChannel, icpPrompt)

      // Auto-regenerate once if pricing slipped through
      if (containsPricing(body)) {
        body = await generateDraft(client, signerName, lead, effectiveChannel, icpPrompt)
        if (containsPricing(body)) {
          failed++
          errors.push(`${lead.company}: pricing detectado tras regenerar`)
          continue
        }
      }

      // Enforce WA char limit (hard cap)
      if (effectiveChannel === 'whatsapp' && body.length > 300) {
        body = body.slice(0, 297) + '...'
      }

      const draftHash = createHash('sha256').update(`${lead.id}${body}`).digest('hex')

      const { error: insertErr } = await supabase.from('drafts').insert({
        lead_global_id:  lead.id,
        campaign_id:     campaignId,
        channel:         effectiveChannel,
        body,
        language:        'es',
        signed_by_email: signedByEmail,
        draft_hash:      draftHash,
        status:          'pending',
      })

      if (insertErr) {
        // Unique constraint violation = hash collision → already exists, count as skipped
        if (insertErr.code === '23505') {
          skipped++
        } else {
          throw insertErr
        }
      } else {
        created++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      failed++
      errors.push(`${lead.company}: ${msg.slice(0, 80)}`)
    }
  }

  return { created, skipped, failed, errors: errors.slice(0, 5) }
}
