import { Topbar } from '@/components/layout/Topbar'
import { DeploysPanel } from '@/components/panels/DeploysPanel'

export const dynamic = 'force-dynamic'

export default function DeploysPage() {
  return (
    <>
      <Topbar title="Deploys" />
      <div style={{ padding: '24px 28px', flex: 1 }}>
        <DeploysPanel />
      </div>
    </>
  )
}
