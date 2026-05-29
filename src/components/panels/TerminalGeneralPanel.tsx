'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { useTerminalStore } from '@/stores/terminalStore'
import type { TerminalSession } from '@/stores/terminalStore'

interface Props {
  userEmail: string
  linuxUser: string
}

function formatRelativeTime(ms: number | undefined): string {
  if (!ms) return 'Sin actividad'
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora mismo'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

// ── Inline-editable session name ──────────────────────────────────────────────
function SessionName({ session }: { session: TerminalSession }) {
  const renameSession = useTerminalStore((s) => s.renameSession)
  const [hovered, setHovered]   = useState(false)
  const [editing, setEditing]   = useState(false)
  const [value, setValue]       = useState('')

  function startEdit() {
    setValue(session.customName ?? session.label)
    setEditing(true)
  }

  function commit() {
    renameSession(session.id, value)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        style={{
          background: 'var(--s3)', border: '1px solid var(--acc)',
          borderRadius: 'var(--r4)', padding: '2px 8px',
          fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--t1)',
          outline: 'none', width: '100%', maxWidth: '220px', fontFamily: 'inherit',
        }}
      />
    )
  }

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{
        fontWeight: 600, color: 'var(--t1)', fontSize: 'var(--text-sm)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {session.customName ?? session.label}
      </span>
      {hovered && (
        <button
          onClick={startEdit}
          title="Renombrar sesión"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', padding: '0', flexShrink: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--acc)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
        >
          <Pencil size={11} />
        </button>
      )}
    </div>
  )
}

export function TerminalGeneralPanel({ userEmail: _userEmail, linuxUser }: Props) {
  const sessions        = useTerminalStore((s) => s.sessions)
  const openSession     = useTerminalStore((s) => s.openSession)
  const closeSession    = useTerminalStore((s) => s.closeSession)
  const switchToSession = useTerminalStore((s) => s.switchToSession)
  const setOpen         = useTerminalStore((s) => s.setOpen)
  const setMinimized    = useTerminalStore((s) => s.setMinimized)

  // Only show personal sessions on this page
  const personalSessions = sessions.filter((s) => s.clientSlug === '')

  function handleNewSession() {
    const sessionId = `personal-${linuxUser}-${Date.now()}`
    openSession({
      id: sessionId,
      clientSlug: '',
      label: `Terminal — ${linuxUser}`,
    })
  }

  function handleOpen(sessionId: string) {
    switchToSession(sessionId)
    setOpen(true)
    setMinimized(false)
  }

  function handleClose(sessionId: string) {
    closeSession(sessionId)
  }

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px' }}>
            Terminal personal
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>
            Sesiones de <code style={{ fontFamily: 'var(--mono)', color: 'var(--acc)', fontSize: '12px' }}>{linuxUser}</code> en Oracle
          </p>
        </div>
        <button
          onClick={handleNewSession}
          className="btn-primary"
          style={{ fontSize: 'var(--text-sm)', padding: '8px 14px' }}
        >
          + Nueva sesión
        </button>
      </div>

      {/* Sessions list */}
      {personalSessions.length === 0 ? (
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '12px', padding: '52px 20px', textAlign: 'center',
            background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)',
          }}
        >
          <p style={{ fontWeight: 600, color: 'var(--t2)', fontSize: 'var(--text-sm)' }}>
            Sin sesiones abiertas
          </p>
          <p style={{ color: 'var(--t3)', fontSize: 'var(--text-xs)' }}>
            Creá una nueva sesión para empezar a trabajar.
          </p>
          <button
            onClick={handleNewSession}
            className="btn-primary"
            style={{ fontSize: 'var(--text-xs)', padding: '7px 16px', marginTop: '4px' }}
          >
            + Nueva sesión
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {personalSessions.map((s) => {
            const statusColor =
              s.status === 'connected'    ? '#A3E635'
              : s.status === 'connecting' ? '#06B6D4'
              : s.status === 'error'      ? '#EF4444'
              : '#525866'

            return (
              <div
                key={s.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 16px',
                  background: 'var(--s2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r12)', boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Status dot */}
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor, flexShrink: 0 }} />

                {/* Name + secondary info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <SessionName session={s} />
                  <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px', fontFamily: 'var(--mono)' }}>
                    {s.cwd
                      ? `📁 ${s.cwd.split('/').slice(-2).join('/')}`
                      : formatRelativeTime(s.lastActivityAt)
                    }
                    {s.gitBranch && s.gitBranch !== 'HEAD' && (
                      <span style={{ marginLeft: '10px' }}>🌿 {s.gitBranch}</span>
                    )}
                  </p>
                </div>

                {/* Unread badge */}
                {s.unread > 0 && (
                  <span style={{
                    background: 'var(--acc)', color: '#000', borderRadius: '10px',
                    fontSize: '10px', fontWeight: 700, padding: '1px 6px', flexShrink: 0,
                  }}>
                    {s.unread}
                  </span>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleOpen(s.id)}
                    className="btn-secondary"
                    style={{ fontSize: 'var(--text-xs)', padding: '5px 12px' }}
                  >
                    Abrir
                  </button>
                  <button
                    onClick={() => handleClose(s.id)}
                    style={{
                      background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r6)',
                      cursor: 'pointer', color: 'var(--t3)', fontSize: 'var(--text-xs)', padding: '5px 10px',
                      transition: 'color 120ms, border-color 120ms',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = '#EF4444' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
