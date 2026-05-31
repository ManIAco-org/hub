'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart3, Users, Search, Globe, Phone, Mail,
  ExternalLink, RefreshCw, X, Loader2, MapPin, Star, PenLine, Zap, CheckSquare,
} from 'lucide-react'
import type { Campaign, CampaignLeadFull, LeadGlobal, LeadStatus, EnrichedData, DraftStatus } from '@/lib/types'
import { DraftApprovalQueue } from '@/components/panels/DraftApprovalQueue'

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<LeadStatus, string> = {
  raw:      '#525866',
  enriched: '#06B6D4',
  approved: '#A3E635',
  sent:     '#A3E635',
  replied:  '#22C55E',
  closed:   '#525866',
  rejected: '#EF4444',
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  raw:      'Sin procesar',
  enriched: 'Enriquecido',
  approved: 'Aprobado',
  sent:     'Enviado',
  replied:  'Respondió',
  closed:   'Cerrado',
  rejected: 'Rechazado',
}

// ── Fit Score Badge ───────────────────────────────────────────────────────────
function FitScoreBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) return (
    <span style={{ fontSize: '10px', color: '#525866', background: '#52586618', border: '1px solid #52586630', borderRadius: '6px', padding: '2px 7px', whiteSpace: 'nowrap', fontWeight: 500 }}>
      Pendiente
    </span>
  )
  const [color, bg] =
    score >= 8 ? ['#22C55E', '#22C55E20'] :
    score >= 5 ? ['#EAB308', '#EAB30820'] :
                 ['#EF4444', '#EF444420']
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, color, background: bg, border: `1px solid ${color}40`, borderRadius: '6px', padding: '2px 8px', whiteSpace: 'nowrap' }}>
      {score}/10
    </span>
  )
}

// ── Lead Drawer ───────────────────────────────────────────────────────────────
interface DraftRow { body: string; status: string; signed_by_email: string; channel: string; created_at: string }

