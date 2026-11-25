import { ArrowRight, BookOpen, CalendarRange, CircleCheck, Clock3, FileClock, FilePlus2, ReceiptText, ShieldCheck, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { KpiCard } from '@/components/common/kpi-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useArAging, useFinanceAudit, useFinanceMeta, useInvoices } from '@/features/finance/api'
import { CurrencyDisplay, EmptyState, PageHeader, StatusBadge } from '@/features/finance/components'

export function FinanceDashboardPage() {
  const { data: meta, isLoading, isError, refetch } = useFinanceMeta()
  const { data: invoices = [] } = useInvoices()
  const { data: aging } = useArAging()
  const { data: audit } = useFinanceAudit()

  if (isError) return <div className="space-y-6"><PageHeader title="Finance overview" breadcrumbs={[{ label: 'Finance' }, { label: 'Overview' }]} /><EmptyState title="Could not load finance data" description="The finance API is unavailable. Check the mock worker or backend and retry." action={<Button onClick={() => void refetch()}>Retry</Button>} /></div>

  const buckets = (['0-30', '31-60', '61-90', '90+'] as const).map((bucket) => ({
    bucket,
    amount: aging?.totals?.[bucket] ?? '0',
    count: aging?.rows.filter((row) => row.bucket === bucket).length ?? 0,
  }))
  const maxBucket = Math.max(...buckets.map((item) => Number(item.amount)), 1)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance overview"
        eyebrow="Finance"
        description="Bookkeeping health, receivables, posting activity and fiscal periods at a glance."
        breadcrumbs={[{ label: 'Finance' }, { label: 'Overview' }]}
        actions={<Button size="sm" asChild><Link to="/staff/finance/invoices/new"><FilePlus2 /> New invoice</Link></Button>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Outstanding AR" value={isLoading ? '—' : <CurrencyDisplay amount={meta?.receivables ?? '0'} currency="NGN" />} changeLabel="open invoices" icon={Wallet} tone="teal" />
        <KpiCard label="Overdue" value={isLoading ? '—' : <CurrencyDisplay amount={meta?.overdueAmount ?? '0'} currency="NGN" />} changeLabel={`${meta?.overdueInvoices ?? 0} invoices past due`} icon={Clock3} tone="rose" />
        <KpiCard label="Posted lines" value={isLoading ? '—' : String(meta?.postedLines ?? 0)} changeLabel="immutable entries" icon={ShieldCheck} tone="violet" />
        <KpiCard label="Chart of accounts" value={isLoading ? '—' : String(meta?.activeAccounts ?? 0)} changeLabel={`${meta?.archivedAccounts ?? 0} archived`} icon={BookOpen} tone="blue" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Accounts receivable aging</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {buckets.map((item) => (
              <div key={item.bucket} className="grid grid-cols-[60px_1fr_auto] items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground">{item.bucket}</span>
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.max(3, (Number(item.amount) / maxBucket) * 100)}%` }} /></div>
                <div className="text-right"><p className="text-xs font-bold"><CurrencyDisplay amount={item.amount} currency="NGN" /></p><p className="text-[10px] text-muted-foreground">{item.count} invoice{item.count === 1 ? '' : 's'}</p></div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-bold"><span>Total outstanding</span><CurrencyDisplay amount={aging?.total ?? '0'} currency="NGN" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Your workspace</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link to="/staff/finance/accounts" className="group flex items-center justify-between rounded-xl border border-border p-4 transition hover:border-primary hover:bg-primary/5"><div><p className="text-sm font-bold">Chart of accounts</p><p className="mt-1 text-xs text-muted-foreground">Codes, balances, delete guard</p></div><ArrowRight className="size-4 text-muted-foreground group-hover:text-primary" /></Link>
            <Link to="/staff/finance/invoices" className="group flex items-center justify-between rounded-xl border border-border p-4 transition hover:border-primary hover:bg-primary/5"><div><p className="text-sm font-bold">Invoices</p><p className="mt-1 text-xs text-muted-foreground">Create, send, generate PDF</p></div><ArrowRight className="size-4 text-muted-foreground group-hover:text-primary" /></Link>
            <Link to="/staff/finance/invoices/new" className="group flex items-center justify-between rounded-xl border border-border p-4 transition hover:border-primary hover:bg-primary/5"><div><p className="text-sm font-bold">New invoice</p><p className="mt-1 text-xs text-muted-foreground">Line items, tax, discount</p></div><FilePlus2 className="size-4 text-muted-foreground group-hover:text-primary" /></Link>
            <div className="flex items-center justify-between rounded-xl border border-dashed border-border p-4 opacity-70"><div><p className="text-sm font-bold">Journal entries</p><p className="mt-1 text-xs text-muted-foreground">Phase 2 · double-entry core</p></div><Clock3 className="size-4 text-muted-foreground" /></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent invoices</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {invoices.slice(0, 6).map((invoice) => (
              <Link key={invoice.id} to={`/staff/finance/invoices/${invoice.id}`} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0 hover:opacity-80">
                <div className="min-w-0"><p className="font-mono text-xs font-bold">{invoice.number}</p><p className="truncate text-[11px] text-muted-foreground">{invoice.customerName} · due {invoice.dueDate.slice(0, 10)}</p></div>
                <div className="flex items-center gap-3"><CurrencyDisplay amount={invoice.total} currency={invoice.currency} className="text-xs font-bold" /><StatusBadge status={invoice.status} /></div>
              </Link>
            ))}
            {invoices.length === 0 && <p className="text-xs text-muted-foreground">No invoices yet.</p>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Fiscal periods</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(meta?.periods ?? []).map((period) => (
                <div key={period.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div><p className="text-xs font-bold">{period.name}</p><p className="text-[10px] text-muted-foreground">{period.startDate.slice(0, 10)} → {period.endDate.slice(0, 10)}</p></div>
                  <StatusBadge status={period.status} />
                </div>
              ))}
              <p className="flex items-center gap-1.5 pt-1 text-[10px] text-muted-foreground"><CalendarRange className="size-3" /> Posting to locked or closed periods is blocked.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><FileClock className="size-4" /> Recent activity</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {audit?.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-start gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                  <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <div className="min-w-0"><p className="text-xs font-bold capitalize">{event.action} · {event.entity}</p><p className="truncate text-[10px] text-muted-foreground">{event.actor} · {new Date(event.timestamp).toLocaleString()}</p></div>
                </div>
              ))}
              {!audit?.length && <p className="text-xs text-muted-foreground">No audit events yet.</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground"><ReceiptText className="size-4" /> All amounts use decimal string arithmetic; totals are rounded only for display.</p>
    </div>
  )
}
