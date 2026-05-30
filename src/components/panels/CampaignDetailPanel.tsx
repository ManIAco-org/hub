'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart3, Users, Search, Globe, Phone, Mail,
  ExternalLink, RefreshCw, X, Loader2, MapPin, Star,
} from 'lucide-react'
import type { Campaign, Lead, LeadStatus, EnrichedData } from '@/lib/types'

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
function FitScoreBadge({ score, showNull = true }: { score: number | null | undefined; showNull?: boolean }) {
  if (score === null || score === undefined) {
    if (!showNull) return null
    return (
      <span style={{
        fontSize: '10px', color: '#525866', background: '#52586618',
        border: '1px solid #52586630', borderRadius: '6px',
        padding: '2px 7px', whiteSpace: 'nowrap', fontWeight: 500,
      }}>
        Pendiente
      </span>
    )
  }
  const [color, bg] =
    score >= 8 ? ['#22C55E', '#22C55E20'] :
    score >= 5 ? ['#EAB308', '#EAB30820'] :
                 ['#EF4444', '#EF444420']
  return (
    <span style={{
      fontSize: '11px', fontWeight: 700, color, background: bg,
      border: `1px solid ${color}40`, borderRadius: '6px',
      padding: '2px 8px', whiteSpace: 'nowrap',
    }}>
      {score}/10
    </span>
  )
}

