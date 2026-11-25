import type { ColumnDef } from '@tanstack/react-table'
import { Check as CheckIcon, Clock3 as ClockIcon, Download, Eye, FilePlus2, Send, WalletCards as ReceiptIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from '@/components/common/kpi-card'
import { useArAging, useCustomers, useFinanceMeta, useInvoices, useSendInvoice, type InvoiceFilters } from '@/features/finance/api'
import { Can, CurrencyDisplay, DataTable, EmptyState, PageHeader, StatusBadge } from '@/features/finance/components'
import { exportRows } from '@/features/finance/utils/export'
import { money, subtract } from '@/lib/money'
import type { FinanceInvoice } from '@/types/domain'

export function InvoicesListPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<InvoiceFilters>({})
  const { data: invoices = [], isLoading, isError, refetch } = useInvoices(filters)
  const { data: customers = [] } = useCustomers()
  const { data: meta } = useFinanceMeta()
  const { data: aging } = useArAging()
  const sendInvoice = useSendInvoice()

  const columns = useMemo<ColumnDef<FinanceInvoice, unknown>[]>(() => [
    { accessorKey: 'number', header: 'Invoice', cell: ({ row }) => <span className="font-mono text-xs font-bold">{row.original.number}</span> },
    { accessorKey: 'customerName', header: 'Customer', cell: ({ row }) => <div className="min-w-[160px]"><p className="text-sm font-bold">{row.original.customerName}</p><p className="text-[11px] text-muted-foreground">Issued {row.original.issueDate.slice(0, 10)}</p></div> },
    { accessorKey: 'dueDate', header: 'Due', cell: ({ row }) => <span className="text-xs">{row.original.dueDate.slice(0, 10)}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: 'total', header: 'Total', cell: ({ row }) => <CurrencyDisplay amount={row.original.total} currency={row.original.currency} className="text-xs font-bold" /> },
    { id: 'balance', header: 'Balance', cell: ({ row }) => <CurrencyDisplay amount={subtract(money(row.original.total, row.original.currency), money(row.original.amountPaid, row.original.currency)).amount} currency={row.original.currency} className="text-xs font-bold text-primary" /> },
    {
      id: 'actions', header: 'Actions', enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          {row.original.status === 'DRAFT' && <Can permission="invoice:approve"><Button size="icon-sm" variant="ghost" aria-label={`Send ${row.original.number}`} onClick={() => sendInvoice.mutate(row.original.id)}><Send /></Button></Can>}
          <Button size="icon-sm" variant="ghost" aria-label={`View ${row.original.number}`} onClick={() => navigate(`/staff/finance/invoices/${row.original.id}`)}><Eye /></Button>
        </div>
      ),
    },
  ], [navigate, sendInvoice])

  if (isError) return <div className="space-y-6"><PageHeader title="Invoices" breadcrumbs={[{ label: 'Finance' }, { label: 'Invoices' }]} /><EmptyState title="Could not load invoices" description="The finance API did not respond." action={<Button onClick={() => void refetch()}>Retry</Button>} /></div>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        eyebrow="Receivables"
        description="Create, send and track invoices with decimal-precise totals and payment allocation."
        breadcrumbs={[{ label: 'Finance' }, { label: 'Invoices' }]}
        actions={<>
          <Button variant="outline" size="sm" onClick={() => exportRows('invoices', invoices.map((invoice) => ({ number: invoice.number, customer: invoice.customerName, issueDate: invoice.issueDate.slice(0, 10), dueDate: invoice.dueDate.slice(0, 10), status: invoice.status, total: invoice.total, paid: invoice.amountPaid, currency: invoice.currency })), 'csv')}><Download /> CSV</Button>
          <Can permission="invoice:create"><Button size="sm" asChild><Link to="/staff/finance/invoices/new"><FilePlus2 /> New invoice</Link></Button></Can>
        </>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total invoices" value={String(meta?.totalInvoices ?? 0)} changeLabel="all documents" icon={FilePlus2} tone="blue" />
        <KpiCard label="Outstanding" value={meta?.receivables ? <CurrencyDisplay amount={meta.receivables} currency="NGN" /> : '₦0'} changeLabel="open receivables" icon={ReceiptIcon} tone="teal" />
        <KpiCard label="Overdue" value={meta?.overdueAmount ? <CurrencyDisplay amount={meta.overdueAmount} currency="NGN" /> : '₦0'} changeLabel={`${meta?.overdueInvoices ?? 0} invoices`} icon={ClockIcon} tone="rose" />
        <KpiCard label="Paid" value={String(meta?.paidInvoices ?? 0)} changeLabel="fully settled" icon={CheckIcon} tone="amber" />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">AR aging</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(['0-30', '31-60', '61-90', '90+'] as const).map((bucket) => (
            <div key={bucket} className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{bucket} days</p>
              <p className="mt-2 font-display text-lg font-extrabold"><CurrencyDisplay amount={aging?.totals?.[bucket] ?? '0'} currency="NGN" /></p>
              <p className="mt-1 text-[10px] text-muted-foreground">{aging?.rows.filter((row) => row.bucket === bucket).length ?? 0} invoices</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-5">
          <div className="space-y-1.5"><label htmlFor="inv-status" className="text-xs font-bold text-muted-foreground">Status</label><select id="inv-status" value={filters.status ?? ''} onChange={(event) => setFilters({ ...filters, status: event.target.value || undefined })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="">All statuses</option>{['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'].map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></div>
          <div className="space-y-1.5"><label htmlFor="inv-customer-filter" className="text-xs font-bold text-muted-foreground">Customer</label><select id="inv-customer-filter" value={filters.customerId ?? ''} onChange={(event) => setFilters({ ...filters, customerId: event.target.value || undefined })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="">All customers</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>
          <Button variant="ghost" size="sm" onClick={() => setFilters({})}>Clear filters</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          {isLoading ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-lg bg-muted/60" />)}</div>
            : invoices.length === 0 ? <EmptyState title="No invoices found" description="Create an invoice or change your filters." action={<Can permission="invoice:create"><Button asChild><Link to="/staff/finance/invoices/new"><FilePlus2 /> New invoice</Link></Button></Can>} />
              : <DataTable data={invoices} columns={columns} searchPlaceholder="Search invoice or customer…" pageSize={10} onRowClick={(invoice) => navigate(`/staff/finance/invoices/${invoice.id}`)} />}
        </CardContent>
      </Card>
    </div>
  )
}
