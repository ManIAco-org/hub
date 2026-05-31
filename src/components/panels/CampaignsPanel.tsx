'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Megaphone, Plus, X, MessageCircle, Mail, Layers, ChevronRight, Clock, CheckSquare, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Campaign, CampaignChannel, CampaignStatus } from '@/lib/types'
import { CAMPAIGN_CATEGORIES } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

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
                const labels = { whatsapp: 'WhatsApp', email: 'Email', both: 'Ambos' }
                const icons  = CHANNEL_ICON
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
                    {icons[ch]}
                    {labels[ch]}
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

// ── Campaign Card ─────────────────────────────────────────────────────────────
function CampaignCard({ campaign, onClick, onDelete }: {
  campaign: Campaign; onClick: () => void; onDelete: () => void
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
        background: confirming ? '#EF444408' : 'var(--s2)',
        border: `1px solid ${confirming ? '#EF444440' : hovered ? 'var(--acc)' : 'var(--border)'}`,
        borderRadius: 'var(--r12)', padding: '18px 20px',
        cursor: confirming ? 'default' : 'pointer',
        transition: 'border-color var(--t-normal), box-shadow var(--t-normal), background 150ms',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        display: 'flex', alignItems: 'center', gap: '14px',
      }}
    >
      {/* Icon */}
      <div style={{
        width: '40px', height: '40px', borderRadius: 'var(--r8)',
        background: 'var(--s3)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{ color: 'var(--acc)' }}>{CHANNEL_ICON[campaign.channel]}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <h3 style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {campaign.name}
          </h3>
          <span className={badge.className} style={{ flexShrink: 0, fontSize: '10px' }}>{badge.label}</span>
        </div>
        {confirming ? (
          <p style={{ fontSize: 'var(--text-xs)', color: '#EF4444', fontWeight: 500 }}>
            ¿Eliminar campaña? Borra leads y drafts asociados.
          </p>
        ) : (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {campaign.icp_prompt}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
          <Clock size={11} color="var(--t3)" />
          <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{formatRelativeTime(campaign.updated_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        {confirming ? (
          <>
            <button onClick={onDelete}
              style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444', background: '#EF444415', border: '1px solid #EF444440', borderRadius: 'var(--r6)', padding: '4px 10px', cursor: 'pointer' }}>
              Eliminar
            </button>
            <button onClick={() => setConfirming(false)}
              style={{ fontSize: '11px', color: 'var(--t3)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r6)', padding: '4px 10px', cursor: 'pointer' }}>
              Cancelar
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
            <ChevronRight size={16} color={hovered ? 'var(--acc)' : 'var(--t3)'} style={{ transition: 'color var(--t-normal)' }} />
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export function CampaignsPanel({ campaigns, ownerEmail }: { campaigns: Campaign[]; ownerEmail: string }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [localCampaigns, setLocalCampaigns] = useState(campaigns)
  const supabase = createClient()

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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px' }}>
            Campañas
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t2)' }}>
            {campaigns.length} campaña{campaigns.length !== 1 ? 's' : ''} · outreach automatizado
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a href="/dashboard/marketing/approval"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', padding: '8px 14px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', color: 'var(--t2)', textDecoration: 'none', fontWeight: 500 }}>
            <CheckSquare size={14} />Cola de aprobación
          </a>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', flexShrink: 0 }}
          >
            <Plus size={14} />
            Nueva campaña
          </button>
        </div>
      </div>

      {/* List */}
      {campaigns.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '80px 20px', gap: '12px',
          background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)',
        }}>
          <Megaphone size={32} color="var(--t3)" />
          <p style={{ color: 'var(--t2)', fontSize: 'var(--text-md)', fontWeight: 600 }}>Sin campañas todavía</p>
          <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)', textAlign: 'center', maxWidth: '340px' }}>
            Creá tu primera campaña para empezar a scrapear leads y enviar mensajes automáticos.
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {localCampaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onClick={() => router.push(`/dashboard/marketing/campaigns/${c.id}`)}
              onDelete={() => handleDelete(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
