import { Render } from '@puckeditor/core'
import { homeConfig } from '@/features/admin/puck-config'
import { usePuckPageStore } from '@/store/puckPageStore'

/** Public homepage rendered from the same Puck components used in the admin page builder. */
export function HomePage() {
  const data = usePuckPageStore((state) => state.data)
  return <div className="overflow-hidden"><Render config={homeConfig} data={data} /></div>
}
