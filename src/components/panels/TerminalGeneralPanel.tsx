'use client'

import { TerminalSquare } from 'lucide-react'
import { useTerminalStore } from '@/stores/terminalStore'

interface Props {
  userEmail: string
  linuxUser: string
}

export function TerminalGeneralPanel({ userEmail: _userEmail, linuxUser }: Props) {
  const openSession = useTerminalStore((s) => s.openSession)
  const sessions    = useTerminalStore((s) => s.sessions)
  const setOpen     = useTerminalStore((s) => s.setOpen)
  const setMinimized = useTerminalStore((s) => s.setMinimized)

  const sessionId  = `personal-${linuxUser}`
  const basePath   = `/srv/maniacos/personal/${linuxUser}`
  const isOpen     = sessions.some((s) => s.id === sessionId)

  function handleOpen() {
    if (isOpen) {
      // Already open → focus panel
      setOpen(true)
      setMinimized(false)
      return
    }
    // clientSlug: "" → server routes to /srv/maniacos/personal/<linuxUser>
    openSession({
      id: sessionId,
      clientSlug: '',
      label: `Personal — ${linuxUser}`,
    })
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 28px',
        gap: '28px',
        textAlign: 'center',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '72px', height: '72px',
          borderRadius: '20px',
          background: 'var(--acc-d)',
          border: '1px solid var(--acc-b)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <TerminalSquare size={32} color="var(--acc)" />
      </div>

      {/* Heading */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '460px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--t1)', margin: 0 }}>
          Terminal Personal
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)', lineHeight: 1.6, margin: 0 }}>
          Tu workspace en{' '}
          <code style={{ fontFamily: 'var(--mono)', color: 'var(--t2)', fontSize: '12px' }}>
            {basePath}
          </code>
          {' '}en el servidor Oracle ARM.
          Corre Claude Code, editá repos y gestioná proyectos directamente desde acá.
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={handleOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '13px 28px',
          background: 'var(--acc)', color: '#000',
          border: 'none', borderRadius: 'var(--r8)',
          fontSize: 'var(--text-base)', fontWeight: 700,
          cursor: 'pointer',
          transition: 'opacity 120ms, transform 120ms',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
      >
        <TerminalSquare size={17} />
        {isOpen ? '↓ Ir a terminal' : '💻 Abrir terminal'}
      </button>

      {/* Sesiones recientes placeholder */}
      <div style={{ width: '100%', maxWidth: '500px' }}>
        <p style={{
          fontSize: '11px', fontWeight: 600, color: 'var(--t3)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          marginBottom: '10px',
        }}>
          Sesiones recientes
        </p>
        <div style={{
          padding: '28px',
          background: 'var(--s2)', border: '1px solid var(--border)',
          borderRadius: 'var(--r8)',
          color: 'var(--t3)', fontSize: 'var(--text-sm)',
        }}>
          El historial de sesiones estará disponible próximamente.
        </div>
      </div>
    </div>
  )
}
