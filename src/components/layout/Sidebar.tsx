'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Users,
  FolderKanban,
  Building2,
  TerminalSquare,
  Rocket,
  BarChart3,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard',           label: 'Equipo',      icon: Users },
  { href: '/dashboard/proyectos', label: 'Proyectos',   icon: FolderKanban },
  { href: '/dashboard/clientes',  label: 'Clientes',    icon: Building2 },
  { href: '/dashboard/terminal',  label: 'Terminal',    icon: TerminalSquare },
  { href: '/dashboard/deploys',   label: 'Deploys',     icon: Rocket },
  { href: '/dashboard/marketing', label: 'Marketing',   icon: BarChart3 },
] as const

interface SidebarProps {
  userEmail: string
  memberName: string
}

export function Sidebar({ userEmail, memberName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Avatar initials from member name
  const initials = memberName
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside
      style={{
        width: 'var(--sidebar-w)',
        minWidth: 'var(--sidebar-w)',
        background: 'var(--s1)',
        borderRight: '1px solid var(--border)',
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        overflowY: 'auto',
      }}
    >
      {/* Brand mark */}
      <div
        style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid var(--bsub)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--ui)',
            fontWeight: 700,
            fontSize: '18px',
            color: 'var(--t1)',
            letterSpacing: '-0.3px',
          }}
        >
          Man<span style={{ color: 'var(--acc)' }}>IA</span>cos
        </span>
        <p
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--t3)',
            marginTop: '2px',
          }}
        >
          Hub interno
        </p>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn('sidebar-pill', isActive && 'active')}
              style={{ marginBottom: '2px', textDecoration: 'none' }}
            >
              <Icon size={16} strokeWidth={1.8} />
              <span style={{ fontSize: 'var(--text-base)' }}>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--bsub)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        {/* Avatar */}
        <div
          className="avatar avatar-md"
          style={{ background: 'var(--acc-d)', color: 'var(--acc)', flexShrink: 0 }}
        >
          {initials}
        </div>

        {/* Name + email */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--t1)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {memberName}
          </p>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--t3)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {userEmail}
          </p>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--t3)',
            padding: '4px',
            borderRadius: 'var(--r6)',
            display: 'flex',
            alignItems: 'center',
            transition: 'color var(--t-normal)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--err)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
        >
          <LogOut size={15} strokeWidth={1.8} />
        </button>
      </div>
    </aside>
  )
}
