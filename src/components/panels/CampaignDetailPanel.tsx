'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart3, Users, Search, Globe, Phone, Mail,
  ExternalLink, RefreshCw, X, MapPin, Star, PenLine,
  CheckSquare, Trash2, Download, DollarSign, Workflow,
} from 'lucide-react'
import type { Campaign, CampaignLeadFull, LeadGlobal, LeadStatus, EnrichedData, DraftStatus } from '@/lib/types'
import { DraftApprovalQueue } from '@/components/panels/DraftApprovalQueue'

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<LeadStatus, string> = {
  raw:      '#525866',
  enriched: '#06B6D4',
  approved: '#A3E635',
  sent:     '#22C55E',
  replied:  '#8B5CF6',
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

// Pipeline step accent colors
const COL_HAIKU    = '#06B6D4'
const COL_SONNET   = 'var(--acc)'
const COL_APPROVED = '#22C55E'

const SIGNERS = [
  { email: 'franco.sanmartin@maniaco.online', name: 'Franco' },
  { email: 'luis.giannasi@maniaco.online',    name: 'Lucho' },
  { email: 'noelia.bottallo@maniaco.online',  name: 'Noe' },
]

type RunningAction = 'search' | 'enrich' | 'write' | null

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
          {enriched && (status === 'enriched' || status === 'approved' || status === 'sent') && (
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

// ── Search Modal (scrape, fire-and-forget) ────────────────────────────────────
function SearchModal({ campaign, onClose, onStarted }: { campaign: Campaign; onClose: () => void; onStarted?: () => void }) {
  const [radiusKm, setRadiusKm] = useState(5)

  const RADIUS_OPTIONS = [
    { km: 2,  label: '2 km — muy céntrico',         est: '30-80 resultados' },
    { km: 5,  label: '5 km — barrios cercanos',      est: '80-200 resultados' },
    { km: 10, label: '10 km — toda la ciudad',       est: '150-400 resultados' },
    { km: 20, label: '20 km — área metropolitana',   est: '300-500+ resultados' },
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
          <p style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '6px' }}>Claude genera 3 variantes de búsqueda automáticamente según el ICP.</p>
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
            Trae todos los resultados del área filtrados por el ICP. Leads ya existentes se saltean automáticamente.
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

// ── Writer Modal (signer select → fireWriter) ─────────────────────────────────
function WriterModal({ campaign, eligibleCount, currentUserEmail, onClose, onConfirm }: {
  campaign: Campaign
  eligibleCount: number
  currentUserEmail: string
  onClose: () => void
  onConfirm: (email: string, max: number) => void
}) {
  const defaultSigner = SIGNERS.some((s) => s.email === currentUserEmail) ? currentUserEmail : SIGNERS[0]!.email
  const [signedByEmail, setSignedByEmail] = useState(defaultSigner)
  const [maxDrafts, setMaxDrafts] = useState(Math.min(eligibleCount, 50))

  const actualMax = Math.min(maxDrafts, eligibleCount)
  const estimatedCost = (actualMax * 0.004).toFixed(3)

  function handleGenerate() {
    onClose()
    onConfirm(signedByEmail, actualMax)
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
            Claude Sonnet · score ≥ 5/10 · omite leads con draft activo.
          </div>
        </div>

        {eligibleCount === 0 && (
          <p style={{ fontSize: 'var(--text-xs)', color: '#EAB308', textAlign: 'center' }}>
            No hay leads enriquecidos con score ≥ 5. Enriquecé primero desde el paso ENRIQUECER.
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

// ── Activity log job records ──────────────────────────────────────────────────
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
  if (job.type === 'scrape' || job.type === 'scrape_enrich') {
    const ins = Number(r.inserted ?? 0), req = Number(r.requests ?? 0)
    const parts: string[] = []
    if (ins > 0) parts.push(`${ins} nuevos leads`)
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
  scrape:        { label: 'Búsqueda',          color: 'var(--acc)' },
  enrich:        { label: 'Enriquecimiento',   color: COL_HAIKU },
  scrape_enrich: { label: 'Búsqueda + enriq.', color: COL_HAIKU },
  write:         { label: 'Drafts',            color: COL_APPROVED },
}

// ── Pipeline step type ────────────────────────────────────────────────────────
interface PipelineStep {
  n: number
  name: string
  count: number
  sub: string
  cost: string
  color: string
  pct: number
  action?: { label: string; onClick: () => void; disabled?: boolean; running?: boolean; tooltip?: string }
}

// ── Pipeline Panel (5 steps) ──────────────────────────────────────────────────
function PipelinePanel({
  campaign, total, rawCount, enrichedCount, draftedCount, approvedCount, sentCount,
  writerEligible, serpRequests, runningAction,
  onSearch, onEnrich, onWriter, onGoApproval,
}: {
  campaign: Campaign
  total: number; rawCount: number; enrichedCount: number; draftedCount: number
  approvedCount: number; sentCount: number; writerEligible: number; serpRequests: number
  runningAction: RunningAction
  onSearch: () => void; onEnrich: () => void; onWriter: () => void; onGoApproval: () => void
}) {
  const supabase = createClient()
  const [jobs, setJobs] = useState<JobRecord[]>([])

  const loadJobs = useCallback(async () => {
    const { data } = await supabase
      .from('agent_jobs')
      .select('id, type, status, result, params, created_at, started_at, finished_at')
      .order('created_at', { ascending: false })
      .limit(40)
    const filtered = ((data ?? []) as unknown as Array<JobRecord & { params?: Record<string, unknown> }>).filter((j) => {
      const r = j.result as Record<string, unknown> | null
      return r?.campaignId === campaign.id || j.params?.campaignId === campaign.id
    })
    setJobs(filtered.slice(0, 5))
  }, [campaign.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadJobs() }, [loadJobs])

  useEffect(() => {
    const ch = supabase.channel(`pipeline-jobs-${campaign.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'agent_jobs' }, () => loadJobs())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_jobs' }, () => loadJobs())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [campaign.id, loadJobs]) // eslint-disable-line react-hooks/exhaustive-deps

  const denom = Math.max(total, 1)

  const steps: PipelineStep[] = [
    {
      n: 1, name: 'BUSCAR', count: total, sub: 'en base de datos',
      cost: '~$0.002/req SerpAPI', color: 'var(--acc)', pct: 1,
      action: { label: 'Buscar más →', onClick: onSearch, running: runningAction === 'search' },
    },
    {
      n: 2, name: 'ENRIQUECER', count: enrichedCount, sub: 'score 0-10 + perfil',
      cost: `~$${(rawCount * 0.001).toFixed(3)} Haiku`, color: COL_HAIKU, pct: enrichedCount / denom,
      action: {
        label: rawCount > 0 ? `Enriquecer (${rawCount})` : 'Al día',
        onClick: onEnrich, disabled: rawCount === 0, running: runningAction === 'enrich',
      },
    },
    {
      n: 3, name: 'REDACTAR', count: draftedCount, sub: 'WA ≤300 chars',
      cost: `~$${(writerEligible * 0.004).toFixed(3)} Sonnet`, color: COL_SONNET, pct: draftedCount / denom,
      action: {
        label: writerEligible > 0 ? `Generar (${writerEligible})` : 'Sin elegibles',
        onClick: onWriter, disabled: writerEligible === 0, running: runningAction === 'write',
      },
    },
    {
      n: 4, name: 'APROBAR', count: approvedCount, sub: 'revisión manual',
      cost: 'gratuito', color: COL_APPROVED, pct: approvedCount / denom,
      action: { label: 'Ver cola →', onClick: onGoApproval },
    },
    {
      n: 5, name: 'ENVIAR', count: sentCount, sub: 'Evolution API / Resend',
      cost: '~$0.001/msg', color: '#22C55E', pct: sentCount / denom,
      action: { label: 'Configurar →', onClick: () => {}, disabled: true, tooltip: 'Próximamente' },
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Workflow size={16} color="var(--acc)" />
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t1)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pipeline de outreach</span>
        {runningAction && (
          <span className="animate-pulse" style={{ fontSize: '11px', color: 'var(--acc)', fontWeight: 600 }}>
            ● {runningAction === 'search' ? 'Buscando...' : runningAction === 'enrich' ? 'Enriqueciendo...' : 'Generando drafts...'}
          </span>
        )}
      </div>

      {/* 5 steps */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
        {steps.map((step) => {
          const isRunning = !!step.action?.running
          const isDisabled = !!step.action?.disabled
          return (
            <div key={step.n} style={{
              background: 'var(--s2)',
              border: `1px solid ${isRunning ? step.color : 'var(--border)'}`,
              borderRadius: 'var(--r12)', padding: '16px 14px',
              display: 'flex', flexDirection: 'column', gap: '8px',
              position: 'relative', overflow: 'hidden',
              transition: 'border-color 200ms',
            }}>
              {isRunning && (
                <div className="animate-pulse" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: step.color }} />
              )}
              {/* number + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{
                  width: '20px', height: '20px', borderRadius: '999px', flexShrink: 0,
                  background: `${step.color}1f`, color: step.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 800, fontFamily: 'var(--mono)',
                }}>{step.n}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.06em' }}>{step.name}</span>
              </div>

              {/* count */}
              <span style={{ fontSize: '30px', fontWeight: 800, fontFamily: 'var(--mono)', color: step.count > 0 ? step.color : 'var(--t3)', lineHeight: 1 }}>
                {step.count}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--t3)', lineHeight: 1.3 }}>{step.sub}</span>

              {/* progress bar */}
              <div style={{ height: '4px', borderRadius: '999px', background: 'var(--s3)', overflow: 'hidden', marginTop: '2px' }}>
                <div style={{ height: '100%', width: `${Math.min(step.pct, 1) * 100}%`, background: step.color, opacity: 0.7, transition: 'width 600ms ease' }} />
              </div>

              {/* cost */}
              <span style={{ fontSize: '9px', color: 'var(--t3)', fontFamily: 'var(--mono)' }}>{step.cost}</span>

              {/* action */}
              {step.action && (
                <button
                  onClick={step.action.onClick}
                  disabled={isDisabled || isRunning}
                  title={step.action.tooltip}
                  className="btn-secondary"
                  style={{
                    marginTop: '2px', fontSize: '11px', padding: '6px 8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    width: '100%', cursor: (isDisabled || isRunning) ? 'not-allowed' : 'pointer',
                    opacity: (isDisabled || isRunning) ? 0.45 : 1,
                    borderColor: isRunning ? step.color : undefined,
                  }}>
                  {isRunning ? 'Corriendo...' : step.action.label}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Activity log */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actividad reciente</span>
        {jobs.length === 0 ? (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)' }}>Sin actividad todavía. Empezá con una búsqueda.</p>
        ) : jobs.map((job) => {
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
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px',
              }}>
                {isRun ? <span className="animate-pulse" style={{ color: cfg.color }}>●</span> : isFail ? '✗' : '✓'}
              </span>
              <span style={{ fontWeight: 600, color: isRun ? cfg.color : isFail ? '#EF4444' : 'var(--t2)', minWidth: '120px' }}>
                {cfg.label}{isRun && <span style={{ color: cfg.color }}> · corriendo</span>}
              </span>
              <span style={{ color: 'var(--t3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isRun ? 'procesando en background...' : isFail ? (String((job.result as Record<string, unknown>)?.error ?? 'error').slice(0, 60)) : summary}
              </span>
              <span style={{ color: 'var(--t3)', flexShrink: 0, opacity: 0.7 }}>{timeAgo(job.created_at)}</span>
            </div>
          )
        })}
        {serpRequests > 0 && (
          <p style={{ fontSize: '10px', color: 'var(--t3)', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '2px' }}>
            {serpRequests} requests SerpAPI acumulados en esta campaña
          </p>
        )}
      </div>
    </div>
  )
}

// ── Tab: Leads (search, filters, CSV export, draft badges) ────────────────────
type SortBy = 'fit_desc' | 'fit_asc' | 'name_asc' | 'created_desc'

function csvEscape(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function TabLeads({
  campaign, rows, loading, draftMap, onReject, onSelect, onRefresh,
}: {
  campaign: Campaign
  rows: CampaignLeadFull[]
  loading: boolean
  draftMap: Record<string, DraftStatus>
  onReject: (row: CampaignLeadFull) => void
  onSelect: (row: CampaignLeadFull) => void
  onRefresh: () => void
}) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all')
  const [minScore, setMinScore] = useState(0)
  const [sortBy, setSortBy] = useState<SortBy>('fit_desc')

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    return [...rows]
      .filter((r) => filterStatus === 'all' || r.status === filterStatus)
      .filter((r) => minScore === 0 || (r.leads_global.fit_score ?? 0) >= minScore)
      .filter((r) => q === '' || r.leads_global.company.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sortBy === 'fit_desc') return (b.leads_global.fit_score ?? -1) - (a.leads_global.fit_score ?? -1)
        if (sortBy === 'fit_asc')  return (a.leads_global.fit_score ?? 11) - (b.leads_global.fit_score ?? 11)
        if (sortBy === 'name_asc') return a.leads_global.company.localeCompare(b.leads_global.company, 'es')
        return new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
      })
  }, [rows, search, filterStatus, minScore, sortBy])

  function exportCSV() {
    const header = ['company', 'city', 'phone', 'email', 'website', 'fit_score', 'status']
    const lines = [header.join(',')]
    for (const r of displayed) {
      const l = r.leads_global
      lines.push([
        csvEscape(l.company), csvEscape(l.city), csvEscape(l.phone),
        csvEscape(l.email), csvEscape(l.website), csvEscape(l.fit_score), csvEscape(r.status),
      ].join(','))
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${campaign.name.replace(/[^\w]+/g, '_').toLowerCase()}_leads.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${displayed.length} leads exportados`)
  }

  const STATUS_FILTER_OPTIONS: Array<{ value: LeadStatus | 'all'; label: string }> = [
    { value: 'all',      label: 'Todos' },
    { value: 'raw',      label: 'Sin procesar' },
    { value: 'enriched', label: 'Enriquecidos' },
    { value: 'approved', label: 'Aprobados' },
    { value: 'sent',     label: 'Enviados' },
    { value: 'rejected', label: 'Rechazados' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empresa..."
            className="input" style={{ height: '36px', fontSize: 'var(--text-xs)', paddingLeft: '30px', width: '100%' }} />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as LeadStatus | 'all')}
          className="input" style={{ height: '36px', fontSize: 'var(--text-xs)', width: 'auto', minWidth: '130px' }}>
          {STATUS_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '11px', color: 'var(--t3)', whiteSpace: 'nowrap' }}>Score ≥</label>
          <input type="number" min={0} max={10} value={minScore}
            onChange={(e) => setMinScore(Math.min(10, Math.max(0, Number(e.target.value))))}
            className="input" style={{ height: '36px', width: '52px', fontSize: 'var(--text-xs)', textAlign: 'center' }} />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="input" style={{ height: '36px', fontSize: 'var(--text-xs)', width: 'auto', minWidth: '150px' }}>
          <option value="fit_desc">Score ↓ mayor primero</option>
          <option value="fit_asc">Score ↑ menor primero</option>
          <option value="name_asc">Nombre A→Z</option>
          <option value="created_desc">Más reciente</option>
        </select>
        <span style={{ fontSize: '11px', color: 'var(--t3)', fontFamily: 'var(--mono)' }}>{displayed.length}/{rows.length}</span>
        <button onClick={exportCSV} disabled={displayed.length === 0}
          className="btn-secondary"
          style={{ height: '36px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', padding: '0 10px', opacity: displayed.length === 0 ? 0.4 : 1 }}>
          <Download size={12} />CSV
        </button>
        <button onClick={onRefresh}
          style={{ height: '36px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r6)', cursor: 'pointer', color: 'var(--t3)', display: 'flex', alignItems: 'center', padding: '0 10px', transition: 'color 120ms, border-color 120ms' }}
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
        </div>
      ) : (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 80px 95px 70px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--s3)' }}>
            {['Empresa', 'Ciudad', 'Web / Tel', 'Score', 'Estado', ''].map((h, i) => (
              <span key={i} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>
          <div style={{ maxHeight: '58vh', overflowY: 'auto' }}>
            {displayed.map((row, i) => {
              const lead = row.leads_global
              const enriched = lead.enriched_data as EnrichedData | null
              const ds = draftMap[row.lead_global_id]
              return (
                <div key={`${row.campaign_id}-${row.lead_global_id}`}
                  onClick={() => onSelect(row)}
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
                      {ds && (() => {
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

                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onSelect(row)} title="Ver detalle"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: '12px', padding: '2px 4px', borderRadius: '4px' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--acc)'; e.currentTarget.style.background = 'var(--acc-d)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'none' }}>
                      👁
                    </button>
                    {row.status !== 'rejected' && (
                      <button onClick={() => onReject(row)} title="Excluir de campaña"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: '12px', padding: '2px 4px', borderRadius: '4px' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#EF444410' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'none' }}>
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
            Generá drafts desde el paso REDACTAR del pipeline y volvé aquí para aprobarlos antes de enviar.
          </p>
        </div>
      ) : (
        <DraftApprovalQueue initialDrafts={drafts} userEmail={userEmail} />
      )}
    </div>
  )
}

// ── Tab: Analytics ────────────────────────────────────────────────────────────
function FunnelBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const filled = Math.round((pct / 100) * 20)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 50px 1fr 50px', alignItems: 'center', gap: '12px', fontSize: 'var(--text-xs)' }}>
      <span style={{ color: 'var(--t2)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--t1)', textAlign: 'right' }}>{value}</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--mono)', color, letterSpacing: '1px', fontSize: '13px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {'█'.repeat(filled)}<span style={{ color: 'var(--s3)' }}>{'░'.repeat(20 - filled)}</span>
        </span>
      </div>
      <span style={{ fontFamily: 'var(--mono)', color: 'var(--t3)', textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

function TabAnalytics({ rows, draftedCount, serpRequests }: {
  rows: CampaignLeadFull[]; draftedCount: number; serpRequests: number
}) {
  const total = rows.length
  const enriched = rows.filter((r) => r.leads_global.enriched_at !== null || r.leads_global.fit_score !== null).length
  const scoreGte5 = rows.filter((r) => (r.leads_global.fit_score ?? 0) >= 5).length
  const approved = rows.filter((r) => ['approved', 'sent', 'replied'].includes(r.status)).length
  const sent = rows.filter((r) => ['sent', 'replied'].includes(r.status)).length
  const replied = rows.filter((r) => r.status === 'replied').length

  // Score distribution
  const buckets = [
    { label: '0-2',  min: 0, max: 2 },
    { label: '3-4',  min: 3, max: 4 },
    { label: '5-6',  min: 5, max: 6 },
    { label: '7-8',  min: 7, max: 8 },
    { label: '9-10', min: 9, max: 10 },
  ].map((b) => ({
    ...b,
    n: rows.filter((r) => {
      const s = r.leads_global.fit_score
      return s !== null && s !== undefined && s >= b.min && s <= b.max
    }).length,
  }))
  const maxBucket = Math.max(1, ...buckets.map((b) => b.n))

  // Costs
  const serpCost = serpRequests * 0.002
  const haikuCost = enriched * 0.001
  const sonnetCost = draftedCount * 0.004
  const totalCost = serpCost + haikuCost + sonnetCost

  // Industry distribution
  const industryMap = new Map<string, number>()
  for (const r of rows) {
    const ind = r.leads_global.industry?.trim()
    if (ind) industryMap.set(ind, (industryMap.get(ind) ?? 0) + 1)
  }
  const industries = [...industryMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)

  const card = { background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)', padding: '18px 20px' } as const
  const heading = { fontSize: '11px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '14px' }

  if (total === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '80px 20px' }}>
        <BarChart3 size={32} color="var(--t3)" />
        <p style={{ fontWeight: 600, color: 'var(--t2)', fontSize: 'var(--text-md)' }}>Sin datos todavía</p>
        <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>Buscá leads para ver el análisis de la campaña.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '760px' }}>
      {/* Funnel */}
      <div style={card}>
        <p style={heading}>Funnel de conversión</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <FunnelBar label="Total leads"   value={total}     total={total} color="var(--acc)" />
          <FunnelBar label="Enriquecidos"  value={enriched}  total={total} color={COL_HAIKU} />
          <FunnelBar label="Score ≥ 5"     value={scoreGte5} total={total} color="#EAB308" />
          <FunnelBar label="Con draft"     value={draftedCount} total={total} color="var(--acc)" />
          <FunnelBar label="Aprobados"     value={approved}  total={total} color={COL_APPROVED} />
          <FunnelBar label="Enviados"      value={sent}      total={total} color="#22C55E" />
          <FunnelBar label="Respondieron"  value={replied}   total={total} color="#8B5CF6" />
        </div>
      </div>

      {/* Score distribution */}
      <div style={card}>
        <p style={heading}>Distribución de scores</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {buckets.map((b) => (
            <div key={b.label} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 40px', alignItems: 'center', gap: '12px', fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--t2)', fontFamily: 'var(--mono)' }}>{b.label}</span>
              <div style={{ height: '14px', borderRadius: '4px', background: 'var(--s3)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(b.n / maxBucket) * 100}%`, background: b.min >= 7 ? '#22C55E' : b.min >= 5 ? '#EAB308' : '#EF4444', opacity: 0.8, transition: 'width 600ms ease' }} />
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--t1)', textAlign: 'right' }}>{b.n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Costs */}
      <div style={card}>
        <p style={heading}>Costos estimados</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          {[
            { label: 'SerpAPI',  detail: `${serpRequests} requests`,    value: serpCost,   color: 'var(--acc)' },
            { label: 'Haiku',    detail: `${enriched} enriquecidos`,    value: haikuCost,  color: COL_HAIKU },
            { label: 'Sonnet',   detail: `${draftedCount} drafts`,      value: sonnetCost, color: COL_SONNET },
            { label: 'Total',    detail: 'acumulado',                   value: totalCost,  color: '#22C55E' },
          ].map((c) => (
            <div key={c.label} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <DollarSign size={12} color={c.color} />
                <span style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{c.label}</span>
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: '20px', color: c.color === '#22C55E' ? 'var(--t1)' : 'var(--t1)', lineHeight: 1 }}>
                ${c.value.toFixed(3)}
              </span>
              <p style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '4px' }}>{c.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      {industries.length > 0 && (
        <div style={card}>
          <p style={heading}>Categorías (industry)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {industries.map(([ind, n]) => (
              <div key={ind} style={{ display: 'grid', gridTemplateColumns: '1fr 60px', alignItems: 'center', gap: '12px', fontSize: 'var(--text-xs)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <span style={{ color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: '100px', flexShrink: 0 }}>{ind}</span>
                  <div style={{ flex: 1, height: '8px', borderRadius: '999px', background: 'var(--s3)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(n / total) * 100}%`, background: COL_HAIKU, opacity: 0.6, transition: 'width 600ms ease' }} />
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--t1)', textAlign: 'right' }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────
type Tab = 'pipeline' | 'leads' | 'aprobacion' | 'analytics'

export function CampaignDetailPanel({ campaign }: {
  campaign: Campaign
  initialLeadCount: number
}) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<Tab>('pipeline')
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('franco.sanmartin@maniaco.online')

  // Shared lead state (used by Pipeline + Leads + Analytics)
  const [rows, setRows] = useState<CampaignLeadFull[]>([])
  const [loading, setLoading] = useState(true)
  const [draftMap, setDraftMap] = useState<Record<string, DraftStatus>>({})
  const [pendingDrafts, setPendingDrafts] = useState(0)
  const [serpRequests, setSerpRequests] = useState(0)
  const [runningAction, setRunningAction] = useState<RunningAction>(null)

  // Modals + drawer
  const [showSearch, setShowSearch] = useState(false)
  const [showWriter, setShowWriter] = useState(false)
  const [selectedRow, setSelectedRow] = useState<CampaignLeadFull | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setCurrentUserEmail(data.user.email)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load leads + draft statuses ──
  const loadLeads = useCallback(async () => {
    const { data } = await supabase
      .from('campaign_leads')
      .select('status, added_at, campaign_id, lead_global_id, leads_global(*)')
      .eq('campaign_id', campaign.id)
      .order('added_at', { ascending: false })
      .limit(500)
    const next = (data ?? []) as unknown as CampaignLeadFull[]
    setRows(next)
    setLoading(false)

    const ids = next.map((r) => r.leads_global?.id).filter(Boolean) as string[]
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
    } else {
      setDraftMap({})
    }
  }, [campaign.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadLeads() }, [loadLeads])

  // ── Pending drafts badge + serp requests ──
  const loadMeta = useCallback(async () => {
    const [{ count }, { data: jobs }] = await Promise.all([
      supabase.from('drafts').select('id', { count: 'exact', head: true }).eq('campaign_id', campaign.id).eq('status', 'pending'),
      supabase.from('agent_jobs').select('result, params, type').eq('type', 'scrape').limit(100),
    ])
    setPendingDrafts(count ?? 0)
    let req = 0
    for (const j of jobs ?? []) {
      const r = j.result as Record<string, unknown> | null
      const p = j.params as Record<string, unknown> | null
      if (r?.campaignId === campaign.id || p?.campaignId === campaign.id) {
        req += Number(r?.requests ?? 0)
      }
    }
    setSerpRequests(req)
  }, [campaign.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadMeta() }, [loadMeta])

  // ── Realtime ──
  useEffect(() => {
    const ch = supabase.channel(`detail-${campaign.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campaign_leads', filter: `campaign_id=eq.${campaign.id}` }, () => loadLeads())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'campaign_leads', filter: `campaign_id=eq.${campaign.id}` }, () => loadLeads())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads_global' }, () => loadLeads())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'drafts' }, () => { loadLeads(); loadMeta() })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drafts' }, () => { loadLeads(); loadMeta() })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'agent_jobs' }, (payload) => {
        const job = payload.new as { status: string }
        if (job.status === 'done' || job.status === 'failed') { setRunningAction((p) => p === 'search' ? null : p); loadMeta() }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [campaign.id, loadLeads, loadMeta]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-clear running state after 10min (fallback si Realtime falla)
  useEffect(() => {
    if (!runningAction) return
    const t = setTimeout(() => setRunningAction(null), 10 * 60 * 1000)
    return () => clearTimeout(t)
  }, [runningAction])

  // ── Derived counts ──
  const total          = rows.length
  const rawCount       = rows.filter((r) => r.status === 'raw').length
  const enrichedCount  = rows.filter((r) => r.status === 'enriched').length
  const draftedCount   = Object.keys(draftMap).length
  const approvedCount  = rows.filter((r) => ['approved', 'sent', 'replied'].includes(r.status)).length
  const sentCount      = rows.filter((r) => ['sent', 'replied'].includes(r.status)).length
  const writerEligible = rows.filter((r) => r.status === 'enriched' && (r.leads_global.fit_score ?? 0) >= 5).length

  // ── Enrich loop (Bug 2 fix: capture initialRaw before loop) ──
  const fireEnrich = useCallback(async () => {
    if (rawCount === 0 || runningAction === 'enrich') return
    setRunningAction('enrich')
    const initialRaw = rawCount
    let totalEnriched = 0
    let pending = initialRaw
    toast.loading(`Enriqueciendo... 0/${initialRaw}`, { id: 'enrich-bg' })
    while (pending > 0) {
      try {
        const res = await fetch('/api/agents/enrich', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: campaign.id, max: 30 }),
        })
        const j = await res.json() as { enriched?: number; remaining?: number; error?: string }
        if (j.error) { toast.error(j.error, { id: 'enrich-bg' }); break }
        totalEnriched += j.enriched ?? 0
        pending = j.remaining ?? 0
        if ((j.enriched ?? 0) === 0) break
        toast.loading(`Enriqueciendo... ${totalEnriched}/${initialRaw}`, { id: 'enrich-bg' })
      } catch {
        toast.error('Error de red al enriquecer', { id: 'enrich-bg' }); break
      }
    }
    toast.success(`✓ ${totalEnriched} leads enriquecidos`, { id: 'enrich-bg', duration: 4000 })
    setRunningAction(null)
    loadLeads()
  }, [rawCount, runningAction, campaign.id, loadLeads])

  // ── Writer loop (no denominator) ──
  const fireWriter = useCallback(async (email: string, max: number) => {
    if (runningAction === 'write') return
    setRunningAction('write')
    let totalCreated = 0
    let remaining = max
    toast.loading('Generando drafts...', { id: 'writer-bg' })
    for (let round = 0; round < 10 && remaining > 0; round++) {
      try {
        const res = await fetch('/api/agents/writer', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: campaign.id, signedByEmail: email, max: 25 }),
        })
        const j = await res.json() as { created?: number; remaining?: number; error?: string }
        if (j.error || !res.ok) { toast.error(j.error ?? 'Error', { id: 'writer-bg' }); break }
        totalCreated += j.created ?? 0
        remaining = j.remaining ?? 0
        if ((j.created ?? 0) === 0) break
        toast.loading(`Generando... ${totalCreated} drafts creados`, { id: 'writer-bg' })
      } catch {
        toast.error('Error de red al generar drafts', { id: 'writer-bg' }); break
      }
    }
    toast.success(totalCreated > 0 ? `✓ ${totalCreated} drafts generados → revisalos en Aprobación` : 'Sin nuevos drafts', { id: 'writer-bg', duration: 5000 })
    setRunningAction(null)
    loadLeads()
    loadMeta()
  }, [runningAction, campaign.id, loadLeads, loadMeta])

  async function handleReject(row: CampaignLeadFull) {
    await supabase.from('campaign_leads').update({ status: 'rejected' })
      .eq('campaign_id', row.campaign_id).eq('lead_global_id', row.lead_global_id)
    toast.success(`${row.leads_global.company} excluido`)
    loadLeads()
  }

  async function handleDeleteCampaign() {
    const { error } = await supabase.from('campaigns').delete().eq('id', campaign.id)
    if (error) { toast.error('Error al eliminar campaña'); return }
    toast.success('Campaña eliminada')
    window.location.href = '/dashboard/marketing/campaigns'
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'pipeline',   label: 'Pipeline',   icon: <Workflow size={14} /> },
    { id: 'leads',      label: `Leads${total > 0 ? ` (${total})` : ''}`, icon: <Users size={14} /> },
    { id: 'aprobacion', label: 'Aprobación', icon: <CheckSquare size={14} />, badge: pendingDrafts },
    { id: 'analytics',  label: 'Analytics',  icon: <BarChart3 size={14} /> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Modals + drawer */}
      {showSearch && <SearchModal campaign={campaign} onClose={() => setShowSearch(false)} onStarted={() => setRunningAction('search')} />}
      {showWriter && (
        <WriterModal
          campaign={campaign}
          eligibleCount={writerEligible}
          currentUserEmail={currentUserEmail}
          onClose={() => setShowWriter(false)}
          onConfirm={fireWriter}
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

      {/* Panel header with delete */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px 0', background: 'var(--s1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campaign.name}</h2>
          <span style={{ fontSize: '11px', color: 'var(--t3)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '340px' }}>
            {campaign.icp_prompt}
          </span>
        </div>
        {confirmDelete ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 500 }}>¿Eliminar campaña?</span>
            <button onClick={handleDeleteCampaign}
              style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444', background: '#EF444415', border: '1px solid #EF444440', borderRadius: 'var(--r6)', padding: '4px 10px', cursor: 'pointer' }}>
              Eliminar
            </button>
            <button onClick={() => setConfirmDelete(false)}
              style={{ fontSize: '11px', color: 'var(--t3)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r6)', padding: '4px 10px', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} title="Eliminar campaña"
            style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0, fontSize: '11px', color: 'var(--t3)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r6)', padding: '6px 10px', cursor: 'pointer', transition: 'color 120ms, border-color 120ms' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = '#EF444440' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
            <Trash2 size={13} />Eliminar
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', padding: '8px 28px 0', borderBottom: '1px solid var(--border)', background: 'var(--s1)', overflowX: 'auto' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const showBadge = tab.id === 'aprobacion' && (tab.badge ?? 0) > 0
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 14px',
              fontSize: 'var(--text-sm)', fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--acc)' : 'var(--t3)',
              background: 'none', border: 'none',
              borderBottom: isActive ? '2px solid var(--acc)' : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 120ms', position: 'relative',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--t2)' }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--t3)' }}>
              {tab.icon}{tab.label}
              {showBadge && (
                <span style={{ background: '#22C55E', color: '#000', fontSize: '10px', fontWeight: 700, borderRadius: '999px', padding: '1px 6px', lineHeight: 1.5, minWidth: '18px', textAlign: 'center' }}>
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ padding: activeTab === 'aprobacion' ? '0' : '20px 28px', flex: 1, overflowY: activeTab === 'aprobacion' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'pipeline' && (
          <PipelinePanel
            campaign={campaign}
            total={total} rawCount={rawCount} enrichedCount={enrichedCount}
            draftedCount={draftedCount} approvedCount={approvedCount} sentCount={sentCount}
            writerEligible={writerEligible} serpRequests={serpRequests}
            runningAction={runningAction}
            onSearch={() => setShowSearch(true)}
            onEnrich={fireEnrich}
            onWriter={() => { if (runningAction !== 'write') setShowWriter(true) }}
            onGoApproval={() => setActiveTab('aprobacion')}
          />
        )}
        {activeTab === 'leads' && (
          <TabLeads
            campaign={campaign}
            rows={rows}
            loading={loading}
            draftMap={draftMap}
            onReject={handleReject}
            onSelect={(r) => setSelectedRow(r)}
            onRefresh={loadLeads}
          />
        )}
        {activeTab === 'aprobacion' && <TabApproval campaign={campaign} userEmail={currentUserEmail} />}
        {activeTab === 'analytics' && (
          <TabAnalytics rows={rows} draftedCount={draftedCount} serpRequests={serpRequests} />
        )}
      </div>
    </div>
  )
}
