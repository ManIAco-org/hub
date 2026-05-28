import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/Topbar'
import { TerminalGeneralPanel } from '@/components/panels/TerminalGeneralPanel'

export const dynamic = 'force-dynamic'

// Map email prefix → linux username on Oracle
const LINUX_USERS: Record<string, string> = {
  'franco.sanmartin': 'franco',
  'luis.giannasi':    'lucho',
  'noelia.bottallo':  'noe',
}

export default async function TerminalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const emailPrefix = user?.email?.split('@')[0] ?? ''
  const linuxUser   = LINUX_USERS[emailPrefix] ?? emailPrefix.split('.')[0] ?? 'user'

  return (
    <>
      <Topbar title="Terminal" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <TerminalGeneralPanel userEmail={user?.email ?? ''} linuxUser={linuxUser} />
      </div>
    </>
  )
}
