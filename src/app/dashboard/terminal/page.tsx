import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/Topbar'
import { TerminalGeneralPanel } from '@/components/panels/TerminalGeneralPanel'

export const dynamic = 'force-dynamic'

export default async function TerminalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Derive linux username from email prefix
  // franco.sanmartin@maniaco.online → franco
  const linuxUser = user?.email?.split('@')[0]?.split('.')[0] ?? 'user'

  return (
    <>
      <Topbar title="Terminal" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <TerminalGeneralPanel userEmail={user?.email ?? ''} linuxUser={linuxUser} />
      </div>
    </>
  )
}
