import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  eyebrow?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, eyebrow, breadcrumbs, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {breadcrumbs.map((breadcrumb, index) => (
              <span key={`${breadcrumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="size-3" aria-hidden="true" />}
                <span className={index === breadcrumbs.length - 1 ? 'text-foreground' : undefined}>{breadcrumb.label}</span>
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
