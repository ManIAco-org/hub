'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ExternalLink, Github, Monitor, X } from 'lucide-react'
import type { Project, ProjectStatus } from '@/lib/types'

const STATUS_BADGE: Record<ProjectStatus, { label: string; className: string }> = {
  active: { label: 'Activo',   className: 'badge badge-acc' },
  paused: { label: 'Pausado',  className: 'badge badge-warn' },
  done:   { label: 'Listo',    className: 'badge badge-ok' },
}

interface NewProjectForm {
  name: string
  client_name: string
  description: string
  vercel_url: string
  github_url: string
  server_path: string
}

const EMPTY_FORM: NewProjectForm = {
  name: '',
  client_name: '',
  description: '',
  vercel_url: '',
  github_url: '',
  server_path: '',
}

export function ProjectsPanel({
  initialData,
  ownerEmail,
  filterCliente,
}: {
  initialData: Project[]
  ownerEmail: string
  filterCliente?: string
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
    if (!form.name.trim() || !form.client_name.trim()) return

    setSaving(true)
    setError(null)

    const { data, error: insertError } = await supabase
      .from('projects')
      .insert({
        name: form.name.trim(),
        client_name: form.client_name.trim(),
        description: form.description.trim() || null,
        vercel_url: form.vercel_url.trim() || null,
        github_url: form.github_url.trim() || null,
        server_path: form.server_path.trim() || null,
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

      {/* New project modal (inline) */}
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
            if (e.target === e.currentTarget) setShowNewForm(false)
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
              maxWidth: '480px',
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
                placeholder="Hub ManIAcos"
                required
                autoFocus
              />
            </div>

            {/* Client */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                Cliente *
              </label>
              <input
                className="input"
                value={form.client_name}
                onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                placeholder="ManIAcos"
                required
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                Descripción
              </label>
              <input
                className="input"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Breve descripción del proyecto"
              />
            </div>

            {/* Vercel URL */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                URL de Vercel
              </label>
              <input
                className="input"
                value={form.vercel_url}
                onChange={(e) => setForm((f) => ({ ...f, vercel_url: e.target.value }))}
                placeholder="https://proyecto.vercel.app"
                type="url"
              />
            </div>

            {/* Server path */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                Ruta en Oracle <span style={{ color: 'var(--t3)' }}>(para terminal)</span>
              </label>
              <input
                className="input"
                value={form.server_path}
                onChange={(e) => setForm((f) => ({ ...f, server_path: e.target.value }))}
                placeholder="/srv/maniacos/mi-proyecto"
              />
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
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--s3)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
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
                          title={hasServerPath ? 'Abrir terminal en este proyecto' : 'Configurá la ruta del servidor para habilitar el terminal'}
                          className="btn-secondary"
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
