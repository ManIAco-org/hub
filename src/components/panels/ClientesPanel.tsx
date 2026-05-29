'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, FolderKanban, ChevronRight, Clock, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { toSlug } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Project, ProjectStatus } from '@/lib/types'

interface ClientGroup {
  client_name: string
  projects: Project[]
  lastActivity: string
}

const STATUS_PRIORITY: Record<ProjectStatus, number> = {
  active: 0,
  paused: 1,
  done: 2,
}

function consolidatedStatus(projects: Project[]): ProjectStatus {
  if (projects.some((p) => p.status === 'active')) return 'active'
  if (projects.some((p) => p.status === 'paused')) return 'paused'
  return 'done'
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string }> = {
  active: { label: 'Activo',   className: 'badge badge-acc' },
  paused: { label: 'Pausado',  className: 'badge badge-warn' },
  done:   { label: 'Listo',    className: 'badge badge-ok' },
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

function ClientCard({
  group,
  onDrilldown,
}: {
  group: ClientGroup
  onDrilldown: (clientName: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const status = consolidatedStatus(group.projects)
  const badge = STATUS_CONFIG[status]
  const activeCount = group.projects.filter((p) => p.status === 'active').length
  const sorted = [...group.projects].sort(
    (a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
  )

  return (
    <div
      onClick={() => onDrilldown(group.client_name)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--s2)',
        border: `1px solid ${hovered ? 'var(--acc)' : 'var(--border)'}`,
        borderRadius: 'var(--r12)',
        padding: '20px',
        cursor: 'pointer',
        transition: 'border-color var(--t-normal), box-shadow var(--t-normal)',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px', height: '36px', borderRadius: 'var(--r8)',
              background: 'var(--s3)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
            }}
          >
            <Building2 size={18} color="var(--t2)" />
          </div>
          <div>
            <h3 style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-md)', lineHeight: 1.2 }}>
              {group.client_name}
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)', marginTop: '2px' }}>
              {group.projects.length} proyecto{group.projects.length !== 1 ? 's' : ''}
              {activeCount > 0 && (
                <span style={{ color: 'var(--acc)', marginLeft: '6px' }}>
                  · {activeCount} activo{activeCount !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={badge.className}>{badge.label}</span>
          <ChevronRight
            size={16}
            color={hovered ? 'var(--acc)' : 'var(--t3)'}
            style={{ transition: 'color var(--t-normal), transform var(--t-normal)', transform: hovered ? 'translateX(2px)' : 'none' }}
          />
        </div>
      </div>

      {/* Project list preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
        {sorted.slice(0, 3).map((p) => {
          const pb = STATUS_CONFIG[p.status]
          return (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 10px', background: 'var(--s1)', borderRadius: 'var(--r8)',
              }}
            >
              <FolderKanban size={12} color="var(--t3)" />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
              <span className={pb.className} style={{ fontSize: '10px', padding: '1px 6px' }}>
                {pb.label}
              </span>
            </div>
          )
        })}
        {sorted.length > 3 && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)', paddingLeft: '10px' }}>
            +{sorted.length - 3} más
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Clock size={11} color="var(--t3)" />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)' }}>
          Última actividad {formatRelativeTime(group.lastActivity)}
        </span>
      </div>
    </div>
  )
}

// ── New Client Modal ──────────────────────────────────────────────────────────
function NewClientModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const supabase = createClient()
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    industria: '',
    ciudad: '',
    contacto: '',
    notas: '',
  })

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    startTransition(async () => {
      const slug = toSlug(form.name.trim())
      const { error } = await supabase
        .from('clients')
        .insert({
          slug,
          name: form.name.trim(),
          description: form.industria.trim() || null,
          contact_info: {
            ...(form.industria.trim() ? { industria: form.industria.trim() } : {}),
            ...(form.ciudad.trim()    ? { ciudad:    form.ciudad.trim()    } : {}),
            ...(form.contacto.trim()  ? { contacto:  form.contacto.trim()  } : {}),
          },
          notes_md: form.notas.trim() || null,
        })
      if (error) {
        toast.error(error.code === '23505' ? 'Ya existe un cliente con ese nombre' : 'Error al crear cliente')
        setSaving(false)
      } else {
        toast.success('Cliente creado')
        onClose()
        router.push(`/dashboard/clientes/${slug}`)
      }
    })
  }

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--s1)', border: '1px solid var(--border)',
          borderRadius: 'var(--r12)', padding: '24px',
          width: '100%', maxWidth: '480px',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={18} color="var(--acc)" />
            <h3 style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-md)' }}>Nuevo cliente</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', padding: '4px' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t1)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Nombre (required) */}
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
              Nombre <span style={{ color: 'var(--acc)' }}>*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={update('name')}
              placeholder="Maniaco Studio"
              className="input"
              autoFocus
              required
            />
          </div>

          {/* Industria */}
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
              Industria
            </label>
            <input
              type="text"
              value={form.industria}
              onChange={update('industria')}
              placeholder="SaaS, E-commerce, Salud..."
              className="input"
            />
          </div>

          {/* Ciudad/País */}
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
              Ciudad / País
            </label>
            <input
              type="text"
              value={form.ciudad}
              onChange={update('ciudad')}
              placeholder="Buenos Aires, Argentina"
              className="input"
            />
          </div>

          {/* Contacto principal */}
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
              Contacto principal
            </label>
            <input
              type="text"
              value={form.contacto}
              onChange={update('contacto')}
              placeholder="Juan Pérez — juan@empresa.com"
              className="input"
            />
          </div>

          {/* Notas iniciales */}
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
              Notas iniciales
            </label>
            <textarea
              value={form.notas}
              onChange={update('notas')}
              placeholder="Contexto, objetivos, links de referencia..."
              rows={3}
              className="input"
              style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ fontSize: 'var(--text-sm)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', opacity: saving ? 0.7 : 1 }}
            >
              <Plus size={14} />
              {saving ? 'Creando...' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export function ClientesPanel({ projects }: { projects: Project[] }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  function handleDrilldown(clientName: string) {
    router.push(`/dashboard/clientes/${toSlug(clientName)}`)
  }

  // Group by client_name, sorted by most recent activity
  const groups: ClientGroup[] = Object.values(
    projects.reduce<Record<string, ClientGroup>>((acc, project) => {
      const key = project.client_name
      if (!acc[key]) {
        acc[key] = { client_name: key, projects: [], lastActivity: project.updated_at }
      }
      acc[key]!.projects.push(project)
      // Track most recent activity
      if (project.updated_at > acc[key]!.lastActivity) {
        acc[key]!.lastActivity = project.updated_at
      }
      return acc
    }, {})
  ).sort((a, b) => b.lastActivity.localeCompare(a.lastActivity))

  return (
    <div>
      {showModal && <NewClientModal onClose={() => setShowModal(false)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px' }}>
            Clientes
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t2)' }}>
            {groups.length} cliente{groups.length !== 1 ? 's' : ''} · {projects.length} proyecto{projects.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', flexShrink: 0 }}
        >
          <Plus size={14} />
          Nuevo cliente
        </button>
      </div>

      {groups.length === 0 ? (
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 20px', gap: '12px',
          }}
        >
          <Building2 size={32} color="var(--t3)" />
          <p style={{ color: 'var(--t2)', fontSize: 'var(--text-md)' }}>Sin clientes todavía.</p>
          <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>
            Creá el primer cliente con el botón de arriba, o agregá un proyecto en{' '}
            <strong style={{ color: 'var(--t2)' }}>Proyectos</strong>.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
          }}
        >
          {groups.map((group) => (
            <ClientCard
              key={group.client_name}
              group={group}
              onDrilldown={handleDrilldown}
            />
          ))}
        </div>
      )}
    </div>
  )
}
