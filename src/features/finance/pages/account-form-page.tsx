import { zodResolver } from '@hookform/resolvers/zod'
import { Save, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FieldError, Input, Label, Textarea } from '@/components/ui/input'
import { FinanceApiError, useAccount, useAccounts, useCreateAccount, useUpdateAccount } from '@/features/finance/api'
import { ConfirmDialog, EmptyState, PageHeader } from '@/features/finance/components'
import { accountSchema, type AccountInput } from '@/features/finance/schemas'

const defaults: AccountInput = {
  code: '', name: '', type: 'Asset', normalBalance: 'debit', parentId: '', status: 'active', description: '', currency: 'NGN',
}

export function AccountFormPage() {
  const { accountId } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(accountId)
  const { data: account, isLoading, isError } = useAccount(accountId)
  const { data: accounts = [] } = useAccounts()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const [discardOpen, setDiscardOpen] = useState(false)

  const form = useForm<AccountInput>({ resolver: zodResolver(accountSchema), defaultValues: defaults, mode: 'onBlur' })
  const { register, handleSubmit, reset, formState: { errors, isDirty, isSubmitting } } = form

  useEffect(() => {
    if (!account) return
    reset({
      code: account.code, name: account.name, type: account.type, normalBalance: account.normalBalance,
      parentId: account.parentId ?? '', status: account.status, description: account.description ?? '', currency: account.currency,
    })
  }, [account, reset])

  // Browser-level unsaved changes guard. In-app navigation is confirmed via the Cancel button.
  useEffect(() => {
    if (!isDirty) return
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  async function submit(values: AccountInput) {
    try {
      if (editing && accountId) {
        await updateAccount.mutateAsync({ id: accountId, input: values })
        navigate(`/staff/finance/accounts/${accountId}`)
      } else {
        const created = await createAccount.mutateAsync(values)
        navigate(`/staff/finance/accounts/${created.id}`)
      }
    } catch (error) {
      if (error instanceof FinanceApiError) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          form.setError(field as Parameters<typeof form.setError>[0], { message })
        }
        if (!Object.keys(error.fieldErrors).length) toast.error(error.message)
      } else toast.error('Could not save account')
    }
  }

  if (isError) return <EmptyState title="Account not found" description="It may have been removed or the API is unavailable." action={<Button asChild><Link to="/staff/finance/accounts">Back to accounts</Link></Button>} />
  if (editing && isLoading) return <div className="h-96 animate-pulse rounded-2xl bg-muted/50" />

  return (
    <div className="space-y-6">
      <PageHeader title={editing ? 'Edit account' : 'New account'} eyebrow="Bookkeeping" description="Codes are unique; accounts with posted entries cannot be deleted." breadcrumbs={[{ label: 'Finance' }, { label: 'Chart of accounts', href: '/staff/finance/accounts' }, { label: editing ? 'Edit' : 'New' }]} />

      {account && account.postedEntryCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <div><p className="font-bold">This account has {account.postedEntryCount} posted lines.</p><p className="mt-1 text-xs">Editing is allowed, but deletion is blocked. Corrections to posted values must be made with reversing entries.</p></div>
        </div>
      )}

      <form onSubmit={handleSubmit(submit)} className="space-y-6">
        <Card>
          <CardContent className="grid gap-5 pt-5 md:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="account-code">Code</Label><Input id="account-code" {...register('code')} placeholder="1100" aria-invalid={Boolean(errors.code)} /><FieldError>{errors.code?.message}</FieldError></div>
            <div className="space-y-1.5"><Label htmlFor="account-name">Name</Label><Input id="account-name" {...register('name')} placeholder="Cash and Bank" aria-invalid={Boolean(errors.name)} /><FieldError>{errors.name?.message}</FieldError></div>
            <div className="space-y-1.5"><Label htmlFor="account-type">Type</Label><select id="account-type" {...register('type')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map((type) => <option key={type}>{type}</option>)}</select><FieldError>{errors.type?.message}</FieldError></div>
            <div className="space-y-1.5"><Label htmlFor="account-balance">Normal balance</Label><select id="account-balance" {...register('normalBalance')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="debit">Debit</option><option value="credit">Credit</option></select><FieldError>{errors.normalBalance?.message}</FieldError></div>
            <div className="space-y-1.5"><Label htmlFor="account-parent">Parent account</Label><select id="account-parent" {...register('parentId')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">— Top level —</option>{accounts.filter((candidate) => candidate.id !== accountId).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.code} · {candidate.name}</option>)}</select><FieldError>{errors.parentId?.message}</FieldError></div>
            <div className="space-y-1.5"><Label htmlFor="account-currency">Currency</Label><Input id="account-currency" {...register('currency')} maxLength={3} placeholder="NGN" aria-invalid={Boolean(errors.currency)} /><FieldError>{errors.currency?.message}</FieldError></div>
            <div className="space-y-1.5"><Label htmlFor="account-status">Status</Label><select id="account-status" {...register('status')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="active">Active</option><option value="archived">Archived</option></select><FieldError>{errors.status?.message}</FieldError></div>
            <div className="space-y-1.5 md:col-span-2"><Label htmlFor="account-description">Description</Label><Textarea id="account-description" {...register('description')} placeholder="Purpose of this account" aria-invalid={Boolean(errors.description)} /><FieldError>{errors.description?.message}</FieldError></div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isSubmitting}><Save /> {isSubmitting ? 'Saving…' : editing ? 'Save changes' : 'Create account'}</Button>
          <Button type="button" variant="outline" onClick={() => isDirty ? setDiscardOpen(true) : navigate('/staff/finance/accounts')}>Cancel</Button>
          {isDirty && <span className="text-xs font-semibold text-amber-600">Unsaved changes</span>}
        </div>
      </form>

      <ConfirmDialog open={discardOpen} onOpenChange={setDiscardOpen} title="Discard unsaved changes?" description="Your edits to this account will be lost." confirmLabel="Discard changes" destructive onConfirm={() => navigate('/staff/finance/accounts')} />
    </div>
  )
}
