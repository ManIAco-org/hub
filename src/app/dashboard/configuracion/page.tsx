import { Topbar } from '@/components/layout/Topbar'
import { ConfiguracionPanel } from '@/components/panels/ConfiguracionPanel'

export const dynamic = 'force-dynamic'

export default function ConfiguracionPage() {
  return (
    <>
      <Topbar title="Configuración" />
      <div style={{ padding: '24px 28px', flex: 1 }}>
        <ConfiguracionPanel />
      </div>
    </>
  )
}
