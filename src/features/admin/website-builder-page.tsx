import { Puck, type Data } from '@puckeditor/core'
import '@puckeditor/core/puck.css'
import { ExternalLink, RotateCcw, Save } from 'lucide-react'
import { Component, useState, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/common/page-header'
import { homeConfig } from '@/features/admin/puck-config'
import { logActivity } from '@/lib/activity-log'
import { useSettingsStore } from '@/store/settingsStore'
import { usePuckPageStore } from '@/store/puckPageStore'

class PuckBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Puck editor failed', error, info.componentStack) }
  render() {
    if (this.state.error) return <div className="space-y-2 p-6"><p className="font-bold text-destructive">The visual editor could not load.</p><p className="text-xs text-muted-foreground">{this.state.error.message}</p></div>
    return this.props.children
  }
}

/** Visual page builder for the public homepage, powered by Puck. */
export function WebsiteBuilderPage() {
  const stored = usePuckPageStore((state) => state.data)
  const update = usePuckPageStore((state) => state.update)
  const reset = usePuckPageStore((state) => state.reset)
  // Puck treats `data` as initial data only; keep this reference stable while edits are tracked separately.
  const [editorData, setEditorData] = useState<Data>(stored)
  const [draft, setDraft] = useState<Data>(stored)
  const [editorKey, setEditorKey] = useState(0)
  const dirty = JSON.stringify(draft) !== JSON.stringify(stored)

  function publish(data: Data) {
    update(data)
    setDraft(data)
    useSettingsStore.getState().markSaved()
    logActivity({ action: 'Homepage published', module: 'Website builder', detail: `${data.content.length} sections` })
    toast.success('Homepage published', { description: 'The public website now uses your changes.' })
  }

  function resetToDefaults() {
    reset()
    const fresh = usePuckPageStore.getState().data
    setDraft(fresh)
    setEditorData(fresh)
    setEditorKey((key) => key + 1)
    toast.success('Homepage reset to defaults')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website builder"
        eyebrow="Administration"
        description="Drag, reorder and edit the sections of the public homepage. Use Publish to make your changes live."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Website builder' }]}
        actions={<>
          <Button variant="ghost" size="sm" asChild><Link to="/" target="_blank"><ExternalLink /> View site</Link></Button>
          <Button variant="outline" size="sm" onClick={resetToDefaults}><RotateCcw /> Reset defaults</Button>
          <Button size="sm" onClick={() => publish(draft)}><Save /> Publish</Button>
        </>}
      />

      {dirty && <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">You have unpublished changes — click <strong>Publish</strong> in the editor toolbar to make them live.</p>}

      <Card>
        <CardContent className="p-0">
          <PuckBoundary key={editorKey}>
            <Puck
              config={homeConfig}
              data={editorData}
              onChange={setDraft}
              onPublish={publish}
              headerTitle="Homepage"
              headerPath="/"
              height="calc(100vh - 250px)"
            />
          </PuckBoundary>
        </CardContent>
      </Card>
    </div>
  )
}