function LeadDrawer({ lead, status, campaignId, onClose }: {
  lead: LeadGlobal; status: LeadStatus; campaignId: string; onClose: () => void
}) {
  const supabase = createClient()
  const enriched = lead.enriched_data as EnrichedData | null
  const raw = lead.raw_data as Record<string, unknown> | null
  const [draft, setDraft] = useState<DraftRow | null>(null)

  useEffect(() => {
    supabase
      .from('drafts')
      .select('body, status, signed_by_email, channel, created_at')
      .eq('lead_global_id', lead.id)
      .eq('campaign_id', campaignId)
      .in('status', ['pending', 'approved', 'sent'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setDraft(data as DraftRow | null))
  }, [lead.id, campaignId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201, width: '380px', maxWidth: '90vw', background: 'var(--s1)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto', boxShadow: '-8px 0 32px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--s1)', zIndex: 1 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-md)', marginBottom: '6px', wordBreak: 'break-word' }}>{lead.company}</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 600, color: STATUS_COLORS[status], background: `${STATUS_COLORS[status]}18`, border: `1px solid ${STATUS_COLORS[status]}40`, borderRadius: '6px', padding: '2px 8px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: STATUS_COLORS[status] }} />
                {STATUS_LABELS[status]}
              </span>
              <FitScoreBadge score={lead.fit_score} />
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: '4px', marginLeft: '8px' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t1)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Contact card */}
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Datos de contacto</p>
            {lead.website && (
              <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--acc)', fontSize: 'var(--text-xs)', textDecoration: 'none', wordBreak: 'break-all' }}>
                <Globe size={12} />{lead.website.replace(/^https?:\/\//, '')}<ExternalLink size={10} style={{ flexShrink: 0 }} />
              </a>
            )}
            {lead.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--t2)', fontSize: 'var(--text-xs)' }}>
                <Phone size={12} color="var(--t3)" />{lead.phone}
              </div>
            )}
            {lead.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--t2)', fontSize: 'var(--text-xs)' }}>
                <Mail size={12} color="var(--t3)" />{lead.email}
              </div>
            )}
            {(lead.city || (raw?.address as string)) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: 'var(--t3)', fontSize: 'var(--text-xs)' }}>
                <MapPin size={12} style={{ marginTop: '1px', flexShrink: 0 }} />
                {(raw?.address as string) || lead.city}
              </div>
            )}
            {raw?.rating !== undefined && raw.rating !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--t3)', fontSize: 'var(--text-xs)' }}>
                <Star size={12} />{String(raw.rating)} ★ ({String(raw.reviews ?? 0)} reseñas)
              </div>
            )}
          </div>

          {/* Enrichment data */}
          {enriched && status === 'enriched' && (
            <div style={{ background: 'var(--acc-d)', border: '1px solid var(--acc-b)', borderRadius: 'var(--r8)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--acc)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Enriquecimiento</p>
              {enriched.bio && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t1)', lineHeight: 1.5 }}>{enriched.bio}</p>}
              {enriched.contact_name && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)' }}>
                  <span style={{ color: 'var(--t3)', marginRight: '4px' }}>Contacto:</span>{enriched.contact_name}
                </div>
              )}
              {enriched.linkedin && (
                <a href={enriched.linkedin} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0A66C2', fontSize: 'var(--text-xs)', textDecoration: 'none' }}>
                  <ExternalLink size={11} />LinkedIn
                </a>
              )}
              {enriched.fit_reason && (
                <div style={{ borderTop: '1px solid var(--acc-b)', paddingTop: '8px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '2px' }}>Razón del score</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)', lineHeight: 1.4 }}>{enriched.fit_reason}</p>
                </div>
              )}
              {lead.enriched_at && (
                <p style={{ fontSize: '10px', color: 'var(--t3)' }}>
                  Enriquecido {new Date(lead.enriched_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          )}

          {lead.enrichment_error && (
            <div style={{ background: '#EF444410', border: '1px solid #EF444430', borderRadius: 'var(--r8)', padding: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#EF4444', marginBottom: '4px' }}>Error en enriquecimiento</p>
              <p style={{ fontSize: '11px', color: 'var(--t3)', fontFamily: 'var(--mono)', wordBreak: 'break-word' }}>{lead.enrichment_error}</p>
            </div>
          )}

          {/* Draft generado */}
          {draft && (
            <div style={{ background: '#22C55E08', border: '1px solid #22C55E30', borderRadius: 'var(--r8)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Draft {draft.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                </p>
                <span style={{
                  fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '6px',
                  background: draft.status === 'approved' ? '#22C55E20' : draft.status === 'sent' ? '#A3E63520' : '#EAB30820',
                  color: draft.status === 'approved' ? '#22C55E' : draft.status === 'sent' ? '#A3E635' : '#EAB308',
                  border: `1px solid ${draft.status === 'approved' ? '#22C55E40' : draft.status === 'sent' ? '#A3E63540' : '#EAB30840'}`,
                }}>
                  {draft.status === 'approved' ? 'Aprobado' : draft.status === 'sent' ? 'Enviado' : 'Pendiente'}
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t1)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{draft.body}</p>
              <p style={{ fontSize: '10px', color: 'var(--t3)' }}>
                Firmado por {draft.signed_by_email.split('@')[0]?.split('.')[0]?.replace(/^\w/, c => c.toUpperCase()) ?? '—'} · {new Date(draft.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Nueva Búsqueda Modal (scrape + enrich integrado) ──────────────────────────
function SearchModal({ campaign, onClose, onStarted }: { campaign: Campaign; onClose: () => void; onStarted?: () => void }) {
  const [radiusKm, setRadiusKm] = useState(5)

  const RADIUS_OPTIONS = [
    { km: 2,  label: '2 km — muy céntrico',      est: '30-80 resultados' },
    { km: 5,  label: '5 km — barrios cercanos',   est: '80-200 resultados' },
    { km: 10, label: '10 km — toda la ciudad',    est: '150-400 resultados' },
    { km: 20, label: '20 km — área metropolitana', est: '300-500+ resultados' },
  ]

  function handleStart() {
    onClose()
    onStarted?.()
    toast.loading('Buscando leads en background...', { id: 'search-bg' })
    fetch('/api/agents/campaigns/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: campaign.id, radiusKm }),
    })
      .then(r => r.json())
      .then((json: { job_id?: string; error?: string }) => {
        if (json.error) toast.error(json.error, { id: 'search-bg' })
        else toast.success('Búsqueda corriendo en background — te avisamos cuando termine', { id: 'search-bg', duration: 5000 })
      })
      .catch(() => toast.error('Error de red al buscar leads', { id: 'search-bg' }))
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 'var(--r12)', padding: '24px', width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search size={18} color="var(--acc)" />
            <h3 style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-md)' }}>Nueva búsqueda de leads</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', padding: '4px' }}><X size={16} /></button>
        </div>

        {/* ICP preview */}
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '12px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>ICP — búsqueda en lenguaje natural</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t2)', fontStyle: 'italic' }}>&ldquo;{campaign.icp_prompt}&rdquo;</p>
          <p style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '6px' }}>Claude genera 3 variantes de búsqueda automáticamente.</p>
        </div>

        {/* Radius */}
        <div>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '6px' }}>Radio de búsqueda</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {RADIUS_OPTIONS.map((opt) => (
              <label key={opt.km} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px 10px', borderRadius: 'var(--r6)', background: radiusKm === opt.km ? 'var(--acc-d)' : 'var(--s2)', border: `1px solid ${radiusKm === opt.km ? 'var(--acc-b)' : 'var(--border)'}`, transition: 'all 100ms' }}>
                <input type="radio" name="radius" checked={radiusKm === opt.km} onChange={() => setRadiusKm(opt.km)}
                  style={{ accentColor: 'var(--acc)' }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t1)' }}>{opt.label}</span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--t3)', fontFamily: 'var(--mono)' }}>{opt.est}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Info */}
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '10px 12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '10px', color: 'var(--t3)' }}>Costo estimado</p>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--t1)' }}>~$0.03–0.15</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', color: 'var(--t3)' }}>Tiempo estimado</p>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--t2)' }}>1–3 min</p>
          </div>
          <div style={{ flex: 1, fontSize: '11px', color: 'var(--t3)', lineHeight: 1.4 }}>
            Trae todos los resultados del área. Leads ya contactados en los últimos 30 días se saltean automáticamente.
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn-secondary" style={{ fontSize: 'var(--text-sm)' }}>Cancelar</button>
          <button onClick={handleStart} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', minWidth: '130px', justifyContent: 'center' }}>
            <Search size={14} />Iniciar búsqueda
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Writer Modal ──────────────────────────────────────────────────────────────
function WriterModal({ campaign, eligibleCount, currentUserEmail, onClose, onStarted }: {
  campaign: Campaign
  eligibleCount: number
  currentUserEmail: string
  onClose: () => void
  onStarted?: () => void
}) {
  const [signedByEmail, setSignedByEmail] = useState(currentUserEmail)
  const [maxDrafts, setMaxDrafts] = useState(Math.min(eligibleCount, 50))

  const SIGNERS = [
    { email: 'franco.sanmartin@maniaco.online', name: 'Franco' },
    { email: 'luis.giannasi@maniaco.online',    name: 'Lucho' },
    { email: 'noelia.bottallo@maniaco.online',  name: 'Noe' },
  ]

  const actualMax = Math.min(maxDrafts, eligibleCount)
  const estimatedCost = (actualMax * 0.004).toFixed(3)

  async function handleGenerate() {
    const id    = campaign.id
    const email = signedByEmail
    onClose()
    onStarted?.()
    toast.loading(`Generando drafts... 0/${eligibleCount}`, { id: 'writer-bg' })

    let totalCreated = 0
    let remaining    = eligibleCount
    const maxRounds  = Math.ceil(eligibleCount / 25) + 2  // safety limit

    for (let round = 0; round < maxRounds && remaining > 0; round++) {
      try {
        const res = await fetch('/api/agents/writer', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: id, signedByEmail: email, max: 25 }),
        })
        const json = await res.json() as { created?: number; skipped?: number; failed?: number; remaining?: number; error?: string }
        if (json.error) { toast.error(json.error, { id: 'writer-bg' }); return }
        totalCreated += json.created ?? 0
        remaining    = json.remaining ?? 0
        if ((json.created ?? 0) === 0) break  // sin progreso
        toast.loading(`Generando... ${totalCreated}/${eligibleCount}`, { id: 'writer-bg' })
      } catch {
        toast.error('Error de red al generar drafts', { id: 'writer-bg' }); return
      }
    }

    const msg = totalCreated > 0
      ? `✓ ${totalCreated} draft${totalCreated !== 1 ? 's' : ''} generados — revisalos en Aprobación`
      : 'Sin cambios — todos los leads elegibles ya tienen draft'
    toast.success(msg, { id: 'writer-bg', duration: 6000 })
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 'var(--r12)', padding: '24px', width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PenLine size={18} color="var(--acc)" />
            <h3 style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-md)' }}>Generar drafts</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', padding: '4px' }}><X size={16} /></button>
        </div>

        {/* Signer */}
        <div>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>Firmante</label>
          <select value={signedByEmail} onChange={(e) => setSignedByEmail(e.target.value)} className="input" style={{ height: '38px' }}>
            {SIGNERS.map((s) => (
              <option key={s.email} value={s.email}>{s.name} ({s.email})</option>
            ))}
          </select>
          <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '4px' }}>El mensaje firma en primera persona del socio seleccionado.</p>
        </div>

        {/* Max */}
        {eligibleCount > 0 && (
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>Cantidad a generar</label>
            <select value={maxDrafts} onChange={(e) => setMaxDrafts(Number(e.target.value))} className="input" style={{ height: '38px' }}>
              {[20, 50].filter(n => n <= eligibleCount).map(n => (
                <option key={n} value={n}>{n} leads</option>
              ))}
              <option value={eligibleCount}>Todos ({eligibleCount})</option>
            </select>
          </div>
        )}

        {/* Cost / eligible */}
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '10px 12px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '10px', color: 'var(--t3)' }}>A generar</p>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--t1)' }}>{eligibleCount > 0 ? actualMax : '—'}</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', color: 'var(--t3)' }}>Canal</p>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--t2)' }}>
              {campaign.channel === 'email' ? 'Email' : 'WhatsApp'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '10px', color: 'var(--t3)' }}>Costo estimado</p>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--t1)' }}>~${estimatedCost}</p>
          </div>
          <div style={{ width: '100%', fontSize: '11px', color: 'var(--t3)', lineHeight: 1.4 }}>
            Claude Sonnet · score ≥ 5/10 · omite leads con draft activo · corre en background.
          </div>
        </div>

        {eligibleCount === 0 && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--warn)', textAlign: 'center' }}>
            No hay leads enriquecidos con score ≥ 5. Enriquecé primero desde "Nueva búsqueda".
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn-secondary" style={{ fontSize: 'var(--text-sm)' }}>Cancelar</button>
          <button onClick={handleGenerate} disabled={eligibleCount === 0} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', opacity: eligibleCount === 0 ? 0.5 : 1, minWidth: '150px', justifyContent: 'center' }}>
            <PenLine size={14} />
            {eligibleCount > 0 ? `Generar (${actualMax})` : 'Sin leads elegibles'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tab: Resumen ──────────────────────────────────────────────────────────────
function TabResumen({ campaign, leadCount }: { campaign: Campaign; leadCount: number }) {
  const CHANNEL_LABELS    = { whatsapp: 'WhatsApp', email: 'Email', both: 'WhatsApp + Email' }
  const STATUS_BADGE      = { draft: 'badge badge-warn', active: 'badge badge-acc', paused: 'badge badge-warn', closed: 'badge badge-ok' }
  const STATUS_LABELS_CAM = { draft: 'Borrador', active: 'Activa', paused: 'Pausada', closed: 'Cerrada' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Estado',     value: <span className={STATUS_BADGE[campaign.status]}>{STATUS_LABELS_CAM[campaign.status]}</span> },
          { label: 'Canal',      value: CHANNEL_LABELS[campaign.channel] },
          { label: 'Categoría',  value: campaign.category ?? 'Otras' },
          { label: 'Leads',      value: <strong style={{ color: 'var(--acc)', fontSize: '1.3em' }}>{leadCount}</strong> },
          { label: 'Creada',     value: new Date(campaign.created_at).toLocaleDateString('es-AR') },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '14px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</p>
            <div style={{ fontSize: 'var(--text-base)', color: 'var(--t1)' }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '16px' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>ICP Prompt</p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t2)', lineHeight: 1.6, fontStyle: 'italic' }}>&ldquo;{campaign.icp_prompt}&rdquo;</p>
      </div>
    </div>
  )
}

// ── Pipeline Panel ────────────────────────────────────────────────────────────
interface JobRecord {
  id: string; type: string; status: string
  result: Record<string, unknown> | null
  created_at: string; started_at: string | null; finished_at: string | null
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'hace un momento'
  const m = Math.floor(s / 60)
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

function jobSummary(job: JobRecord): string {
  const r = job.result ?? {}
  if (job.type === 'scrape') {
    const ins = Number(r.inserted ?? 0), req = Number(r.requests ?? 0), reused = Number(r.reusedFromCache ?? 0)
    const parts = []
    if (ins > 0) parts.push(`${ins} nuevos leads`)
    if (reused > 0) parts.push(`${reused} reutilizados`)
    if (req > 0) parts.push(`${req} req SerpAPI`)
    return parts.join(' · ') || 'sin resultados'
  }
  if (job.type === 'enrich') {
    const enriched = Number(r.enriched ?? 0), failed = Number(r.failed ?? 0)
    const parts = [`${enriched} enriquecidos`]
    if (failed > 0) parts.push(`${failed} errores`)
    return parts.join(' · ')
  }
  if (job.type === 'write') {
    const created = Number(r.created ?? 0), skipped = Number(r.skipped ?? 0)
    const parts = [`${created} drafts generados`]
    if (skipped > 0) parts.push(`${skipped} ya tenían`)
    return parts.join(' · ')
  }
  return ''
}

const JOB_CONFIG: Record<string, { label: string; color: string }> = {
  scrape:       { label: 'Búsqueda',       color: 'var(--acc)' },
  enrich:       { label: 'Enriquecimiento', color: '#06B6D4' },
  scrape_enrich:{ label: 'Búsqueda + enriq.', color: '#06B6D4' },
  write:        { label: 'Drafts',          color: '#22C55E' },
}

function PipelinePanel({
  campaign, rows, rawCount, enrichedCount, writerEligible, draftCount,
  runningAction, setRunningAction, setShowSearch, setShowWriter,
}: {
  campaign: Campaign; rows: CampaignLeadFull[]; rawCount: number; enrichedCount: number; writerEligible: number; draftCount: number
  runningAction: 'search' | 'enrich' | 'write' | null
  setRunningAction: (a: 'search' | 'enrich' | 'write' | null) => void
  setShowSearch: (v: boolean) => void; setShowWriter: (v: boolean) => void
}) {
  const supabase = createClient()
  const [jobs, setJobs] = useState<JobRecord[]>([])

  const loadJobs = useCallback(async () => {
    const { data } = await supabase
      .from('agent_jobs')
      .select('id, type, status, result, created_at, started_at, finished_at')
      .order('created_at', { ascending: false })
      .limit(30)
    const filtered = ((data ?? []) as JobRecord[]).filter((j) => {
      const r = j.result as Record<string, unknown> | null
      const p = j as unknown as { params?: Record<string, unknown> }
      return r?.campaignId === campaign.id || p.params?.campaignId === campaign.id
    })
    // fallback: show last 6 if no campaign filter matches
    setJobs(filtered.slice(0, 6))
  }, [campaign.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadJobs() }, [loadJobs])

  useEffect(() => {
    const ch = supabase.channel(`pipeline-jobs-${campaign.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'agent_jobs' }, () => { loadJobs(); setRunningAction(null) })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_jobs' }, () => loadJobs())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [campaign.id, loadJobs]) // eslint-disable-line react-hooks/exhaustive-deps

  const total         = rows.length
  const approvedCount = rows.filter((r) => ['approved', 'sent', 'replied'].includes(r.status)).length

  // Proportions for the funnel bar (capped at 1)
  const pEnriched  = total > 0 ? Math.min(enrichedCount / total, 1) : 0
  const pDraft     = total > 0 ? Math.min(draftCount / total, 1)    : 0
  const pApproved  = total > 0 ? Math.min(approvedCount / total, 1) : 0

  async function fireEnrich() {
    if (rawCount === 0 || runningAction === 'enrich') return
    setRunningAction('enrich')

    let totalEnriched = 0
    let pending = rawCount
    toast.loading(`Enriqueciendo... 0/${rawCount}`, { id: 'enrich-bg' })

    while (pending > 0) {
      try {
        const res = await fetch('/api/agents/enrich', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: campaign.id, max: 30 }),
        })
        const j = await res.json() as { enriched?: number; failed?: number; remaining?: number; error?: string }
        if (j.error) { toast.error(j.error, { id: 'enrich-bg' }); break }
        totalEnriched += j.enriched ?? 0
        pending = j.remaining ?? 0
        if ((j.enriched ?? 0) === 0) break  // ningún progreso, detener
        toast.loading(`Enriqueciendo... ${totalEnriched}/${rawCount}`, { id: 'enrich-bg' })
      } catch {
        toast.error('Error de red al enriquecer', { id: 'enrich-bg' }); break
      }
    }

    toast.success(`✓ ${totalEnriched} leads enriquecidos`, { id: 'enrich-bg', duration: 4000 })
    setRunningAction(null)
  }

  const stages = [
    { key: 'total',    label: 'Total',        sub: `${rawCount} sin procesar`, count: total,         color: 'var(--t3)',  pct: 1 },
    { key: 'enrich',   label: 'Enriquecidos', sub: `score calc. por Haiku`,    count: enrichedCount,  color: '#06B6D4',   pct: pEnriched },
    { key: 'draft',    label: 'Con draft',    sub: `pendientes de aprobar`,     count: draftCount,     color: 'var(--acc)', pct: pDraft },
    { key: 'approved', label: 'Aprobados',    sub: `listos para enviar`,        count: approvedCount,  color: '#22C55E',   pct: pApproved },
  ]

  const runningMap: Record<string, 'search' | 'enrich' | 'write'> = {
    total: 'search', enrich: 'enrich', draft: 'write',
  }

  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)', overflow: 'hidden' }}>
      {/* ── Header ── */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Pipeline de outreach</span>
          {runningAction && (
            <span className="animate-pulse" style={{ marginLeft: '10px', fontSize: '11px', color: 'var(--acc)', fontWeight: 600 }}>
              ● {runningAction === 'search' ? 'Buscando...' : runningAction === 'enrich' ? 'Enriqueciendo...' : 'Generando drafts...'}
            </span>
          )}
        </div>
        <button onClick={() => setShowSearch(true)} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: 'var(--text-xs)', padding: '6px 12px' }}>
          <Search size={12} />Nueva búsqueda
        </button>
      </div>

      {/* ── Funnel stages ── */}
      <div style={{ padding: '20px', display: 'flex', alignItems: 'stretch', gap: '0' }}>
        {stages.map((stage, i) => {
          const stageRunning = runningAction === runningMap[stage.key]
          const isLast = i === stages.length - 1
          return (
            <div key={stage.key} style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
              <div style={{
                flex: 1,
                background: stageRunning ? `${stage.color}12` : 'var(--s1)',
                border: `1px solid ${stageRunning ? stage.color : 'var(--border)'}`,
                borderRadius: 'var(--r8)',
                padding: '16px 14px',
                display: 'flex', flexDirection: 'column', gap: '6px',
                position: 'relative', overflow: 'hidden',
                transition: 'border-color 200ms, background 200ms',
              }}>
                {stageRunning && (
                  <div className="animate-pulse" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: stage.color }} />
                )}
                {/* Progress fill bar */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'var(--border)' }}>
                  <div style={{ height: '100%', width: `${stage.pct * 100}%`, background: stage.color, opacity: 0.6, transition: 'width 600ms ease' }} />
                </div>

                <span style={{ fontSize: '10px', fontWeight: 700, color: stageRunning ? stage.color : 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {stage.label}
                </span>
                <span style={{ fontSize: '28px', fontWeight: 800, color: stage.count > 0 ? stage.color : 'var(--t3)', fontFamily: 'var(--mono)', lineHeight: 1 }}>
                  {stage.count}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--t3)', lineHeight: 1.3, marginBottom: '4px' }}>{stage.sub}</span>
              </div>
              {!isLast && (
                <div style={{ width: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: 'var(--t3)', fontSize: '16px' }}>→</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Action buttons ── */}
      <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
        {/* Buscar */}
        <div />  {/* total stage has no action besides header button */}
        {/* Enriquecer */}
        <button
          onClick={fireEnrich}
          disabled={rawCount === 0 || runningAction === 'enrich'}
          className="btn-secondary"
          style={{ fontSize: 'var(--text-xs)', padding: '7px 10px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', opacity: (rawCount === 0 || runningAction === 'enrich') ? 0.4 : 1 }}>
          <Zap size={12} color="#06B6D4" />
          {runningAction === 'enrich' ? 'Corriendo...' : rawCount > 0 ? `Enriquecer (${rawCount})` : 'Al día'}
        </button>
        {/* Generar drafts */}
        <button
          onClick={() => { if (runningAction !== 'write') setShowWriter(true) }}
          disabled={writerEligible === 0 || runningAction === 'write'}
          className="btn-secondary"
          style={{ fontSize: 'var(--text-xs)', padding: '7px 10px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', opacity: (writerEligible === 0 || runningAction === 'write') ? 0.4 : 1 }}>
          <PenLine size={12} color="var(--acc)" />
          {runningAction === 'write' ? 'Corriendo...' : writerEligible > 0 ? `Generar (${writerEligible})` : 'Sin elegibles'}
        </button>
        {/* Cola de aprobación */}
        <a
          href="/dashboard/marketing/approval"
          style={{ fontSize: 'var(--text-xs)', padding: '7px 10px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', background: approvedCount === 0 ? 'transparent' : '#22C55E18', border: `1px solid ${approvedCount > 0 ? '#22C55E40' : 'var(--border)'}`, borderRadius: 'var(--r6)', color: approvedCount > 0 ? '#22C55E' : 'var(--t3)', textDecoration: 'none', fontWeight: 500, transition: 'all 150ms' }}>
          {approvedCount > 0 ? '✓' : '○'} Cola {approvedCount > 0 ? `(${approvedCount})` : '→'}
        </a>
      </div>

      {/* ── Activity log ── */}
      {jobs.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Actividad reciente</span>
          {jobs.slice(0, 5).map((job) => {
            const cfg = JOB_CONFIG[job.type] ?? { label: job.type, color: 'var(--t3)' }
            const isRun = job.status === 'running' || job.status === 'queued'
            const isFail = job.status === 'failed'
            const summary = jobSummary(job)
            return (
              <div key={job.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px' }}>
                <span style={{
                  width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                  background: isRun ? `${cfg.color}30` : isFail ? '#EF444420' : `${cfg.color}20`,
                  border: `1px solid ${isRun ? cfg.color : isFail ? '#EF4444' : cfg.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px',
                }}>
                  {isRun ? <span className="animate-pulse" style={{ color: cfg.color }}>●</span> : isFail ? '✗' : '✓'}
                </span>
                <span style={{ fontWeight: 600, color: isRun ? cfg.color : isFail ? '#EF4444' : 'var(--t2)', minWidth: '110px' }}>
                  {cfg.label}
                  {isRun && <span style={{ color: cfg.color }}> · corriendo</span>}
                </span>
                <span style={{ color: 'var(--t3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isRun ? 'procesando en background...' : isFail ? (String((job.result as Record<string,unknown>)?.error ?? 'error').slice(0, 60)) : summary}
                </span>
                <span style={{ color: 'var(--t3)', flexShrink: 0, opacity: 0.7 }}>{timeAgo(job.created_at)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Tab: Leads ────────────────────────────────────────────────────────────────
type SortBy = 'fit_desc' | 'fit_asc' | 'created_desc' | 'name_asc'

function TabLeads({ campaign, currentUserEmail }: { campaign: Campaign; currentUserEmail: string }) {
  const supabase = createClient()
  const [rows, setRows] = useState<CampaignLeadFull[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all')
  const [minScore, setMinScore] = useState(0)
  const [sortBy, setSortBy] = useState<SortBy>('fit_desc')
  const [showSearch, setShowSearch] = useState(false)
  const [showWriter, setShowWriter] = useState(false)
  const [selectedRow, setSelectedRow] = useState<CampaignLeadFull | null>(null)
  const [runningAction, setRunningAction] = useState<'search' | 'enrich' | 'write' | null>(null)
  // draft status map: leadGlobalId → 'pending' | 'approved' | 'sent'
  const [draftMap, setDraftMap] = useState<Record<string, DraftStatus>>({})

  const loadLeads = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('campaign_leads')
      .select('status, added_at, leads_global(*)')
      .eq('campaign_id', campaign.id)
      .order('added_at', { ascending: false })
      .limit(200)
    setRows((data ?? []) as unknown as CampaignLeadFull[])
    setLoading(false)
    // Load draft statuses
    const ids = (data ?? []).map((r: Record<string, unknown>) => (r.leads_global as Record<string,unknown>)?.id).filter(Boolean) as string[]
    if (ids.length > 0) {
      const { data: drafts } = await supabase
        .from('drafts').select('lead_global_id, status')
        .eq('campaign_id', campaign.id)
        .in('lead_global_id', ids)
        .in('status', ['pending', 'approved', 'sent'])
      const map: Record<string, DraftStatus> = {}
      const priority: Record<string, number> = { sent: 3, approved: 2, pending: 1 }
      for (const d of drafts ?? []) {
        const cur = map[d.lead_global_id]
        if (!cur || (priority[d.status] ?? 0) > (priority[cur] ?? 0)) {
          map[d.lead_global_id] = d.status as DraftStatus
        }
      }
      setDraftMap(map)
    }
  }, [campaign.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadLeads() }, [loadLeads])

  // Realtime for campaign_leads + leads_global changes
  useEffect(() => {
    const ch = supabase.channel(`cl-${campaign.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campaign_leads', filter: `campaign_id=eq.${campaign.id}` }, () => loadLeads())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'campaign_leads', filter: `campaign_id=eq.${campaign.id}` }, () => { loadLeads(); setRunningAction(null) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads_global' }, () => { loadLeads(); setRunningAction((prev) => prev === 'enrich' ? null : prev) })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [campaign.id, loadLeads]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: watch agent_jobs to clear running state when jobs complete
  useEffect(() => {
    const ch2 = supabase.channel(`jobs-watch-${campaign.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'agent_jobs' }, (payload) => {
        const job = payload.new as { status: string }
        if (job.status === 'done' || job.status === 'failed') setRunningAction(null)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch2) }
  }, [campaign.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-clear running state after 10min (fallback si Realtime falla)
  useEffect(() => {
    if (!runningAction) return
    const t = setTimeout(() => setRunningAction(null), 10 * 60 * 1000)
    return () => clearTimeout(t)
  }, [runningAction])

  const rawCount          = rows.filter((r) => r.status === 'raw').length
  const enrichedCount     = rows.filter((r) => r.status === 'enriched').length
  const writerEligible    = rows.filter((r) => r.status === 'enriched' && (r.leads_global.fit_score ?? 0) >= 5).length

  const displayed = [...rows]
    .filter((r) => filterStatus === 'all' || r.status === filterStatus)
    .filter((r) => minScore === 0 || (r.leads_global.fit_score ?? 0) >= minScore)
    .sort((a, b) => {
      if (sortBy === 'fit_desc')  return (b.leads_global.fit_score ?? -1) - (a.leads_global.fit_score ?? -1)
      if (sortBy === 'fit_asc')   return (a.leads_global.fit_score ?? 11) - (b.leads_global.fit_score ?? 11)
      if (sortBy === 'name_asc')  return a.leads_global.company.localeCompare(b.leads_global.company, 'es')
      return 0
    })

  const STATUS_FILTER_OPTIONS: Array<{ value: LeadStatus | 'all'; label: string }> = [
    { value: 'all',      label: 'Todos' },
    { value: 'raw',      label: 'Sin procesar' },
    { value: 'enriched', label: 'Enriquecidos' },
    { value: 'approved', label: 'Aprobados' },
    { value: 'sent',     label: 'Enviados' },
    { value: 'replied',  label: 'Respondieron' },
    { value: 'rejected', label: 'Rechazados' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {showSearch && <SearchModal campaign={campaign} onClose={() => setShowSearch(false)} onStarted={() => setRunningAction('search')} />}
      {showWriter && (
        <WriterModal
          campaign={campaign}
          eligibleCount={writerEligible}
          currentUserEmail={currentUserEmail}
          onClose={() => setShowWriter(false)}
          onStarted={() => setRunningAction('write')}
        />
      )}
      {selectedRow && (
        <LeadDrawer
          lead={selectedRow.leads_global}
          status={selectedRow.status}
          campaignId={campaign.id}
          onClose={() => setSelectedRow(null)}
        />
      )}

      <PipelinePanel
        campaign={campaign}
        rows={rows}
        rawCount={rawCount}
        enrichedCount={enrichedCount}
        writerEligible={writerEligible}
        draftCount={Object.keys(draftMap).length}
        runningAction={runningAction}
        setRunningAction={setRunningAction}
        setShowSearch={setShowSearch}
        setShowWriter={setShowWriter}
      />

      {/* ── Filtros y tabla ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as LeadStatus | 'all')}
          className="input" style={{ height: '36px', fontSize: 'var(--text-xs)', width: 'auto', minWidth: '140px' }}>
          {STATUS_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="input" style={{ height: '36px', fontSize: 'var(--text-xs)', width: 'auto', minWidth: '150px' }}>
          <option value="fit_desc">Score ↓ mayor primero</option>
          <option value="fit_asc">Score ↑ menor primero</option>
          <option value="created_desc">Más reciente</option>
          <option value="name_asc">Nombre A→Z</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '11px', color: 'var(--t3)', whiteSpace: 'nowrap' }}>Score ≥</label>
          <input type="number" min={0} max={10} value={minScore}
            onChange={(e) => setMinScore(Math.min(10, Math.max(0, Number(e.target.value))))}
            className="input" style={{ height: '36px', width: '52px', fontSize: 'var(--text-xs)', textAlign: 'center' }} />
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{displayed.length}/{rows.length}</span>
        <button onClick={loadLeads}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r6)', cursor: 'pointer', color: 'var(--t3)', display: 'flex', alignItems: 'center', padding: '7px 10px', transition: 'color 120ms, border-color 120ms' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--t1)'; e.currentTarget.style.borderColor = 'var(--t2)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>Cargando leads...</div>
      ) : displayed.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '60px 20px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)' }}>
          <Users size={28} color="var(--t3)" />
          <p style={{ fontWeight: 600, color: 'var(--t2)', fontSize: 'var(--text-sm)' }}>
            {rows.length === 0 ? 'Sin leads todavía' : 'Sin resultados para este filtro'}
          </p>
          {rows.length === 0 && (
            <button onClick={() => setShowSearch(true)} className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', marginTop: '4px' }}>
              <Search size={13} />Nueva búsqueda
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)', overflow: 'hidden' }}>
          {/* Header: Empresa | Ciudad | Website | Score | Estado | Acciones */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 80px 95px 70px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--s3)' }}>
            {['Empresa', 'Ciudad', 'Sitio web', 'Score', 'Estado', ''].map((h) => (
              <span key={h} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {displayed.map((row, i) => {
              const lead = row.leads_global
              const enriched = lead.enriched_data as EnrichedData | null
              return (
                <div key={`${row.campaign_id}-${row.lead_global_id}`}
                  onClick={() => setSelectedRow(row)}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 80px 95px 70px',
                    padding: '10px 16px',
                    borderBottom: i < displayed.length - 1 ? '1px solid var(--border)' : 'none',
                    alignItems: 'center', cursor: 'pointer', transition: 'background 100ms',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--s3)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 'var(--text-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                        {lead.company}
                      </span>
                      {(() => {
                        const ds = draftMap[row.lead_global_id]
                        if (!ds) return null
                        const cfg = ds === 'sent' ? { label: '✉ Enviado', c: '#22C55E', bg: '#22C55E15' }
                                  : ds === 'approved' ? { label: '✓ Aprobado', c: '#A3E635', bg: '#A3E63515' }
                                  : { label: '✏ Draft', c: '#EAB308', bg: '#EAB30815' }
                        return (
                          <span style={{ fontSize: '9px', fontWeight: 700, color: cfg.c, background: cfg.bg, borderRadius: '4px', padding: '1px 5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {cfg.label}
                          </span>
                        )
                      })()}
                    </div>
                    {enriched?.bio && (
                      <span style={{ fontSize: '10px', color: 'var(--t3)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                        {enriched.bio}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.city ?? '—'}</span>
                  <span style={{ fontSize: 'var(--text-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lead.website ? (
                      <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: 'var(--acc)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Globe size={11} />
                        {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 28)}
                        <ExternalLink size={9} style={{ flexShrink: 0 }} />
                      </a>
                    ) : lead.phone ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--t2)' }}>
                        <Phone size={11} color="var(--t3)" />{lead.phone}
                      </span>
                    ) : <span style={{ color: 'var(--t3)' }}>—</span>}
                  </span>
                  <FitScoreBadge score={lead.fit_score} />
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '10px', fontWeight: 600, color: STATUS_COLORS[row.status],
                    background: `${STATUS_COLORS[row.status]}18`, border: `1px solid ${STATUS_COLORS[row.status]}40`,
                    borderRadius: '6px', padding: '2px 7px', whiteSpace: 'nowrap',
                  }}>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: STATUS_COLORS[row.status], flexShrink: 0 }} />
                    {STATUS_LABELS[row.status]}
                  </span>

                  {/* Row actions */}
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedRow(row)}
                      title="Ver detalle"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: '12px', padding: '2px 4px', borderRadius: '4px', whiteSpace: 'nowrap' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--acc)'; e.currentTarget.style.background = 'var(--acc-d)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'none' }}
                    >
                      👁
                    </button>
                    {row.status !== 'rejected' && (
                      <button
                        onClick={async () => {
                          const supa = createClient()
                          await supa.from('campaign_leads').update({ status: 'rejected' })
                            .eq('campaign_id', row.campaign_id).eq('lead_global_id', row.lead_global_id)
                          toast.success(`${lead.company} excluido`)
                        }}
                        title="Excluir de campaña"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: '12px', padding: '2px 4px', borderRadius: '4px', whiteSpace: 'nowrap' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#EF444410' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'none' }}
                      >
                        🚫
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Aprobación ───────────────────────────────────────────────────────────
function TabApproval({ campaign, userEmail }: { campaign: Campaign; userEmail: string }) {
  const supabase = createClient()
  const [drafts, setDrafts] = useState<Parameters<typeof DraftApprovalQueue>[0]['initialDrafts']>([])
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  const loadDrafts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('drafts')
      .select('id, body, subject, channel, status, signed_by_email, campaign_id, lead_global_id, created_at, leads_global(id, company, city, website, phone, fit_score, enriched_data)')
      .eq('campaign_id', campaign.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(200)
    const rows = (data ?? []) as unknown as Parameters<typeof DraftApprovalQueue>[0]['initialDrafts']
    setDrafts(rows)
    setPendingCount(rows.length)
    setLoading(false)
  }, [campaign.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadDrafts() }, [loadDrafts])

  useEffect(() => {
    const ch = supabase.channel(`drafts-tab-${campaign.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'drafts' }, loadDrafts)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drafts' }, loadDrafts)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [campaign.id, loadDrafts]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>Cargando drafts...</div>

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {pendingCount === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '80px 20px' }}>
          <CheckSquare size={32} color="var(--t3)" />
          <p style={{ fontWeight: 600, color: 'var(--t2)', fontSize: 'var(--text-md)' }}>Sin drafts pendientes</p>
          <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)', textAlign: 'center', maxWidth: '340px' }}>
            Generá drafts desde la pestaña Leads y volvé aquí para aprobarlos antes de enviar.
          </p>
        </div>
      ) : (
        <DraftApprovalQueue initialDrafts={drafts} userEmail={userEmail} />
      )}
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────
type Tab = 'resumen' | 'leads' | 'aprovacion'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'resumen',    label: 'Resumen',    icon: <BarChart3 size={14} /> },
  { id: 'leads',      label: 'Leads',      icon: <Users size={14} /> },
  { id: 'aprovacion', label: 'Aprobación', icon: <CheckSquare size={14} /> },
]

export function CampaignDetailPanel({ campaign, initialLeadCount }: {
  campaign: Campaign
  initialLeadCount: number
}) {
  const [activeTab, setActiveTab] = useState<Tab>('leads')
  const [leadCount, setLeadCount] = useState(initialLeadCount)
  const [pendingDrafts, setPendingDrafts] = useState(0)
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('franco.sanmartin@maniaco.online')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setCurrentUserEmail(data.user.email)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll pending drafts count for badge
  useEffect(() => {
    async function loadPending() {
      const { count } = await supabase.from('drafts').select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id).eq('status', 'pending')
      setPendingDrafts(count ?? 0)
    }
    loadPending()
    const ch = supabase.channel(`pending-count-${campaign.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'drafts' }, loadPending)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drafts' }, loadPending)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [campaign.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'resumen') {
      supabase.from('campaign_leads').select('lead_global_id', { count: 'exact', head: true }).eq('campaign_id', campaign.id)
        .then(({ count }) => { if (count !== null) setLeadCount(count) })
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', gap: '2px', padding: '0 28px', borderBottom: '1px solid var(--border)', background: 'var(--s1)', overflowX: 'auto' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const badge = tab.id === 'aprovacion' && pendingDrafts > 0 ? pendingDrafts : null
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 14px',
              fontSize: 'var(--text-sm)', fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--acc)' : 'var(--t3)',
              background: 'none', border: 'none',
              borderBottom: isActive ? '2px solid var(--acc)' : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 120ms',
              position: 'relative',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--t2)' }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--t3)' }}>
              {tab.icon}{tab.label}
              {badge && (
                <span style={{ background: '#22C55E', color: '#000', fontSize: '10px', fontWeight: 700, borderRadius: '999px', padding: '1px 6px', lineHeight: 1.5, minWidth: '18px', textAlign: 'center' }}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div style={{ padding: activeTab === 'aprovacion' ? '0' : '24px 28px', flex: 1, overflowY: activeTab === 'aprovacion' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'resumen'    && <TabResumen campaign={campaign} leadCount={leadCount} />}
        {activeTab === 'leads'      && <TabLeads   campaign={campaign} currentUserEmail={currentUserEmail} />}
        {activeTab === 'aprovacion' && <TabApproval campaign={campaign} userEmail={currentUserEmail} />}
      </div>
    </div>
  )
}
