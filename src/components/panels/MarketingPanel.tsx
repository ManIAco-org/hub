'use client'

import { TrendingUp, TrendingDown, Users, DollarSign, MousePointerClick, BarChart3, Minus } from 'lucide-react'

interface KPI {
  label: string
  value: string
  sub: string
  trend: 'up' | 'down' | 'flat'
  trendValue: string
  Icon: typeof TrendingUp
}

// Mock data — conectar a agentes en Sprint 2-3
const MOCK_KPIS: KPI[] = [
  {
    label: 'Leads este mes',
    value: '—',
    sub: 'Conectar fuente en Sprint 2',
    trend: 'flat',
    trendValue: '—',
    Icon: Users,
  },
  {
    label: 'Tasa de conversión',
    value: '—',
    sub: 'Leads → reunión inicial',
    trend: 'flat',
    trendValue: '—',
    Icon: MousePointerClick,
  },
  {
    label: 'Costo por lead',
    value: '—',
    sub: 'USD promedio mensual',
    trend: 'flat',
    trendValue: '—',
    Icon: DollarSign,
  },
  {
    label: 'MRR',
    value: '—',
    sub: 'Monthly Recurring Revenue',
    trend: 'flat',
    trendValue: '—',
    Icon: TrendingUp,
  },
]

interface PipelineStage {
  label: string
  count: number
  color: string
}

const MOCK_PIPELINE: PipelineStage[] = [
  { label: 'Prospecto',    count: 0, color: 'var(--t3)' },
  { label: 'Contactado',  count: 0, color: 'var(--acc)' },
  { label: 'Reunión',     count: 0, color: 'var(--warn)' },
  { label: 'Propuesta',   count: 0, color: '#a855f7' },
  { label: 'Cerrado',     count: 0, color: 'var(--ok)' },
]

const TREND_ICONS = {
  up:   { Icon: TrendingUp,   color: 'var(--ok)' },
  down: { Icon: TrendingDown, color: 'var(--err)' },
  flat: { Icon: Minus,        color: 'var(--t3)' },
}

function KPICard({ kpi }: { kpi: KPI }) {
  const trend = TREND_ICONS[kpi.trend]
  return (
    <div
      style={{
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r12)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--r8)',
            background: 'var(--s3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <kpi.Icon size={16} color="var(--t2)" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <trend.Icon size={13} color={trend.color} />
          <span style={{ fontSize: '11px', color: trend.color, fontFamily: 'var(--mono)' }}>
            {kpi.trendValue}
          </span>
        </div>
      </div>
      <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px', fontFamily: 'var(--mono)' }}>
        {kpi.value}
      </p>
      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--t2)', marginBottom: '2px' }}>
        {kpi.label}
      </p>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)' }}>
        {kpi.sub}
      </p>
    </div>
  )
}

export function MarketingPanel() {
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px' }}>
            Marketing
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t2)' }}>
            KPIs internos ManIAcos · datos reales en Sprint 2-3
          </p>
        </div>
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--t3)',
            background: 'var(--s2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r8)',
            padding: '4px 10px',
          }}
        >
          Mock data
        </span>
      </div>

      {/* KPI grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {MOCK_KPIS.map((kpi) => (
          <KPICard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      {/* Pipeline */}
      <div
        style={{
          background: 'var(--s2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r12)',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <BarChart3 size={16} color="var(--t2)" />
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--t1)' }}>
            Pipeline de ventas
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', height: '56px' }}>
          {MOCK_PIPELINE.map((stage) => (
            <div
              key={stage.label}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                background: 'var(--s1)',
                borderRadius: 'var(--r8)',
                border: `1px solid ${stage.color}22`,
              }}
            >
              <span style={{ fontSize: '16px', fontWeight: 700, color: stage.color, fontFamily: 'var(--mono)' }}>
                {stage.count}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--t3)' }}>{stage.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state / roadmap */}
      <div
        style={{
          background: 'var(--s2)',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--r12)',
          padding: '32px',
          textAlign: 'center',
        }}
      >
        <BarChart3 size={28} color="var(--t3)" style={{ margin: '0 auto 12px' }} />
        <p style={{ fontWeight: 600, color: 'var(--t2)', marginBottom: '8px', fontSize: 'var(--text-md)' }}>
          Agentes de marketing en Sprint 2-3
        </p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)', maxWidth: '400px', margin: '0 auto' }}>
          Claude va a poblar este panel automáticamente: leads desde formularios,
          conversiones, MRR real, y análisis de campañas.
        </p>
      </div>
    </div>
  )
}
