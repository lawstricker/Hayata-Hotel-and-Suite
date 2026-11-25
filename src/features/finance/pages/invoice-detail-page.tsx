import { ArrowLeft, Download, Printer, Send, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldError, Input, Label } from '@/components/ui/input'
import { useInvoice, usePayments, useRecordPayment, useSendInvoice } from '@/features/finance/api'
import { Can, ConfirmDialog, CurrencyDisplay, EmptyState, PageHeader, StatusBadge } from '@/features/finance/components'
import { money, multiply, subtract } from '@/lib/money'
import { generateInvoicePdf } from '@/features/finance/utils/invoice-pdf'

export function InvoiceDetailPage() {
  const { invoiceId } = useParams()
  const { data: invoice, isLoading, isError } = useInvoice(invoiceId)
  const { data: payments = [] } = usePayments()
  const sendInvoice = useSendInvoice()
  const recordPayment = useRecordPayment()
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [payment, setPayment] = useState(() => ({ amount: '', date: new Date().toISOString().slice(0, 10), method: 'Bank transfer', reference: '' }))

  if (isError || (!isLoading && !invoice)) return <EmptyState title="Invoice not found" description="It may have been removed or the API is unavailable." action={<Button asChild><Link to="/staff/finance/invoices">Back to invoices</Link></Button>} />
  if (isLoading || !invoice) return <div className="h-96 animate-pulse rounded-2xl bg-muted/50" />

  const balance = subtract(money(invoice.total, invoice.currency), money(invoice.amountPaid, invoice.currency))
  const related = payments.filter((entry) => entry.allocations.some((allocation) => allocation.documentId === invoice.id))
  const canRecord = invoice.status !== 'DRAFT' && invoice.status !== 'VOID' && invoice.status !== 'PAID'

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.number}
        eyebrow="Receivables"
        description={`${invoice.customerName} · issued ${invoice.issueDate.slice(0, 10)} · due ${invoice.dueDate.slice(0, 10)}`}
        breadcrumbs={[{ label: 'Finance' }, { label: 'Invoices', href: '/staff/finance/invoices' }, { label: invoice.number }]}
        actions={<>
          <Button variant="ghost" size="sm" asChild><Link to="/staff/finance/invoices"><ArrowLeft /> Back</Link></Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer /> Print</Button>
          <Button size="sm" onClick={() => generateInvoicePdf(invoice)}><Download /> Generate PDF</Button>
          {invoice.status === 'DRAFT' && <Can permission="invoice:approve"><Button size="sm" variant="secondary" onClick={() => sendInvoice.mutate(invoice.id)}><Send /> Send invoice</Button></Can>}
        </>}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
              <div>
                <p className="font-display text-2xl font-extrabold tracking-tight text-primary">Hayata Hotel &amp; Suite</p>
                <p className="mt-1 text-xs text-muted-foreground">Metro City · Lagos, Nigeria</p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-extrabold">INVOICE</p>
                <p className="font-mono text-sm font-bold">{invoice.number}</p>
                <div className="mt-2"><StatusBadge status={invoice.status} /></div>
              </div>
            </div>

            <div className="grid gap-6 border-b border-border py-6 sm:grid-cols-2">
              <div><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Bill to</p><p className="mt-1 font-display text-lg font-bold">{invoice.customerName}</p></div>
              <div className="text-sm sm:text-right"><p><span className="text-muted-foreground">Issued:</span> {invoice.issueDate.slice(0, 10)}</p><p><span className="text-muted-foreground">Due:</span> {invoice.dueDate.slice(0, 10)}</p><p><span className="text-muted-foreground">Currency:</span> {invoice.currency}</p></div>
            </div>

            <div className="py-6">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><th className="pb-2">Description</th><th className="pb-2 text-right">Qty</th><th className="pb-2 text-right">Unit price</th><th className="pb-2 text-right">Amount</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {invoice.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="py-3 pr-3 font-semibold">{line.description}</td>
                      <td className="py-3 text-right tabular-nums">{line.quantity}</td>
                      <td className="py-3 text-right tabular-nums"><CurrencyDisplay amount={line.unitPrice} currency={invoice.currency} /></td>
                      <td className="py-3 text-right font-bold tabular-nums"><CurrencyDisplay amount={multiply(money(line.unitPrice, invoice.currency), line.quantity).amount} currency={invoice.currency} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {invoice.notes && <p className="mt-6 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">{invoice.notes}</p>}
            </div>

            <div className="ml-auto max-w-xs space-y-2 border-t border-border pt-6 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><CurrencyDisplay amount={invoice.subtotal} currency={invoice.currency} /></div>
              <div className="flex justify-between text-muted-foreground"><span>Discount</span><CurrencyDisplay amount={invoice.discount} currency={invoice.currency} /></div>
              <div className="flex justify-between text-muted-foreground"><span>Tax</span><CurrencyDisplay amount={invoice.tax} currency={invoice.currency} /></div>
              <div className="flex justify-between text-muted-foreground"><span>Paid</span><CurrencyDisplay amount={invoice.amountPaid} currency={invoice.currency} /></div>
              <div className="flex justify-between border-t border-border pt-2 font-display text-lg font-extrabold"><span>Balance due</span><CurrencyDisplay amount={balance.amount} currency={invoice.currency} /></div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Payment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Outstanding</p>
                <p className="mt-1 font-display text-2xl font-extrabold"><CurrencyDisplay amount={balance.amount} currency={invoice.currency} /></p>
              </div>
              <Can permission="payment:create">
                <Button className="w-full" disabled={!canRecord} onClick={() => setPaymentOpen(true)}><Wallet /> Record payment</Button>
              </Can>
              {!canRecord && <p className="text-xs text-muted-foreground">{invoice.status === 'DRAFT' ? 'Send the invoice before recording a payment.' : 'No further payment is required.'}</p>}
              <div className="space-y-2">
                <p className="text-xs font-bold">Payments applied</p>
                {related.length === 0 ? <p className="text-xs text-muted-foreground">No payments recorded yet.</p> : related.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-xs">
                    <div><p className="font-bold">{entry.number}</p><p className="text-muted-foreground">{entry.method} · {entry.date.slice(0, 10)}</p></div>
                    <CurrencyDisplay amount={entry.amount} currency={entry.currency} className="font-bold" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Audit trail</CardTitle></CardHeader>
            <CardContent><p className="text-xs leading-relaxed text-muted-foreground">Creation, send and payment events are recorded with user, timestamp and before/after values in the finance audit log.</p></CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        title="Record payment"
        description={`Allocate a payment to ${invoice.number}. Idempotency prevents double-posting.`}
        confirmLabel="Record payment"
        onConfirm={() => {
          recordPayment.mutate({
            direction: 'incoming', amount: payment.amount, currency: invoice.currency, date: `${payment.date}T00:00:00.000Z`,
            method: payment.method, reference: payment.reference || `PMT-${Date.now()}`,
            idempotencyKey: crypto.randomUUID(),
            allocations: [{ documentId: invoice.id, documentType: 'invoice', amount: payment.amount }],
          }, { onSuccess: () => setPayment({ amount: '', date: new Date().toISOString().slice(0, 10), method: 'Bank transfer', reference: '' }) })
        }}
      >
        <div className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="pay-amount">Amount ({invoice.currency})</Label><Input id="pay-amount" inputMode="decimal" value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} placeholder={balance.amount} />{!payment.amount && <FieldError>Enter the amount received.</FieldError>}</div>
          <div className="space-y-1.5"><Label htmlFor="pay-date">Date</Label><Input id="pay-date" type="date" value={payment.date} onChange={(event) => setPayment({ ...payment, date: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="pay-method">Method</Label><select id="pay-method" value={payment.method} onChange={(event) => setPayment({ ...payment, method: event.target.value })} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option>Bank transfer</option><option>Card</option><option>Cash</option><option>Cheque</option></select></div>
          <div className="space-y-1.5"><Label htmlFor="pay-reference">Reference</Label><Input id="pay-reference" value={payment.reference} onChange={(event) => setPayment({ ...payment, reference: event.target.value })} placeholder="Bank reference or receipt number" /></div>
          <p className="text-[10px] text-muted-foreground">Invoice total <CurrencyDisplay amount={invoice.total} currency={invoice.currency} /> · balance <CurrencyDisplay amount={balance.amount} currency={invoice.currency} /></p>
        </div>
      </ConfirmDialog>
    </div>
  )
}
