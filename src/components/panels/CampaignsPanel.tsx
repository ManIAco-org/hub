'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Megaphone, Plus, X, MessageCircle, Mail, Layers,
  ChevronRight, Trash2, Users, Sparkles, PenLine, DollarSign,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Campaign, CampaignChannel, CampaignStatus } from '@/lib/types'
import { CAMPAIGN_CATEGORIES } from '@/lib/types'

// ── Constants ───────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  raw:      '#525866',
  enriched: '#06B6D4',
  approved: '#A3E635',
  sent:     '#22C55E',
} as const

const STATUS_CONFIG: Record<CampaignStatus, { label: string; className: string }> = {
  draft:  { label: 'Borrador', className: 'badge badge-warn' },
  active: { label: 'Activa',   className: 'badge badge-acc'  },
  paused: { label: 'Pausada',  className: 'badge badge-warn' },
  closed: { label: 'Cerrada',  className: 'badge badge-ok'   },
}

const CHANNEL_ICON: Record<CampaignChannel, React.ReactNode> = {
  whatsapp: <MessageCircle size={14} />,
  email:    <Mail size={14} />,
  both:     <Layers size={14} />,
}

const CHANNEL_LABEL: Record<CampaignChannel, string> = {
  whatsapp: 'WhatsApp',
  email:    'Email',
  both:     'Ambos',
}

const ROW_COLS = '2.2fr 1fr 0.8fr 2fr 0.9fr 1fr 90px'

// ── Per-campaign aggregated stats ────────────────────────────────────────────────
interface CampaignStats {
  total:    number
  raw:      number
  enriched: number
  approved: number   // approved + sent + replied
  sent:     number
  drafts:   number   // pending drafts
}

const EMPTY_STATS: CampaignStats = { total: 0, raw: 0, enriched: 0, approved: 0, sent: 0, drafts: 0 }

