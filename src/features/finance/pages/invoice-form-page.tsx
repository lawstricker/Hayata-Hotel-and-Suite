import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, ReceiptText, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FieldError, Input, Label, Textarea } from '@/components/ui/input'
import { useCreateCustomer, useCreateInvoice, useCustomers, useFinanceMeta, useTaxRates } from '@/features/finance/api'
import { ConfirmDialog, CurrencyDisplay, EmptyState, MoneyInput, PageHeader, StatusBadge } from '@/features/finance/components'
import { invoiceSchema, type InvoiceInput } from '@/features/finance/schemas'
import { add, divide, money, multiply, subtract, sum } from '@/lib/money'

type Values = InvoiceInput
const isoDay = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString()

/** Client-side totals mirror the API's decimal.js calculation; the API remains authoritative. */
function useTotals(lines: Array<{ unitPrice: string; quantity: string; taxRateId?: string }>, discount: string, currency: string, taxRates: Array<{ id: string; rate: string }>) {
  const safeCurrency = currency || 'NGN'
  const safeLines = lines.map((line) => ({ ...line, unitPrice: line.unitPrice || '0', quantity: line.quantity || '0' }))
  const subtotal = sum(safeLines.map((line) => multiply(money(line.unitPrice, safeCurrency), line.quantity)), safeCurrency)
  const tax = sum(safeLines.map((line) => {
    const rate = taxRates.find((candidate) => candidate.id === line.taxRateId)
    if (!rate) return money('0', safeCurrency)
    return multiply(multiply(money(line.unitPrice, safeCurrency), line.quantity), divide(money(rate.rate, safeCurrency), '100').amount)
  }), safeCurrency)
  const total = add(subtract(subtotal, money(discount || '0', safeCurrency)), tax)
  return { subtotal, tax, total, safeCurrency }
}

