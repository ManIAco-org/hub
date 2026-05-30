'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface CategorySlice {
  name: string
  value: number
}

const COLORS = ['#06B6D4', '#A3E635', '#EAB308', '#F97316', '#8B5CF6', '#EC4899', '#22C55E', '#525866']

interface Props {
  data: CategorySlice[]
}

export function CategoryDonut({ data }: Props) {
  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>
        Sin datos
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="40%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: 'var(--s2)', border: '1px solid var(--border)',
            borderRadius: '8px', fontSize: '12px', color: 'var(--t1)',
          }}
          formatter={(value, name) => [`${Number(value ?? 0)} campañas`, String(name)]}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: '12px', color: 'var(--t2)' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
