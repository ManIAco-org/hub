'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getPresenceLabel } from '@/lib/presenceLabel'
import type { MemberStatus } from '@/lib/types'

const ACTIVE_MS   = 30 * 60 * 1_000  // 0–30 min  → active
const AWAY_MS     = 90 * 60 * 1_000  // 30–90 min → away
const INTERVAL_MS =  2 * 60 * 1_000  // push update every 2 min

function pathToProject(pathname: string): string | null {
  if (pathname.startsWith('/dashboard/marketing'))   return 'Marketing'
  if (pathname.startsWith('/dashboard/terminal'))    return 'Terminal personal'
  if (pathname.startsWith('/dashboard/deploys'))     return 'Deploys'
  if (pathname.startsWith('/dashboard/proyectos/')) return getPresenceLabel() ?? 'En proyecto'
  if (pathname.startsWith('/dashboard/clientes/'))  return getPresenceLabel() ?? 'Revisando cliente'
  return null   // home / equipo / proyectos list → no current_project
}

function calcStatus(lastActivity: number): MemberStatus {
  const elapsed = Date.now() - lastActivity
  if (elapsed < ACTIVE_MS) return 'active'
  if (elapsed < AWAY_MS)   return 'away'
  return 'idle'
}

/**
 * Auto-updates team_status based on browser activity and current route.
 * Mount once in DashboardLayout via <PresenceTracker />.
 */
export function usePresenceTracker({ userEmail }: { userEmail: string }) {
  const pathname        = usePathname()
  const lastActivityRef = useRef(Date.now())
  const supabase        = createClient()

  // Track any user interaction to determine activity status
  useEffect(() => {
    const touch = () => { lastActivityRef.current = Date.now() }
    const opts: AddEventListenerOptions = { passive: true }
    window.addEventListener('mousemove', touch, opts)
    window.addEventListener('keydown',   touch, opts)
    window.addEventListener('scroll',    touch, opts)
    window.addEventListener('click',     touch, opts)
    return () => {
      window.removeEventListener('mousemove', touch)
      window.removeEventListener('keydown',   touch)
      window.removeEventListener('scroll',    touch)
      window.removeEventListener('click',     touch)
    }
  }, [])

  const pushUpdate = useCallback(async (path: string) => {
    if (!userEmail) return
    const { error } = await supabase
      .from('team_status')
      .update({
        status:          calcStatus(lastActivityRef.current),
        current_project: pathToProject(path),
        current_task:    null,          // task field removed from manual editing
        last_active_at:  new Date().toISOString(),
      })
      .eq('member_email', userEmail)
    if (error) console.error('[presence] update failed:', error.message)
  }, [userEmail, supabase])

  // Update on path change — slight delay so page components have time to setPresenceLabel
  useEffect(() => {
    const t = setTimeout(() => { void pushUpdate(pathname) }, 200)
    return () => clearTimeout(t)
  }, [pathname, pushUpdate])

  // Periodic heartbeat
  useEffect(() => {
    const id = setInterval(() => { void pushUpdate(pathname) }, INTERVAL_MS)
    return () => clearInterval(id)
  }, [pathname, pushUpdate])
}
