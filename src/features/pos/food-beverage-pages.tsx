import { ChefHat, Clock3, Coffee, CreditCard, GlassWater, LayoutGrid, Pencil, Plus, ReceiptText, Send, Store, Trash2, UserRound, UtensilsCrossed } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Label, Textarea } from '@/components/ui/input'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { PageHeader } from '@/components/common/page-header'
import { StatusPill } from '@/components/common/status-pill'
import { tables as seedTables } from '@/mock/data'
import { useHotelStore } from '@/store/hotelStore'
import { useMenuStore } from '@/store/menuStore'
import { MenuImageField } from '@/features/pos/menu-image-field'
import { KitchenAlertWatcher } from '@/features/pos/kitchen-alert'
import { cn, downloadCsv, formatCurrency } from '@/lib/utils'
import type { MenuItem, Order, OrderStatus, RestaurantTable } from '@/types/domain'

const tableStyles: Record<RestaurantTable['status'], string> = { Free: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/40', Seated: 'border-blue-200 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/40', Ordered: 'border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/40', 'Bill requested': 'border-violet-200 bg-violet-50/70 dark:border-violet-900 dark:bg-violet-950/40' }

export function RestaurantTablesPage() {
  const [tableList, setTableList] = useState(seedTables)
  const [editing, setEditing] = useState(false)
  function cycle(tableId: string) { setTableList((current) => current.map((table) => { if (table.id !== tableId) return table; const statuses: RestaurantTable['status'][] = ['Free', 'Seated', 'Ordered', 'Bill requested']; const next = statuses[(statuses.indexOf(table.status) + 1) % statuses.length]; return { ...table, status: next } })) }
  return <div className="space-y-6"><PageHeader title="Restaurant tables" description="Live floor plan, seating status and server ownership." breadcrumbs={[{ label: 'Food & beverage' }, { label: 'Tables' }]} actions={<Button variant={editing ? 'default' : 'outline'} onClick={() => { setEditing((current) => !current); toast.success(editing ? 'Table layout saved' : 'Layout editing enabled', { description: editing ? 'Click a table to change its status.' : 'Click a table to cycle its status.' }) }}><LayoutGrid /> {editing ? 'Save layout' : 'Edit layout'}</Button>} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card className="p-4"><p className="text-xs text-muted-foreground">Total tables</p><p className="mt-1 font-display text-2xl font-extrabold">{tableList.length}</p></Card><Card className="p-4"><p className="text-xs text-muted-foreground">Seated</p><p className="mt-1 font-display text-2xl font-extrabold">{tableList.filter((table) => table.status === 'Seated').length}</p></Card><Card className="p-4"><p className="text-xs text-muted-foreground">Ordered</p><p className="mt-1 font-display text-2xl font-extrabold">{tableList.filter((table) => table.status === 'Ordered').length}</p></Card><Card className="p-4"><p className="text-xs text-muted-foreground">Bill requested</p><p className="mt-1 font-display text-2xl font-extrabold">{tableList.filter((table) => table.status === 'Bill requested').length}</p></Card></div><Card><CardContent className="p-5"><div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">{tableList.map((table) => <button key={table.id} type="button" onClick={() => { if (editing) cycle(table.id) }} className={cn('relative flex aspect-square flex-col items-center justify-center rounded-2xl border-2 p-3 text-center transition', editing && 'hover:-translate-y-0.5 hover:shadow-lg', tableStyles[table.status])}><span className="font-display text-xl font-extrabold">{table.name}</span><span className="mt-1 text-[10px] font-bold opacity-75">{table.seats} seats</span><span className="mt-2 text-[9px] opacity-60">{table.area}</span><span className="absolute right-2 top-2 size-2 rounded-full bg-current opacity-60" /></button>)}</div></CardContent></Card></div>
}

interface MenuDraft {
  name: string
  category: string
  price: string
  cost: string
  description: string
  station: string
  prepMinutes: string
  image: string
  available: boolean
}

const emptyMenuDraft: MenuDraft = {
  name: '', category: 'Mains', price: '', cost: '', description: '', station: 'Kitchen',
  prepMinutes: '10', image: '', available: true,
}

function MenuThumbnail({ src, alt }: { src: string; alt: string }) {
  if (!src) {
    return <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-[9px] font-bold uppercase text-muted-foreground">No image</div>
  }
  return <img src={src} alt={alt} className="size-10 rounded-lg bg-muted object-cover" onError={(event) => { event.currentTarget.style.display = 'none' }} />
}

export function RestaurantMenuPage() {
  const items = useMenuStore((state) => state.items)
  const loading = useMenuStore((state) => state.loading)
  const source = useMenuStore((state) => state.source)
  const load = useMenuStore((state) => state.load)
  const createItem = useMenuStore((state) => state.create)
  const updateItem = useMenuStore((state) => state.update)
  const removeItem = useMenuStore((state) => state.remove)
  const setAvailable = useMenuStore((state) => state.setAvailable)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [draft, setDraft] = useState<MenuDraft>(emptyMenuDraft)
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<MenuItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { void load() }, [load])

  const restaurantItems = useMemo(() => items.filter((item) => item.outlet === 'RESTAURANT'), [items])

  function openCreate() {
    setEditing(null)
    setDraft(emptyMenuDraft)
    setEditorOpen(true)
  }

  function openEdit(item: MenuItem) {
    setEditing(item)
    setDraft({
      name: item.name ?? '',
      category: item.category ?? 'Mains',
      price: item.price === undefined ? '' : String(item.price),
      cost: item.cost === undefined ? '' : String(item.cost),
      description: item.description ?? '',
      station: item.station ?? 'Kitchen',
      prepMinutes: item.prepMinutes === undefined ? '10' : String(item.prepMinutes),
      image: item.image ?? '',
      available: item.available ?? true,
    })
    setEditorOpen(true)
  }

  async function saveItem() {
    const name = draft.name.trim()
    if (name.length < 2) { toast.error('Enter the name of the menu item'); return }
    const price = Number(draft.price)
    if (!Number.isFinite(price) || price <= 0) { toast.error('Enter a price greater than zero'); return }
    const image = draft.image.trim()
    if (!image) { toast.error('Add an image for the menu item', { description: 'Paste an image link or upload a photo.' }); return }

    const payload: MenuItem = {
      id: editing?.id ?? `menu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      category: draft.category.trim() || 'Mains',
      outlet: 'RESTAURANT',
      price,
      cost: Number(draft.cost) || 0,
      available: draft.available,
      image,
      description: draft.description.trim(),
      station: draft.station.trim() || 'Kitchen',
      prepMinutes: Number(draft.prepMinutes) || 10,
      ageRestricted: editing?.ageRestricted ?? false,
      recipe: editing?.recipe ?? [],
    }

    setSaving(true)
    try {
      const result = editing ? await updateItem(payload) : await createItem(payload)
      toast.success(editing ? 'Menu item updated' : 'Menu item added', {
        description: result.persisted
          ? `${result.item.name} · ${formatCurrency(result.item.price)}`
          : `${result.item.name} was saved in this browser only — the menu server could not be reached.`,
      })
      setEditorOpen(false)
      setEditing(null)
      setDraft(emptyMenuDraft)
    } finally {
      setSaving(false)
    }
  }

  async function toggleAvailability(item: MenuItem) {
    await setAvailable(item.id, !item.available)
    toast.success(`${item.name} ${item.available ? 'paused' : 'is available again'}`, {
      description: item.available ? 'Guests can no longer order it.' : 'Guests can order it again.',
    })
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const persisted = await removeItem(pendingDelete.id)
      toast.success('Menu item deleted', {
        description: persisted
          ? `${pendingDelete.name} was removed from the menu.`
          : `${pendingDelete.name} was removed from this browser only — the menu server could not be reached.`,
      })
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const columns: DataTableColumn<MenuItem>[] = [
    {
      key: 'name', header: 'Item', sortable: true,
      cell: (row) => <div className="flex min-w-[210px] items-center gap-3"><MenuThumbnail src={row.image} alt={row.name} /><div><p className="font-bold">{row.name}</p><p className="text-[10px] text-muted-foreground">{row.category} · {row.station}</p></div></div>,
    },
    { key: 'price', header: 'Price', align: 'right', sortable: true, cell: (row) => <span className="text-xs font-bold">{formatCurrency(row.price)}</span> },
    { key: 'cost', header: 'Food cost', align: 'right', cell: (row) => <span className="text-xs font-bold">{row.price > 0 ? Math.round((row.cost / row.price) * 100) : 0}%</span> },
    { key: 'prepMinutes', header: 'Prep', align: 'right', cell: (row) => <span className="text-xs">{row.prepMinutes} min</span> },
    {
      key: 'available', header: 'Availability',
      cell: (row) => <button type="button" onClick={() => void toggleAvailability(row)} aria-label={`Toggle availability for ${row.name}`}><StatusPill status={row.available ? 'Available' : 'Out of Order'} /></button>,
    },
    {
      key: 'actions', header: 'Actions', align: 'right',
      cell: (row) => <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(row)} aria-label={`Edit ${row.name}`}><Pencil /> Edit</Button><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setPendingDelete(row)} aria-label={`Delete ${row.name}`}><Trash2 /> Delete</Button></div>,
    },
  ]

  return <div className="space-y-6">
    <PageHeader
      title="Restaurant menu"
      description="Manage menu items, images, pricing, station routing and availability."
      breadcrumbs={[{ label: 'Food & beverage' }, { label: 'Restaurant menu' }]}
      actions={<>
        <Button variant="outline" onClick={() => { downloadCsv('restaurant-menu-template.csv', [{ code: 'ITEM-CODE', name: 'Item name', category: 'Category', price: '0.00', station: 'Kitchen', prepMinutes: '10' }]); toast.success('Menu template downloaded') }}><Store /> Templates</Button>
        <Button onClick={openCreate}><Plus /> Add item</Button>
      </>}
    />

    {source === 'local' && (
      <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        The menu server could not be reached, so this list is running from the browser copy. Changes are kept here until the server is available.
      </p>
    )}

    <Card>
      <CardContent className="pt-5">
        <DataTable
          data={restaurantItems}
          columns={columns}
          searchPlaceholder="Search menu item…"
          searchKeys={[(row) => row.name, (row) => row.category, (row) => row.station]}
          pageSize={10}
          filename="restaurant-menu.csv"
          selectable
        />
        {loading && <p className="mt-3 text-[11px] text-muted-foreground">Loading the live menu…</p>}
      </CardContent>
    </Card>

    <Dialog open={editorOpen} onOpenChange={(open) => { if (!open && !saving) { setEditorOpen(false); setEditing(null) } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add menu item'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Update the name, image, pricing or station for this item.'
              : 'Give the dish a name and a picture so it looks right on the menu and the in-room QR code.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="menu-name">Menu item name</Label>
            <Input id="menu-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Truffle Burrata" autoComplete="off" />
          </div>

          <MenuImageField value={draft.image} onChange={(image) => setDraft({ ...draft, image })} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="menu-category">Category</Label>
              <Input id="menu-category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="Starters" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="menu-station">Station</Label>
              <Input id="menu-station" value={draft.station} onChange={(event) => setDraft({ ...draft, station: event.target.value })} placeholder="Hot" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="menu-price">Price</Label>
              <Input id="menu-price" type="number" min={0} step="0.01" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="menu-cost">Food cost</Label>
              <Input id="menu-cost" type="number" min={0} step="0.01" value={draft.cost} onChange={(event) => setDraft({ ...draft, cost: event.target.value })} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="menu-prep">Prep (min)</Label>
              <Input id="menu-prep" type="number" min={0} value={draft.prepMinutes} onChange={(event) => setDraft({ ...draft, prepMinutes: event.target.value })} placeholder="10" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="menu-description">Description</Label>
            <Textarea id="menu-description" rows={2} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Heirloom tomato, basil oil, aged balsamic" />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" checked={draft.available} onChange={(event) => setDraft({ ...draft, available: event.target.checked })} className="size-4 rounded border-border" />
            Available for ordering
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setEditorOpen(false); setEditing(null) }} disabled={saving}>Cancel</Button>
          <Button onClick={() => void saveItem()} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add item'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => { if (!open && !deleting) setPendingDelete(null) }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {pendingDelete?.name}?</DialogTitle>
          <DialogDescription>This removes the item from the restaurant menu and from the in-room QR menu. This cannot be undone.</DialogDescription>
        </DialogHeader>
        {pendingDelete && (
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <MenuThumbnail src={pendingDelete.image} alt={pendingDelete.name} />
            <div>
              <p className="text-sm font-bold">{pendingDelete.name}</p>
              <p className="text-[11px] text-muted-foreground">{pendingDelete.category} · {formatCurrency(pendingDelete.price)}</p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={deleting}>Keep item</Button>
          <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete item'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}

export function RestaurantOrdersPage() {
  const orders = useHotelStore((state) => state.orders)
  const columns: DataTableColumn<Order>[] = [
    { key: 'orderNumber', header: 'Order', sortable: true, cell: (row) => <span className="font-mono text-xs font-bold">{row.orderNumber}</span> },
    { key: 'type', header: 'Type', cell: (row) => <Badge variant="outline">{row.type}</Badge> },
    { key: 'tableName', header: 'Table', cell: (row) => <span className="text-xs font-bold">{row.tableName ?? row.roomNumber ?? '—'}</span> },
    { key: 'server', header: 'Server', cell: (row) => <span className="text-xs">{row.server}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusPill status={row.status} /> },
    { key: 'paymentStatus', header: 'Payment', cell: (row) => <StatusPill status={row.paymentStatus} /> },
    { key: 'total', header: 'Total', align: 'right', cell: (row) => <span className="text-xs font-bold">{formatCurrency(row.total)}</span> },
  ]
  return <div className="space-y-6"><PageHeader title="Restaurant orders" description="Review order history, payment status and outlet performance." breadcrumbs={[{ label: 'Food & beverage' }, { label: 'Orders' }]} actions={<Button variant="outline" onClick={() => { const rows = orders.filter((order) => order.outlet === 'RESTAURANT'); downloadCsv('restaurant-orders.csv', rows.map((order) => ({ order: order.orderNumber, type: order.type, table: order.tableName ?? '', server: order.server, status: order.status, payment: order.paymentStatus, total: order.total, date: order.createdAt }))); toast.success('Orders exported', { description: `${rows.length} orders written to CSV` }) }}><ReceiptText /> Export</Button>} /><Card><CardContent className="pt-5"><DataTable data={orders.filter((order) => order.outlet === 'RESTAURANT')} columns={columns} searchPlaceholder="Search order, table or server…" searchKeys={[(row) => row.orderNumber, (row) => row.tableName ?? '', (row) => row.server, (row) => row.guestName ?? '']} initialSort={{ key: 'orderNumber', direction: 'desc' }} pageSize={10} filename="restaurant-orders.csv" /></CardContent></Card></div>
}

const kdsColumns: OrderStatus[] = ['New', 'Preparing', 'Ready']

export function KitchenDisplayPage({ outlet = 'RESTAURANT' }: { outlet?: 'RESTAURANT' | 'BAR' }) {
  const orders = useHotelStore((state) => state.orders)
  const updateStatus = useHotelStore((state) => state.updateOrderStatus)
  const isBar = outlet === 'BAR'

  return (
    <div className="space-y-6">
      <PageHeader
        title={isBar ? 'Bar display' : 'Kitchen display'}
        description="Live tickets by station and preparation status."
        breadcrumbs={[{ label: 'Food & beverage' }, { label: isBar ? 'Bar KDS' : 'Kitchen display' }]}
        actions={<Badge variant="success" className="px-3 py-1.5"><span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-current" /> Live tickets</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {kdsColumns.map((status) => {
          const tickets = orders.filter((order) => order.outlet === outlet && order.status === status)
          return (
            <Card key={status} className="min-h-[520px] bg-muted/25">
              <div className="flex items-center justify-between border-b border-border p-4">
                <div className="flex items-center gap-2">
                  <span className={cn('size-2.5 rounded-full', status === 'New' ? 'bg-red-500' : status === 'Preparing' ? 'bg-amber-500' : 'bg-emerald-500')} />
                  <h3 className="font-display font-bold">{status}</h3>
                </div>
                <Badge variant="secondary">{tickets.length}</Badge>
              </div>
              <CardContent className="space-y-3 pt-4">
                {tickets.map((order) => (
                  <div key={order.id} className="rounded-xl border border-border bg-card p-4 shadow-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-sm font-extrabold">{order.orderNumber}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {order.roomNumber ? `Room ${order.roomNumber}` : order.tableName ?? order.type} &middot; {order.server}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                        <Clock3 className="size-3" /> {Math.max(1, Math.floor((Date.now() - new Date(order.createdAt || Date.now()).getTime()) / 60000))}m
                      </span>
                    </div>
                    <div className="my-3 space-y-2 border-y border-border py-3">
                      {(order.items ?? []).map((item) => (
                        <div key={item.id} className="text-xs">
                          <div className="flex justify-between font-bold">
                            <span><span className="mr-2 text-primary">{item.quantity}&times;</span>{item.name}</span>
                            <span>{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                          {item.modifiers.map((modifier) => (
                            <p key={modifier} className="ml-7 mt-0.5 text-[10px] font-semibold text-red-600">+ {modifier}</p>
                          ))}
                        </div>
                      ))}
                    </div>
                    {order.instructions && (
                      <p className="mb-3 rounded-lg bg-amber-50 p-2 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        Note: {order.instructions}
                      </p>
                    )}
                    <Button
                      className="w-full"
                      size="sm"
                      variant={status === 'Ready' ? 'default' : 'outline'}
                      onClick={() => {
                        const next = status === 'New' ? 'Preparing' : status === 'Preparing' ? 'Ready' : 'Served'
                        updateStatus(order.id, next)
                        toast.success(`${order.orderNumber} &rarr; ${next}`)
                      }}
                    >
                      {status === 'New' ? <ChefHat /> : status === 'Preparing' ? <UtensilsCrossed /> : <Send />}
                      {status === 'New' ? 'Start preparation' : status === 'Preparing' ? 'Mark ready' : 'Mark served'}
                    </Button>
                  </div>
                ))}
                {!tickets.length && (
                  <div className="flex min-h-40 flex-col items-center justify-center text-center">
                    <Checkmark />
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">No tickets</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <KitchenAlertWatcher outlet={outlet} />
    </div>
  )
}
function Checkmark() { return <div className="flex size-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60"><ChefHat className="size-4" /></div> }

export function BarTabsPage() {
  const orders = useHotelStore((state) => state.orders)
  const addOrder = useHotelStore((state) => state.addOrder)
  const [newOpen, setNewOpen] = useState(false)
  const [settled, setSettled] = useState<string[]>([])
  const [transferred, setTransferred] = useState<string[]>([])
  const [draft, setDraft] = useState({ guestName: '', room: '', amount: '0' })
  const tabs = orders.filter((order) => order.outlet === 'BAR' && order.paymentStatus !== 'Paid' && !settled.includes(order.id))

  function openTab() {
    const amount = Number(draft.amount) || 0
    if (amount <= 0) { toast.error('Enter an opening amount greater than zero'); return }
    const order: Order = {
      id: `order-${Date.now()}`, orderNumber: `B-${Math.floor(3000 + Math.random() * 6000)}`,
      outlet: 'BAR', type: 'Dine-in', status: 'New',
      items: [{ id: `line-${Date.now()}`, menuItemId: 'opening-balance', name: 'Tab opening balance', quantity: 1, price: amount, modifiers: [], station: 'Bar' }],
      guestName: draft.guestName || undefined, roomNumber: draft.room || undefined,
      server: 'Bar team', createdAt: new Date().toISOString(),
      subtotal: amount, discount: 0, tax: 0, tip: 0, total: amount,
      paymentStatus: 'Unpaid', source: 'POS',
    }
    addOrder(order)
    toast.success('Bar tab opened', { description: `${order.orderNumber} · ${formatCurrency(amount)}` })
    setNewOpen(false)
    setDraft({ guestName: '', room: '', amount: '0' })
  }
  return <div className="space-y-6"><PageHeader title="Bar tabs" description="Running balances, room transfers and settlement controls." breadcrumbs={[{ label: 'Food & beverage' }, { label: 'Bar tabs' }]} actions={<Button onClick={() => setNewOpen(true)}><Plus /> New tab</Button>} /><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Card className="p-4"><GlassWater className="size-4 text-primary" /><p className="mt-2 font-display text-2xl font-extrabold">{tabs.length}</p><p className="text-xs text-muted-foreground">Open tabs</p></Card><Card className="p-4"><CreditCard className="size-4 text-blue-500" /><p className="mt-2 font-display text-2xl font-extrabold">{formatCurrency(tabs.reduce((sum, tab) => sum + tab.total, 0))}</p><p className="text-xs text-muted-foreground">Running balance</p></Card><Card className="p-4"><Coffee className="size-4 text-amber-500" /><p className="mt-2 font-display text-2xl font-extrabold">4</p><p className="text-xs text-muted-foreground">Room transfers</p></Card><Card className="p-4"><UserRound className="size-4 text-violet-500" /><p className="mt-2 font-display text-2xl font-extrabold">3</p><p className="text-xs text-muted-foreground">Guest tabs</p></Card></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tabs.map((tab) => <Card key={tab.id}><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="font-mono text-xs font-bold text-primary">{tab.orderNumber}</p><h3 className="mt-1 font-display font-bold">{tab.guestName ?? tab.tableName ?? `Bar · ${tab.server}`}</h3></div><StatusPill status={tab.paymentStatus} /></div><div className="my-4 space-y-1 text-xs">{(tab.items ?? []).map((item) => <div key={item.id} className="flex justify-between"><span className="text-muted-foreground">{item.quantity}× {item.name}</span><span>{formatCurrency(item.price * item.quantity)}</span></div>)}</div><div className="flex items-center justify-between border-t border-border pt-3"><span className="text-xs text-muted-foreground">Running balance</span><span className="font-display text-lg font-extrabold">{formatCurrency(tab.total)}</span></div><div className="mt-4 grid grid-cols-2 gap-2"><Button size="sm" variant="outline" onClick={() => { setTransferred((current) => [...current, tab.id]); toast.success('Tab transferred to room', { description: `${tab.orderNumber} moved to the guest folio.` }) }}>{transferred.includes(tab.id) ? 'Transferred ✓' : 'Transfer to room'}</Button><Button size="sm" onClick={() => { setSettled((current) => [...current, tab.id]); toast.success('Tab settled', { description: `${formatCurrency(tab.total)} paid by card.` }) }}>Settle</Button></div></CardContent></Card>)}</div>
    <Dialog open={newOpen} onOpenChange={setNewOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Open a bar tab</DialogTitle><DialogDescription>Start a running tab for a guest or room.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="tab-guest">Guest name</Label><Input id="tab-guest" value={draft.guestName} onChange={(event) => setDraft({ ...draft, guestName: event.target.value })} placeholder="Optional" /></div>
          <div className="space-y-1.5"><Label htmlFor="tab-room">Room number</Label><Input id="tab-room" value={draft.room} onChange={(event) => setDraft({ ...draft, room: event.target.value })} placeholder="Optional" /></div>
          <div className="space-y-1.5"><Label htmlFor="tab-amount">Opening amount</Label><Input id="tab-amount" type="number" min={1} value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button><Button onClick={openTab}>Open tab</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
}