// ── Lead Drawer ───────────────────────────────────────────────────────────────
function LeadDrawer({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const enriched = lead.enriched_data as EnrichedData | null
  const raw = lead.raw_data as Record<string, unknown> | null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)' }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
        width: '380px', maxWidth: '90vw',
        background: 'var(--s1)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto', boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '20px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--s1)', zIndex: 1,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-md)', marginBottom: '6px', wordBreak: 'break-word' }}>
              {lead.company}
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '10px', fontWeight: 600, color: STATUS_COLORS[lead.status],
                background: `${STATUS_COLORS[lead.status]}18`, border: `1px solid ${STATUS_COLORS[lead.status]}40`,
                borderRadius: '6px', padding: '2px 8px',
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: STATUS_COLORS[lead.status] }} />
                {STATUS_LABELS[lead.status]}
              </span>
              <FitScoreBadge score={lead.fit_score} />
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: '4px', marginLeft: '8px', flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t1)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Contact info */}
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Datos de contacto</p>
            {lead.website && (
              <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--acc)', fontSize: 'var(--text-xs)', textDecoration: 'none', wordBreak: 'break-all' }}>
                <Globe size={12} />
                {lead.website.replace(/^https?:\/\//, '')}
                <ExternalLink size={10} style={{ flexShrink: 0 }} />
              </a>
            )}
            {lead.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--t2)', fontSize: 'var(--text-xs)' }}>
                <Phone size={12} color="var(--t3)" /> {lead.phone}
              </div>
            )}
            {lead.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--t2)', fontSize: 'var(--text-xs)' }}>
                <Mail size={12} color="var(--t3)" /> {lead.email}
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
                <Star size={12} />
                {String(raw.rating)} ★ ({String(raw.reviews ?? 0)} reseñas)
              </div>
            )}
          </div>

          {/* Enrichment data */}
          {enriched && lead.status === 'enriched' && (
            <div style={{ background: 'var(--acc-d)', border: '1px solid var(--acc-b)', borderRadius: 'var(--r8)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--acc)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Enriquecimiento</p>
              {enriched.bio && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t1)', lineHeight: 1.5 }}>{enriched.bio}</p>
              )}
              {enriched.contact_name && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)' }}>
                  <span style={{ color: 'var(--t3)', marginRight: '4px' }}>Contacto:</span>
                  {enriched.contact_name}
                </div>
              )}
              {enriched.linkedin && (
                <a href={enriched.linkedin} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0A66C2', fontSize: 'var(--text-xs)', textDecoration: 'none' }}>
                  <ExternalLink size={11} /> LinkedIn
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

          {/* Enrichment error */}
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

// ── Enrich Modal ──────────────────────────────────────────────────────────────
function EnrichModal({ campaign, rawCount, onClose, onDone }: {
  campaign: Campaign
  rawCount: number
  onClose: () => void
  onDone: () => void
}) {
  const [max, setMax] = useState(Math.min(rawCount, 20))
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ enriched: number; failed: number; total: number; errors?: string[] } | null>(null)

  // Haiku: ~$0.001 per lead (scrape + prompt)
  const costEst = (max * 0.001).toFixed(3)
  const timeEst = max <= 10 ? '~1 min' : max <= 20 ? '~2 min' : '~3-4 min'

  async function handleEnrich() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/agents/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, max }),
      })
      const json = await res.json() as { enriched?: number; failed?: number; total?: number; errors?: string[]; error?: string }
      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Error al enriquecer')
      } else {
        setResult({ enriched: json.enriched ?? 0, failed: json.failed ?? 0, total: json.total ?? max, errors: json.errors })
        if ((json.enriched ?? 0) > 0) toast.success(`${json.enriched} leads enriquecidos con Claude`)
        onDone()
      }
    } catch {
      toast.error('Error de red al enriquecer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={!loading ? onClose : undefined}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--s1)', border: '1px solid var(--border)',
          borderRadius: 'var(--r12)', padding: '24px',
          width: '100%', maxWidth: '440px',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🧠</span>
            <h3 style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-md)' }}>Enriquecer leads</h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{ background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer', color: 'var(--t3)', display: 'flex', padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Stats */}
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '12px', display: 'flex', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--acc)', lineHeight: 1 }}>{rawCount}</p>
            <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>leads raw</p>
          </div>
          <div style={{ flex: 1, fontSize: 'var(--text-xs)', color: 'var(--t2)', lineHeight: 1.5 }}>
            Visita el sitio web de cada lead y usa Claude Haiku para extraer contacto, descripción y score de fit con tu ICP.
          </div>
        </div>

        {/* How many */}
        <div>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
            Cuántos procesar
          </label>
          <select
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}
            className="input"
            style={{ height: '38px' }}
            disabled={loading || rawCount === 0}
          >
            {[5, 10, 20, 30, 50].filter((n) => n <= Math.max(rawCount, 5)).map((n) => (
              <option key={n} value={n}>{n} leads</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '11px', color: 'var(--t3)' }}>
              💰 Costo Claude Haiku: <strong style={{ color: 'var(--t2)' }}>~${costEst}</strong>
            </p>
            <p style={{ fontSize: '11px', color: 'var(--t3)' }}>
              ⏱ Duración estimada: <strong style={{ color: 'var(--t2)' }}>{timeEst}</strong>
            </p>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div style={{
            background: result.failed > 0 ? 'var(--s2)' : 'var(--acc-d)',
            border: `1px solid ${result.failed > 0 ? 'var(--border)' : 'var(--acc-b)'}`,
            borderRadius: 'var(--r8)', padding: '12px',
            display: 'flex', gap: '20px', flexWrap: 'wrap',
          }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--acc)', lineHeight: 1 }}>{result.enriched}</p>
              <p style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '2px' }}>enriquecidos</p>
            </div>
            {result.failed > 0 && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#EF4444', lineHeight: 1 }}>{result.failed}</p>
                <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>con errores</p>
              </div>
            )}
            {result.errors && result.errors.length > 0 && (
              <div style={{ width: '100%', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                {result.errors.map((e, i) => (
                  <p key={i} style={{ fontSize: '10px', color: 'var(--t3)', fontFamily: 'var(--mono)' }}>{e}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={loading} className="btn-secondary" style={{ fontSize: 'var(--text-sm)' }}>
            {result ? 'Cerrar' : 'Cancelar'}
          </button>
          {!result && (
            <button
              onClick={handleEnrich}
              disabled={loading || rawCount === 0}
              className="btn-primary"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: 'var(--text-sm)', opacity: loading || rawCount === 0 ? 0.7 : 1,
                minWidth: '150px', justifyContent: 'center',
                background: 'var(--acc)', color: '#000',
              }}
            >
              {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <span>🧠</span>}
              {loading ? 'Enriqueciendo...' : 'Enriquecer'}
            </button>
          )}
          {result && result.failed > 0 && (
            <button
              onClick={handleEnrich}
              disabled={loading}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)' }}
            >
              <RefreshCw size={13} />
              Reintentar errores
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Scrape Modal ──────────────────────────────────────────────────────────────
function ScrapeModal({ campaign, onClose, onDone }: {
  campaign: Campaign
  onClose: () => void
  onDone: () => void
}) {
  const [count, setCount] = useState(20)
  const [requireWebsite, setRequireWebsite] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    inserted: number; skipped: number; requests?: number; query?: string; location?: string
  } | null>(null)

  const requestsEstimate = Math.ceil(count / 20)
  const costEstimate = (requestsEstimate * 0.01).toFixed(2)

  async function handleScrape() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/agents/lead-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, count, requireWebsite }),
      })
      const json = await res.json() as {
        inserted?: number; skipped_duplicates?: number; requests?: number
        error?: string; query?: string; location?: string
      }
      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Error al scrapear')
      } else {
        setResult({ inserted: json.inserted ?? 0, skipped: json.skipped_duplicates ?? 0, requests: json.requests, query: json.query, location: json.location })
        if ((json.inserted ?? 0) > 0) toast.success(`${json.inserted} leads agregados desde Google Maps`)
        onDone()
      }
    } catch {
      toast.error('Error de red al scrapear')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 'var(--r12)', padding: '24px', width: '100%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search size={18} color="var(--acc)" />
            <h3 style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-md)' }}>Scrapear leads</h3>
          </div>
          <button onClick={onClose} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '12px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Query de búsqueda</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t2)', fontStyle: 'italic' }}>&ldquo;{campaign.icp_prompt}&rdquo;</p>
        </div>

        <div>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>Cantidad de resultados</label>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="input" style={{ height: '38px' }} disabled={loading}>
            {[10, 20, 30, 50, 100].map((n) => <option key={n} value={n}>{n} leads</option>)}
          </select>
          {count > 20 ? (
            <p style={{ fontSize: '11px', color: 'var(--warn)', marginTop: '4px' }}>
              ⚡ {requestsEstimate} requests SerpAPI (~${costEstimate}) · duplicados se ignoran
            </p>
          ) : (
            <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '4px' }}>1 request SerpAPI (~$0.01) · duplicados se ignoran</p>
          )}
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
          <input type="checkbox" checked={requireWebsite} onChange={(e) => setRequireWebsite(e.target.checked)} disabled={loading} style={{ width: '16px', height: '16px', accentColor: 'var(--acc)', cursor: 'pointer', marginTop: '1px' }} />
          <div>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t1)', lineHeight: 1.3 }}>
              Solo leads con sitio web <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(recomendado)</span>
            </p>
            <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px', lineHeight: 1.4 }}>
              {requireWebsite ? 'Descarta negocios sin web — mejor calidad para enriquecimiento.' : 'Incluye negocios sin web — útil para WhatsApp directo por teléfono.'}
            </p>
          </div>
        </label>

        {result && (result.query || result.location) && (
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '10px 12px' }}>
            <p style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '2px' }}>Búsqueda Google Maps</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)' }}>
              <strong style={{ color: 'var(--acc)' }}>&ldquo;{result.query}&rdquo;</strong>
              {result.location && <> cerca de <strong>{result.location}</strong></>}
            </p>
          </div>
        )}

        {result && (
          <div style={{ background: 'var(--acc-d)', border: '1px solid var(--acc-b)', borderRadius: 'var(--r8)', padding: '12px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', minWidth: '60px' }}>
              <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--acc)', lineHeight: 1 }}>{result.inserted}</p>
              <p style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '2px' }}>insertados</p>
            </div>
            <div style={{ textAlign: 'center', minWidth: '60px' }}>
              <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--t3)', lineHeight: 1 }}>{result.skipped}</p>
              <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>ignorados</p>
            </div>
            {(result.requests ?? 1) > 1 && (
              <div style={{ textAlign: 'center', minWidth: '60px' }}>
                <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--t2)', lineHeight: 1 }}>{result.requests}</p>
                <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>requests</p>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={loading} className="btn-secondary" style={{ fontSize: 'var(--text-sm)' }}>{result ? 'Cerrar' : 'Cancelar'}</button>
          {!result && (
            <button onClick={handleScrape} disabled={loading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', opacity: loading ? 0.7 : 1, minWidth: '140px', justifyContent: 'center' }}>
              {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
              {loading ? 'Buscando...' : 'Scrapear'}
            </button>
          )}
          {result && (
            <button onClick={handleScrape} disabled={loading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)' }}>
              <RefreshCw size={14} />
              Scrapear más
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tab: Resumen ──────────────────────────────────────────────────────────────
function TabResumen({ campaign, leadCount }: { campaign: Campaign; leadCount: number }) {
  const CHANNEL_LABELS = { whatsapp: 'WhatsApp', email: 'Email', both: 'WhatsApp + Email' }
  const STATUS_BADGE   = { draft: 'badge badge-warn', active: 'badge badge-acc', paused: 'badge badge-warn', closed: 'badge badge-ok' }
  const STATUS_LABELS_CAM = { draft: 'Borrador', active: 'Activa', paused: 'Pausada', closed: 'Cerrada' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Estado', value: <span className={STATUS_BADGE[campaign.status]}>{STATUS_LABELS_CAM[campaign.status]}</span> },
          { label: 'Canal',  value: CHANNEL_LABELS[campaign.channel] },
          { label: 'Leads',  value: <strong style={{ color: 'var(--acc)', fontSize: '1.3em' }}>{leadCount}</strong> },
          { label: 'Creada', value: new Date(campaign.created_at).toLocaleDateString('es-AR') },
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

function TabLeads({ campaign }: { campaign: Campaign }) {
  const supabase = createClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all')
  const [minScore, setMinScore] = useState(0)
  const [sortBy, setSortBy] = useState<SortBy>('fit_desc')
  const [showScrape, setShowScrape] = useState(false)
  const [showEnrich, setShowEnrich] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const loadLeads = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('created_at', { ascending: false })
      .limit(200)
    setLeads((data ?? []) as Lead[])
    setLoading(false)
  }, [campaign.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadLeads() }, [loadLeads])

  // Realtime: INSERT + UPDATE
  useEffect(() => {
    const channel = supabase
      .channel(`leads-all:${campaign.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads', filter: `campaign_id=eq.${campaign.id}` }, () => loadLeads())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads', filter: `campaign_id=eq.${campaign.id}` }, () => loadLeads())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [campaign.id, loadLeads]) // eslint-disable-line react-hooks/exhaustive-deps

  // Raw count for enrich button
  const rawCount = leads.filter((l) => l.status === 'raw').length
  const enrichedCount = leads.filter((l) => l.status === 'enriched').length

  // Client-side filter + sort
  const displayed = [...leads]
    .filter((l) => filterStatus === 'all' || l.status === filterStatus)
    .filter((l) => minScore === 0 || (l.fit_score ?? 0) >= minScore)
    .sort((a, b) => {
      if (sortBy === 'fit_desc')    return (b.fit_score ?? -1) - (a.fit_score ?? -1)
      if (sortBy === 'fit_asc')     return (a.fit_score ?? 11) - (b.fit_score ?? 11)
      if (sortBy === 'name_asc')    return a.company.localeCompare(b.company, 'es')
      return 0  // created_desc: already sorted by loadLeads
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
      {showScrape && (
        <ScrapeModal campaign={campaign} onClose={() => setShowScrape(false)} onDone={() => { setShowScrape(false); loadLeads() }} />
      )}
      {showEnrich && (
        <EnrichModal campaign={campaign} rawCount={rawCount} onClose={() => setShowEnrich(false)} onDone={() => { setShowEnrich(false); loadLeads() }} />
      )}
      {selectedLead && (
        <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* Status filter */}
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as LeadStatus | 'all')}
          className="input" style={{ height: '36px', fontSize: 'var(--text-xs)', width: 'auto', minWidth: '140px' }}>
          {STATUS_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Sort by */}
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="input" style={{ height: '36px', fontSize: 'var(--text-xs)', width: 'auto', minWidth: '150px' }}>
          <option value="fit_desc">Score ↓ mayor primero</option>
          <option value="fit_asc">Score ↑ menor primero</option>
          <option value="created_desc">Más reciente</option>
          <option value="name_asc">Nombre A→Z</option>
        </select>

        {/* Min score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '11px', color: 'var(--t3)', whiteSpace: 'nowrap' }}>Score ≥</label>
          <input
            type="number" min={0} max={10} value={minScore}
            onChange={(e) => setMinScore(Math.min(10, Math.max(0, Number(e.target.value))))}
            className="input"
            style={{ height: '36px', width: '52px', fontSize: 'var(--text-xs)', textAlign: 'center' }}
          />
        </div>

        <div style={{ flex: 1 }} />

        {/* Refresh */}
        <button onClick={loadLeads}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r6)', cursor: 'pointer', color: 'var(--t3)', display: 'flex', alignItems: 'center', padding: '7px 10px', transition: 'color 120ms, border-color 120ms' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--t1)'; e.currentTarget.style.borderColor = 'var(--t2)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          title="Actualizar">
          <RefreshCw size={12} />
        </button>

        {/* Enrich button */}
        <button
          onClick={() => setShowEnrich(true)}
          disabled={rawCount === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', fontSize: 'var(--text-sm)',
            background: rawCount > 0 ? 'var(--acc)' : 'var(--s3)',
            color: rawCount > 0 ? '#0A0A0A' : 'var(--t3)',
            border: 'none', borderRadius: 'var(--r6)', cursor: rawCount > 0 ? 'pointer' : 'default',
            fontWeight: 600, transition: 'opacity 120ms',
            opacity: rawCount > 0 ? 1 : 0.5,
          }}
          title={rawCount === 0 ? 'No hay leads raw para enriquecer' : `Enriquecer ${rawCount} leads con Claude`}
        >
          <span style={{ fontSize: '14px' }}>🧠</span>
          Enriquecer ({rawCount} raw)
        </button>

        {/* Scrape button */}
        <button onClick={() => setShowScrape(true)} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', padding: '8px 14px' }}>
          <Search size={14} />
          Scrapear
        </button>
      </div>

      {/* Stats row */}
      {!loading && leads.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--t3)' }}>
          <span>{leads.length} leads total</span>
          {rawCount > 0 && <span style={{ color: '#525866' }}>· {rawCount} sin procesar</span>}
          {enrichedCount > 0 && <span style={{ color: '#06B6D4' }}>· {enrichedCount} enriquecidos</span>}
          {displayed.length !== leads.length && <span>· {displayed.length} visibles (filtro activo)</span>}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>
          Cargando leads...
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '60px 20px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)' }}>
          <Users size={28} color="var(--t3)" />
          <p style={{ fontWeight: 600, color: 'var(--t2)', fontSize: 'var(--text-sm)' }}>
            {leads.length === 0 ? 'Sin leads todavía' : 'Sin resultados para este filtro'}
          </p>
          {leads.length === 0 && (
            <button onClick={() => setShowScrape(true)} className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', marginTop: '4px' }}>
              <Search size={13} /> Scrapear leads
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)', overflow: 'hidden' }}>
          {/* Table header: Empresa | Ciudad | Website | Score | Estado */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 80px 95px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--s3)' }}>
            {['Empresa', 'Ciudad', 'Sitio web', 'Score', 'Estado'].map((h) => (
              <span key={h} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>

          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {displayed.map((lead, i) => (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                title={lead.enriched_data ? `${(lead.enriched_data as EnrichedData).bio ?? ''}\n${(lead.enriched_data as EnrichedData).fit_reason ?? ''}`.trim() : undefined}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 80px 95px',
                  padding: '10px 16px',
                  borderBottom: i < displayed.length - 1 ? '1px solid var(--border)' : 'none',
                  alignItems: 'center', cursor: 'pointer', transition: 'background 100ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--s3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Empresa */}
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 'var(--text-xs)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lead.company}
                  </span>
                  {(lead.enriched_data as EnrichedData)?.bio && (
                    <span style={{ fontSize: '10px', color: 'var(--t3)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                      {(lead.enriched_data as EnrichedData).bio}
                    </span>
                  )}
                </div>

                {/* Ciudad */}
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lead.city ?? '—'}
                </span>

                {/* Website */}
                <span style={{ fontSize: 'var(--text-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lead.website ? (
                    <a
                      href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: 'var(--acc)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Globe size={11} />
                      {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 30)}
                      <ExternalLink size={9} style={{ flexShrink: 0 }} />
                    </a>
                  ) : lead.phone ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--t2)' }}>
                      <Phone size={11} color="var(--t3)" />{lead.phone}
                    </span>
                  ) : <span style={{ color: 'var(--t3)' }}>—</span>}
                </span>

                {/* Fit Score */}
                <FitScoreBadge score={lead.fit_score} />

                {/* Status */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '10px', fontWeight: 600,
                  color: STATUS_COLORS[lead.status],
                  background: `${STATUS_COLORS[lead.status]}18`,
                  border: `1px solid ${STATUS_COLORS[lead.status]}40`,
                  borderRadius: '6px', padding: '2px 7px', whiteSpace: 'nowrap',
                }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: STATUS_COLORS[lead.status], flexShrink: 0 }} />
                  {STATUS_LABELS[lead.status]}
                </span>
              </div>
            ))}
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
  { id: 'leads',   label: 'Leads',   icon: <Users size={14} />     },
]

export function CampaignDetailPanel({ campaign, initialLeadCount }: {
  campaign: Campaign
  initialLeadCount: number
}) {
  const [activeTab, setActiveTab] = useState<Tab>('leads')
  const [leadCount, setLeadCount] = useState(initialLeadCount)
  const supabase = createClient()

  useEffect(() => {
    if (activeTab === 'resumen') {
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('campaign_id', campaign.id)
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
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '12px 14px', fontSize: 'var(--text-sm)',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--acc)' : 'var(--t3)',
              background: 'none', border: 'none',
              borderBottom: isActive ? '2px solid var(--acc)' : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 120ms',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--t2)' }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--t3)' }}
            >
              {tab.icon}{tab.label}
            </button>
          )
        })}
      </div>

      <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>
        {activeTab === 'resumen' && <TabResumen campaign={campaign} leadCount={leadCount} />}
        {activeTab === 'leads'   && <TabLeads   campaign={campaign} />}
      </div>
    </div>
  )
}
