'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FolderKanban, ExternalLink, Github, Monitor, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Project, ProjectStatus, Client } from '@/lib/types'
import { NotesPanel } from './NotesPanel'

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

type Tab = 'resumen' | 'proyectos' | 'notas'

interface Props {
  clientId: string
  clientName: string
  clientSlug: string
  projects: Project[]
  createdBy?: string
  ownerEmail?: string
}

export function ClientDetailPanel({
  clientId,
  clientName,
  projects: initialProjects,
  createdBy = 'franco.sanmartin@maniaco.online',
  ownerEmail = 'franco.sanmartin@maniaco.online',
}: Props) {
  const router  = useRouter()
  const supabase = createClient()

  const [activeTab, setActiveTab]   = useState<Tab>('resumen')
  const [hovered, setHovered]       = useState<string | null>(null)
  const [projects, setProjects]     = useState<Project[]>(initialProjects)
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [saving, setSaving]         = useState(false)

  const activeCount = projects.filter((p) => p.status === 'active').length

  // ── Quick-create project pre-filled with this client ─────────────────────────
  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault()
    const name = newProjectName.trim()
    if (!name) return
    setSaving(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        client_name: clientName,
        client_id: clientId,
        owner_email: ownerEmail,
        status: 'active',
      })
      .select()
      .single()
    setSaving(false)
    if (error) { toast.error('Error al crear proyecto'); return }
    setProjects((prev) => [data as Project, ...prev])
    setNewProjectName('')
    setShowNewProject(false)
    toast.success(`Proyecto "${name}" creado`)
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────────
  const TAB_LABELS: { id: Tab; label: string }[] = [
    { id: 'resumen',   label: 'Resumen' },
    { id: 'proyectos', label: `Proyectos${projects.length > 0 ? ` (${projects.length})` : ''}` },
    { id: 'notas',     label: 'Notas' },
  ]

  return (
    <div>
      {/* Client header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '4px' }}>
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

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--border)',
        marginBottom: '24px',
      }}>
        {TAB_LABELS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${activeTab === id ? 'var(--acc)' : 'transparent'}`,
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
              fontWeight: activeTab === id ? 600 : 400,
              color: activeTab === id ? 'var(--acc)' : 'var(--t2)',
              transition: 'color 120ms, border-color 120ms',
              marginBottom: '-1px',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Resumen ───────────────────────────────────────────────────────── */}
      {activeTab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {[
              { label: 'Total proyectos',  value: projects.length },
              { label: 'Activos',          value: activeCount },
              { label: 'Pausados / Listos', value: projects.length - activeCount },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  background: 'var(--s2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r12)', padding: '16px',
                }}
              >
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)', marginBottom: '4px' }}>{label}</p>
                <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--t1)' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Recent projects shortlist */}
          {projects.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                Proyectos recientes
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {projects.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/dashboard/proyectos/${p.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                      background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)',
                      cursor: 'pointer', transition: 'border-color 120ms',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--acc)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <FolderKanban size={14} color="var(--t3)" />
                    <span style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 'var(--text-sm)', flex: 1 }}>{p.name}</span>
                    <span className={STATUS_CONFIG[p.status].className}>{STATUS_CONFIG[p.status].label}</span>
                  </div>
                ))}
              </div>
              {projects.length > 3 && (
                <button
                  onClick={() => setActiveTab('proyectos')}
                  style={{ marginTop: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--acc)', fontSize: 'var(--text-xs)' }}
                >
                  Ver todos los proyectos →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Proyectos ─────────────────────────────────────────────────────── */}
      {activeTab === 'proyectos' && (
        <div>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Proyectos
            </p>
            <button
              onClick={() => setShowNewProject(true)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: 'var(--text-xs)', padding: '5px 12px' }}
            >
              <Plus size={12} />
              Nuevo proyecto
            </button>
          </div>

          {/* Projects list */}
          <div
            style={{
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r12)',
              overflow: 'hidden',
            }}
          >
            {projects.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <FolderKanban size={28} color="var(--t3)" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--t2)', fontSize: 'var(--text-sm)' }}>
                  Sin proyectos para este cliente todavía.
                </p>
                <button
                  onClick={() => setShowNewProject(true)}
                  className="btn-primary"
                  style={{ marginTop: '12px', fontSize: 'var(--text-xs)', padding: '7px 16px' }}
                >
                  + Nuevo proyecto
                </button>
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
                            Ver →
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Notas ─────────────────────────────────────────────────────────── */}
      {activeTab === 'notas' && (
        <NotesPanel
          clientId={clientId}
          createdBy={createdBy}
        />
      )}

      {/* ── New project modal (inline, client pre-selected) ───────────────────── */}
      {showNewProject && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: '20px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowNewProject(false); setNewProjectName('') } }}
        >
          <form
            onSubmit={handleCreateProject}
            style={{
              background: 'var(--s2)', border: '1px solid var(--border)',
              borderRadius: 'var(--r16)', padding: '28px',
              width: '100%', maxWidth: '400px', boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--t1)', marginBottom: '6px' }}>
              Nuevo proyecto
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)', marginBottom: '20px' }}>
              Cliente: <strong style={{ color: 'var(--acc)' }}>{clientName}</strong>
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                Nombre del proyecto *
              </label>
              <input
                className="input"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Mi nuevo proyecto"
                required
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setShowNewProject(false); setNewProjectName('') }}
                style={{ background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: 'var(--text-sm)', padding: '8px 14px' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
                style={{ fontSize: 'var(--text-sm)', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Creando...' : 'Crear proyecto'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
