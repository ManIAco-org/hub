'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ExternalLink, Github, Monitor, X } from 'lucide-react'
import type { Project, ProjectStatus, Client } from '@/lib/types'

const STATUS_BADGE: Record<ProjectStatus, { label: string; className: string }> = {
  active: { label: 'Activo',   className: 'badge badge-acc' },
  paused: { label: 'Pausado',  className: 'badge badge-warn' },
  done:   { label: 'Listo',    className: 'badge badge-ok' },
}

interface NewProjectForm {
  name: string
  clientId: string    // FK to clients.id ('' = none)
  clientName: string  // display / free-text fallback
}

const EMPTY_FORM: NewProjectForm = { name: '', clientId: '', clientName: '' }

export function ProjectsPanel({
  initialData,
  ownerEmail,
  filterCliente,
  clients = [],
}: {
  initialData: Project[]
  ownerEmail: string
  filterCliente?: string
  clients?: Pick<Client, 'id' | 'slug' | 'name'>[]
}) {
  const supabase = createClient()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>(initialData)
  const [showNewForm, setShowNewForm] = useState(false)
  const [form, setForm] = useState<NewProjectForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const nameClean = form.name.trim()
    const clientNameClean = form.clientName.trim()
    if (!nameClean || !clientNameClean) return

    setSaving(true)
    setError(null)

    const { data, error: insertError } = await supabase
      .from('projects')
      .insert({
        name: nameClean,
        client_name: clientNameClean,
        client_id: form.clientId || null,
        owner_email: ownerEmail,
        status: 'active',
      })
      .select()
      .single()

    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    if (data) {
      setProjects((prev) => [data as Project, ...prev])
    }
    setForm(EMPTY_FORM)
    setShowNewForm(false)
  }

  function handleClientSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = clients.find((c) => c.id === e.target.value)
    if (selected) {
      setForm((f) => ({ ...f, clientId: selected.id, clientName: selected.name }))
    } else {
      setForm((f) => ({ ...f, clientId: '', clientName: '' }))
    }
  }

  const displayed = filterCliente
    ? projects.filter((p) => p.client_name === filterCliente)
    : projects

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px' }}>
            Proyectos
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t2)' }}>
            {displayed.length} proyecto{displayed.length !== 1 ? 's' : ''}
            {filterCliente && ` de ${filterCliente}`}
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="btn-primary"
          style={{ fontSize: 'var(--text-sm)', padding: '8px 14px' }}
        >
          + Nuevo proyecto
        </button>
      </div>

      {/* Filter banner */}
      {filterCliente && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            background: 'var(--s2)',
            border: '1px solid var(--acc)',
            borderRadius: 'var(--r8)',
            marginBottom: '16px',
            fontSize: 'var(--text-sm)',
            color: 'var(--t2)',
          }}
        >
          <span>Filtrando por cliente: <strong style={{ color: 'var(--acc)' }}>{filterCliente}</strong></span>
          <button
            onClick={() => router.push('/dashboard/proyectos')}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--t3)',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
            }}
            title="Quitar filtro"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* New project modal */}
      {showNewForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) { setShowNewForm(false); setForm(EMPTY_FORM) }
          }}
        >
          <form
            onSubmit={handleCreate}
            style={{
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r16)',
              padding: '28px',
              width: '100%',
              maxWidth: '420px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--t1)', marginBottom: '20px' }}>
              Nuevo proyecto
            </h3>

            {/* Name */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                Nombre del proyecto *
              </label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Mi proyecto"
                required
                autoFocus
              />
            </div>

            {/* Client dropdown */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                Cliente *
              </label>
              {clients.length > 0 ? (
                <select
                  className="input"
                  value={form.clientId}
                  onChange={handleClientSelect}
                  required
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Seleccioná un cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  value={form.clientName}
                  onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value, clientId: '' }))}
                  placeholder="ManIAcos"
                  required
                />
              )}
            </div>

            {error && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--err)', marginBottom: '12px' }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setShowNewForm(false); setForm(EMPTY_FORM) }}
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

      {/* Empty state */}
      {displayed.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            gap: '12px',
          }}
        >
          <p style={{ color: 'var(--t2)', fontSize: 'var(--text-md)' }}>
            {filterCliente ? `Sin proyectos para ${filterCliente}.` : 'Sin proyectos — empezá el primero.'}
          </p>
          <button
            onClick={() => setShowNewForm(true)}
            className="btn-primary"
          >
            + Nuevo proyecto
          </button>
        </div>
      ) : (
        /* Projects table */
        <div
          style={{
            background: 'var(--s2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r12)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Proyecto', 'Cliente', 'Estado', 'Vercel', 'Acciones'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      color: 'var(--t3)',
                      whiteSpace: 'nowrap',
                      background: 'var(--s1)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((project, idx) => {
                const badge = STATUS_BADGE[project.status]
                const hasServerPath = Boolean(project.server_path)
                const isLast = idx === displayed.length - 1

                return (
                  <tr
                    key={project.id}
                    style={{
                      borderBottom: isLast ? 'none' : '1px solid var(--bsub)',
                      transition: 'background var(--t-fast)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--s3)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => router.push(`/dashboard/proyectos/${project.id}`)}
                  >
                    {/* Name */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 'var(--text-base)' }}>
                        {project.name}
                      </span>
                      {project.description && (
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)', marginTop: '2px' }}>
                          {project.description}
                        </p>
                      )}
                    </td>

                    {/* Client */}
                    <td style={{ padding: '14px 16px', fontSize: 'var(--text-sm)', color: 'var(--t2)' }}>
                      {project.client_name}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <span className={badge.className}>{badge.label}</span>
                    </td>

                    {/* Vercel link */}
                    <td style={{ padding: '14px 16px' }}>
                      {project.vercel_url ? (
                        <a
                          href={project.vercel_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--t2)',
                            fontSize: 'var(--text-xs)',
                            textDecoration: 'none',
                            transition: 'color var(--t-normal)',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--acc)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t2)')}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={13} />
                          Ver deploy
                        </a>
                      ) : (
                        <span style={{ color: 'var(--t3)', fontSize: 'var(--text-xs)' }}>—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Trabajar button */}
                        <button
                          disabled={!hasServerPath}
                          title={hasServerPath ? 'Abrir terminal en este proyecto' : 'El servidor se configura automáticamente'}
                          className="btn-secondary"
                          onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/proyectos/${project.id}`) }}
                          style={{
                            fontSize: 'var(--text-xs)',
                            padding: '5px 10px',
                            opacity: hasServerPath ? 1 : 0.4,
                            cursor: hasServerPath ? 'pointer' : 'not-allowed',
                          }}
                        >
                          <Monitor size={13} />
                          Trabajar
                        </button>

                        {/* GitHub link */}
                        {project.github_url && (
                          <a
                            href={project.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: 'var(--t3)', display: 'flex', alignItems: 'center' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t1)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
                          >
                            <Github size={15} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
