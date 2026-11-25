import { ArrowLeft, Pencil, ShieldAlert } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAccount, useAccounts, useFinanceAudit } from '@/features/finance/api'
import { Can, EmptyState, PageHeader, StatusBadge } from '@/features/finance/components'

export function AccountDetailPage() {
  const { accountId } = useParams()
  const { data: account, isLoading, isError } = useAccount(accountId)
  const { data: accounts = [] } = useAccounts()
  const { data: audit = [] } = useFinanceAudit({ entity: 'Account' })

  if (isError || (!isLoading && !account)) return <EmptyState title="Account not found" description="It may have been removed or the API is unavailable." action={<Button asChild><Link to="/staff/finance/accounts">Back to accounts</Link></Button>} />
  if (isLoading || !account) return <div className="h-96 animate-pulse rounded-2xl bg-muted/50" />

  const parent = accounts.find((candidate) => candidate.id === account.parentId)
  const children = accounts.filter((candidate) => candidate.parentId === account.id)

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${account.code} · ${account.name}`}
        eyebrow="Bookkeeping"
        description={`${account.type} account · ${account.normalBalance} normal balance · ${account.currency}`}
        breadcrumbs={[{ label: 'Finance' }, { label: 'Chart of accounts', href: '/staff/finance/accounts' }, { label: account.code }]}
        actions={<>
          <Button variant="ghost" size="sm" asChild><Link to="/staff/finance/accounts"><ArrowLeft /> Back</Link></Button>
          <Can permission="accounts:edit"><Button size="sm" asChild><Link to={`/staff/finance/accounts/${account.id}/edit`}><Pencil /> Edit account</Link></Button></Can>
        </>}
      />

      {account.postedEntryCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <div><p className="font-bold">This account has {account.postedEntryCount} posted lines.</p><p className="mt-1 text-xs">Posted entries are immutable. Deletion is blocked; archive the account instead.</p></div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Account details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {[
              ['Code', account.code], ['Name', account.name], ['Type', account.type],
              ['Normal balance', account.normalBalance], ['Status', null], ['Currency', account.currency],
              ['Parent', parent ? `${parent.code} · ${parent.name}` : '—'],
              ['Child accounts', String(children.length)], ['Posted lines', String(account.postedEntryCount)],
              ['Created', account.createdAt.slice(0, 10)], ['Last updated', account.updatedAt.slice(0, 10)],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-border p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-bold">{label === 'Status' ? <StatusBadge status={account.status} /> : value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Audit history</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {audit.filter((event) => event.entityId === account.id).length === 0 ? <p className="text-xs text-muted-foreground">No events recorded for this account.</p>
              : audit.filter((event) => event.entityId === account.id).map((event) => (
                <div key={event.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
                  <p className="text-xs font-bold capitalize">{event.action} · {event.actor}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(event.timestamp).toLocaleString()}{event.reason ? ` · ${event.reason}` : ''}</p>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
