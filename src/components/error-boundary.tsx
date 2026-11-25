import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches render-time errors so a single broken page never blanks the whole application.
 * Without this boundary React unmounts the entire tree, which surfaces as a silent white page.
 *
 * The boundary is keyed by the current route by its callers, so navigating away remounts
 * it and clears the caught error.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] render failed:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-[calc(100vh-180px)] items-center justify-center p-6">
        <Card className="max-w-lg p-8 text-center sm:p-10">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-extrabold">This section could not be displayed</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            An unexpected error stopped this page from rendering. The rest of the app is still working — reload the section to try again.
          </p>
          <pre className="mt-5 max-h-32 overflow-auto rounded-lg bg-muted p-3 text-left font-mono text-[11px] leading-relaxed text-muted-foreground">
            {this.state.error.message}
          </pre>
          <div className="mt-7 flex justify-center gap-2">
            <Button variant="outline" onClick={() => this.setState({ error: null })}>
              <RefreshCw /> Try again
            </Button>
            <Button asChild>
              <a href="/staff/dashboard">Back to dashboard</a>
            </Button>
          </div>
        </Card>
      </div>
    )
  }
}
