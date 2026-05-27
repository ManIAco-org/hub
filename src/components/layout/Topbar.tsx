import Link from 'next/link'
import type { ReactNode } from 'react'

interface BreadcrumbItem {
  label: string
  href: string
}

interface TopbarProps {
  children?: ReactNode
  title?: string
  breadcrumb?: BreadcrumbItem[]
}

export function Topbar({ title, breadcrumb }: TopbarProps) {
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
        gap: '8px',
      }}
    >
      {/* Breadcrumb + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {breadcrumb?.map((crumb, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Link
              href={crumb.href}
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                color: 'var(--t3)',
                textDecoration: 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                transition: 'color 120ms',
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = 'var(--t2)')}
              onMouseOut={(e) => (e.currentTarget.style.color = 'var(--t3)')}
            >
              {crumb.label}
            </Link>
            <span style={{ color: 'var(--t3)', fontSize: 'var(--text-xs)' }}>→</span>
          </span>
        ))}
        {title && (
          <h1
            style={{
              fontSize: breadcrumb?.length ? 'var(--text-sm)' : 'var(--text-md)',
              fontWeight: 600,
              color: breadcrumb?.length ? 'var(--t2)' : 'var(--t1)',
            }}
          >
            {title}
          </h1>
        )}
      </div>

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
