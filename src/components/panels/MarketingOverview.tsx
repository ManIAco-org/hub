'use client'

import { useRouter } from 'next/navigation'
import { Users, Sparkles, CheckCircle, Send, MessageCircle, TrendingUp } from 'lucide-react'
import { FunnelChart } from '@/components/charts/FunnelChart'
import { CategoryDonut } from '@/components/charts/CategoryDonut'
import type { Campaign } from '@/lib/types'

interface Kpis {
  total: number
  enriched: number
  approved: number
  sent: number
  replied: number
  highScore: number
}

interface KpiCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  sub?: string
}

function KpiCard({ label, value, icon, color, sub }: KpiCardProps) {
  return (
    <div style={{
      background: 'var(--s2)', border: '1px solid var(--border)',
      borderRadius: 'var(--r12)', padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--t1)', lineHeight: 1 }}>
        {value.toLocaleString('es-AR')}
      </p>
      {sub && <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '4px' }}>{sub}</p>}
    </div>
  )
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', active: 'Activa', paused: 'Pausada', closed: 'Cerrada',
}
const STATUS_CLASS: Record<string, string> = {
  draft: 'badge badge-warn', active: 'badge badge-acc', paused: 'badge badge-warn', closed: 'badge badge-ok',
}

export function MarketingOverview({ campaigns, kpis }: { campaigns: Campaign[]; kpis: Kpis }) {
  const router = useRouter()

  // Funnel data
  const funnelSteps = [
    { label: 'Total leads',   value: kpis.total,    color: '#525866' },
    { label: 'Enriquecidos',  value: kpis.enriched, color: '#06B6D4' },
    { label: 'Score ≥ 6',     value: kpis.highScore, color: '#EAB308' },
    { label: 'Aprobados',     value: kpis.approved, color: '#A3E635' },
    { label: 'Enviados',      value: kpis.sent,     color: '#22C55E' },
    { label: 'Respondieron',  value: kpis.replied,  color: '#8B5CF6' },
  ]

  // Category distribution from campaigns
  const categoryMap: Record<string, number> = {}
  for (const c of campaigns) {
    const cat = c.category ?? 'Otras'
    categoryMap[cat] = (categoryMap[cat] ?? 0) + 1
  }
  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const activeCampaigns = campaigns.filter((c) => c.status === 'active' || c.status === 'draft')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1100px', minWidth: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px' }}>Marketing Overview</h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t2)' }}>
            {campaigns.length} campaña{campaigns.length !== 1 ? 's' : ''} · pipeline completo
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/marketing/campaigns')}
          className="btn-primary"
          style={{ fontSize: 'var(--text-sm)', padding: '8px 16px' }}
        >
          Ver campañas
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <KpiCard label="Total leads"  value={kpis.total}    icon={<Users size={16} />}         color="#525866" />
        <KpiCard label="Enriquecidos" value={kpis.enriched} icon={<Sparkles size={16} />}      color="#06B6D4" sub={kpis.total > 0 ? `${Math.round(kpis.enriched / kpis.total * 100)}% del total` : undefined} />
        <KpiCard label="Score ≥ 6"    value={kpis.highScore} icon={<TrendingUp size={16} />}   color="#EAB308" />
        <KpiCard label="Aprobados"    value={kpis.approved} icon={<CheckCircle size={16} />}   color="#A3E635" />
        <KpiCard label="Enviados"     value={kpis.sent}     icon={<Send size={16} />}           color="#22C55E" />
        <KpiCard label="Respondieron" value={kpis.replied}  icon={<MessageCircle size={16} />} color="#8B5CF6"
          sub={kpis.sent > 0 ? `${Math.round(kpis.replied / kpis.sent * 100)}% reply rate` : undefined} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(0, 340px)', gap: '16px', minWidth: 0 }}>
        {/* Funnel */}
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)', padding: '20px' }}>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--t1)', marginBottom: '16px' }}>Funnel de conversión</h3>
          <FunnelChart steps={funnelSteps} />
        </div>

        {/* Category donut */}
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)', padding: '20px' }}>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--t1)', marginBottom: '16px' }}>Campañas por categoría</h3>
          <CategoryDonut data={categoryData} />
        </div>
      </div>

      {/* Active campaigns */}
      {activeCampaigns.length > 0 && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--t1)' }}>Campañas activas</h3>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)' }}>{activeCampaigns.length} campaña{activeCampaigns.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {activeCampaigns.map((c, i) => (
              <div
                key={c.id}
                onClick={() => router.push(`/dashboard/marketing/campaigns/${c.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 20px',
                  borderBottom: i < activeCampaigns.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', transition: 'background 100ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--s3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                    {c.icp_prompt}
                  </p>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--t3)', whiteSpace: 'nowrap' }}>
                  {formatRelativeTime(c.updated_at)}
                </span>
                <span className={STATUS_CLASS[c.status] ?? 'badge'} style={{ flexShrink: 0 }}>
                  {STATUS_LABELS[c.status] ?? c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