export function InvoiceFormPage() {
  const navigate = useNavigate()
  const { data: customers = [] } = useCustomers()
  const { data: taxRates = [] } = useTaxRates()
  const { data: meta } = useFinanceMeta()
  const createInvoice = useCreateInvoice()
  const createCustomer = useCreateCustomer()
  const [customerOpen, setCustomerOpen] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', paymentTermsDays: '30' })

  const form = useForm<Values>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      number: meta?.nextInvoiceNumber ?? 'INV-2026-007',
      customerId: '', currency: 'NGN', discount: '0',
      issueDate: isoDay(0), dueDate: isoDay(30), notes: '',
      lines: [{ id: 'line-1', description: '', quantity: '1', unitPrice: '0', taxRateId: '' }],
    },
    mode: 'onBlur',
  })
  const { control, register, handleSubmit, reset, formState: { errors, isSubmitting } } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const lines = useWatch({ control, name: 'lines' }) ?? []
  const discount = useWatch({ control, name: 'discount' }) ?? '0'
  const currency = useWatch({ control, name: 'currency' }) ?? 'NGN'
  const { subtotal, tax, total, safeCurrency } = useTotals(lines, discount, currency, taxRates)

  async function submit(values: Values) {
    try {
      const created = await createInvoice.mutateAsync(values)
      navigate(`/staff/finance/invoices/${created.id}`)
    } catch { /* toast handled in the mutation hook */ }
  }

  if (!customers.length) return <EmptyState title="Add a customer first" description="Invoices need a customer. Create one to get started." action={<Button onClick={() => setCustomerOpen(true)}>Add customer</Button>} />

  return (
    <div className="space-y-6">
      <PageHeader title="Create invoice" eyebrow="Receivables" description="Line items, tax, discount and due date. Totals use decimal precision and the API assigns the invoice number." breadcrumbs={[{ label: 'Finance' }, { label: 'Invoices', href: '/staff/finance/invoices' }, { label: 'New' }]} />

      <form onSubmit={handleSubmit(submit)} className="grid gap-5 lg:grid-cols-[1fr_330px]">
        <div className="space-y-5">
          <Card>
            <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="inv-number">Invoice number</Label><Input id="inv-number" {...register('number')} readOnly className="bg-muted font-mono font-bold" /></div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-customer">Customer</Label>
                <select id="inv-customer" {...register('customerId')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" aria-invalid={Boolean(errors.customerId)}>
                  <option value="">Select a customer…</option>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                </select>
                {errors.customerId ? <FieldError>{errors.customerId.message}</FieldError> : <button type="button" onClick={() => setCustomerOpen(true)} className="text-xs font-semibold text-primary hover:underline">+ Add a new customer</button>}
              </div>
              <div className="space-y-1.5"><Label htmlFor="inv-issue">Issue date</Label><Input id="inv-issue" type="date" {...register('issueDate')} className="h-10" aria-invalid={Boolean(errors.issueDate)} /><FieldError>{errors.issueDate?.message}</FieldError></div>
              <div className="space-y-1.5"><Label htmlFor="inv-due">Due date</Label><Input id="inv-due" type="date" {...register('dueDate')} className="h-10" aria-invalid={Boolean(errors.dueDate)} /><FieldError>{errors.dueDate?.message}</FieldError></div>
              <div className="space-y-1.5"><Label htmlFor="inv-currency">Currency</Label><Input id="inv-currency" {...register('currency')} maxLength={3} placeholder="NGN" /><FieldError>{errors.currency?.message}</FieldError></div>
              <Controller control={control} name="discount" render={({ field }) => <MoneyInput id="inv-discount" label="Discount" value={field.value} onChange={field.onChange} currency={currency} error={errors.discount?.message} />} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="mb-4 flex items-center justify-between"><div><p className="font-display font-bold">Line items</p><p className="text-xs text-muted-foreground">Quantity × unit price, with optional tax rate.</p></div><Button type="button" size="sm" variant="outline" onClick={() => append({ id: `line-${Date.now()}`, description: '', quantity: '1', unitPrice: '0', taxRateId: '' })}><Plus /> Add line</Button></div>
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1.6fr_0.6fr_0.9fr_1fr_auto]">
                    <div className="space-y-1.5 sm:col-span-1"><Label htmlFor={`line-desc-${index}`}>Description</Label><Input id={`line-desc-${index}`} {...register(`lines.${index}.description`)} placeholder="Service or item" aria-invalid={Boolean(errors.lines?.[index]?.description)} /><FieldError>{errors.lines?.[index]?.description?.message}</FieldError></div>
                    <div className="space-y-1.5"><Label htmlFor={`line-qty-${index}`}>Qty</Label><Controller control={control} name={`lines.${index}.quantity`} render={({ field: controller }) => <MoneyInput id={`line-qty-${index}`} value={controller.value} onChange={controller.onChange} currency={currency} placeholder="1" />} /></div>
                    <div className="space-y-1.5"><Label htmlFor={`line-price-${index}`}>Unit price</Label><Controller control={control} name={`lines.${index}.unitPrice`} render={({ field: controller }) => <MoneyInput id={`line-price-${index}`} value={controller.value} onChange={controller.onChange} currency={currency} />} /></div>
                    <div className="space-y-1.5"><Label htmlFor={`line-tax-${index}`}>Tax</Label><select id={`line-tax-${index}`} {...register(`lines.${index}.taxRateId`)} className="h-10 rounded-lg border border-input bg-background px-2 text-xs"><option value="">No tax</option>{taxRates.map((rate) => <option key={rate.id} value={rate.id}>{rate.name}</option>)}</select></div>
                    <button type="button" aria-label={`Remove line ${index + 1}`} onClick={() => remove(index)} className="mt-6 rounded p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"><Trash2 className="size-4" /></button>
                  </div>
                ))}
              </div>
              {errors.lines?.message && <p className="mt-2 text-xs font-medium text-destructive">{errors.lines.message}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="space-y-1.5"><Label htmlFor="inv-notes">Notes</Label><Textarea id="inv-notes" {...register('notes')} placeholder="Payment instructions, thanks, or terms" /></div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-24">
          <CardContent className="space-y-4 pt-5">
            <div className="flex items-center justify-between"><p className="font-display font-bold">Invoice summary</p><StatusBadge status="DRAFT" /></div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><CurrencyDisplay amount={subtotal.amount} currency={safeCurrency} /></div>
              <div className="flex justify-between text-muted-foreground"><span>Discount</span><CurrencyDisplay amount={discount || '0'} currency={safeCurrency} /></div>
              <div className="flex justify-between text-muted-foreground"><span>Tax</span><CurrencyDisplay amount={tax.amount} currency={safeCurrency} /></div>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Total</p>
              <p className="mt-1 font-display text-2xl font-extrabold"><CurrencyDisplay amount={total.amount} currency={safeCurrency} /></p>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}><ReceiptText /> {isSubmitting ? 'Creating…' : 'Create invoice'}</Button>
            <p className="text-[10px] leading-relaxed text-muted-foreground">The invoice is saved as a draft. Open it to send, record payment or generate a PDF.</p>
          </CardContent>
        </Card>
      </form>

      <ConfirmDialog open={customerOpen} onOpenChange={setCustomerOpen} title="Add customer" description="New customers are immediately available on the invoice." confirmLabel="Add customer" onConfirm={() => {
        void createCustomer.mutateAsync({ name: newCustomer.name, email: newCustomer.email, currency: 'NGN', paymentTermsDays: Number(newCustomer.paymentTermsDays), status: 'active' }).then((customer) => {
          reset({ ...form.getValues(), customerId: customer.id })
          setNewCustomer({ name: '', email: '', paymentTermsDays: '30' })
        }).catch(() => {})
      }}>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="new-customer-name">Name</Label><Input id="new-customer-name" value={newCustomer.name} onChange={(event) => setNewCustomer({ ...newCustomer, name: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="new-customer-email">Email</Label><Input id="new-customer-email" value={newCustomer.email} onChange={(event) => setNewCustomer({ ...newCustomer, email: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="new-customer-terms">Payment terms (days)</Label><Input id="new-customer-terms" type="number" value={newCustomer.paymentTermsDays} onChange={(event) => setNewCustomer({ ...newCustomer, paymentTermsDays: event.target.value })} /></div>
        </div>
      </ConfirmDialog>
    </div>
  )
}
