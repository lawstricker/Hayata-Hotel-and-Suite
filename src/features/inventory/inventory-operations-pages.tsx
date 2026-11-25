import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRightLeft, Check, CheckCircle2, ClipboardCheck, FileCheck2, FileClock, History, PackageCheck, Plus, Send, Truck, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Label, Textarea } from '@/components/ui/input'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { PageHeader } from '@/components/common/page-header'
import { StatusPill } from '@/components/common/status-pill'
import { inventoryItems, requisitions as seedRequisitions, suppliers, transfers as seedTransfers } from '@/mock/data'
import { useHotelStore } from '@/store/hotelStore'
import { cn, downloadCsv, formatCurrency, formatDate } from '@/lib/utils'
import type { PurchaseOrder, Requisition, StockMovement, Supplier, Transfer } from '@/types/domain'

export function InventoryLedgerPage() {
  const movements = useHotelStore((state) => state.movements)
  const [type, setType] = useState('all')
  const [selected, setSelected] = useState<StockMovement | null>(null)
  const filtered = useMemo(() => movements.filter((movement) => type === 'all' || movement.type === type), [movements, type])
  const columns: DataTableColumn<StockMovement>[] = [
    { key: 'timestamp', header: 'Date & time', sortable: true, cell: (row) => <span className="whitespace-nowrap text-xs font-semibold">{formatDate(row.timestamp, 'MMM d, yyyy · h:mm a')}</span> },
    { key: 'itemName', header: 'Item', sortable: true, cell: (row) => <div><p className="font-bold">{row.itemName}</p><p className="font-mono text-[10px] text-muted-foreground">{row.sku} · {row.outlet}</p></div> },
    { key: 'type', header: 'Movement type', cell: (row) => <StatusPill status={row.type} /> },
    { key: 'quantityIn', header: 'Qty in', align: 'right', cell: (row) => <span className="font-bold text-emerald-600">{row.quantityIn ? `+${row.quantityIn}` : '—'}</span> },
    { key: 'quantityOut', header: 'Qty out', align: 'right', cell: (row) => <span className="font-bold text-red-600">{row.quantityOut ? `−${row.quantityOut}` : '—'}</span> },
    { key: 'runningBalance', header: 'Running balance', align: 'right', cell: (row) => <span className="font-display font-extrabold">{row.runningBalance}</span> },
    { key: 'reference', header: 'Reference', cell: (row) => <span className="font-mono text-xs">{row.reference}</span> },
    { key: 'user', header: 'User', hideOnMobile: true, cell: (row) => <span className="text-xs text-muted-foreground">{row.user}</span> },
  ]
  return (
    <div className="space-y-6">
      <PageHeader title="Stock ledger" description="A complete, immutable trail of every stock movement across all outlets." breadcrumbs={[{ label: 'Inventory' }, { label: 'Stock ledger' }]} actions={<Button variant="outline" onClick={() => { downloadCsv('stock-ledger.csv', filtered.map((row) => ({ date: row.timestamp, item: row.itemName, sku: row.sku, outlet: row.outlet, type: row.type, in: row.quantityIn, out: row.quantityOut, balance: row.runningBalance, reference: row.reference, user: row.user }))); toast.success('Ledger exported', { description: `${filtered.length} movements written to CSV` }) }}><Upload /> Export ledger</Button>} />
      <Card><CardContent className="pt-5"><DataTable data={filtered} columns={columns} searchPlaceholder="Search item, SKU, reference…" searchKeys={[(row) => row.itemName, (row) => row.sku, (row) => row.reference, (row) => row.user]} initialSort={{ key: 'timestamp', direction: 'desc' }} pageSize={10} filename="stock-ledger.csv" selectable toolbar={<select value={type} onChange={(event) => setType(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="all">All movement types</option>{['Sale', 'Purchase Receipt', 'Transfer', 'Wastage', 'Adjustment', 'Return', 'Requisition'].map((option) => <option key={option}>{option}</option>)}</select>} /></CardContent></Card>
      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null) }}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Movement details</DialogTitle><DialogDescription>Audit record for {selected?.reference}</DialogDescription></DialogHeader>{selected && <div className="space-y-4"><div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/60 p-4"><div><p className="text-[10px] font-bold uppercase text-muted-foreground">Item</p><p className="mt-1 text-sm font-bold">{selected.itemName}</p></div><div><p className="text-[10px] font-bold uppercase text-muted-foreground">Reference</p><p className="mt-1 font-mono text-sm font-bold">{selected.reference}</p></div><div><p className="text-[10px] font-bold uppercase text-muted-foreground">Posted by</p><p className="mt-1 text-sm font-bold">{selected.user}</p></div><div><p className="text-[10px] font-bold uppercase text-muted-foreground">Timestamp</p><p className="mt-1 text-sm font-bold">{formatDate(selected.timestamp, 'MMM d, yyyy h:mm a')}</p></div></div><div className="flex items-center justify-between rounded-lg border border-border p-3"><span className="text-sm font-semibold">Net movement</span><span className={cn('font-display text-lg font-extrabold', selected.quantityOut ? 'text-red-600' : 'text-emerald-600')}>{selected.quantityIn ? `+${selected.quantityIn}` : `−${selected.quantityOut}`}</span></div>{selected.note && <p className="text-sm text-muted-foreground">{selected.note}</p>}</div>}<DialogFooter><Button onClick={() => setSelected(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
    </div>
  )
}

