// Server-safe skeleton — no 'use client' needed, no JS, pure CSS animation
export function PanelSkeleton() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0' }}>
      {/* Topbar skeleton */}
      <div style={{
        height: '57px',
        padding: '0 28px',
        display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--s1)',
      }}>
        <div className="skeleton" style={{ width: '120px', height: '18px', borderRadius: '6px' }} />
      </div>

      {/* Content skeleton */}
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div className="skeleton" style={{ width: '160px', height: '22px', borderRadius: '6px' }} />
          <div className="skeleton" style={{ width: '100px', height: '34px', borderRadius: '8px' }} />
        </div>

        {/* Card grid */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="skeleton"
            style={{
              width: '100%',
              height: '68px',
              borderRadius: '10px',
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Compact version for detail pages (2-column layout)
export function DetailSkeleton() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0' }}>
      <div style={{
        height: '57px', padding: '0 28px',
        display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: '1px solid var(--border)', background: 'var(--s1)',
      }}>
        <div className="skeleton" style={{ width: '80px', height: '14px', borderRadius: '4px' }} />
        <div style={{ color: 'var(--bsub)' }}>/</div>
        <div className="skeleton" style={{ width: '140px', height: '14px', borderRadius: '4px' }} />
      </div>
      <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="skeleton" style={{ width: '200px', height: '28px', borderRadius: '8px' }} />
        <div className="skeleton" style={{ width: '100%', height: '44px', borderRadius: '10px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '10px', animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
