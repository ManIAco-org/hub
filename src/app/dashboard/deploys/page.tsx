import { Topbar } from '@/components/layout/Topbar'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// T025: Deploys moved to /dashboard/proyectos/[id] → tab "Deploys"
// This route now redirects to proyectos so the sidebar item stays useful
export default function DeploysPage() {
  redirect('/dashboard/proyectos')
}
