import { CreditCard, Download, FileText, Hotel, Plus, Printer, ReceiptText, Send, Split, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { KpiCard } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { StatusPill } from '@/components/common/status-pill'
import { logActivity } from '@/lib/activity-log'
import { downloadCsv, formatCurrency, formatDate } from '@/lib/utils'
import { guests, invoices as seedInvoices, payments as seedPayments } from '@/mock/data'
import type { Invoice, Payment } from '@/types/domain'

interface Folio {
  id: string
  guestName: string
  room: number
  tier: string
  status: 'Open' | 'Overdue' | 'Payment requested'
  roomCharges: number
  restaurant: number
  bar: number
  balance: number
}

function toFolio(index: number): Folio {
  const guest = guests[index]
  return {
    id: guest.id, guestName: `${guest.firstName} ${guest.lastName}`, room: 201 + index, tier: guest.tier,
    status: index % 4 === 0 ? 'Overdue' : 'Open',
    roomCharges: 680 + index * 110, restaurant: 140 + index * 38, bar: 80 + index * 22,
    balance: 900 + index * 170,
  }
}

export function FoliosPage() {
  const [folios, setFolios] = useState<Folio[]>(() => guests.slice(0, 8).map((_, index) => toFolio(index)))
  const [newOpen, setNewOpen] = useState(false)
  const [viewing, setViewing] = useState<Folio | null>(null)
  const [requesting, setRequesting] = useState<Folio | null>(null)
  const [newFolio, setNewFolio] = useState({ guestId: guests[0].id, openingBalance: '0' })
  const [requestAmount, setRequestAmount] = useState('')

  function exportFolios() {
    downloadCsv('folio-report.csv', folios.map((folio) => ({
      guest: folio.guestName, room: folio.room, tier: folio.tier, status: folio.status,
      roomCharges: folio.roomCharges, restaurant: folio.restaurant, bar: folio.bar, balance: folio.balance,
    })))
    logActivity({ action: 'Folio report exported', module: 'Billing', detail: `${folios.length} folios` })
    toast.success('Folio report exported', { description: `${folios.length} folios written to CSV` })
  }

  function createFolio() {
    const guest = guests.find((candidate) => candidate.id === newFolio.guestId)
    if (!guest) return
    const balance = Number(newFolio.openingBalance) || 0
    const folio: Folio = {
      id: `folio-${Date.now()}`, guestName: `${guest.firstName} ${guest.lastName}`, room: 201 + folios.length,
      tier: guest.tier, status: 'Open', roomCharges: balance, restaurant: 0, bar: 0, balance,
    }
    setFolios((current) => [folio, ...current])
    logActivity({ action: 'Folio opened', module: 'Billing', detail: `${folio.guestName} · ${formatCurrency(balance)}` })
    toast.success('Folio opened', { description: folio.guestName })
    setNewOpen(false)
  }

  function requestPayment() {
    if (!requesting) return
    const amount = Number(requestAmount) || 0
    if (amount <= 0) { toast.error('Enter an amount greater than zero'); return }
    setFolios((current) => current.map((folio) => folio.id === requesting.id ? { ...folio, status: 'Payment requested' } : folio))
    logActivity({ action: 'Payment requested', module: 'Billing', detail: `${requesting.guestName} · ${formatCurrency(amount)}` })
    toast.success('Payment request sent', { description: `${requesting.guestName} · ${formatCurrency(amount)}` })
    setRequesting(null)
    setRequestAmount('')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Guest folios" description="Combine room, restaurant, bar and event charges in one account." breadcrumbs={[{ label: 'Finance' }, { label: 'Guest folios' }]} actions={<><Button variant="outline" onClick={exportFolios}><Download /> Export</Button><Button onClick={() => setNewOpen(true)}><Plus /> New folio</Button></>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Open folios" value={folios.length} changeLabel="active guest accounts" icon={ReceiptText} tone="teal" />
        <KpiCard label="Folio balance" value={formatCurrency(folios.reduce((sum, folio) => sum + folio.balance, 0))} changeLabel="total outstanding" icon={WalletCards} tone="blue" />
        <KpiCard label="Room charges" value={formatCurrency(folios.reduce((sum, folio) => sum + folio.roomCharges, 0))} changeLabel="across folios" icon={Hotel} tone="violet" />
        <KpiCard label="Outlet charges" value={formatCurrency(folios.reduce((sum, folio) => sum + folio.restaurant + folio.bar, 0))} changeLabel="restaurant & bar" icon={CreditCard} tone="amber" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {folios.map((folio) => (
          <Card key={folio.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div><p className="text-xs font-bold text-primary">{folio.guestName}</p><p className="mt-0.5 text-[10px] text-muted-foreground">Room {folio.room} · {folio.tier}</p></div>
                <StatusPill status={folio.status} />
              </div>
              <div className="my-5 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Room & services</span><span className="font-semibold">{formatCurrency(folio.roomCharges)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Restaurant</span><span className="font-semibold">{formatCurrency(folio.restaurant)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bar</span><span className="font-semibold">{formatCurrency(folio.bar)}</span></div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3"><span className="text-xs font-semibold">Balance</span><span className="font-display text-lg font-extrabold">{formatCurrency(folio.balance)}</span></div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" onClick={() => setViewing(folio)}><FileText /> View folio</Button>
                <Button size="sm" onClick={() => { setRequesting(folio); setRequestAmount(String(folio.balance)) }}><Send /> Request payment</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Open a folio</DialogTitle><DialogDescription>Choose a guest and set the opening balance.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="folio-guest">Guest</Label><select id="folio-guest" value={newFolio.guestId} onChange={(event) => setNewFolio({ ...newFolio, guestId: event.target.value })} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{guests.map((guest) => <option key={guest.id} value={guest.id}>{guest.firstName} {guest.lastName}</option>)}</select></div>
            <div className="space-y-1.5"><Label htmlFor="folio-balance">Opening balance</Label><Input id="folio-balance" type="number" min={0} value={newFolio.openingBalance} onChange={(event) => setNewFolio({ ...newFolio, openingBalance: event.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button><Button onClick={createFolio}>Open folio</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => { if (!open) setViewing(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{viewing?.guestName}</DialogTitle><DialogDescription>Room {viewing?.room} · {viewing?.tier}</DialogDescription></DialogHeader>
          <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Room & services</span><span className="font-bold">{formatCurrency(viewing?.roomCharges ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Restaurant</span><span className="font-bold">{formatCurrency(viewing?.restaurant ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Bar</span><span className="font-bold">{formatCurrency(viewing?.bar ?? 0)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold"><span>Balance</span><span>{formatCurrency(viewing?.balance ?? 0)}</span></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button><Button onClick={() => setViewing(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(requesting)} onOpenChange={(open) => { if (!open) setRequesting(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Request payment</DialogTitle><DialogDescription>Send a payment request to {requesting?.guestName}.</DialogDescription></DialogHeader>
          <div className="space-y-1.5"><Label htmlFor="request-amount">Amount</Label><Input id="request-amount" type="number" min={1} value={requestAmount} onChange={(event) => setRequestAmount(event.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setRequesting(null)}>Cancel</Button><Button onClick={requestPayment}>Send request</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(seedInvoices)
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [draft, setDraft] = useState(() => ({ guestId: guests[0].id, outlet: 'Restaurant', amount: '0', dueDate: new Date().toISOString().slice(0, 10) }))

  function createInvoice() {
    const guest = guests.find((candidate) => candidate.id === draft.guestId)
    if (!guest) return
    const total = Number(draft.amount) || 0
    const invoice: Invoice = {
      id: `inv-${Date.now()}`, invoiceNumber: `INV-${String(invoices.length + 1).padStart(4, '0')}`,
      guestName: `${guest.firstName} ${guest.lastName}`, outlet: draft.outlet as Invoice['outlet'],
      issuedAt: new Date().toISOString(), dueAt: `${draft.dueDate}T23:59:59.000Z`, status: 'Pending',
      subtotal: total, tax: 0, total, balance: total,
    }
    setInvoices((current) => [invoice, ...current])
    logActivity({ action: 'Invoice created', module: 'Billing', detail: `${invoice.invoiceNumber} · ${formatCurrency(total)}` })
    toast.success('Invoice created', { description: invoice.invoiceNumber })
    setNewOpen(false)
  }

  function sendInvoice(invoice: Invoice) {
    setInvoices((current) => current.map((item) => item.id === invoice.id ? { ...item, status: 'Pending' } : item))
    logActivity({ action: 'Invoice sent', module: 'Billing', detail: invoice.invoiceNumber })
    toast.success('Invoice sent to guest', { description: invoice.invoiceNumber })
  }

  function exportInvoices() {
    downloadCsv('invoice-report.csv', invoices.map((invoice) => ({
      number: invoice.invoiceNumber, guest: invoice.guestName, outlet: invoice.outlet,
      issued: invoice.issuedAt.slice(0, 10), due: invoice.dueAt.slice(0, 10),
      status: invoice.status, total: invoice.total, balance: invoice.balance,
    })))
    toast.success('Invoice report exported', { description: `${invoices.length} invoices written to CSV` })
  }

  const columns: DataTableColumn<Invoice>[] = [
    { key: 'invoiceNumber', header: 'Invoice', sortable: true, cell: (row) => <span className="font-mono text-xs font-bold">{row.invoiceNumber}</span> },
    { key: 'guestName', header: 'Guest', cell: (row) => <span className="font-semibold">{row.guestName}</span> },
    { key: 'outlet', header: 'Outlet', hideOnMobile: true, cell: (row) => <Badge variant="outline">{row.outlet}</Badge> },
    { key: 'issuedAt', header: 'Issued', sortable: true, cell: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.issuedAt)}</span> },
    { key: 'dueAt', header: 'Due', cell: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.dueAt)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusPill status={row.status} /> },
    { key: 'total', header: 'Total', align: 'right', cell: (row) => <span className="text-xs font-bold">{formatCurrency(row.total)}</span> },
    { key: 'balance', header: 'Balance', align: 'right', cell: (row) => <span className={`text-xs font-bold ${row.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCurrency(row.balance)}</span> },
    { key: 'actions', header: 'Action', align: 'right', cell: (row) => <Button size="sm" variant="ghost" onClick={() => setSelected(row)}><FileText /> Preview</Button> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Track pending, paid, partial and overdue guest invoices." breadcrumbs={[{ label: 'Finance' }, { label: 'Invoices' }]} actions={<><Button variant="outline" onClick={exportInvoices}><Download /> Export</Button><Button onClick={() => setNewOpen(true)}><Plus /> New invoice</Button></>} />
      <Card><CardContent className="pt-5"><DataTable data={invoices} columns={columns} searchPlaceholder="Search invoice or guest…" searchKeys={[(row) => row.invoiceNumber, (row) => row.guestName, (row) => row.outlet]} initialSort={{ key: 'issuedAt', direction: 'desc' }} pageSize={10} filename="invoices.csv" selectable /></CardContent></Card>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New invoice</DialogTitle><DialogDescription>Create a guest invoice from a folio charge.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="invoice-guest">Guest</Label><select id="invoice-guest" value={draft.guestId} onChange={(event) => setDraft({ ...draft, guestId: event.target.value })} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{guests.map((guest) => <option key={guest.id} value={guest.id}>{guest.firstName} {guest.lastName}</option>)}</select></div>
            <div className="space-y-1.5"><Label htmlFor="invoice-outlet">Outlet</Label><select id="invoice-outlet" value={draft.outlet} onChange={(event) => setDraft({ ...draft, outlet: event.target.value })} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{['Rooms', 'Restaurant', 'Bar', 'Events'].map((outlet) => <option key={outlet}>{outlet}</option>)}</select></div>
            <div className="space-y-1.5"><Label htmlFor="invoice-amount">Amount</Label><Input id="invoice-amount" type="number" min={0} value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="invoice-due">Due date</Label><Input id="invoice-due" type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button><Button onClick={createInvoice}>Create invoice</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Invoice preview</DialogTitle><DialogDescription>{selected?.invoiceNumber}</DialogDescription></DialogHeader>
          {selected && (
            <div className="rounded-lg border border-border bg-white p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
              <div className="flex justify-between border-b border-slate-200 pb-5 dark:border-slate-800">
                <div><p className="font-display text-xl font-extrabold text-teal-700 dark:text-teal-400">HAYATA</p><p className="text-[10px] uppercase tracking-widest text-slate-400">Hotel & Suite</p></div>
                <div className="text-right"><p className="font-display text-lg font-extrabold">INVOICE</p><p className="text-xs text-slate-500">{selected.invoiceNumber}</p></div>
              </div>
              <div className="my-5 grid grid-cols-2 gap-4 text-xs">
                <div><p className="font-bold uppercase text-slate-400">Billed to</p><p className="mt-1 font-bold">{selected.guestName}</p><p className="text-slate-500">Guest account</p></div>
                <div className="text-right"><p className="font-bold uppercase text-slate-400">Issue date</p><p className="mt-1">{formatDate(selected.issuedAt)}</p><p className="text-slate-500">Due {formatDate(selected.dueAt)}</p></div>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
                <div className="flex justify-between text-xs"><span>Accommodation & services</span><span>{formatCurrency(selected.subtotal)}</span></div>
                <div className="mt-2 flex justify-between text-xs"><span>Tax</span><span>{formatCurrency(selected.tax)}</span></div>
                <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 font-bold dark:border-slate-800"><span>Total due</span><span>{formatCurrency(selected.total)}</span></div>
              </div>
              <p className="mt-5 text-center text-[10px] text-slate-400">Thank you for staying with Hayata. Payment is due by {formatDate(selected.dueAt)}.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>
            <Button onClick={() => selected && sendInvoice(selected)}><Send /> Send invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function PaymentsPage() {
  const [method, setMethod] = useState('all')
  const [payments, setPayments] = useState<Payment[]>(seedPayments)
  const [recording, setRecording] = useState(false)
  const [refunding, setRefunding] = useState<Payment | null>(null)
  const [details, setDetails] = useState<Payment | null>(null)
  const [draft, setDraft] = useState({ guestName: guests[0].firstName + ' ' + guests[0].lastName, method: 'Card', amount: '0', reference: '' })
  const [refundReason, setRefundReason] = useState('')
  const filtered = method === 'all' ? payments : payments.filter((payment) => payment.method === method)

  function recordPayment() {
    const amount = Number(draft.amount) || 0
    if (amount <= 0) { toast.error('Enter an amount greater than zero'); return }
    const payment: Payment = {
      id: `pay-${Date.now()}`, paymentNumber: `PAY-${String(payments.length + 1).padStart(4, '0')}`,
      invoiceId: '', guestName: draft.guestName, method: draft.method as Payment['method'],
      amount, status: 'Completed', createdAt: new Date().toISOString(), reference: draft.reference || `REF-${Date.now()}`,
    }
    setPayments((current) => [payment, ...current])
    logActivity({ action: 'Payment recorded', module: 'Billing', detail: `${payment.paymentNumber} · ${formatCurrency(amount)}` })
    toast.success('Payment recorded', { description: payment.paymentNumber })
    setRecording(false)
    setDraft({ ...draft, amount: '0', reference: '' })
  }

  function refund() {
    if (!refunding) return
    setPayments((current) => current.map((payment) => payment.id === refunding.id ? { ...payment, status: 'Refunded' } : payment))
    logActivity({ action: 'Payment refunded', module: 'Billing', detail: `${refunding.paymentNumber} · ${refundReason || 'No reason given'}` })
    toast.success('Refund recorded', { description: refunding.paymentNumber })
    setRefunding(null)
    setRefundReason('')
  }

  function exportPayments() {
    downloadCsv('payment-report.csv', filtered.map((payment) => ({
      number: payment.paymentNumber, guest: payment.guestName, method: payment.method,
      amount: payment.amount, status: payment.status, reference: payment.reference,
      date: payment.createdAt,
    })))
    toast.success('Payment report exported', { description: `${filtered.length} transactions written to CSV` })
  }

  const columns: DataTableColumn<Payment>[] = [
    { key: 'paymentNumber', header: 'Payment', sortable: true, cell: (row) => <span className="font-mono text-xs font-bold">{row.paymentNumber}</span> },
    { key: 'guestName', header: 'Guest', cell: (row) => <span className="font-semibold">{row.guestName}</span> },
    { key: 'method', header: 'Method', cell: (row) => <Badge variant="outline">{row.method}</Badge> },
    { key: 'amount', header: 'Amount', align: 'right', sortable: true, cell: (row) => <span className="text-xs font-bold">{formatCurrency(row.amount)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusPill status={row.status} /> },
    { key: 'reference', header: 'Reference', hideOnMobile: true, cell: (row) => <span className="font-mono text-[10px] text-muted-foreground">{row.reference}</span> },
    { key: 'createdAt', header: 'Date', cell: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.createdAt, 'MMM d, h:mm a')}</span> },
    { key: 'actions', header: 'Action', align: 'right', cell: (row) => <div className="flex justify-end gap-1">{row.status === 'Completed' ? <Button size="sm" variant="ghost" onClick={() => setRefunding(row)}><Split /> Refund</Button> : <Button size="sm" variant="ghost" onClick={() => setDetails(row)}><ReceiptText /> Details</Button>}</div> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Track every transaction, refund and settlement method." breadcrumbs={[{ label: 'Finance' }, { label: 'Payments' }]} actions={<><Button variant="outline" onClick={exportPayments}><Download /> Export</Button><Button onClick={() => setRecording(true)}><Plus /> Record payment</Button></>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Collected today" value={formatCurrency(payments.filter((payment) => payment.status === 'Completed').reduce((sum, payment) => sum + payment.amount, 0))} changeLabel="completed transactions" icon={WalletCards} tone="teal" />
        <KpiCard label="Card payments" value={formatCurrency(payments.filter((payment) => payment.method === 'Card').reduce((sum, payment) => sum + payment.amount, 0))} changeLabel="card settlements" icon={CreditCard} tone="blue" />
        <KpiCard label="Pending" value={payments.filter((payment) => payment.status === 'Pending').length} changeLabel="awaiting confirmation" icon={ReceiptText} tone="amber" />
        <KpiCard label="Refunded" value={payments.filter((payment) => payment.status === 'Refunded').length} changeLabel="transactions reversed" icon={Split} tone="rose" />
      </div>
      <Card><CardContent className="pt-5"><DataTable data={filtered} columns={columns} searchPlaceholder="Search payment, guest or reference…" searchKeys={[(row) => row.paymentNumber, (row) => row.guestName, (row) => row.reference]} pageSize={10} filename="payments.csv" selectable toolbar={<select value={method} onChange={(event) => setMethod(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="all">All methods</option>{['Cash', 'Card', 'Bank transfer', 'Room charge', 'Loyalty redemption'].map((option) => <option key={option}>{option}</option>)}</select>} /></CardContent></Card>

      <Dialog open={recording} onOpenChange={setRecording}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record payment</DialogTitle><DialogDescription>Add a settlement to the payments ledger.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="payment-guest">Guest</Label><select id="payment-guest" value={draft.guestName} onChange={(event) => setDraft({ ...draft, guestName: event.target.value })} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{guests.map((guest) => <option key={guest.id}>{guest.firstName} {guest.lastName}</option>)}</select></div>
            <div className="space-y-1.5"><Label htmlFor="payment-method">Method</Label><select id="payment-method" value={draft.method} onChange={(event) => setDraft({ ...draft, method: event.target.value })} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{['Cash', 'Card', 'Bank transfer', 'Room charge', 'Loyalty redemption'].map((option) => <option key={option}>{option}</option>)}</select></div>
            <div className="space-y-1.5"><Label htmlFor="payment-amount">Amount</Label><Input id="payment-amount" type="number" min={1} value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="payment-reference">Reference</Label><Input id="payment-reference" value={draft.reference} onChange={(event) => setDraft({ ...draft, reference: event.target.value })} placeholder="Bank or receipt reference" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRecording(false)}>Cancel</Button><Button onClick={recordPayment}>Record payment</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(refunding)} onOpenChange={(open) => { if (!open) setRefunding(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Refund payment</DialogTitle><DialogDescription>Refund {refunding?.paymentNumber} · {formatCurrency(refunding?.amount ?? 0)}. The reason is recorded in the audit log.</DialogDescription></DialogHeader>
          <div className="space-y-1.5"><Label htmlFor="refund-reason">Reason</Label><Input id="refund-reason" value={refundReason} onChange={(event) => setRefundReason(event.target.value)} placeholder="Guest request, duplicate charge…" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setRefunding(null)}>Cancel</Button><Button variant="destructive" onClick={refund}>Confirm refund</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(details)} onOpenChange={(open) => { if (!open) setDetails(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{details?.paymentNumber}</DialogTitle><DialogDescription>Payment details</DialogDescription></DialogHeader>
          <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Guest</span><span className="font-bold">{details?.guestName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-bold">{details?.method}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold">{formatCurrency(details?.amount ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs">{details?.reference}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusPill status={details?.status ?? 'Pending'} /></div>
          </div>
          <DialogFooter><Button onClick={() => setDetails(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
