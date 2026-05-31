'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart3, Users, Search, Globe, Phone, Mail,
  ExternalLink, RefreshCw, X, Loader2, MapPin, Star, PenLine,
} from 'lucide-react'
import type { Campaign, CampaignLeadFull, LeadGlobal, LeadStatus, EnrichedData } from '@/lib/types'

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
function LeadDrawer({ lead, status, onClose }: { lead: LeadGlobal; status: LeadStatus; onClose: () => void }) {
  const enriched = lead.enriched_data as EnrichedData | null
  const raw = lead.raw_data as Record<string, unknown> | null

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
        </div>
      </div>
    </>
  )
}

// ── Nueva Búsqueda Modal (scrape + enrich integrado) ──────────────────────────
function SearchModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const [count, setCount] = useState(20)
  const [requireWebsite, setRequireWebsite] = useState(true)
  const [autoEnrich, setAutoEnrich] = useState(true)
  const [loading, setLoading] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)

  const reqsEst = Math.ceil(count / 20)
  const serpCost = (reqsEst * 0.01).toFixed(2)
  const enrichCost = autoEnrich ? (count * 0.001).toFixed(3) : '0.000'

  async function handleStart() {
    setLoading(true)
    try {
      const res = await fetch('/api/agents/campaigns/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, count, requireWebsite, autoEnrich }),
      })
      const json = await res.json() as { job_id?: string; error?: string }
      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Error iniciando búsqueda')
      } else {
        setJobId(json.job_id ?? null)
        toast.success('🔍 Búsqueda iniciada en background. Te avisamos cuando termine.', { duration: 6000 })
        onClose()
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setLoading(false)
    }
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
          <button onClick={onClose} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', padding: '4px' }}><X size={16} /></button>
        </div>

        {/* ICP preview */}
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '12px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>ICP</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t2)', fontStyle: 'italic' }}>&ldquo;{campaign.icp_prompt}&rdquo;</p>
        </div>

        {/* Count */}
        <div>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>Cantidad de leads</label>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="input" style={{ height: '38px' }} disabled={loading}>
            {[10, 20, 30, 50, 100].map((n) => <option key={n} value={n}>{n} leads</option>)}
          </select>
          {count > 20
            ? <p style={{ fontSize: '11px', color: 'var(--warn)', marginTop: '4px' }}>⚡ {reqsEst} requests SerpAPI (~${serpCost})</p>
            : <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '4px' }}>1 request SerpAPI (~$0.01)</p>
          }
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={requireWebsite} onChange={(e) => setRequireWebsite(e.target.checked)} disabled={loading}
              style={{ width: '16px', height: '16px', accentColor: 'var(--acc)', marginTop: '1px' }} />
            <div>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t1)' }}>Solo leads con sitio web <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(recomendado)</span></p>
              <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '1px' }}>Mejor calidad para enriquecimiento y outreach personalizado.</p>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoEnrich} onChange={(e) => setAutoEnrich(e.target.checked)} disabled={loading}
              style={{ width: '16px', height: '16px', accentColor: '#22C55E', marginTop: '1px' }} />
            <div>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t1)' }}>
                <span style={{ fontSize: '14px', marginRight: '4px' }}>🧠</span>
                Enriquecer automáticamente <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(recomendado)</span>
              </p>
              <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '1px' }}>
                Claude Haiku extrae contacto, bio y fit score. ~${enrichCost} adicional.
              </p>
            </div>
          </label>
        </div>

        {/* Cost summary */}
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '10px 12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '10px', color: 'var(--t3)' }}>Costo total estimado</p>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--t1)' }}>
              ~${(parseFloat(serpCost) + parseFloat(enrichCost)).toFixed(3)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '10px', color: 'var(--t3)' }}>Tiempo estimado</p>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--t2)' }}>
              {count <= 10 ? '~1 min' : count <= 20 ? '~2 min' : '~3-5 min'}
            </p>
          </div>
          <div style={{ flex: 1, fontSize: '11px', color: 'var(--t3)', lineHeight: 1.4 }}>
            Corre en background — podés navegar libremente. Recibirás una notificación al terminar.
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={loading} className="btn-secondary" style={{ fontSize: 'var(--text-sm)' }}>Cancelar</button>
          <button onClick={handleStart} disabled={loading} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', opacity: loading ? 0.7 : 1, minWidth: '130px', justifyContent: 'center' }}>
            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
            {loading ? 'Iniciando...' : 'Iniciar búsqueda'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Writer Modal ──────────────────────────────────────────────────────────────
function WriterModal({ campaign, eligibleCount, currentUserEmail, onClose }: {
  campaign: Campaign
  eligibleCount: number
  currentUserEmail: string
  onClose: () => void
}) {
  const [signedByEmail, setSignedByEmail] = useState(currentUserEmail)
  const [loading, setLoading] = useState(false)

  const SIGNERS = [
    { email: 'franco.sanmartin@maniaco.online', name: 'Franco' },
    { email: 'luis.giannasi@maniaco.online',    name: 'Lucho' },
    { email: 'noelia.bottallo@maniaco.online',  name: 'Noe' },
  ]

  const estimatedCost = (eligibleCount * 0.004).toFixed(3)

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch('/api/agents/writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, signedByEmail }),
      })
      const json = await res.json() as { created?: number; skipped?: number; failed?: number; error?: string }
      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Error generando drafts')
      } else {
        const parts = []
        if (json.created)  parts.push(`${json.created} draft${json.created !== 1 ? 's' : ''} generados`)
        if (json.skipped)  parts.push(`${json.skipped} ya tenían draft`)
        if (json.failed)   parts.push(`${json.failed} fallaron`)
        toast.success(parts.join(' · ') || 'Sin cambios')
        onClose()
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setLoading(false)
    }
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
          <button onClick={onClose} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', padding: '4px' }}><X size={16} /></button>
        </div>

        {/* Info */}
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '12px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Canal</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t2)' }}>
            {campaign.channel === 'whatsapp' ? 'WhatsApp (≤300 caracteres)' : campaign.channel === 'email' ? 'Email (asunto + cuerpo)' : 'WhatsApp (≤300 caracteres)'}
          </p>
        </div>

        {/* Signer */}
        <div>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>Firmante</label>
          <select value={signedByEmail} onChange={(e) => setSignedByEmail(e.target.value)}
            className="input" style={{ height: '38px' }} disabled={loading}>
            {SIGNERS.map((s) => (
              <option key={s.email} value={s.email}>{s.name} ({s.email})</option>
            ))}
          </select>
          <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '4px' }}>El mensaje firma en primera persona del socio seleccionado.</p>
        </div>

        {/* Cost / eligible */}
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '10px 12px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '10px', color: 'var(--t3)' }}>Leads elegibles</p>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--t1)' }}>{eligibleCount > 0 ? eligibleCount : '—'}</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', color: 'var(--t3)' }}>Costo estimado</p>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--t1)' }}>~${estimatedCost}</p>
          </div>
          <div style={{ flex: 1, fontSize: '11px', color: 'var(--t3)', lineHeight: 1.4 }}>
            Claude Sonnet · solo leads enriquecidos con score ≥ 5/10 · omite leads con draft activo.
          </div>
        </div>

        {eligibleCount === 0 && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--warn)', textAlign: 'center' }}>
            No hay leads enriquecidos con score ≥ 5. Enriquecé primero desde "Nueva búsqueda".
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={loading} className="btn-secondary" style={{ fontSize: 'var(--text-sm)' }}>Cancelar</button>
          <button onClick={handleGenerate} disabled={loading || eligibleCount === 0} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', opacity: (loading || eligibleCount === 0) ? 0.7 : 1, minWidth: '150px', justifyContent: 'center' }}>
            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <PenLine size={14} />}
            {loading ? 'Generando...' : `Generar${eligibleCount > 0 ? ` (${eligibleCount})` : ''}`}
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
  }, [campaign.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadLeads() }, [loadLeads])

  // Realtime for both INSERT and UPDATE on campaign_leads
  useEffect(() => {
    const ch = supabase.channel(`cl-${campaign.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'campaign_leads', filter: `campaign_id=eq.${campaign.id}` }, () => loadLeads())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'campaign_leads', filter: `campaign_id=eq.${campaign.id}` }, () => loadLeads())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads_global' }, () => loadLeads())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [campaign.id, loadLeads]) // eslint-disable-line react-hooks/exhaustive-deps

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
      {showSearch && <SearchModal campaign={campaign} onClose={() => setShowSearch(false)} />}
      {showWriter && (
        <WriterModal
          campaign={campaign}
          eligibleCount={writerEligible}
          currentUserEmail={currentUserEmail}
          onClose={() => setShowWriter(false)}
        />
      )}
      {selectedRow && (
        <LeadDrawer
          lead={selectedRow.leads_global}
          status={selectedRow.status}
          onClose={() => setSelectedRow(null)}
        />
      )}

      {/* Controls */}
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
        <button onClick={loadLeads}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r6)', cursor: 'pointer', color: 'var(--t3)', display: 'flex', alignItems: 'center', padding: '7px 10px', transition: 'color 120ms, border-color 120ms' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--t1)'; e.currentTarget.style.borderColor = 'var(--t2)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
          <RefreshCw size={12} />
        </button>
        <button onClick={() => setShowSearch(true)} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', padding: '8px 16px' }}>
          <Search size={14} />
          Nueva búsqueda
        </button>
        <button onClick={() => setShowWriter(true)} className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', padding: '8px 16px', position: 'relative' }}>
          <PenLine size={14} />
          Generar drafts
          {writerEligible > 0 && (
            <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--acc)', color: '#000', fontSize: '10px', fontWeight: 700, borderRadius: '999px', padding: '1px 5px', lineHeight: 1.4 }}>
              {writerEligible}
            </span>
          )}
        </button>
      </div>

      {/* Stats */}
      {!loading && rows.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--t3)' }}>
          <span>{rows.length} leads total</span>
          {rawCount > 0      && <span style={{ color: '#525866' }}>· {rawCount} sin procesar</span>}
          {enrichedCount > 0 && <span style={{ color: '#06B6D4' }}>· {enrichedCount} enriquecidos</span>}
          {displayed.length !== rows.length && <span>· {displayed.length} visibles (filtros activos)</span>}
        </div>
      )}

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
                    <span style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 'var(--text-xs)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.company}
                    </span>
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

// ── Main Panel ────────────────────────────────────────────────────────────────
type Tab = 'resumen' | 'leads'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'resumen', label: 'Resumen', icon: <BarChart3 size={14} /> },
  { id: 'leads',   label: 'Leads',   icon: <Users size={14} /> },
]

export function CampaignDetailPanel({ campaign, initialLeadCount }: {
  campaign: Campaign
  initialLeadCount: number
}) {
  const [activeTab, setActiveTab] = useState<Tab>('leads')
  const [leadCount, setLeadCount] = useState(initialLeadCount)
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('franco.sanmartin@maniaco.online')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setCurrentUserEmail(data.user.email)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 14px',
              fontSize: 'var(--text-sm)', fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--acc)' : 'var(--t3)',
              background: 'none', border: 'none',
              borderBottom: isActive ? '2px solid var(--acc)' : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 120ms',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--t2)' }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--t3)' }}>
              {tab.icon}{tab.label}
            </button>
          )
        })}
      </div>
      <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>
        {activeTab === 'resumen' && <TabResumen campaign={campaign} leadCount={leadCount} />}
        {activeTab === 'leads'   && <TabLeads   campaign={campaign} currentUserEmail={currentUserEmail} />}
      </div>
    </div>
  )
}
