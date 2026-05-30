'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart3, Users, Settings2, Search, Globe, Phone, Mail,
  ExternalLink, RefreshCw, X, Loader2,
} from 'lucide-react'
import type { Campaign, Lead, LeadStatus } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────
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

  // Cost preview: each SerpAPI Maps request = $0.01, max 20 results each
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
        setResult({
          inserted:  json.inserted ?? 0,
          skipped:   json.skipped_duplicates ?? 0,
          requests:  json.requests,
          query:     json.query,
          location:  json.location,
        })
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
    <div
      onClick={onClose}
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
          width: '100%', maxWidth: '460px',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search size={18} color="var(--acc)" />
            <h3 style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-md)' }}>Scrapear leads</h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ICP preview */}
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '12px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Query de búsqueda</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t2)', fontStyle: 'italic' }}>&ldquo;{campaign.icp_prompt}&rdquo;</p>
        </div>

        {/* Count selector */}
        <div>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
            Cantidad de resultados
          </label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="input"
            style={{ height: '38px' }}
            disabled={loading}
          >
            {[10, 20, 30, 50, 100].map((n) => (
              <option key={n} value={n}>{n} leads</option>
            ))}
          </select>

          {/* Cost warning for >20 results (= >1 SerpAPI request) */}
          {count > 20 ? (
            <p style={{ fontSize: '11px', color: 'var(--warn)', marginTop: '4px' }}>
              ⚡ {requestsEstimate} requests SerpAPI (~${costEstimate}) · duplicados se ignoran
            </p>
          ) : (
            <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '4px' }}>
              1 request SerpAPI (~$0.01) · duplicados se ignoran
            </p>
          )}
        </div>

        {/* requireWebsite toggle */}
        <label
          style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}
          title="Si está activado, descarta negocios sin web. Mejor calidad para enriquecer y outreach personalizado. Si lo desactivás, trae también los que solo tienen teléfono (útil para WhatsApp directo)."
        >
          <div style={{ position: 'relative', flexShrink: 0, marginTop: '1px' }}>
            <input
              type="checkbox"
              checked={requireWebsite}
              onChange={(e) => setRequireWebsite(e.target.checked)}
              disabled={loading}
              style={{ width: '16px', height: '16px', accentColor: 'var(--acc)', cursor: 'pointer' }}
            />
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t1)', lineHeight: 1.3 }}>
              Solo leads con sitio web <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(recomendado)</span>
            </p>
            <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px', lineHeight: 1.4 }}>
              {requireWebsite
                ? 'Descarta negocios sin web — mejor calidad para enriquecimiento y outreach personalizado.'
                : 'Incluye negocios sin web — más volumen, útil para WhatsApp directo por teléfono.'}
            </p>
          </div>
        </label>

        {/* Parsed query preview (after scrape) */}
        {result && (result.query || result.location) && (
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '10px 12px' }}>
            <p style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '2px' }}>Búsqueda Google Maps</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)' }}>
              <strong style={{ color: 'var(--acc)' }}>&ldquo;{result.query}&rdquo;</strong>
              {result.location && <> cerca de <strong>{result.location}</strong></>}
            </p>
          </div>
        )}

        {/* Result counts */}
        {result && (
          <div style={{
            background: 'var(--acc-d)', border: '1px solid var(--acc-b)',
            borderRadius: 'var(--r8)', padding: '12px',
            display: 'flex', gap: '20px', flexWrap: 'wrap',
          }}>
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

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={loading} className="btn-secondary" style={{ fontSize: 'var(--text-sm)' }}>
            {result ? 'Cerrar' : 'Cancelar'}
          </button>
          {!result && (
            <button
              onClick={handleScrape}
              disabled={loading}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', opacity: loading ? 0.7 : 1, minWidth: '140px', justifyContent: 'center' }}
            >
              {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
              {loading ? 'Buscando...' : 'Scrapear'}
            </button>
          )}
          {result && (
            <button
              onClick={handleScrape}
              disabled={loading}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)' }}
            >
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
  const STATUS_BADGE = {
    draft:  'badge badge-warn',
    active: 'badge badge-acc',
    paused: 'badge badge-warn',
    closed: 'badge badge-ok',
  }
  const STATUS_LABELS_CAM = { draft: 'Borrador', active: 'Activa', paused: 'Pausada', closed: 'Cerrada' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Estado',   value: <span className={STATUS_BADGE[campaign.status]}>{STATUS_LABELS_CAM[campaign.status]}</span> },
          { label: 'Canal',    value: CHANNEL_LABELS[campaign.channel] },
          { label: 'Leads',    value: <strong style={{ color: 'var(--acc)', fontSize: '1.3em' }}>{leadCount}</strong> },
          { label: 'Creada',   value: new Date(campaign.created_at).toLocaleDateString('es-AR') },
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
function TabLeads({ campaign }: { campaign: Campaign }) {
  const supabase = createClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all')
  const [showScrape, setShowScrape] = useState(false)
  const reloadRef = useRef(0)

  const loadLeads = useCallback(async () => {
    setLoading(true)
    const q = supabase
      .from('leads')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (filterStatus !== 'all') {
      q.eq('status', filterStatus)
    }

    const { data } = await q
    setLeads((data ?? []) as Lead[])
    setLoading(false)
  }, [campaign.id, filterStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadLeads() }, [loadLeads, reloadRef.current])

  // Realtime subscription for new leads
  useEffect(() => {
    const channel = supabase
      .channel(`leads:${campaign.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'leads',
        filter: `campaign_id=eq.${campaign.id}`,
      }, () => { loadLeads() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [campaign.id, loadLeads]) // eslint-disable-line react-hooks/exhaustive-deps

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
        <ScrapeModal
          campaign={campaign}
          onClose={() => setShowScrape(false)}
          onDone={() => { setShowScrape(false); loadLeads() }}
        />
      )}

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as LeadStatus | 'all')}
          className="input"
          style={{ height: '36px', fontSize: 'var(--text-xs)', width: 'auto', minWidth: '150px' }}
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        <button
          onClick={loadLeads}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r6)', cursor: 'pointer', color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 12px', fontSize: 'var(--text-xs)', transition: 'color 120ms, border-color 120ms' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--t1)'; e.currentTarget.style.borderColor = 'var(--t2)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          title="Actualizar"
        >
          <RefreshCw size={12} />
        </button>

        <button
          onClick={() => setShowScrape(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', padding: '8px 16px' }}
        >
          <Search size={14} />
          Scrapear leads
        </button>
      </div>

      {/* Leads count */}
      {!loading && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)' }}>
          {leads.length} lead{leads.length !== 1 ? 's' : ''} {filterStatus !== 'all' ? `· filtro: ${filterStatus}` : ''}
        </p>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>
          Cargando leads...
        </div>
      ) : leads.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '12px', padding: '60px 20px',
          background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)',
        }}>
          <Users size={28} color="var(--t3)" />
          <p style={{ fontWeight: 600, color: 'var(--t2)', fontSize: 'var(--text-sm)' }}>Sin leads todavía</p>
          <p style={{ color: 'var(--t3)', fontSize: 'var(--text-xs)' }}>
            Hacé click en "Scrapear leads" para buscar empresas automáticamente.
          </p>
          <button
            onClick={() => setShowScrape(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', marginTop: '4px' }}
          >
            <Search size={13} />
            Scrapear leads
          </button>
        </div>
      ) : (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 100px',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--s3)',
          }}>
            {['Empresa', 'Ciudad', 'Sitio web', 'Teléfono / Email', 'Estado'].map((h) => (
              <span key={h} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {leads.map((lead, i) => (
              <div
                key={lead.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 100px',
                  padding: '10px 16px',
                  borderBottom: i < leads.length - 1 ? '1px solid var(--border)' : 'none',
                  alignItems: 'center',
                  transition: 'background 100ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--s3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Empresa */}
                <span style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 'var(--text-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lead.company}
                </span>

                {/* Ciudad */}
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lead.city ?? '—'}
                </span>

                {/* Website */}
                <span style={{ fontSize: 'var(--text-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lead.website ? (
                    <a
                      href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--acc)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Globe size={11} />
                      {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      <ExternalLink size={10} />
                    </a>
                  ) : <span style={{ color: 'var(--t3)' }}>—</span>}
                </span>

                {/* Phone / Email */}
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lead.phone ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={11} color="var(--t3)" /> {lead.phone}
                    </span>
                  ) : lead.email ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={11} color="var(--t3)" /> {lead.email}
                    </span>
                  ) : <span style={{ color: 'var(--t3)' }}>—</span>}
                </span>

                {/* Status badge */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '10px', fontWeight: 600,
                  color: STATUS_COLORS[lead.status],
                  background: `${STATUS_COLORS[lead.status]}18`,
                  border: `1px solid ${STATUS_COLORS[lead.status]}40`,
                  borderRadius: '6px', padding: '2px 8px', whiteSpace: 'nowrap',
                }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: STATUS_COLORS[lead.status], flexShrink: 0 }} />
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

  // Refresh count when switching back to resumen
  const supabase = createClient()
  useEffect(() => {
    if (activeTab === 'resumen') {
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('campaign_id', campaign.id)
        .then(({ count }) => { if (count !== null) setLeadCount(count) })
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '2px', padding: '0 28px',
        borderBottom: '1px solid var(--border)', background: 'var(--s1)', overflowX: 'auto',
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
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

      {/* Tab content */}
      <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>
        {activeTab === 'resumen' && <TabResumen campaign={campaign} leadCount={leadCount} />}
        {activeTab === 'leads'   && <TabLeads   campaign={campaign} />}
      </div>
    </div>
  )
}
