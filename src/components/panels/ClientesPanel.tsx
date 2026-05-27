'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, FolderKanban, ChevronRight, Clock } from 'lucide-react'
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
              width: '36px',
              height: '36px',
              borderRadius: 'var(--r8)',
              background: 'var(--s3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
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
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                background: 'var(--s1)',
                borderRadius: 'var(--r8)',
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

export function ClientesPanel({ projects }: { projects: Project[] }) {
  const router = useRouter()

  function handleDrilldown(clientName: string) {
    router.push(`/dashboard/proyectos?cliente=${encodeURIComponent(clientName)}`)
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

  if (groups.length === 0) {
    return (
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
        <Building2 size={32} color="var(--t3)" />
        <p style={{ color: 'var(--t2)', fontSize: 'var(--text-md)' }}>
          Sin clientes todavía.
        </p>
        <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>
          Creá el primer proyecto en <strong style={{ color: 'var(--t2)' }}>Proyectos</strong> para ver los clientes acá.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px' }}>
          Clientes
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t2)' }}>
          {groups.length} cliente{groups.length !== 1 ? 's' : ''} · {projects.length} proyecto{projects.length !== 1 ? 's' : ''} en total
        </p>
      </div>

      {/* Grid */}
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
    </div>
  )
}
