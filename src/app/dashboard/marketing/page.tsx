import { Topbar } from '@/components/layout/Topbar'
import { MarketingPanel } from '@/components/panels/MarketingPanel'

export const revalidate = 60

export default function MarketingPage() {
  return (
    <>
      <Topbar title="Marketing" />
      <div style={{ padding: '24px 28px', flex: 1 }}>
        <MarketingPanel />
      </div>
    </>
  )
}