const transferSchema = z.object({ itemId: z.string().min(1), fromOutlet: z.string().min(1), toOutlet: z.string().min(1), quantity: z.number().int().positive(), note: z.string().optional() })
type TransferValues = z.infer<typeof transferSchema>

export function InventoryTransfersPage() {
  const [transfers, setTransfers] = useState(seedTransfers)
  const [open, setOpen] = useState(false)
  const form = useForm<TransferValues>({ resolver: zodResolver(transferSchema), defaultValues: { fromOutlet: 'STORE', toOutlet: 'RESTAURANT', quantity: 5 } })
  function submit(values: TransferValues) {
    const item = inventoryItems.find((candidate) => candidate.id === values.itemId)
    const transfer: Transfer = { id: `trf-new-${Date.now()}`, transferNumber: `TRF-${Math.floor(4000 + Math.random() * 5000)}`, fromOutlet: values.fromOutlet as Transfer['fromOutlet'], toOutlet: values.toOutlet as Transfer['toOutlet'], itemId: values.itemId, itemName: item?.name ?? 'Inventory item', quantity: values.quantity, status: 'Requested', requestedBy: 'Elena Vasquez', createdAt: new Date().toISOString() }
    setTransfers((current) => [transfer, ...current])
    toast.success('Transfer requested', { description: `${transfer.transferNumber} awaits store manager approval.` })
    setOpen(false)
    form.reset()
  }
  const columns: DataTableColumn<Transfer>[] = [
    { key: 'transferNumber', header: 'Transfer', sortable: true, cell: (row) => <span className="font-mono text-xs font-bold">{row.transferNumber}</span> },
    { key: 'itemName', header: 'Item', cell: (row) => <div><p className="font-bold">{row.itemName}</p><p className="text-[10px] text-muted-foreground">{row.quantity} units</p></div> },
    { key: 'fromOutlet', header: 'From', cell: (row) => <span className="text-xs font-semibold">{row.fromOutlet}</span> },
    { key: 'toOutlet', header: 'To', cell: (row) => <span className="text-xs font-semibold">{row.toOutlet}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusPill status={row.status} /> },
    { key: 'requestedBy', header: 'Requested by', cell: (row) => <span className="text-xs text-muted-foreground">{row.requestedBy}</span> },
    { key: 'actions', header: 'Actions', align: 'right', cell: (row) => row.status === 'Requested' ? <Button size="sm" onClick={() => { setTransfers((current) => current.map((transfer) => transfer.id === row.id ? { ...transfer, status: 'Approved' } : transfer)); toast.success('Transfer approved') }}><Check /> Approve</Button> : row.status === 'Approved' ? <Button size="sm" variant="outline" onClick={() => { setTransfers((current) => current.map((transfer) => transfer.id === row.id ? { ...transfer, status: 'In transit' } : transfer)); toast.success('Transfer dispatched') }}><Truck /> Dispatch</Button> : <Button size="sm" variant="ghost"><History /> Details</Button> },
  ]
  return <div className="space-y-6"><PageHeader title="Stock transfers" description="Move inventory between outlets with approval and tracking." breadcrumbs={[{ label: 'Inventory' }, { label: 'Transfers' }]} actions={<Button onClick={() => setOpen(true)}><Plus /> New transfer</Button>} /><Card><CardContent className="pt-5"><DataTable data={transfers} columns={columns} searchPlaceholder="Search transfer or item…" searchKeys={[(row) => row.transferNumber, (row) => row.itemName]} pageSize={8} filename="stock-transfers.csv" /></CardContent></Card><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Request stock transfer</DialogTitle><DialogDescription>Transfers require approval before dispatch.</DialogDescription></DialogHeader><form onSubmit={form.handleSubmit(submit)} className="space-y-4"><div className="space-y-1.5"><Label>Item</Label><select {...form.register('itemId')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Select item</option>{inventoryItems.slice(0, 30).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.stock} available</option>)}</select></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>From</Label><select {...form.register('fromOutlet')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option>STORE</option><option>RESTAURANT</option><option>BAR</option></select></div><div className="space-y-1.5"><Label>To</Label><select {...form.register('toOutlet')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option>RESTAURANT</option><option>BAR</option><option>STORE</option></select></div></div><div className="space-y-1.5"><Label>Quantity</Label><Input type="number" {...form.register('quantity', { valueAsNumber: true })} /></div><div className="space-y-1.5"><Label>Reason</Label><Textarea {...form.register('note')} placeholder="Why is this stock needed?" /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit"><ArrowRightLeft /> Submit request</Button></DialogFooter></form></DialogContent></Dialog></div>
}

export function InventoryRequisitionsPage() {
  const adjustStock = useHotelStore((state) => state.adjustStock)
  const [requests, setRequests] = useState(seedRequisitions)
  function update(id: string, status: Requisition['status']) {
    const request = requests.find((candidate) => candidate.id === id)
    if (status === 'Fulfilled' && request) adjustStock(request.itemId, -request.quantity, 'Requisition', request.reqNumber, `Fulfilled for ${request.outlet}`)
    setRequests((current) => current.map((candidate) => candidate.id === id ? { ...candidate, status } : candidate))
    toast.success(`Requisition ${status.toLowerCase()}`)
  }
  const columns: DataTableColumn<Requisition>[] = [
    { key: 'reqNumber', header: 'Request', sortable: true, cell: (row) => <span className="font-mono text-xs font-bold">{row.reqNumber}</span> },
    { key: 'outlet', header: 'Outlet', cell: (row) => <StatusPill status={row.outlet} variant="outline" /> },
    { key: 'itemName', header: 'Item', cell: (row) => <div><p className="font-bold">{row.itemName}</p><p className="text-[10px] text-muted-foreground">Qty {row.quantity}</p></div> },
    { key: 'requestedBy', header: 'Requested by', cell: (row) => <span className="text-xs">{row.requestedBy}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusPill status={row.status} /> },
    { key: 'actions', header: 'Action', align: 'right', cell: (row) => row.status === 'Pending' ? <div className="flex justify-end gap-1"><Button size="sm" variant="outline" onClick={() => update(row.id, 'Rejected')}>Reject</Button><Button size="sm" onClick={() => update(row.id, 'Approved')}>Approve</Button></div> : row.status === 'Approved' ? <Button size="sm" onClick={() => update(row.id, 'Fulfilled')}><PackageCheck /> Fulfill</Button> : <Button size="sm" variant="ghost"><FileCheck2 /> Details</Button> },
  ]
  return <div className="space-y-6"><PageHeader title="Requisitions" description="Outlet stock requests reviewed and fulfilled by the store team." breadcrumbs={[{ label: 'Inventory' }, { label: 'Requisitions' }]} actions={<Button onClick={() => toast.info('New requisition', { description: 'Select an outlet and item to begin.' })}><Plus /> New requisition</Button>} /><Card><CardContent className="pt-5"><DataTable data={requests} columns={columns} searchPlaceholder="Search request or item…" searchKeys={[(row) => row.reqNumber, (row) => row.itemName, (row) => row.requestedBy]} pageSize={8} filename="requisitions.csv" /></CardContent></Card></div>
}

export function InventoryPurchaseOrdersPage() {
  const purchaseOrders = useHotelStore((state) => state.purchaseOrders)
  const updateStatus = useHotelStore((state) => state.updatePurchaseOrderStatus)
  const columns: DataTableColumn<PurchaseOrder>[] = [
    { key: 'poNumber', header: 'PO number', sortable: true, cell: (row) => <span className="font-mono text-xs font-bold">{row.poNumber}</span> },
    { key: 'supplierName', header: 'Supplier', cell: (row) => <span className="font-semibold">{row.supplierName}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusPill status={row.status} /> },
    { key: 'itemCount', header: 'Items', align: 'right', cell: (row) => <span className="text-xs font-bold">{row.itemCount}</span> },
    { key: 'total', header: 'Total', align: 'right', cell: (row) => <span className="text-xs font-bold">{formatCurrency(row.total)}</span> },
    { key: 'expectedDate', header: 'Expected', cell: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.expectedDate)}</span> },
    { key: 'actions', header: 'Action', align: 'right', cell: (row) => row.status === 'Draft' ? <Button size="sm" onClick={() => { updateStatus(row.id, 'Pending approval'); toast.success('PO sent for approval') }}><Send /> Submit</Button> : row.status === 'Pending approval' ? <Button size="sm" onClick={() => { updateStatus(row.id, 'Approved'); toast.success('PO approved') }}><Check /> Approve</Button> : row.status === 'Approved' ? <Button size="sm" variant="outline" onClick={() => { updateStatus(row.id, 'Sent'); toast.success('PO sent to supplier') }}><Send /> Send</Button> : row.status === 'Sent' ? <Button size="sm" onClick={() => { updateStatus(row.id, 'Received'); toast.success('Goods receipt recorded', { description: 'Stock quantities updated from received GRN.' }) }}><PackageCheck /> Receive</Button> : <Button size="sm" variant="ghost"><FileClock /> View</Button> },
  ]
  return <div className="space-y-6"><PageHeader title="Purchase orders" description="Approve, send and receive supplier orders with partial receipts." breadcrumbs={[{ label: 'Inventory' }, { label: 'Purchase orders' }]} actions={<><Button variant="outline" onClick={() => toast.success('PO template downloaded')}><Upload /> Import CSV</Button><Button onClick={() => toast.info('Create purchase order', { description: 'Choose a low-stock alert or supplier to begin.' })}><Plus /> New PO</Button></>} /><Card><CardContent className="pt-5"><DataTable data={purchaseOrders} columns={columns} searchPlaceholder="Search PO or supplier…" searchKeys={[(row) => row.poNumber, (row) => row.supplierName]} initialSort={{ key: 'createdAt', direction: 'desc' }} pageSize={8} filename="purchase-orders.csv" /></CardContent></Card></div>
}

