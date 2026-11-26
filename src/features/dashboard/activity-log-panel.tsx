import { Activity, Filter, RefreshCw, ShieldCheck, TriangleAlert, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { loadAuditLogs, type AuditLogFilters, type AuditLogStats } from '@/lib/audit-log-api'
import { cn, downloadCsv, formatDate } from '@/lib/utils'
import type { AuditLog } from '@/types/domain'

const moduleColors = ['#0f766e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#ef4444', '#6366f1']

/** The filters that hold a text value. */
type TextFilterKey = 'module' | 'actor' | 'action' | 'from' | 'to' | 'q'

function StatTile({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint?: string; icon: typeof Activity; tone: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-2xl font-extrabold">{value}</p>
          {hint && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{hint}</p>}
        </div>
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', tone)}><Icon className="size-4" /></span>
      </div>
    </Card>
  )
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="flex min-w-[9rem] flex-1 flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs font-semibold"
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

export function ActivityLogPanel({ compact = false }: { compact?: boolean }) {
  const [filters, setFilters] = useState<AuditLogFilters>({})
  const [entries, setEntries] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<AuditLogStats | null>(null)
  const [live, setLive] = useState(false)
  const [options, setOptions] = useState<{ modules: string[]; actors: string[]; actions: string[] }>({ modules: [], actors: [], actions: [] })
  const [refreshedAt, setRefreshedAt] = useState<string>('')
  const [loadedKey, setLoadedKey] = useState<string>('')
  const [reloadToken, setReloadToken] = useState(0)

  // The filters are turned into a key so the loading state can be derived
  // instead of being set from inside the effect.
  const filterKey = JSON.stringify(filters)
  const loading = loadedKey !== `${filterKey}:${reloadToken}`

  useEffect(() => {
    let active = true
    const load = async () => {
      const result = await loadAuditLogs(filters)
      if (!active) return
      setEntries(result.entries)
      setStats(result.stats)
      setLive(result.live)
      setRefreshedAt(new Date().toISOString())
      setLoadedKey(`${filterKey}:${reloadToken}`)
      // The filter lists come from the widest possible result set, so the
      // dropdowns keep offering every module even when one is selected.
      const widest = await loadAuditLogs({ limit: 300 })
      if (!active) return
      setOptions({
        modules: [...new Set(widest.entries.map((entry) => entry.module))].sort(),
        actors: [...new Set(widest.entries.map((entry) => entry.actor))].sort(),
        actions: [...new Set(widest.entries.map((entry) => entry.action))].sort(),
      })
    }
    void load()
    return () => { active = false }
  }, [filterKey, filters, reloadToken])

  const patch = (key: TextFilterKey, value: string) => {
    setFilters((current) => {
      const next = { ...current }
      if (value) next[key] = value
      else delete next[key]
      return next
    })
  }

  const columns: DataTableColumn<AuditLog>[] = useMemo(() => [
    {
      key: 'timestamp',
      header: 'Time',
      sortable: true,
      cell: (row) => <span className="whitespace-nowrap text-xs font-semibold">{formatDate(row.timestamp, 'MMM d, yyyy · h:mm a')}</span>,
    },
    {
      key: 'actor',
      header: 'Actor',
      sortable: true,
      cell: (row) => <div className="min-w-0"><p className="truncate text-xs font-bold">{row.actor}</p><p className="truncate text-[10px] font-mono text-muted-foreground">{row.ipAddress || '—'}</p></div>,
    },
    {
      key: 'module',
      header: 'Module',
      sortable: true,
      cell: (row) => <Badge variant="outline">{row.module}</Badge>,
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      cell: (row) => <div className="min-w-0"><p className="truncate text-xs font-semibold">{row.action}</p>{row.detail && <p className="truncate text-[10px] text-muted-foreground">{row.detail}</p>}</div>,
    },
  ], [])

  const activeFilterCount = Object.values(filters).filter(Boolean).length
  const maxModuleHits = stats?.byModule[0]?.count ?? 1

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Activity log</CardTitle>
          <CardDescription>Every recorded action across the property, newest first.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={live ? 'success' : 'warning'} className="px-2.5 py-1">
            {live ? 'Live from server' : 'Offline records'}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setReloadToken((current) => current + 1)} disabled={loading} aria-label="Refresh activity log">
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading && !entries.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Total events" value={String(stats?.total ?? 0)} hint={`${stats?.returned ?? 0} shown`} icon={Activity} tone="bg-primary/10 text-primary" />
            <StatTile label="Today" value={String(stats?.today ?? 0)} hint="Recorded since midnight" icon={TriangleAlert} tone="bg-amber-50 text-amber-600 dark:bg-amber-950/60" />
            <StatTile label="Active actors" value={String(stats?.actors ?? 0)} hint={stats?.topActor ? `Top: ${stats.topActor}` : 'No actors yet'} icon={Users} tone="bg-blue-50 text-blue-600 dark:bg-blue-950/60" />
            <StatTile label="Modules" value={String(stats?.modules ?? 0)} hint={stats?.topModule ? `Top: ${stats.topModule}` : 'No modules yet'} icon={Filter} tone="bg-violet-50 text-violet-600 dark:bg-violet-950/60" />
          </div>
        )}

        <div className="rounded-xl border border-border bg-muted/25 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filters</p>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setFilters({})} aria-label="Clear all filters">
                Clear {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <FilterSelect label="Module" value={filters.module ?? ''} options={options.modules} onChange={(value) => patch('module', value)} />
            <FilterSelect label="Actor" value={filters.actor ?? ''} options={options.actors} onChange={(value) => patch('actor', value)} />
            <FilterSelect label="Action" value={filters.action ?? ''} options={options.actions} onChange={(value) => patch('action', value)} />
            <label className="flex min-w-[9rem] flex-1 flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From</span>
              <Input type="date" value={filters.from ?? ''} onChange={(event) => patch('from', event.target.value)} className="h-9 text-xs" aria-label="From date" />
            </label>
            <label className="flex min-w-[9rem] flex-1 flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To</span>
              <Input type="date" value={filters.to ?? ''} onChange={(event) => patch('to', event.target.value)} className="h-9 text-xs" aria-label="To date" />
            </label>
          </div>
        </div>

        {!compact && stats && stats.byModule.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">By module</p>
              <div className="space-y-2.5">
                {stats.byModule.slice(0, 6).map((row, index) => (
                  <div key={row.name}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-semibold"><i className="size-2 rounded-full" style={{ background: moduleColors[index % moduleColors.length] }} />{row.name}</span>
                      <span className="font-bold">{row.count}</span>
                    </div>
                    <Progress value={(row.count / maxModuleHits) * 100} />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Most active actors</p>
              <div className="space-y-2">
                {stats.byActor.slice(0, 6).map((row) => (
                  <div key={row.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                    <span className="font-semibold">{row.name}</span>
                    <span className="font-bold text-muted-foreground">{row.count} action{row.count === 1 ? '' : 's'}</span>
                  </div>
                ))}
                {!stats.byActor.length && <p className="text-xs text-muted-foreground">No actors recorded yet.</p>}
              </div>
            </div>
          </div>
        )}

        <DataTable
          data={entries}
          columns={columns}
          searchPlaceholder="Search actor, action, module or detail…"
          searchKeys={[(row) => row.actor, (row) => row.action, (row) => row.module, (row) => row.detail, (row) => row.ipAddress]}
          searchValue={filters.q ?? ''}
          onSearchChange={(value) => patch('q', value)}
          initialSort={{ key: 'timestamp', direction: 'desc' }}
          pageSize={12}
          filename="hayata-activity-log.csv"
          emptyTitle="No activity recorded"
          emptyDescription="Actions taken in the property will appear here as soon as they happen."
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-[10px] text-muted-foreground">
            Last refreshed {refreshedAt ? formatDate(refreshedAt, 'MMM d, yyyy · h:mm a') : '—'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              downloadCsv('hayata-activity-log.csv', entries.map((entry) => ({
                timestamp: entry.timestamp,
                actor: entry.actor,
                module: entry.module,
                action: entry.action,
                detail: entry.detail,
                ipAddress: entry.ipAddress,
              })))
              toast.success('Activity log exported', { description: `${entries.length} entries written to CSV` })
            }}
          >
            Export filtered log
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