// ── New Campaign Modal ────────────────────────────────────────────────────────
function NewCampaignModal({ ownerEmail, onClose, onCreated }: {
  ownerEmail: string
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const supabase = createClient()
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    icp_prompt: '',
    channel: 'whatsapp' as CampaignChannel,
    category: 'Otras' as string,
  })

  const update = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.icp_prompt.trim()) return
    setSaving(true)
    startTransition(async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          name: form.name.trim(),
          icp_prompt: form.icp_prompt.trim(),
          channel: form.channel,
          category: form.category,
          owner_email: ownerEmail,
          status: 'draft',
        })
        .select('id')
        .single()

      if (error || !data) {
        toast.error('Error al crear la campaña')
        setSaving(false)
      } else {
        toast.success('Campaña creada')
        onCreated(data.id)
      }
    })
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
          width: '100%', maxWidth: '520px',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Megaphone size={18} color="var(--acc)" />
            <h3 style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-md)' }}>Nueva campaña</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', padding: '4px' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t1)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Nombre */}
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
              Nombre de la campaña <span style={{ color: 'var(--acc)' }}>*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={update('name')}
              placeholder="Outreach Córdoba — Agencias Q3"
              className="input"
              autoFocus
              required
            />
          </div>

          {/* ICP Prompt */}
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
              ICP prompt <span style={{ color: 'var(--acc)' }}>*</span>
            </label>
            <textarea
              value={form.icp_prompt}
              onChange={update('icp_prompt')}
              placeholder="Inmobiliarias chicas en Córdoba capital, preferentemente dentro de la circunvalación, con atención al cliente"
              rows={3}
              className="input"
              required
              style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
            />
            <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '4px' }}>
              Describí en lenguaje natural qué tipo de empresa buscás. Claude genera las queries de búsqueda automáticamente.
            </p>
          </div>

          {/* Canal */}
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '8px' }}>
              Canal de outreach
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {(['whatsapp', 'email', 'both'] as CampaignChannel[]).map((ch) => {
                const active = form.channel === ch
                return (
                  <label
                    key={ch}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '6px', padding: '10px', cursor: 'pointer',
                      background: active ? 'var(--acc-d)' : 'var(--s2)',
                      border: `1px solid ${active ? 'var(--acc)' : 'var(--border)'}`,
                      borderRadius: 'var(--r8)',
                      fontSize: 'var(--text-xs)', fontWeight: active ? 600 : 400,
                      color: active ? 'var(--acc)' : 'var(--t2)',
                      transition: 'all 150ms',
                    }}
                  >
                    <input
                      type="radio"
                      name="channel"
                      value={ch}
                      checked={form.channel === ch}
                      onChange={update('channel')}
                      style={{ display: 'none' }}
                    />
                    {CHANNEL_ICON[ch]}
                    {CHANNEL_LABEL[ch]}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
              Categoría
            </label>
            <select value={form.category} onChange={update('category')} className="input" style={{ height: '38px' }}>
              {CAMPAIGN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ fontSize: 'var(--text-sm)' }}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim() || !form.icp_prompt.trim()}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', opacity: saving ? 0.7 : 1 }}
            >
              <Plus size={14} />
              {saving ? 'Creando...' : 'Crear campaña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Pipeline mini-bar ─────────────────────────────────────────────────────────
function PipelineBar({ stats }: { stats: CampaignStats }) {
  const total = stats.total
  if (total === 0) {
    return <div style={{ height: '8px', borderRadius: '999px', background: 'var(--s3)', width: '100%' }} />
  }
  const segs: Array<{ key: string; n: number; color: string }> = [
    { key: 'approved', n: stats.approved, color: STATUS_COLORS.approved },
    { key: 'enriched', n: stats.enriched, color: STATUS_COLORS.enriched },
    { key: 'raw',      n: stats.raw,      color: STATUS_COLORS.raw },
  ]
  return (
    <div title={`${stats.raw} sin procesar · ${stats.enriched} enriquecidos · ${stats.approved} aprobados`}
      style={{ display: 'flex', height: '8px', borderRadius: '999px', overflow: 'hidden', background: 'var(--s3)', width: '100%' }}>
      {segs.map((s) => s.n > 0 ? (
        <div key={s.key} style={{ width: `${(s.n / total) * 100}%`, background: s.color, transition: 'width 600ms ease' }} />
      ) : null)}
    </div>
  )
}

// ── Campaign Row ─────────────────────────────────────────────────────────────
function CampaignRow({ campaign, stats, loading, onClick, onDelete }: {
  campaign: Campaign
  stats: CampaignStats
  loading: boolean
  onClick: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const badge = STATUS_CONFIG[campaign.status]

  return (
    <div
      onClick={() => { if (!confirming) onClick() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirming(false) }}
      style={{
        display: 'grid',
        gridTemplateColumns: ROW_COLS,
        alignItems: 'center', gap: '12px',
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        background: confirming ? '#EF444408' : hovered ? 'var(--s3)' : 'transparent',
        cursor: confirming ? 'default' : 'pointer',
        transition: 'background 120ms',
      }}
    >
      {/* Campaña */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: 'var(--r8)',
          background: 'var(--s3)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0, color: 'var(--acc)',
        }}>
          {CHANNEL_ICON[campaign.channel]}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {campaign.name}
          </p>
          {confirming ? (
            <p style={{ fontSize: '11px', color: '#EF4444', fontWeight: 500 }}>
              ¿Eliminar? Borra leads y drafts asociados.
            </p>
          ) : (
            <p style={{ fontSize: '11px', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {campaign.category} · {campaign.icp_prompt}
            </p>
          )}
        </div>
      </div>

      {/* Canal */}
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ color: 'var(--t3)', display: 'flex' }}>{CHANNEL_ICON[campaign.channel]}</span>
        {CHANNEL_LABEL[campaign.channel]}
      </span>

      {/* Leads */}
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-sm)' }}>
        {loading ? '·' : stats.total}
      </span>

      {/* Pipeline */}
      <div style={{ minWidth: 0 }}>
        <PipelineBar stats={stats} />
      </div>

      {/* Drafts */}
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 'var(--text-xs)', color: stats.drafts > 0 ? '#EAB308' : 'var(--t3)' }}>
        {loading ? '·' : stats.drafts > 0 ? `${stats.drafts} ✏` : '—'}
      </span>

      {/* Estado */}
      <span className={badge.className} style={{ fontSize: '10px', justifySelf: 'start' }}>{badge.label}</span>

      {/* Acciones */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
        {confirming ? (
          <>
            <button onClick={onDelete}
              style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444', background: '#EF444415', border: '1px solid #EF444440', borderRadius: 'var(--r6)', padding: '4px 8px', cursor: 'pointer' }}>
              Sí
            </button>
            <button onClick={() => setConfirming(false)}
              style={{ fontSize: '11px', color: 'var(--t3)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r6)', padding: '4px 8px', cursor: 'pointer' }}>
              No
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setConfirming(true)}
              title="Eliminar campaña"
              style={{ color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: 'var(--r6)', display: 'flex', alignItems: 'center', transition: 'color 120ms' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
            >
              <Trash2 size={14} />
            </button>
            <ChevronRight size={16} color={hovered ? 'var(--acc)' : 'var(--t3)'} style={{ transition: 'color 120ms' }} />
          </>
        )}
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: string; accent?: string
}) {
  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--t3)' }}>
        {icon}
        <span style={{ fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: '24px', color: accent ?? 'var(--t1)', lineHeight: 1 }}>
        {value}
      </span>
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export function CampaignsPanel({ campaigns, ownerEmail }: { campaigns: Campaign[]; ownerEmail: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [showModal, setShowModal] = useState(false)
  const [localCampaigns, setLocalCampaigns] = useState(campaigns)
  const [statsMap, setStatsMap] = useState<Record<string, CampaignStats>>({})
  const [statsLoading, setStatsLoading] = useState(true)

  const loadStats = useCallback(async () => {
    if (localCampaigns.length === 0) { setStatsLoading(false); return }
    setStatsLoading(true)
    const entries = await Promise.all(localCampaigns.map(async (c) => {
      const [{ data: leadRows }, { count: draftCount }] = await Promise.all([
        supabase.from('campaign_leads').select('status').eq('campaign_id', c.id),
        supabase.from('drafts').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('status', 'pending'),
      ])
      const s: CampaignStats = { ...EMPTY_STATS, drafts: draftCount ?? 0 }
      for (const r of leadRows ?? []) {
        s.total++
        if (r.status === 'raw') s.raw++
        else if (r.status === 'enriched') s.enriched++
        else if (r.status === 'sent') { s.approved++; s.sent++ }
        else if (r.status === 'approved' || r.status === 'replied') s.approved++
      }
      return [c.id, s] as const
    }))
    setStatsMap(Object.fromEntries(entries))
    setStatsLoading(false)
  }, [localCampaigns]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadStats() }, [loadStats])

  // ── Global stats bar aggregation ──
  const globals = Object.values(statsMap).reduce(
    (acc, s) => {
      acc.leads += s.total
      acc.enriched += s.enriched
      acc.drafts += s.drafts
      return acc
    },
    { leads: 0, enriched: 0, drafts: 0 },
  )
  // Estimated total cost: enrich (~$0.001/lead enriched) + drafts (~$0.004/draft)
  const estCost = globals.enriched * 0.001 + globals.drafts * 0.004

  function handleCreated(id: string) {
    setShowModal(false)
    router.push(`/dashboard/marketing/campaigns/${id}`)
  }

  async function handleDelete(campaignId: string) {
    const { error } = await supabase.from('campaigns').delete().eq('id', campaignId)
    if (error) {
      toast.error('Error al eliminar campaña')
    } else {
      setLocalCampaigns((prev) => prev.filter((c) => c.id !== campaignId))
      toast.success('Campaña eliminada')
    }
  }

  return (
    <div>
      {showModal && (
        <NewCampaignModal
          ownerEmail={ownerEmail}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px' }}>
            Marketing
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t2)' }}>
            Outreach automatizado · {localCampaigns.length} campaña{localCampaigns.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', flexShrink: 0 }}
        >
          <Plus size={14} />
          Nueva campaña
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '18px' }}>
        <StatCard icon={<Users size={13} />}      label="Total leads"       value={statsLoading ? '·' : String(globals.leads)} />
        <StatCard icon={<Sparkles size={13} />}   label="Enriquecidos"      value={statsLoading ? '·' : String(globals.enriched)} accent={STATUS_COLORS.enriched} />
        <StatCard icon={<PenLine size={13} />}    label="Drafts pendientes" value={statsLoading ? '·' : String(globals.drafts)} accent={globals.drafts > 0 ? '#EAB308' : undefined} />
        <StatCard icon={<DollarSign size={13} />} label="Costo estimado"    value={statsLoading ? '·' : `$${estCost.toFixed(2)}`} />
      </div>

      {/* List */}
      {localCampaigns.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '80px 20px', gap: '12px',
          background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)',
        }}>
          <Megaphone size={32} color="var(--t3)" />
          <p style={{ color: 'var(--t2)', fontSize: 'var(--text-md)', fontWeight: 600 }}>Sin campañas todavía</p>
          <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)', textAlign: 'center', maxWidth: '360px', lineHeight: 1.5 }}>
            Creá tu primera campaña para empezar a buscar leads, enriquecerlos con IA y generar mensajes de outreach automáticos.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', marginTop: '8px' }}
          >
            <Plus size={14} />
            Nueva campaña
          </button>
        </div>
      ) : (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: ROW_COLS,
            gap: '12px', padding: '10px 18px',
            borderBottom: '1px solid var(--border)', background: 'var(--s3)',
          }}>
            {['Campaña', 'Canal', 'Leads', 'Pipeline', 'Drafts', 'Estado', ''].map((h, i) => (
              <span key={i} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em', justifySelf: i === 6 ? 'end' : 'start' }}>{h}</span>
            ))}
          </div>
          {localCampaigns.map((c) => (
            <CampaignRow
              key={c.id}
              campaign={c}
              stats={statsMap[c.id] ?? EMPTY_STATS}
              loading={statsLoading}
              onClick={() => router.push(`/dashboard/marketing/campaigns/${c.id}`)}
              onDelete={() => handleDelete(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
