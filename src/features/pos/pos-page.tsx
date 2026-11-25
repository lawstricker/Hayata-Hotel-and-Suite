import { motion } from 'framer-motion'
import { Banknote, CreditCard, ExternalLink, Minus, Plus, ReceiptText, Search, ShoppingBag, Split, Trash2, UserCheck, UserRound, Wine } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { roleLabels } from '@/lib/permission-data'
import { processPayment, recordTransaction } from '@/lib/payment-gateway'
import { cn, formatCurrency } from '@/lib/utils'
import { demoUsers, menuItems, tables } from '@/mock/data'
import { useHotelStore } from '@/store/hotelStore'
import { eligibleStaffFor, sessionTotals, usePosDisplayStore, type PosOutlet } from '@/store/posDisplayStore'
import { usePaymentGatewayStore } from '@/store/paymentGatewayStore'
import { useStaffStore } from '@/store/staffStore'
import type { MenuItem, Order, OrderType } from '@/types/domain'

function ModifierDialog({ item, onClose, onAdd }: { item: MenuItem | null; onClose: () => void; onAdd: (item: MenuItem, modifiers: string[], quantity: number) => void }) {
  const [modifiers, setModifiers] = useState<string[]>([])
  const [quantity, setQuantity] = useState(1)
  const [idVerified, setIdVerified] = useState(false)
  if (!item) return null
  const options = item.outlet === 'BAR' ? ['No ice', 'Extra lime', 'Double shot', 'Decant'] : ['No onions', 'Extra cheese', 'Sauce on side', 'Gluten-free']
  function toggle(option: string) { setModifiers((current) => current.includes(option) ? current.filter((value) => value !== option) : [...current, option]) }
  return <Dialog open={Boolean(item)} onOpenChange={(open) => { if (!open) { onClose(); setModifiers([]); setQuantity(1) } }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Customize {item.name}</DialogTitle><DialogDescription>{item.description}</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Modifiers</Label><div className="grid grid-cols-2 gap-2">{options.map((option) => <button key={option} type="button" onClick={() => toggle(option)} className={cn('rounded-lg border px-3 py-2 text-left text-xs font-semibold transition', modifiers.includes(option) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-muted')}>{option}</button>)}</div></div><div className="flex items-center justify-between"><Label>Quantity</Label><div className="flex items-center gap-2"><Button size="icon-sm" variant="outline" onClick={() => setQuantity((current) => Math.max(1, current - 1))}><Minus /></Button><span className="w-6 text-center font-bold">{quantity}</span><Button size="icon-sm" variant="outline" onClick={() => setQuantity((current) => current + 1)}><Plus /></Button></div></div>{item.ageRestricted && <button type="button" onClick={() => setIdVerified((current) => !current)} className={cn('flex w-full items-center gap-3 rounded-lg border p-3 text-left', idVerified ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40' : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40')}><UserCheck className="size-4" /><span className="text-xs font-bold">{idVerified ? 'Age verified for this order' : 'Confirm guest is 21 or over'}</span></button>}</div><DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={item.ageRestricted && !idVerified} onClick={() => { onAdd(item, modifiers, quantity); setModifiers([]); setQuantity(1) }}><Plus /> Add to order</Button></DialogFooter></DialogContent></Dialog>
}

export function PosPage({ outlet }: { outlet: PosOutlet }) {
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card'>('Card')
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' })
  const [splitOpen, setSplitOpen] = useState(false)
  const [splitCount, setSplitCount] = useState(2)

  const session = usePosDisplayStore((state) => state.sessions[outlet])
  const updateSession = usePosDisplayStore((state) => state.updateSession)
  const setAssignment = usePosDisplayStore((state) => state.setAssignment)
  const completeOrder = usePosDisplayStore((state) => state.completeOrder)
  const addedStaff = useStaffStore((state) => state.addedStaff)
  const staffEdits = useStaffStore((state) => state.edits)
  const { settings: paymentSettings } = usePaymentGatewayStore()
  const addOrder = useHotelStore((state) => state.addOrder)

  const allStaffList = useMemo(() => [...addedStaff, ...demoUsers].map((user) => staffEdits[user.id] ?? user), [addedStaff, staffEdits])
  const eligibleStaff = useMemo(() => eligibleStaffFor(outlet, allStaffList), [outlet, allStaffList])
  const rolesInSection = [...new Set(eligibleStaff.map((user) => user.role))]
  const items = menuItems.filter((item) => item.outlet === outlet)
  const categories = ['All', ...new Set(items.map((item) => item.category))]
  const filteredItems = items.filter((item) => (category === 'All' || item.category === category) && (!query || `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase())))
  const { subtotal, tax, total } = useMemo(() => sessionTotals(session), [session])
  const selectedTable = tables.find((table) => table.id === session.tableId)

  function addToCart(menuItem: MenuItem, modifiers: string[], quantity: number) {
    updateSession(outlet, (current) => {
      const existing = current.lines.find((line) => line.menuItemId === menuItem.id && line.modifiers.join(',') === modifiers.join(','))
      const lines = existing
        ? current.lines.map((line) => line.id === existing.id ? { ...line, quantity: line.quantity + quantity } : line)
        : [...current.lines, { id: `line-${Date.now()}-${menuItem.id}`, menuItemId: menuItem.id, name: menuItem.name, quantity, price: menuItem.price, modifiers, station: menuItem.station }]
      return { ...current, lines }
    })
    setSelectedItem(null)
    toast.success(`${menuItem.name} added`, { description: `${quantity} × ${formatCurrency(menuItem.price)}` })
  }
  function changeQuantity(id: string, delta: number) {
    updateSession(outlet, (current) => ({ ...current, lines: current.lines.flatMap((line) => line.id === id ? (line.quantity + delta <= 0 ? [] : [{ ...line, quantity: line.quantity + delta }]) : [line]) }))
  }
  function removeLine(id: string) {
    updateSession(outlet, (current) => ({ ...current, lines: current.lines.filter((line) => line.id !== id) }))
  }
  function openDisplay() {
    window.open(`/display/${outlet.toLowerCase()}`, '_blank', 'noopener,noreferrer')
    toast.info('Guest display opened', { description: 'Keep this POS open — new items appear on the display instantly.' })
  }
  async function checkout() {
    const current = usePosDisplayStore.getState().sessions[outlet]
    if (!current.lines.length) return
    const totals = sessionTotals(current)
    const table = tables.find((candidate) => candidate.id === current.tableId)
    const request = {
      amount: totals.total,
      email: 'pos@hayatahotel.com',
      description: `${outlet === 'BAR' ? 'Bar' : 'Restaurant'} order · ${table?.name ?? current.orderType}`,
      referenceHint: outlet === 'BAR' ? 'BAR' : 'POS',
      method: paymentMethod,
      card: paymentMethod === 'Card' ? card : undefined,
    }
    const result = await processPayment(request, paymentSettings)
    recordTransaction(result, request)
    if (!result.ok) {
      toast.error('Payment declined', { description: result.message })
      return
    }
    const order: Order = {
      id: `order-${Date.now()}`,
      orderNumber: `${outlet === 'BAR' ? 'B' : 'R'}-${Math.floor(2000 + Math.random() * 7000)}`,
      outlet,
      tableId: table?.id,
      tableName: table?.name,
      type: current.orderType,
      status: 'New',
      items: current.lines,
      server: current.server?.name ?? 'Unassigned',
      createdAt: new Date().toISOString(),
      subtotal: totals.subtotal,
      discount: current.discount,
      tax: totals.tax,
      tip: current.tip,
      total: totals.total,
      paymentStatus: 'Paid',
      source: 'POS',
    }
    addOrder(order)
    completeOrder(outlet)
    toast.success('Payment completed', { description: `${order.orderNumber} · ${formatCurrency(totals.total)} via ${result.provider === 'demo' ? 'demo' : paymentMethod} · ${result.reference}` })
  }

  return (
    <div className="grid min-h-[calc(100vh-135px)] gap-4 xl:grid-cols-[1fr_390px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold">{outlet === 'BAR' ? 'Bar POS' : 'Restaurant POS'}</h1>
              <Badge variant="success">Live</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{outlet === 'BAR' ? 'Fast, compliant bar service with age verification.' : 'Order, modify and serve every table in real time.'}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search menu…" className="pl-9" />
            </div>
            <Button variant="outline" onClick={openDisplay} className="shrink-0"><ExternalLink /> Guest display</Button>
          </div>
        </div>

        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="flex h-auto w-full justify-start overflow-x-auto p-1">{categories.map((item) => <TabsTrigger key={item} value={item} className="shrink-0">{item}</TabsTrigger>)}</TabsList>
        </Tabs>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {filteredItems.map((item) => (
            <motion.button layout key={item.id} type="button" whileHover={{ y: -3 }} onClick={() => setSelectedItem(item)} className="group overflow-hidden rounded-xl border border-border bg-card text-left shadow-card transition-shadow hover:shadow-lg">
              <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-teal-100 to-slate-100 dark:from-teal-950 dark:to-slate-900">
                <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                <span className="absolute left-2 top-2 rounded-md bg-white/90 px-1.5 py-1 text-[9px] font-bold text-slate-700 shadow-sm backdrop-blur">{item.station}</span>
                {item.ageRestricted && <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-md bg-amber-500 text-white"><Wine className="size-3" /></span>}
                {!item.available && <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-xs font-bold text-white">Unavailable</span>}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2"><p className="line-clamp-1 text-sm font-bold">{item.name}</p><p className="shrink-0 font-display text-sm font-extrabold text-primary">{formatCurrency(item.price)}</p></div>
                <p className="mt-1 line-clamp-2 min-h-8 text-[10px] leading-relaxed text-muted-foreground">{item.description}</p>
                <div className="mt-2 flex items-center justify-between text-[9px] font-semibold text-muted-foreground"><span>{item.prepMinutes} min</span><span>{item.cost > 0 ? `${Math.round((1 - item.cost / item.price) * 100)}% margin` : ''}</span></div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <Card className="flex h-[calc(100vh-135px)] min-h-[620px] flex-col overflow-hidden xl:sticky xl:top-[89px]">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <p className="font-display font-bold">Current order</p>
            <p className="text-[10px] text-muted-foreground">{selectedTable?.name ?? session.orderType} · {session.lines.length} lines · {session.server?.name ?? 'Unassigned'}</p>
          </div>
          <Badge variant="outline">{session.orderType}</Badge>
        </div>

        <div className="space-y-2 border-b border-border p-3">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <UserRound className="size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned section server</p>
                  <p className="truncate text-xs font-bold">{session.server?.name ?? 'No server selected'}</p>
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0">{session.server?.roleLabel ?? 'Unassigned'}</Badge>
            </div>
            <select
              value={session.server?.userId ?? ''}
              onChange={(event) => setAssignment(outlet, eligibleStaff.find((user) => user.id === event.target.value) ?? null)}
              aria-label="Assign a user to this section"
              className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-2 text-xs font-semibold"
            >
              <option value="">Unassigned</option>
              {rolesInSection.map((role) => (
                <optgroup key={role} label={roleLabels[role]}>
                  {eligibleStaff.filter((user) => user.role === role).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={session.orderType} onChange={(event) => updateSession(outlet, (current) => ({ ...current, orderType: event.target.value as OrderType }))} className="h-9 rounded-lg border border-input bg-background px-2 text-xs font-semibold"><option>Dine-in</option><option>Takeaway</option><option>Room service</option></select>
            {outlet === 'RESTAURANT' && <select value={session.tableId} onChange={(event) => updateSession(outlet, (current) => ({ ...current, tableId: event.target.value }))} className="h-9 rounded-lg border border-input bg-background px-2 text-xs font-semibold"><option value="">No table</option>{tables.map((table) => <option key={table.id} value={table.id}>{table.name} · {table.seats} seats</option>)}</select>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {session.lines.length === 0 ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted"><ShoppingBag className="size-5 text-muted-foreground" /></div>
              <p className="mt-4 text-sm font-bold">Order is empty</p>
              <p className="mt-1 text-xs text-muted-foreground">Tap a menu item to start an order.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {session.lines.map((line) => (
                <div key={line.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold">{line.name}</p>
                      {line.modifiers.length > 0 && <p className="mt-0.5 text-[10px] text-primary">{line.modifiers.join(' · ')}</p>}
                      <p className="mt-1 text-[10px] font-semibold text-muted-foreground">{formatCurrency(line.price)} each</p>
                    </div>
                    <span className="text-xs font-extrabold">{formatCurrency(line.price * line.quantity)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button size="icon-sm" variant="outline" onClick={() => changeQuantity(line.id, -1)}><Minus /></Button>
                      <span className="w-6 text-center text-xs font-bold">{line.quantity}</span>
                      <Button size="icon-sm" variant="outline" onClick={() => changeQuantity(line.id, 1)}><Plus /></Button>
                    </div>
                    <button type="button" onClick={() => removeLine(line.id)} className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${line.name}`}><Trash2 className="size-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border p-4">
          <div className="mb-3 grid grid-cols-3 gap-1">
            <Button size="sm" variant="outline" onClick={() => setSplitOpen(true)}><Split /> Split</Button>
            <Button size="sm" variant="outline" onClick={() => updateSession(outlet, (current) => ({ ...current, discount: Math.round(subtotal * 0.1 * 100) / 100 }))}>10% off</Button>
            <Button size="sm" variant="outline" onClick={() => updateSession(outlet, (current) => ({ ...current, tip: Math.round(subtotal * 0.15 * 100) / 100 }))}>15% tip</Button>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            {session.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>−{formatCurrency(session.discount)}</span></div>}
            <div className="flex justify-between text-muted-foreground"><span>Tax (8%)</span><span>{formatCurrency(tax)}</span></div>
            {session.tip > 0 && <div className="flex justify-between text-muted-foreground"><span>Tip</span><span>{formatCurrency(session.tip)}</span></div>}
            <div className="flex justify-between border-t border-border pt-2 font-display text-base font-extrabold"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setPaymentMethod('Cash')} className={paymentMethod === 'Cash' ? 'border-primary bg-primary/5' : ''}><Banknote /> Cash</Button>
            <Button variant="outline" onClick={() => setPaymentMethod('Card')} className={paymentMethod === 'Card' ? 'border-primary bg-primary/5' : ''}><CreditCard /> Card</Button>
          </div>
          {paymentMethod === 'Card' && (
            <div className="mt-3 space-y-2 rounded-xl border border-border p-3">
              <Input value={card.name} onChange={(event) => setCard({ ...card, name: event.target.value })} placeholder="Name on card" aria-label="Name on card" />
              <Input value={card.number} onChange={(event) => setCard({ ...card, number: event.target.value })} placeholder="4242 4242 4242 4242" inputMode="numeric" aria-label="Card number" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={card.expiry} onChange={(event) => setCard({ ...card, expiry: event.target.value })} placeholder="12/28" aria-label="Expiry" />
                <Input value={card.cvc} onChange={(event) => setCard({ ...card, cvc: event.target.value })} placeholder="CVC" aria-label="CVC" />
              </div>
              <p className="text-[10px] text-muted-foreground">Demo gateway only — no real charge is made.</p>
            </div>
          )}
          <Button className="mt-2 w-full" size="lg" disabled={!session.lines.length} onClick={checkout}><ReceiptText /> Pay {formatCurrency(total)}</Button>
        </div>
      </Card>

      <ModifierDialog item={selectedItem} onClose={() => setSelectedItem(null)} onAdd={addToCart} />
      <Dialog open={splitOpen} onOpenChange={setSplitOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Split bill</DialogTitle><DialogDescription>Split the current total evenly across guests.</DialogDescription></DialogHeader>
          <div className="space-y-1.5"><Label>Number of shares</Label><Input type="number" min={2} max={20} value={splitCount} onChange={(event) => setSplitCount(Number(event.target.value))} /></div>
          <div className="rounded-lg bg-muted p-3 text-center"><p className="text-xs text-muted-foreground">Each guest pays</p><p className="font-display text-2xl font-extrabold">{formatCurrency(total / Math.max(1, splitCount))}</p></div>
          <DialogFooter><Button variant="outline" onClick={() => setSplitOpen(false)}>Cancel</Button><Button onClick={() => { toast.success('Bill split', { description: `${splitCount} equal shares created.` }); setSplitOpen(false) }}>Split bill</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
