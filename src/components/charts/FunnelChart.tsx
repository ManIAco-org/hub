'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface FunnelStep {
  label: string
  value: number
  color: string
}

interface Props {
  steps: FunnelStep[]
}

export function FunnelChart({ steps }: Props) {
  const max = Math.max(...steps.map((s) => s.value), 1)

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={steps} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 100 }}>
        <XAxis type="number" domain={[0, max]} hide />
        <YAxis
          type="category"
          dataKey="label"
          width={95}
          tick={{ fontSize: 12, fill: 'var(--t2)', fontFamily: 'var(--sans)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--s3)' }}
          contentStyle={{
            background: 'var(--s2)', border: '1px solid var(--border)',
            borderRadius: '8px', fontSize: '12px', color: 'var(--t1)',
          }}
          formatter={(value) => [Number(value ?? 0).toLocaleString('es-AR'), 'Leads']}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 12, fill: 'var(--t2)' }}>
          {steps.map((step, i) => (
            <Cell key={i} fill={step.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
