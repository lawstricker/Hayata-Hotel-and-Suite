import type { ColumnDef } from '@tanstack/react-table'
import { Download, Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAccounts, useDeleteAccount, type AccountFilters } from '@/features/finance/api'
import { Can, ConfirmDialog, DataTable, EmptyState, PageHeader, StatusBadge } from '@/features/finance/components'
import { exportRows } from '@/features/finance/utils/export'
import type { Account } from '@/types/domain'

export function AccountsListPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<AccountFilters>({})
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const { data: accounts = [], isLoading, isError, refetch } = useAccounts(filters)
  const deleteAccount = useDeleteAccount()

  const columns = useMemo<ColumnDef<Account, unknown>[]>(() => {
    const lookup = new Map(accounts.map((account) => [account.id, account]))
    const depth = (account: Account) => {
      let level = 0
      let parent = account.parentId ? lookup.get(account.parentId) : undefined
      while (parent && level < 10) { level += 1; parent = parent.parentId ? lookup.get(parent.parentId) : undefined }
      return level
    }
    return [
    {
      accessorKey: 'code', header: 'Code',
      cell: ({ row }) => <span className="font-mono text-xs font-bold" style={{ paddingLeft: depth(row.original) * 16 }}>{depth(row.original) > 0 ? '↳ ' : ''}{row.original.code}</span>,
    },
    {
      accessorKey: 'name', header: 'Account',
      cell: ({ row }) => <div className="min-w-[180px]"><p className="text-sm font-bold">{row.original.name}</p><p className="text-[11px] text-muted-foreground">{row.original.type} · {row.original.normalBalance} balance</p></div>,
    },
    {
      id: 'parent', header: 'Parent',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.parentId ? lookup.get(row.original.parentId)?.name ?? '—' : '—'}</span>,
    },
    { accessorKey: 'currency', header: 'Currency', cell: ({ row }) => <span className="text-xs font-semibold">{row.original.currency}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      accessorKey: 'postedEntryCount', header: 'Posted lines',
      cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.postedEntryCount}</span>,
    },
    {
      id: 'actions', header: 'Actions', enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="icon-sm" variant="ghost" aria-label={`View ${row.original.name}`} onClick={() => navigate(`/staff/finance/accounts/${row.original.id}`)}><Eye /></Button>
          <Can permission="accounts:edit">
            <Button size="icon-sm" variant="ghost" aria-label={`Edit ${row.original.name}`} onClick={() => navigate(`/staff/finance/accounts/${row.original.id}/edit`)}><Pencil /></Button>
          </Can>
          <Can permission="accounts:delete">
            <Button size="icon-sm" variant="ghost" aria-label={`Delete ${row.original.name}`} className="text-destructive" onClick={() => setDeleteTarget(row.original)}><Trash2 /></Button>
          </Can>
        </div>
      ),
    },
    ] as ColumnDef<Account, unknown>[]
  }, [accounts, navigate])

  if (isError) return <div className="space-y-6"><PageHeader title="Chart of accounts" breadcrumbs={[{ label: 'Finance' }, { label: 'Chart of accounts' }]} /><EmptyState title="Could not load accounts" description="The finance API did not respond. Retry to continue." action={<Button onClick={() => void refetch()}>Retry</Button>} /></div>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of accounts"
        eyebrow="Bookkeeping"
        description="Hierarchical accounts with unique codes, normal balances and a delete guard for posted entries."
        breadcrumbs={[{ label: 'Finance' }, { label: 'Chart of accounts' }]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => exportRows('chart-of-accounts', accounts.map((account) => ({ code: account.code, name: account.name, type: account.type, normalBalance: account.normalBalance, status: account.status, currency: account.currency, postedLines: account.postedEntryCount })), 'csv')}><Download /> CSV</Button>
            <Button variant="outline" size="sm" onClick={() => exportRows('chart-of-accounts', accounts.map((account) => ({ code: account.code, name: account.name, type: account.type, normalBalance: account.normalBalance, status: account.status, currency: account.currency, postedLines: account.postedEntryCount })), 'xlsx')}><Download /> XLSX</Button>
            <Can permission="accounts:create"><Button size="sm" asChild><Link to="/staff/finance/accounts/new"><Plus /> New account</Link></Button></Can>
          </>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-5">
          <div className="space-y-1.5"><label htmlFor="account-type" className="text-xs font-bold text-muted-foreground">Account type</label><select id="account-type" value={filters.type ?? ''} onChange={(event) => setFilters({ ...filters, type: event.target.value || undefined })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="">All types</option>{['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map((type) => <option key={type}>{type}</option>)}</select></div>
          <div className="space-y-1.5"><label htmlFor="account-status" className="text-xs font-bold text-muted-foreground">Status</label><select id="account-status" value={filters.status ?? ''} onChange={(event) => setFilters({ ...filters, status: event.target.value || undefined })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="archived">Archived</option></select></div>
          <Button variant="ghost" size="sm" onClick={() => setFilters({})}>Clear filters</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-lg bg-muted/60" />)}</div>
          ) : accounts.length === 0 ? (
            <EmptyState
              title="No accounts found"
              description={Object.keys(filters).length ? 'Try different filters or clear them.' : 'Create the first account in your chart of accounts.'}
              action={<Can permission="accounts:create"><Button asChild><Link to="/staff/finance/accounts/new"><Plus /> New account</Link></Button></Can>}
            />
          ) : (
            <DataTable data={accounts} columns={columns} searchPlaceholder="Search code or account name…" pageSize={12} onRowClick={(account) => navigate(`/staff/finance/accounts/${account.id}`)} />
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title={`Delete ${deleteTarget?.name ?? 'account'}?`}
        description="This action is permanent and recorded in the audit log. Accounts with posted entries or child accounts cannot be deleted."
        confirmLabel="Delete account"
        destructive
        requireReason
        onConfirm={(reason) => {
          if (!deleteTarget) return
          deleteAccount.mutate({ id: deleteTarget.id, reason }, { onSuccess: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}
