'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TeamStatus, MemberStatus } from '@/lib/types'

interface TeamStatusPanelProps {
  initialData: TeamStatus[]
  currentUserEmail: string
}

const STATUS_LABELS: Record<MemberStatus, { label: string; color: string; pulse: boolean }> = {
  active: { label: 'Activo',    color: 'var(--run)',  pulse: true },
  idle:   { label: 'Inactivo',  color: 'var(--t3)',   pulse: false },
  away:   { label: 'Ausente',   color: 'var(--warn)', pulse: false },
}

const DISPLAY_NAMES: Record<string, string> = {
  'franco.sanmartin@maniaco.online': 'Franco San Martín',
  'lucho@maniaco.online': 'Luis Giannasi',
  'noe@maniaco.online': 'Noelia Bottallo',
}

// Distinct cyan-ish accent per member for avatar bg
const AVATAR_COLORS: Record<string, string> = {
  'franco.sanmartin@maniaco.online': 'rgba(6,182,212,0.18)',
  'lucho@maniaco.online': 'rgba(163,230,53,0.15)',
  'noe@maniaco.online': 'rgba(245,158,11,0.15)',
}
const AVATAR_TEXT_COLORS: Record<string, string> = {
  'franco.sanmartin@maniaco.online': 'var(--acc)',
  'lucho@maniaco.online': 'var(--run)',
  'noe@maniaco.online': 'var(--warn)',
}

function getInitials(email: string): string {
  const name = DISPLAY_NAMES[email] ?? email.split('@')[0] ?? '?'
  return name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
}

function StatusDot({ status }: { status: MemberStatus }) {
  const cfg = STATUS_LABELS[status]
  return (
    <span
      className={cfg.pulse ? 'dot-run' : ''}
      style={{
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: cfg.color,
        flexShrink: 0,
      }}
    />
  )
}