export function InventorySuppliersPage() {
  const [selected, setSelected] = useState<Supplier | null>(null)
  const columns: DataTableColumn<Supplier>[] = [
    { key: 'name', header: 'Supplier', sortable: true, cell: (row) => <div><p className="font-bold">{row.name}</p><p className="text-[10px] text-muted-foreground">{row.contactName} · {row.email}</p></div> },
    { key: 'status', header: 'Status', cell: (row) => <StatusPill status={row.status} /> },
    { key: 'itemsSupplied', header: 'Catalog items', align: 'right', cell: (row) => <span className="text-xs font-bold">{row.itemsSupplied}</span> },
    { key: 'leadTime', header: 'Lead time', align: 'right', cell: (row) => <span className="text-xs font-bold">{row.leadTime} days</span> },
    { key: 'paymentTerms', header: 'Payment terms', cell: (row) => <span className="text-xs text-muted-foreground">{row.paymentTerms}</span> },
    { key: 'phone', header: 'Contact', hideOnMobile: true, cell: (row) => <span className="text-xs">{row.phone}</span> },
  ]
  return <div className="space-y-6"><PageHeader title="Suppliers" description="Supplier contacts, terms, performance and item catalogs." breadcrumbs={[{ label: 'Inventory' }, { label: 'Suppliers' }]} actions={<Button onClick={() => toast.info('Supplier onboarding', { description: 'Complete contact and tax details in the supplier form.' })}><Plus /> Add supplier</Button>} /><Card><CardContent className="pt-5"><DataTable<Supplier> data={suppliers} columns={columns} searchPlaceholder="Search supplier or contact…" searchKeys={[(row) => row.name, (row) => row.contactName, (row) => row.email]} pageSize={8} filename="suppliers.csv" onRowClick={setSelected} /></CardContent></Card><Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null) }}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{selected?.name}</DialogTitle><DialogDescription>Approved supplier · {selected?.status}</DialogDescription></DialogHeader>{selected && <div className="grid grid-cols-2 gap-3"><div className="rounded-lg border border-border p-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">Contact</p><p className="mt-1 text-sm font-bold">{selected.contactName}</p><p className="text-xs text-muted-foreground">{selected.email}</p></div><div className="rounded-lg border border-border p-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">Lead time</p><p className="mt-1 text-sm font-bold">{selected.leadTime} days</p><p className="text-xs text-muted-foreground">{selected.paymentTerms}</p></div><div className="col-span-2 rounded-lg border border-border p-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">Address</p><p className="mt-1 text-sm">{selected.address}</p></div></div>}<DialogFooter><Button onClick={() => setSelected(null)}>Close</Button></DialogFooter></DialogContent></Dialog></div>
}

