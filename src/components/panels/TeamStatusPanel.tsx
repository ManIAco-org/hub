'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TeamStatus, MemberStatus } from '@/lib/types'

interface TeamStatusPanelProps {
  initialData: TeamStatus[]
  currentUserEmail: string
}

const STATUS_LABELS: Record<MemberStatus, { label: string; color: string; pulse: boolean }> = {
  active: { label: 'Activo',   color: 'var(--run)',  pulse: true  },
  idle:   { label: 'Inactivo', color: 'var(--t3)',   pulse: false },
  away:   { label: 'Ausente',  color: 'var(--warn)', pulse: false },
}

const DISPLAY_NAMES: Record<string, string> = {
  'franco.sanmartin@maniaco.online': 'Franco San Martín',
  'luis.giannasi@maniaco.online':    'Luis Giannasi',
  'noelia.bottallo@maniaco.online':  'Noelia Bottallo',
}

const AVATAR_COLORS: Record<string, string> = {
  'franco.sanmartin@maniaco.online': 'rgba(6,182,212,0.18)',
  'luis.giannasi@maniaco.online':    'rgba(163,230,53,0.15)',
  'noelia.bottallo@maniaco.online':  'rgba(245,158,11,0.15)',
}
const AVATAR_TEXT_COLORS: Record<string, string> = {
  'franco.sanmartin@maniaco.online': 'var(--acc)',
  'luis.giannasi@maniaco.online':    'var(--run)',
  'noelia.bottallo@maniaco.online':  'var(--warn)',
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
        width: '8px', height: '8px',
        borderRadius: '50%',
        background: cfg.color,
        flexShrink: 0,
      }}
    />
  )
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'ahora mismo'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

// ── Read-only member card — status auto-detected by presence tracker ──────────
function MemberCard({
  member,
  isOwn,
}: {
  member: TeamStatus
  isOwn: boolean
}) {
  const [flash, setFlash] = useState(false)
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
        transition: 'border-color var(--t-normal)',
        position: 'relative',
      }}
    >
      {/* "Tú" label */}
      {isOwn && (
        <span style={{
          position: 'absolute', top: '10px', right: '12px',
          fontSize: 'var(--text-xs)', color: 'var(--acc)', fontWeight: 600,
        }}>
          Tú
        </span>
      )}

      {/* Header: avatar + name + status badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        {/* Avatar with status dot */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
          background: AVATAR_COLORS[member.member_email] ?? 'var(--s3)',
          color: AVATAR_TEXT_COLORS[member.member_email] ?? 'var(--t2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '13px', fontFamily: 'var(--ui)',
          position: 'relative',
        }}>
          {getInitials(member.member_email)}
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
                background: `rgba(${
                  statusCfg.color === 'var(--run)'  ? '163,230,53'  :
                  statusCfg.color === 'var(--warn)' ? '245,158,11'  :
                  '82,88,102'}, 0.12)`,
                color: statusCfg.color,
                border: `1px solid ${statusCfg.color === 'var(--t3)' ? 'var(--border)' : statusCfg.color}22`,
                fontSize: 'var(--text-xs)',
              }}
            >
              {statusCfg.pulse && <span style={{ marginRight: '4px' }}>●</span>}
              {statusCfg.label}
            </span>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)', marginTop: '1px' }}>
            {member.member_email}
          </p>
        </div>
      </div>

      {/* Activity info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t2)' }}>
          {member.current_project ?? (
            <span style={{ color: 'var(--t3)', fontStyle: 'italic' }}>Sin actividad registrada</span>
          )}
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)', marginTop: '4px' }}>
          Visto {formatRelativeTime(member.last_active_at)}
        </p>
      </div>
    </div>
  )
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
            return exists
              ? prev.map((m) => (m.id === updated.id ? updated : m))
              : [...prev, updated]
          })
        },
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [supabase])

  if (members.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '16px' }}>
        <p style={{ color: 'var(--t2)', fontSize: 'var(--text-md)' }}>
          Nadie online todavía.
        </p>
      </div>
    )
  }

  const sorted = [...members].sort((a, b) => {
    if (a.member_email === currentUserEmail) return -1
    if (b.member_email === currentUserEmail) return 1
    return a.member_name.localeCompare(b.member_name)
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
      {sorted.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          isOwn={member.member_email === currentUserEmail}
        />
      ))}
    </div>
  )
}
