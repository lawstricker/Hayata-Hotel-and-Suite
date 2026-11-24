import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDownToLine, ArrowUpFromLine, Barcode, Boxes, MapPin, PackagePlus, Pencil, Plus, RotateCcw, ScanLine } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { StatusPill } from '@/components/common/status-pill'
import { suppliers } from '@/mock/data'
import { useHotelStore } from '@/store/hotelStore'
import { formatCurrency } from '@/lib/utils'
import type { InventoryItem } from '@/types/domain'

const itemSchema = z.object({
  name: z.string().min(2, 'Enter an item name'),
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
  outlet: z.enum(['STORE', 'RESTAURANT', 'BAR', 'HOUSEKEEPING']),
  category: z.string().min(2, 'Enter a category'),
  unit: z.string().min(1, 'Enter a unit'),
  cost: z.number().positive('Cost must be greater than zero'),
  price: z.number().positive('Price must be greater than zero'),
  supplierId: z.string().min(1, 'Select a supplier'),
  reorderPoint: z.number().int().min(0, 'Enter zero or more'),
  reorderQty: z.number().int().positive('Reorder quantity must be positive'),
  location: z.string().min(2, 'Enter a storage location'),
})
type ItemValues = z.infer<typeof itemSchema>

function ItemDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const addInventoryItem = useHotelStore((state) => state.addInventoryItem)
  const form = useForm<ItemValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { outlet: 'STORE', unit: 'Each', cost: 1, price: 2, reorderPoint: 10, reorderQty: 20 },
  })
  async function submit(values: ItemValues) {
    addInventoryItem({
      id: `inv-new-${Date.now()}`,
      name: values.name,
      sku: values.sku.toUpperCase(),
      outlet: values.outlet,
      category: values.category,
      unit: values.unit,
      cost: values.cost,
      price: values.price,
      supplierId: values.supplierId,
      supplier: undefined,
      reorderPoint: values.reorderPoint,
      reorderQty: values.reorderQty,
      batch: `B${Date.now().toString().slice(-5)}`,
      location: values.location,
      bin: 'A-01',
      stock: 0,
      maximumStock: values.reorderPoint * 4,
      barcode: `89${Date.now().toString().slice(-10)}`,
      lastUpdated: new Date().toISOString(),
    } as InventoryItem)
    toast.success('Inventory item created', { description: `${values.name} · ${values.sku.toUpperCase()}` })
    form.reset()
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Add inventory item</DialogTitle><DialogDescription>Create a SKU and define its reorder controls.</DialogDescription></DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Item name" error={form.formState.errors.name?.message}><Input {...form.register('name')} placeholder="e.g. Sparkling Water 330ml" /></Field>
          <Field label="SKU" error={form.formState.errors.sku?.message}><Input {...form.register('sku')} placeholder="ST-1042" /></Field>
          <Field label="Outlet" error={form.formState.errors.outlet?.message}><select {...form.register('outlet')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="STORE">Store</option><option value="RESTAURANT">Restaurant</option><option value="BAR">Bar</option><option value="HOUSEKEEPING">Housekeeping</option></select></Field>
          <Field label="Category" error={form.formState.errors.category?.message}><Input {...form.register('category')} placeholder="Beverages" /></Field>
          <Field label="Unit of measure" error={form.formState.errors.unit?.message}><Input {...form.register('unit')} placeholder="Each / Case / Litre" /></Field>
          <Field label="Supplier" error={form.formState.errors.supplierId?.message}><select {...form.register('supplierId')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Select supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></Field>
          <Field label="Unit cost" error={form.formState.errors.cost?.message}><Input type="number" step="0.01" {...form.register('cost', { valueAsNumber: true })} /></Field>
          <Field label="Selling price" error={form.formState.errors.price?.message}><Input type="number" step="0.01" {...form.register('price', { valueAsNumber: true })} /></Field>
          <Field label="Reorder point" error={form.formState.errors.reorderPoint?.message}><Input type="number" {...form.register('reorderPoint', { valueAsNumber: true })} /></Field>
          <Field label="Reorder quantity" error={form.formState.errors.reorderQty?.message}><Input type="number" {...form.register('reorderQty', { valueAsNumber: true })} /></Field>
          <Field label="Storage location" error={form.formState.errors.location?.message}><Input {...form.register('location')} placeholder="Warehouse A" /></Field>
          <div className="sm:col-span-2"><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit"><PackagePlus /> Create item</Button></DialogFooter></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}{error && <p className="text-xs font-medium text-destructive" role="alert">{error}</p>}</div>
}

function AdjustStockDialog({ item, onOpenChange }: { item: InventoryItem | null; onOpenChange: (open: boolean) => void }) {
  const adjustStock = useHotelStore((state) => state.adjustStock)
  const [direction, setDirection] = useState<'in' | 'out'>('out')
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('Stock count correction')
  if (!item) return null
  function submit() {
    if (!item) return
    adjustStock(item.id, direction === 'in' ? quantity : -quantity, direction === 'in' ? 'Return' : 'Wastage', `ADJ-${Date.now().toString().slice(-5)}`, reason)
    toast.success('Stock adjusted', { description: `${item.name} changed by ${direction === 'in' ? '+' : '−'}${quantity}.` })
    onOpenChange(false)
  }
  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Adjust stock</DialogTitle><DialogDescription>{item.name} · {item.sku} · Current balance {item.stock} {item.unit}</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2"><Button variant={direction === 'in' ? 'default' : 'outline'} onClick={() => setDirection('in')}><ArrowDownToLine /> Stock in</Button><Button variant={direction === 'out' ? 'default' : 'outline'} onClick={() => setDirection('out')}><ArrowUpFromLine /> Stock out</Button></div>
          <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></div>
          <div className="space-y-1.5"><Label>Reason code</Label><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for adjustment" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit}>Apply adjustment</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function InventoryItemsPage() {
  const inventory = useHotelStore((state) => state.inventory)
  const [outlet, setOutlet] = useState('all')
  const [status, setStatus] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const filtered = useMemo(() => inventory.filter((item) => (outlet === 'all' || item.outlet === outlet) && (status === 'all' || (status === 'low' ? item.stock <= item.reorderPoint : status === 'expiring' ? Boolean(item.expiry) : item.stock > item.reorderPoint))), [inventory, outlet, status])

  const columns: DataTableColumn<InventoryItem>[] = [
    { key: 'name', header: 'Item', sortable: true, cell: (row) => <div className="flex min-w-[210px] items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Boxes className="size-4" /></span><div className="min-w-0"><p className="truncate font-bold text-foreground">{row.name}</p><p className="font-mono text-[10px] text-muted-foreground">{row.sku}</p></div></div> },
    { key: 'outlet', header: 'Outlet', cell: (row) => <Badge variant="outline">{row.outlet}</Badge> },
    { key: 'category', header: 'Category', cell: (row) => <span className="text-xs text-muted-foreground">{row.category}</span> },
    { key: 'stock', header: 'On hand', sortable: true, align: 'right', cell: (row) => <div className="ml-auto w-28"><div className="mb-1 flex justify-between text-xs"><span className="font-bold">{row.stock}</span><span className="text-muted-foreground">/{row.maximumStock}</span></div><Progress value={(row.stock / row.maximumStock) * 100} indicatorClassName={row.stock <= row.reorderPoint ? 'bg-red-500' : row.stock <= row.reorderPoint * 1.5 ? 'bg-amber-500' : 'bg-primary'} /></div> },
    { key: 'reorderPoint', header: 'Reorder at', align: 'right', cell: (row) => <span className="text-xs font-semibold">{row.reorderPoint}</span> },
    { key: 'cost', header: 'Value', align: 'right', cell: (row) => <div><p className="text-xs font-bold">{formatCurrency(row.stock * row.cost)}</p><p className="text-[10px] text-muted-foreground">{formatCurrency(row.cost)}/{row.unit}</p></div> },
    { key: 'location', header: 'Location', hideOnMobile: true, cell: (row) => <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" /> {row.location} · {row.bin}</span> },
    { key: 'status', header: 'Status', cell: (row) => row.expiry ? <StatusPill status={row.stock <= row.reorderPoint ? 'Critical' : 'Expiring'} /> : <StatusPill status={row.stock <= row.reorderPoint ? 'Critical' : row.stock <= row.reorderPoint * 1.5 ? 'Warning' : 'Available'} /> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">Item master</p><h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-[28px]">Inventory items</h1><p className="mt-1 text-sm text-muted-foreground">Control SKUs, thresholds, batches and storage locations.</p></div><div className="flex gap-2"><Button variant="outline"><ScanLine /> Scan barcode</Button><Button onClick={() => setAddOpen(true)}><Plus /> Add item</Button></div></div>

      <Card className="overflow-visible"><CardContent className="pt-5">
        <DataTable<InventoryItem>
          data={filtered}
          columns={columns}
          searchPlaceholder="Search item, SKU, category…"
          searchKeys={[(row) => row.name, (row) => row.sku, (row) => row.category, (row) => row.location]}
          filename="inventory-items.csv"
          selectable
          onRowClick={setSelectedItem}
          initialSort={{ key: 'name', direction: 'asc' }}
          bulkActions={(ids, clear) => <Button size="sm" variant="outline" onClick={() => { toast.success(`${ids.length} items selected for transfer`, { description: 'Transfer workflow opened with selected SKUs.' }); clear() }}><ArrowUpFromLine /> Transfer</Button>}
          toolbar={<>
            <Select value={outlet} onValueChange={setOutlet}><SelectTrigger className="w-[145px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All outlets</SelectItem><SelectItem value="STORE">Store</SelectItem><SelectItem value="RESTAURANT">Restaurant</SelectItem><SelectItem value="BAR">Bar</SelectItem><SelectItem value="HOUSEKEEPING">Housekeeping</SelectItem></SelectContent></Select>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-[145px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All stock levels</SelectItem><SelectItem value="healthy">Healthy</SelectItem><SelectItem value="low">Low stock</SelectItem><SelectItem value="expiring">Expiring</SelectItem></SelectContent></Select>
          </>}
        />
      </CardContent></Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><Barcode className="size-4" /> Barcode support</div><p className="mt-2 text-sm font-semibold">Every SKU has a unique scannable identifier.</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><RotateCcw className="size-4" /> FIFO batches</div><p className="mt-2 text-sm font-semibold">Expiry-aware picking recommended on every receipt.</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><Pencil className="size-4" /> Audit trail</div><p className="mt-2 text-sm font-semibold">Adjustments require a reason code and actor identity.</p></div>
      </div>

      <ItemDialog open={addOpen} onOpenChange={setAddOpen} />
      <AdjustStockDialog item={selectedItem} onOpenChange={(open) => { if (!open) setSelectedItem(null) }} />
    </div>
  )
}
