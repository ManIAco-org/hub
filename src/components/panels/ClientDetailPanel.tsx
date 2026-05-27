'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FolderKanban, ExternalLink, Github, Monitor } from 'lucide-react'
import { toSlug } from '@/lib/utils'
import type { Project, ProjectStatus } from '@/lib/types'

const STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string }> = {
  active: { label: 'Activo',  className: 'badge badge-acc' },
  paused: { label: 'Pausado', className: 'badge badge-warn' },
  done:   { label: 'Listo',   className: 'badge badge-ok' },
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora mismo'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

interface Props {
  clientName: string
  clientSlug: string
  projects: Project[]
}

export function ClientDetailPanel({ clientName, projects }: Props) {
  const router = useRouter()
  const [hovered, setHovered] = useState<string | null>(null)

  const activeCount = projects.filter((p) => p.status === 'active').length

  return (
    <div>
      {/* Client header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
          {/* Avatar */}
          <div
            style={{
              width: '48px', height: '48px', borderRadius: 'var(--r12)',
              background: 'var(--acc-d)', color: 'var(--acc)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', fontWeight: 700, fontFamily: 'var(--ui)',
              flexShrink: 0,
            }}
          >
            {clientName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--t1)', lineHeight: 1.2 }}>
              {clientName}
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)', marginTop: '2px' }}>
              {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
              {activeCount > 0 && (
                <span style={{ color: 'var(--acc)', marginLeft: '8px' }}>
                  · {activeCount} activo{activeCount !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Section: Projects */}
      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Proyectos
        </h3>
        <button
          onClick={() => router.push('/dashboard/proyectos')}
          className="btn-primary"
          style={{ fontSize: 'var(--text-xs)', padding: '5px 12px' }}
        >
          + Nuevo proyecto
        </button>
      </div>

      {/* Projects list */}
      <div
        style={{
          background: 'var(--s2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r12)',
          overflow: 'hidden',
          marginBottom: '28px',
        }}
      >
        {projects.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <FolderKanban size={28} color="var(--t3)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--t2)', fontSize: 'var(--text-sm)' }}>
              Sin proyectos para este cliente todavía.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Proyecto', 'Estado', 'Última actividad', 'Links', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--t3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      background: 'var(--s1)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p, idx) => {
                const badge = STATUS_CONFIG[p.status]
                const isLast = idx === projects.length - 1
                const isHov = hovered === p.id
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: isLast ? 'none' : '1px solid var(--bsub)',
                      background: isHov ? 'var(--s3)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={() => setHovered(p.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => router.push(`/dashboard/proyectos/${p.id}`)}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FolderKanban size={14} color="var(--t3)" />
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 'var(--text-base)' }}>
                            {p.name}
                          </p>
                          {p.description && (
                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)', marginTop: '1px' }}>
                              {p.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={badge.className}>{badge.label}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)', fontFamily: 'var(--mono)' }}>
                        {formatRelativeTime(p.updated_at)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {p.vercel_url && (
                          <a
                            href={p.vercel_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: 'var(--t3)', display: 'flex' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--acc)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        {p.github_url && (
                          <a
                            href={p.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: 'var(--t3)', display: 'flex' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t1)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
                          >
                            <Github size={14} />
                          </a>
                        )}
                        {p.server_path && (
                          <span title={p.server_path} style={{ color: 'var(--t3)', display: 'flex' }}>
                            <Monitor size={14} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: isHov ? 'var(--acc)' : 'var(--t3)', transition: 'color 120ms' }}>
                        Ver proyecto →
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Notes placeholder — enabled after migration applied */}
      <div
        style={{
          background: 'var(--s2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r12)',
          padding: '20px',
        }}
      >
        <h3 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
          Notas del cliente
        </h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>
          Editor de notas disponible tras aplicar la migración{' '}
          <code style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>20260527000004_clients_schema.sql</code>{' '}
          en Supabase Dashboard.
        </p>
      </div>
    </div>
  )
}