function MemberCard({
  member,
  isOwn,
  onSave,
}: {
  member: TeamStatus
  isOwn: boolean
  onSave: (updates: Partial<Pick<TeamStatus, 'status' | 'current_project' | 'current_task'>>) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(false)

  // Edit form state
  const [editStatus, setEditStatus] = useState<MemberStatus>(member.status)
  const [editProject, setEditProject] = useState(member.current_project ?? '')
  const [editTask, setEditTask] = useState(member.current_task ?? '')

  const prevUpdatedAt = useRef(member.updated_at)

  // Flash on Realtime update
  useEffect(() => {
    if (member.updated_at !== prevUpdatedAt.current) {
      prevUpdatedAt.current = member.updated_at
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 900)
      return () => clearTimeout(t)
    }
  }, [member.updated_at])

  // Sync local form state if external update while not editing
  useEffect(() => {
    if (!editing) {
      setEditStatus(member.status)
      setEditProject(member.current_project ?? '')
      setEditTask(member.current_task ?? '')
    }
  }, [member, editing])

  function handleCardClick() {
    if (!isOwn || editing) return
    setEditing(true)
  }

  function handleCancel() {
    setEditStatus(member.status)
    setEditProject(member.current_project ?? '')
    setEditTask(member.current_task ?? '')
    setEditing(false)
  }

  async function handleSave() {
    setSaving(true)
    await onSave({
      status: editStatus,
      current_project: editProject.trim() || null,
      current_task: editTask.trim() || null,
    } as Partial<Pick<TeamStatus, 'status' | 'current_project' | 'current_task'>>)
    setSaving(false)
    setEditing(false)
  }

  const statusCfg = STATUS_LABELS[member.status]

  return (
    <div
      className={flash ? 'rt-flash' : ''}
      style={{
        background: 'var(--s2)',
        border: `1px solid ${isOwn ? 'var(--acc)' : 'var(--border)'}`,
        borderRadius: 'var(--r12)',
        padding: '16px',
        boxShadow: 'var(--shadow-sm)',
        cursor: isOwn && !editing ? 'pointer' : 'default',
        transition: 'border-color var(--t-normal), box-shadow var(--t-normal)',
        position: 'relative',
      }}
      onClick={handleCardClick}
      onMouseEnter={(e) => {
        if (isOwn && !editing) {
          e.currentTarget.style.boxShadow = 'var(--shadow-md)'
          e.currentTarget.style.borderColor = 'var(--acc)'
        }
      }}
      onMouseLeave={(e) => {
        if (!editing) {
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
          e.currentTarget.style.borderColor = isOwn ? 'var(--acc)' : 'var(--border)'
        }
      }}
    >
      {/* "Tú" label */}
      {isOwn && (
        <span
          style={{
            position: 'absolute',
            top: '10px',
            right: '12px',
            fontSize: 'var(--text-xs)',
            color: 'var(--acc)',
            fontWeight: 600,
          }}
        >
          Tú {!editing && <span style={{ color: 'var(--t3)' }}>· click para editar</span>}
        </span>
      )}

      {/* Header: avatar + name + email + status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        {/* Avatar */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
          background: AVATAR_COLORS[member.member_email] ?? 'var(--s3)',
          color: AVATAR_TEXT_COLORS[member.member_email] ?? 'var(--t2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '13px', fontFamily: 'var(--ui)',
          position: 'relative',
        }}>
          {getInitials(member.member_email)}
          {/* Status dot */}
          <span style={{
            position: 'absolute', bottom: '0px', right: '0px',
            width: '10px', height: '10px', borderRadius: '50%',
            background: statusCfg.color,
            border: '2px solid var(--s2)',
          }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 'var(--text-md)' }}>
              {DISPLAY_NAMES[member.member_email] ?? member.member_name}
            </span>
            <span
              className="badge"
              style={{
                background: `rgba(${statusCfg.color === 'var(--run)' ? '163,230,53' : statusCfg.color === 'var(--warn)' ? '245,158,11' : '82,88,102'}, 0.12)`,
                color: statusCfg.color,
                border: `1px solid ${statusCfg.color === 'var(--t3)' ? 'var(--border)' : statusCfg.color}22`,
                fontSize: 'var(--text-xs)',
              }}
            >
              {statusCfg.pulse && <span style={{ marginRight: '4px' }}>●</span>}{statusCfg.label}
            </span>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)', marginTop: '1px' }}>
            {member.member_email}
          </p>
        </div>
      </div>

      {!editing ? (
        /* ── Read-only view ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t2)' }}>
            {member.current_project ?? (
              <span style={{ color: 'var(--t3)', fontStyle: 'italic' }}>Sin proyecto activo</span>
            )}
          </p>
          {member.current_task && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)' }}>
              {member.current_task}
            </p>
          )}
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)', marginTop: '6px' }}>
            Activo {formatRelativeTime(member.last_active_at)}
          </p>
        </div>
      ) : (
        /* ── Inline edit form ── */
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Status select */}
          <div>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
              Estado
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as MemberStatus)}
              className="input"
              style={{ height: '36px' }}
            >
              <option value="active">Activo</option>
              <option value="idle">Inactivo</option>
              <option value="away">Ausente</option>
            </select>
          </div>

          {/* Current project */}
          <div>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
              Proyecto actual
            </label>
            <input
              type="text"
              value={editProject}
              onChange={(e) => setEditProject(e.target.value)}
              placeholder="RC Repuestos"
              className="input"
              style={{ height: '36px' }}
              maxLength={80}
            />
          </div>

          {/* Current task */}
          <div>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
              En qué estás
            </label>
            <input
              type="text"
              value={editTask}
              onChange={(e) => setEditTask(e.target.value)}
              placeholder="Armando el schema de Supabase"
              className="input"
              style={{ height: '36px' }}
              maxLength={80}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleCancel}
              disabled={saving}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--t2)',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                padding: '6px 12px',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
              style={{ fontSize: 'var(--text-sm)', padding: '6px 16px', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
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

export function TeamStatusPanel({ initialData, currentUserEmail }: TeamStatusPanelProps) {
  const [members, setMembers] = useState<TeamStatus[]>(initialData)
  const supabase = createClient()

  // Supabase Realtime — subscribe to team_status changes
  useEffect(() => {
    const channel = supabase
      .channel('team_status_panel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_status' },
        (payload) => {
          setMembers((prev) => {
            const updated = payload.new as TeamStatus
            const exists = prev.some((m) => m.id === updated.id)
            if (exists) {
              return prev.map((m) => (m.id === updated.id ? updated : m))
            }
            return [...prev, updated]
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [supabase])

  async function handleSave(
    memberEmail: string,
    updates: Partial<Pick<TeamStatus, 'status' | 'current_project' | 'current_task'>>
  ) {
    const payload = {
      ...updates,
      last_active_at: new Date().toISOString(),
    }

    // Optimistic update
    setMembers((prev) =>
      prev.map((m) =>
        m.member_email === memberEmail ? { ...m, ...payload } : m
      )
    )

    const { error } = await supabase
      .from('team_status')
      .update(payload)
      .eq('member_email', memberEmail)

    if (error) {
      console.error('[TeamStatus] Update error:', error.message)
      // Revert optimistic update on error
      setMembers(initialData)
    }
  }

  if (members.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          gap: '16px',
        }}
      >
        <p style={{ color: 'var(--t2)', fontSize: 'var(--text-md)' }}>
          Nadie ha actualizado su estado todavía.
        </p>
        <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>
          Actualizá el tuyo para empezar.
        </p>
      </div>
    )
  }

  // Sort: own card first, then alphabetical
  const sorted = [...members].sort((a, b) => {
    if (a.member_email === currentUserEmail) return -1
    if (b.member_email === currentUserEmail) return 1
    return a.member_name.localeCompare(b.member_name)
  })

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px',
      }}
    >
      {sorted.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          isOwn={member.member_email === currentUserEmail}
          onSave={(updates) => handleSave(member.member_email, updates)}
        />
      ))}
    </div>
  )
}
