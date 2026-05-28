'use client'

import { usePresenceTracker } from '@/hooks/usePresenceTracker'

/**
 * Invisible client component that auto-updates team_status presence.
 * Rendered inside DashboardLayout (server component) with userEmail prop.
 */
export function PresenceTracker({ userEmail }: { userEmail: string }) {
  usePresenceTracker({ userEmail })
  return null
}
