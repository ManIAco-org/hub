import { createClient } from '@/lib/supabase/server'
import type { MemberName } from '@/lib/types'

// Map of email → display name for the team
const TEAM_NAMES: Record<string, MemberName> = {
  'franco.sanmartin@maniaco.online': 'Franco',
  'luis.giannasi@maniaco.online':    'Lucho',
  'noelia.bottallo@maniaco.online':  'Noe',
}

/**
 * Ensures the logged-in user has a row in team_status.
 * Called on first login — upserts so it's idempotent (safe to call every login).
 * Returns the member name if known, null if not a team member.
 */
export async function upsertMemberStatus(email: string): Promise<MemberName | null> {
  const memberName = TEAM_NAMES[email]
  if (!memberName) {
    console.warn(`[upsertMemberStatus] Unknown team member: ${email}`)
    return null
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('team_status')
    .upsert(
      {
        member_email: email,
        member_name: memberName,
        // Don't overwrite existing status/project/task on re-login
      },
      {
        onConflict: 'member_email',
        ignoreDuplicates: true,  // only insert if not exists, never overwrite
      }
    )

  if (error) {
    console.error('[upsertMemberStatus] Error:', error.message)
  }

  return memberName
}
