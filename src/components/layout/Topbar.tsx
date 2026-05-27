import type { ReactNode } from 'react'

interface TopbarProps {
  children?: ReactNode
  title?: string
}

export function Topbar({ title }: TopbarProps) {
  return (
    <header
      style={{
        height: 'var(--topbar-h)',
        background: 'var(--s1)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        gap: '12px',
      }}
    >
      {/* Page title / breadcrumb */}
      {title && (
        <h1
          style={{
            fontSize: 'var(--text-md)',
            fontWeight: 600,
            color: 'var(--t1)',
          }}
        >
          {title}
        </h1>
      )}

      <div style={{ flex: 1 }} />

      {/* Connection indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: 'var(--text-xs)',
          color: 'var(--t3)',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--ok)',
            display: 'inline-block',
          }}
        />
        Conectado
      </div>
    </header>
  )
}
