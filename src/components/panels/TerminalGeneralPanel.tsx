'use client'

import { Terminal, FolderOpen, GitBranch, Cpu } from 'lucide-react'
import { useTerminalStore } from '@/stores/terminalStore'

interface Props {
  userEmail: string
  linuxUser: string
}

export function TerminalGeneralPanel({ userEmail, linuxUser }: Props) {
  const basePath   = `/srv/maniacos/personal/${linuxUser}`
  const openSession = useTerminalStore((s) => s.openSession)
  const sessions    = useTerminalStore((s) => s.sessions)
  const sessionId   = `personal-${linuxUser}`
  const isOpen      = sessions.some((s) => s.id === sessionId)

  function handleOpen() {
    openSession({
      id: sessionId,
      clientSlug: 'personal',
      label: `Personal — ${linuxUser}`,
    })
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 28px', gap: '20px' }}>
      {/* Info bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
        padding: '10px 16px', background: 'var(--s2)', border: '1px solid var(--border)',
        borderRadius: 'var(--r8)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', color: 'var(--t2)' }}>
          <FolderOpen size={13} color="var(--acc)" />
          <code style={{ fontFamily: 'var(--mono)' }}>{basePath}</code>
        </div>
        <span style={{ color: 'var(--bsub)' }}>·</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', color: 'var(--t3)' }}>
          <Cpu size={13} />
          Oracle ARM — Ubuntu 22.04
        </div>
        <span style={{ color: 'var(--bsub)' }}>·</span>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)' }}>
          {userEmail}
        </div>
      </div>

      {/* Terminal placeholder */}
      <div style={{
        flex: 1, background: '#0D0D0D', borderRadius: 'var(--r12)',
        border: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        minHeight: '500px', overflow: 'hidden',
      }}>
        {/* Terminal chrome */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 14px', borderBottom: '1px solid #1a1a1a',
          background: '#111',
        }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF5F56', display: 'block' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FFBD2E', display: 'block' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27C93F', display: 'block' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
            <Terminal size={12} color="#525866" />
            <span style={{ fontSize: '11px', color: '#525866', fontFamily: 'var(--mono)' }}>
              {linuxUser}@oracle:{basePath}
            </span>
          </div>
        </div>

        {/* Terminal body */}
        <div style={{
          flex: 1, padding: '20px', fontFamily: 'var(--mono)', fontSize: '13px',
          lineHeight: 1.6, color: '#525866',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        }}>
          <div>
            <p style={{ color: '#06B6D4', marginBottom: '8px' }}>
              ManIAcos Terminal — General
            </p>
            <p style={{ marginBottom: '4px' }}>
              <span style={{ color: '#27C93F' }}>{linuxUser}@oracle</span>
              <span style={{ color: '#525866' }}>:</span>
              <span style={{ color: '#22D3EE' }}>{basePath}</span>
              <span style={{ color: '#8A8F9E' }}>$ </span>
            </p>
            <p style={{ color: '#525866', marginBottom: '20px' }}>
              # Terminal embebida disponible en Sprint 2
            </p>
            <p style={{ color: '#525866', marginBottom: '4px' }}>
              # Conectá via SSH mientras tanto:
            </p>
            <p style={{ color: '#8A8F9E' }}>
              ssh {linuxUser}@oracle.maniaco.online
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '16px' }}>
            <span style={{ color: '#27C93F' }}>{linuxUser}@oracle</span>
            <span style={{ color: '#525866' }}>:</span>
            <span style={{ color: '#22D3EE' }}>{basePath}</span>
            <span style={{ color: '#8A8F9E' }}>$ </span>
            <span style={{ display: 'inline-block', width: '8px', height: '14px', background: '#8A8F9E', animation: 'none' }}>▌</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={handleOpen}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 22px',
            background: 'var(--acc)', color: '#000',
            border: 'none', borderRadius: 'var(--r8)',
            fontSize: 'var(--text-sm)', fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 120ms',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <Terminal size={15} />
          {isOpen ? '↓ Ir a terminal' : 'Abrir terminal'}
        </button>
        {isOpen && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--acc)' }}>
            Terminal abierta — click para enfocar
          </span>
        )}
      </div>

      {/* Help row */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {[
          { icon: <Terminal size={13} />, label: 'Claude Code', cmd: 'claude' },
          { icon: <GitBranch size={13} />, label: 'Ver repos', cmd: 'ls /srv/maniacos' },
          { icon: <FolderOpen size={13} />, label: 'Tu espacio', cmd: `cd ${basePath}` },
        ].map(({ icon, label, cmd }) => (
          <div
            key={cmd}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px', background: 'var(--s2)',
              border: '1px solid var(--border)', borderRadius: 'var(--r8)',
              fontSize: 'var(--text-xs)', color: 'var(--t2)',
            }}
          >
            <span style={{ color: 'var(--acc)' }}>{icon}</span>
            <span>{label}:</span>
            <code style={{ fontFamily: 'var(--mono)', color: 'var(--t1)' }}>{cmd}</code>
          </div>
        ))}
      </div>
    </div>
  )
}
