import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react'
import { type ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: ReactNode
  change?: number
  changeLabel?: string
  icon: LucideIcon
  tone?: 'teal' | 'blue' | 'amber' | 'violet' | 'rose' | 'slate'
  footer?: ReactNode
  live?: boolean
}

const toneClasses = {
  teal: 'bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

export function KpiCard({ label, value, change, changeLabel, icon: Icon, tone = 'teal', footer, live }: KpiCardProps) {
  const positive = change !== undefined && change > 0
  const negative = change !== undefined && change < 0
  return (
    <Card className="group relative overflow-hidden p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/[0.04] sm:p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <div className="mt-2 flex items-end gap-2">
            <motion.p
              key={String(value)}
              initial={{ opacity: 0.65, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className="font-display text-2xl font-extrabold tracking-tight text-foreground"
            >
              {value}
            </motion.p>
            {live && <span className="mb-1.5 size-2 animate-pulse rounded-full bg-emerald-500" aria-label="Live" />}
          </div>
        </div>
        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', toneClasses[tone])}>
          <Icon className="size-[18px]" aria-hidden="true" />
        </div>
      </div>
      {(change !== undefined || footer) && (
        <div className="mt-4 flex items-center justify-between gap-2 text-xs">
          {change !== undefined ? (
            <span className={cn('inline-flex items-center gap-1 font-bold', positive ? 'text-emerald-600 dark:text-emerald-400' : negative ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
              {positive ? <ArrowUpRight className="size-3.5" /> : negative ? <ArrowDownRight className="size-3.5" /> : <Minus className="size-3.5" />}
              {Math.abs(change)}%
            </span>
          ) : <span />}
          <span className="truncate text-muted-foreground">{changeLabel ?? footer}</span>
        </div>
      )}
    </Card>
  )
}