export function InventoryStockTakePage() {
  const inventory = useHotelStore((state) => state.inventory)
  const adjustStock = useHotelStore((state) => state.adjustStock)
  const [itemId, setItemId] = useState(inventory[0]?.id ?? '')
  const [counted, setCounted] = useState(String(inventory[0]?.stock ?? 0))
  const [notes, setNotes] = useState('')
  const item = inventory.find((candidate) => candidate.id === itemId)
  const variance = item ? Number(counted || 0) - item.stock : 0
  function submit() {
    if (!item) return
    adjustStock(item.id, variance, 'Adjustment', `ST-${Date.now().toString().slice(-5)}`, notes || 'Physical stock count')
    toast.success('Stock count submitted', { description: `${item.name}: variance ${variance >= 0 ? '+' : ''}${variance} recorded.` })
  }
  return <div className="space-y-6"><PageHeader title="Stock take" description="Record physical counts and review variances before posting." breadcrumbs={[{ label: 'Inventory' }, { label: 'Stock take' }]} actions={<Button variant="outline" onClick={() => { downloadCsv('count-sheet.csv', inventory.map((candidate) => ({ item: candidate.name, sku: candidate.sku, location: candidate.location, systemQty: candidate.stock, countedQty: candidate.id === itemId ? counted : '', variance: candidate.id === itemId ? variance : '' }))); toast.success('Count sheet exported', { description: `${inventory.length} items written to CSV` }) }}><Upload /> Export count sheet</Button>} /><div className="grid gap-4 lg:grid-cols-[1fr_360px]"><Card><CardContent className="p-6"><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-1.5 sm:col-span-2"><Label>Inventory item</Label><select value={itemId} onChange={(event) => { setItemId(event.target.value); const selected = inventory.find((candidate) => candidate.id === event.target.value); setCounted(String(selected?.stock ?? 0)) }} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{inventory.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.sku} · System {candidate.stock}</option>)}</select></div><div className="space-y-1.5"><Label>Physical count</Label><Input type="number" value={counted} onChange={(event) => setCounted(event.target.value)} /></div><div className="space-y-1.5"><Label>Count date</Label><Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div><div className="space-y-1.5 sm:col-span-2"><Label>Count notes</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Condition, damaged units, or recount explanation" /></div></div></CardContent></Card><Card className="h-fit"><CardContent className="p-5"><div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-primary" /><h3 className="font-display font-bold">Count summary</h3></div><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">System quantity</span><span className="font-bold">{item?.stock ?? 0}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Counted quantity</span><span className="font-bold">{Number(counted || 0)}</span></div><div className="flex justify-between border-t border-border pt-3"><span className="font-semibold">Variance</span><span className={cn('font-display text-lg font-extrabold', variance < 0 ? 'text-red-600' : variance > 0 ? 'text-emerald-600' : 'text-foreground')}>{variance >= 0 ? '+' : ''}{variance}</span></div></div><Button className="mt-6 w-full" onClick={submit} disabled={!item || variance === 0}><CheckCircle2 /> Post count</Button><p className="mt-3 text-center text-[10px] text-muted-foreground">Posting creates an immutable adjustment movement.</p></CardContent></Card></div></div>
}
