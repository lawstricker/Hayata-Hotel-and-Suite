import { zodResolver } from '@hookform/resolvers/zod'
import { AlarmClock, BellOff, CheckCheck, PackagePlus, ShoppingCart, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { KpiCard } from '@/components/common/kpi-card'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { LiveIndicator } from '@/components/common/live-indicator'
import { StatusPill } from '@/components/common/status-pill'
import { suppliers } from '@/mock/data'
import { useHotelStore } from '@/store/hotelStore'
import { formatDate } from '@/lib/utils'
import type { PurchaseOrder, StockAlert } from '@/types/domain'

const poSchema = z.object({
  supplierId: z.string().min(1, 'Select a supplier'),
  quantity: z.number().int().positive('Quantity must be positive'),
  expectedDate: z.string().min(1, 'Choose an expected date'),
  note: z.string().optional(),
})
type PoValues = z.infer<typeof poSchema>

function CreatePurchaseOrderDialog({ alert, open, onOpenChange }: { alert: StockAlert | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const addPurchaseOrder = useHotelStore((state) => state.addPurchaseOrder)
  const form = useForm<PoValues>({ resolver: zodResolver(poSchema), defaultValues: { quantity: 25, expectedDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10) } })
  async function submit(values: PoValues) {
    if (!alert) return
    const supplier = suppliers.find((candidate) => candidate.id === values.supplierId)
    const purchaseOrder: PurchaseOrder = {
      id: `po-new-${Date.now()}`,
      poNumber: `PO-2026-${Math.floor(2000 + Math.random() * 8000)}`,
      supplierId: values.supplierId,
      supplierName: supplier?.name ?? 'Supplier',
      status: 'Draft',
      createdAt: new Date().toISOString(),
      expectedDate: values.expectedDate,
      total: 0,
      itemCount: 1,
      createdBy: 'Elena Vasquez',
    }
    addPurchaseOrder(purchaseOrder)
    toast.success('Purchase order created', { description: `${purchaseOrder.poNumber} · ${alert.itemName} × ${values.quantity}` })
    onOpenChange(false)
    form.reset()
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Create purchase order</DialogTitle><DialogDescription>{alert ? `${alert.itemName} · ${alert.currentStock} remaining · reorder at ${alert.threshold}` : 'Create a replenishment order.'}</DialogDescription></DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
          <div className="space-y-1.5"><Label>Supplier</Label><select {...form.register('supplierId')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Select preferred supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name} · {supplier.leadTime} day lead time</option>)}</select>{form.formState.errors.supplierId && <p className="text-xs text-destructive">{form.formState.errors.supplierId.message}</p>}</div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>Quantity</Label><Input type="number" {...form.register('quantity', { valueAsNumber: true })} /></div><div className="space-y-1.5"><Label>Expected date</Label><Input type="date" {...form.register('expectedDate')} /></div></div>
          <div className="space-y-1.5"><Label>Note</Label><Input {...form.register('note')} placeholder="Optional receiving instructions" /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit"><ShoppingCart /> Create PO</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function InventoryAlertsPage() {
  const alerts = useHotelStore((state) => state.alerts)
  const acknowledgeAlert = useHotelStore((state) => state.acknowledgeAlert)
  const snoozeAlert = useHotelStore((state) => state.snoozeAlert)
  const [filter, setFilter] = useState('all')
  const [selectedAlert, setSelectedAlert] = useState<StockAlert | null>(null)
  const [poOpen, setPoOpen] = useState(false)
  const filtered = useMemo(() => alerts.filter((alert) => (filter === 'all' || alert.type === filter) && !alert.acknowledged), [alerts, filter])
  const critical = alerts.filter((alert) => alert.type === 'critical' && !alert.acknowledged).length
  const warning = alerts.filter((alert) => alert.type === 'warning' && !alert.acknowledged).length
  const expiring = alerts.filter((alert) => alert.type === 'expiring' || alert.expiry).length

  const columns: DataTableColumn<StockAlert>[] = [
    { key: 'itemName', header: 'Item', sortable: true, cell: (row) => <div><p className="font-bold text-foreground">{row.itemName}</p><p className="font-mono text-[10px] text-muted-foreground">{row.sku} · {row.outlet}</p></div> },
    { key: 'type', header: 'Severity', cell: (row) => <StatusPill status={row.type === 'critical' ? 'Critical' : row.type === 'expiring' ? 'Expiring' : 'Warning'} /> },
    { key: 'currentStock', header: 'On hand', align: 'right', sortable: true, cell: (row) => <span className={`font-display text-base font-extrabold ${row.type === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>{row.currentStock}</span> },
    { key: 'threshold', header: 'Threshold', align: 'right', cell: (row) => <span className="text-xs font-semibold">{row.threshold}</span> },
    { key: 'expiry', header: 'Expiry', cell: (row) => row.expiry ? <span className="text-xs font-semibold text-amber-600">{formatDate(row.expiry)}</span> : '—' },
    { key: 'createdAt', header: 'Triggered', cell: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.createdAt, 'MMM d, h:mm a')}</span> },
    { key: 'actions', header: 'Actions', align: 'right', cell: (row) => <div className="flex justify-end gap-1"><Button size="sm" variant="outline" onClick={() => { snoozeAlert(row.id); toast.success('Alert snoozed for 24 hours') }}><BellOff /> Snooze</Button><Button size="sm" variant="outline" onClick={() => { acknowledgeAlert(row.id); toast.success('Alert acknowledged') }}><CheckCheck /> Ack</Button><Button size="sm" onClick={() => { setSelectedAlert(row); setPoOpen(true) }}><ShoppingCart /> PO</Button></div> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="mb-1 flex items-center gap-2"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Live monitoring</p><LiveIndicator /></div><h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-[28px]">Stock alerts</h1><p className="mt-1 text-sm text-muted-foreground">Critical thresholds, expiring batches and acknowledged warnings.</p></div><Button variant="outline" onClick={() => { alerts.filter((alert) => !alert.acknowledged).forEach((alert) => acknowledgeAlert(alert.id)); toast.success('All alerts acknowledged') }}><CheckCheck /> Acknowledge all</Button></div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Critical" value={critical} changeLabel="below minimum level" icon={TriangleAlert} tone="rose" live />
        <KpiCard label="Warning" value={warning} changeLabel="at reorder point" icon={AlarmClock} tone="amber" live />
        <KpiCard label="Expiring soon" value={expiring} changeLabel="within 30 days" icon={PackagePlus} tone="violet" />
      </div>

      <Card><CardContent className="pt-5">
        <DataTable data={filtered} columns={columns} searchPlaceholder="Search item or SKU…" searchKeys={[(row) => row.itemName, (row) => row.sku]} pageSize={10} filename="stock-alerts.csv" selectable toolbar={<select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm"><option value="all">All severities</option><option value="critical">Critical</option><option value="warning">Warning</option><option value="expiring">Expiring</option></select>} />
      </CardContent></Card>

      <CreatePurchaseOrderDialog alert={selectedAlert} open={poOpen} onOpenChange={setPoOpen} />
    </div>
  )
}
