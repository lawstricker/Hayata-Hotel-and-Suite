import { SearchX, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function EmptyState({ icon: Icon = SearchX, title = 'No results found', description = 'Try adjusting your filters or search terms.', action, compact = false }: { icon?: LucideIcon; title?: string; description?: string; action?: ReactNode; compact?: boolean }) {
  return (
    <Card className={compact ? 'flex flex-col items-center justify-center p-8 text-center' : 'flex min-h-72 flex-col items-center justify-center p-10 text-center'}>
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="font-display text-base font-bold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  )
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={SearchX}
      title="We couldn’t load this data"
      description="Something went wrong while contacting the mock service. Your changes were not affected."
      action={onRetry ? <Button onClick={onRetry}>Try again</Button> : undefined}
    />
  )
}
