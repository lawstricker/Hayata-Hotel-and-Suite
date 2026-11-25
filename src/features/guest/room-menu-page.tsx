import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChefHat, Clock3, Minus, Plus, QrCode, Search, Send, ShoppingBag, Trash2, UtensilsCrossed } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Label, Textarea } from '@/components/ui/input'
import { StatusPill } from '@/components/common/status-pill'
import { findActiveRoomStay } from '@/lib/room-menu'
import { menuItems } from '@/mock/data'
import { useHotelStore } from '@/store/hotelStore'
import { usePrinterStore } from '@/store/printerStore'
import { dispatchKitchenPrint } from '@/lib/thermal-printer'
import { cn, formatCurrency } from '@/lib/utils'
import type { MenuItem, Order, OrderItem } from '@/types/domain'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function UnavailableRoom({ roomNumber }: { roomNumber: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card shadow-card">
        <CardContent className="space-y-4 p-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><QrCode className="size-6" /></div>
          <div>
            <h1 className="font-display text-xl font-extrabold">Menu unavailable</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Code for room {roomNumber || '—'} is not linked to an active checked-in stay. Please ask reception to issue a fresh in-room dining code.
            </p>
          </div>
          <div className="rounded-lg border border-dashed border-border bg-muted/35 p-3 text-left text-[11px] text-muted-foreground">
            Scan the QR card placed in your room. A new code is generated automatically each time you check in.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function RoomMenuPage() {
  const { roomNumber = '' } = useParams()
  const rooms = useHotelStore((state) => state.rooms)
  const reservations = useHotelStore((state) => state.reservations)
  const orders = useHotelStore((state) => state.orders)
  const addOrder = useHotelStore((state) => state.addOrder)
  const printerSettings = usePrinterStore((state) => state.settings)
  const enqueuePrintJob = usePrinterStore((state) => state.enqueueJob)

  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<OrderItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null)
  const [placedEta, setPlacedEta] = useState(0)

  const stay = useMemo(
    () => findActiveRoomStay(rooms, reservations, roomNumber),
    [rooms, reservations, roomNumber],
  )

  const menu = useMemo(() => menuItems.filter((item) => item.outlet === 'RESTAURANT' && item.available), [])
  const categories = useMemo(() => ['All', ...new Set(menu.map((item) => item.category))], [menu])
  const filtered = useMemo(() => menu.filter((item) => (
    (category === 'All' || item.category === category)
    && (!query || `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase()))
  )), [menu, category, query])

  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0)
  const tax = Math.round(subtotal * 0.08 * 100) / 100
  const total = Math.round((subtotal + tax) * 100) / 100
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0)
  const roomOrders = stay ? orders.filter((order) => order.roomNumber === stay.room.number && order.source === 'ROOM_SERVICE') : []

  if (!stay) return <UnavailableRoom roomNumber={roomNumber} />

  const guestFirstName = stay.reservation.guestName.split(' ')[0] ?? 'Guest'

  function addToCart(item: MenuItem) {
    setCart((current) => {
      const existing = current.find((line) => line.menuItemId === item.id)
      if (existing) return current.map((line) => line.id === existing.id ? { ...line, quantity: line.quantity + 1 } : line)
      return [...current, {
        id: `rs-line-${Date.now()}-${item.id}`,
        menuItemId: item.id,
        name: item.name,
        quantity: 1,
        price: item.price,
        modifiers: [],
        station: item.station,
      }]
    })
    toast.success(`${item.name} added`, { description: `${formatCurrency(item.price)} · ${item.prepMinutes} min prep` })
  }

  function changeQuantity(id: string, delta: number) {
    setCart((current) => current.flatMap((line) => line.id === id ? (line.quantity + delta <= 0 ? [] : [{ ...line, quantity: line.quantity + delta }]) : [line]))
  }

  function placeOrder() {
    if (!stay || !cart.length) return
    const eta = Math.max(15, ...cart.map((line) => menuItems.find((item) => item.id === line.menuItemId)?.prepMinutes ?? 15)) + 10
    const order: Order = {
      id: `room-${Date.now()}`,
      orderNumber: `RS-${Math.floor(2000 + Math.random() * 7000)}`,
      outlet: 'RESTAURANT',
      type: 'Room service',
      status: 'New',
      items: cart,
      guestName: stay.reservation.guestName,
      roomNumber: stay.room.number,
      server: 'In-room dining',
      createdAt: new Date().toISOString(),
      subtotal,
      discount: 0,
      tax,
      tip: 0,
      total,
      paymentStatus: 'Unpaid',
      source: 'ROOM_SERVICE',
      instructions: notes.trim() || undefined,
    }
    addOrder(order)
    setPlacedOrder(order)
    setPlacedEta(eta)
    setCart([])
    setNotes('')
    setCartOpen(false)
    toast.success('Order sent to the kitchen', { description: `${order.orderNumber} · ETA ${eta} min` })
    void dispatchKitchenPrint(
      order,
      { roomNumber: stay.room.number, guestName: stay.reservation.guestName },
      printerSettings,
      enqueuePrintJob,
    ).then((result) => {
      if (result.status === 'sent') toast.success('Kitchen ticket printed', { description: order.orderNumber })
      if (result.status === 'queued') toast.warning('Printer unavailable', { description: `${order.orderNumber} saved to the print queue.` })
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><UtensilsCrossed className="size-5" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">In-room dining</p>
              <p className="font-display text-base font-extrabold leading-tight">Hayata Kitchen</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-extrabold">Room {stay.room.number}</p>
            <p className="text-[10px] text-muted-foreground">{guestFirstName}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 pt-6" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>
        {placedOrder ? (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:border-emerald-900 dark:from-emerald-950/50 dark:to-teal-950/40">
              <CardContent className="p-8 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="size-7" /></div>
                <h1 className="mt-4 font-display text-2xl font-extrabold">Order received</h1>
                <p className="mt-1 text-sm text-muted-foreground">The kitchen has your ticket, {guestFirstName}.</p>
                <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white/70 px-4 py-3 dark:border-emerald-900 dark:bg-slate-950/40">
                  <span className="font-mono text-sm font-extrabold">{placedOrder.orderNumber}</span>
                  <span className="size-1 rounded-full bg-emerald-500" />
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300"><Clock3 className="size-3.5" /> About {placedEta} min</span>
                  <span className="size-1 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold">{formatCurrency(placedOrder.total)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2"><ChefHat className="size-4 text-primary" /><h2 className="font-display font-bold">Order progress</h2></div>
                <div className="mt-4 space-y-3">
                  {['Received', 'Preparing', 'On the way'].map((step, index) => (
                    <div key={step} className="flex items-center gap-3">
                      <span className={cn('flex size-7 items-center justify-center rounded-full text-[11px] font-extrabold', index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{index + 1}</span>
                      <span className={cn('text-sm font-semibold', index === 0 ? 'text-foreground' : 'text-muted-foreground')}>{step}</span>
                      {index === 0 && <Badge variant="success" className="ml-auto">In progress</Badge>}
                    </div>
                  ))}
                </div>
                <Button className="mt-6 w-full" variant="outline" onClick={() => setPlacedOrder(null)}><Plus /> Order something else</Button>
              </CardContent>
            </Card>
          </motion.section>
        ) : (
          <>
            <section>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{greeting()}, {guestFirstName}</p>
              <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">What would you like from the kitchen?</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Freshly prepared by Hayata Kitchen and delivered to room {stay.room.number}. Charges are posted to your room folio.
              </p>
            </section>

            {roomOrders.length > 0 && (
              <Card>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center gap-2"><Clock3 className="size-4 text-primary" /><h2 className="font-display text-sm font-bold">Your active orders</h2></div>
                  {roomOrders.slice(0, 3).map((order) => (
                    <div key={order.id} className="flex items-center gap-3 rounded-lg bg-muted/45 p-3">
                      <span className="font-mono text-xs font-extrabold">{order.orderNumber}</span>
                      <span className="text-[11px] text-muted-foreground">{(order.items ?? []).reduce((sum, line) => sum + line.quantity, 0)} items</span>
                      <StatusPill status={order.status} className="ml-auto" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the menu…" className="h-11 pl-9" aria-label="Search the menu" />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Menu categories">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={cn('shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition', category === item ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted')}
                  aria-pressed={category === item}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {filtered.map((item) => (
                  <motion.div key={item.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Card className="h-full overflow-hidden shadow-card">
                      <div className="aspect-[16/9] overflow-hidden bg-muted">
                        <img src={item.image} alt="" loading="lazy" className="size-full object-cover transition duration-300 hover:scale-105" />
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="font-display text-sm font-extrabold">{item.name}</h2>
                              <Badge variant="outline">{item.station}</Badge>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                          </div>
                          <span className="shrink-0 font-display text-sm font-extrabold text-primary">{formatCurrency(item.price)}</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"><Clock3 className="size-3" /> {item.prepMinutes} min</span>
                          <Button size="sm" onClick={() => addToCart(item)} aria-label={`Add ${item.name} to order`}><Plus /> Add</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {filtered.length === 0 && (
              <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No menu items match your search.</CardContent></Card>
            )}

            <p className="text-center text-[11px] text-muted-foreground">Need assistance? Reception is available 24 hours.</p>
          </>
        )}
      </main>

      {itemCount > 0 && !placedOrder && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 p-4 backdrop-blur" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShoppingBag className="size-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold">{itemCount} {itemCount === 1 ? 'item' : 'items'} in your order</p>
              <p className="text-sm font-extrabold">{formatCurrency(total)}</p>
            </div>
            <Button onClick={() => setCartOpen(true)}><ShoppingBag /> View order</Button>
          </div>
        </div>
      )}

      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="border-b border-border p-5 pb-4">
            <DialogTitle>Your order</DialogTitle>
            <DialogDescription>Review your items and add any instructions for the kitchen.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[45vh] space-y-3 overflow-y-auto px-5">
            {cart.map((line) => (
              <div key={line.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{line.name}</p>
                  <p className="text-[11px] text-muted-foreground">{formatCurrency(line.price)} each · {line.station}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon-sm" variant="outline" onClick={() => changeQuantity(line.id, -1)} aria-label={`Decrease ${line.name} quantity`}><Minus /></Button>
                  <span className="w-5 text-center text-xs font-extrabold">{line.quantity}</span>
                  <Button size="icon-sm" variant="outline" onClick={() => changeQuantity(line.id, 1)} aria-label={`Increase ${line.name} quantity`}><Plus /></Button>
                </div>
                <span className="w-16 text-right text-xs font-extrabold">{formatCurrency(line.price * line.quantity)}</span>
                <Button size="icon-sm" variant="ghost" onClick={() => setCart((current) => current.filter((candidate) => candidate.id !== line.id))} aria-label={`Remove ${line.name}`}><Trash2 /></Button>
              </div>
            ))}
          </div>
          <div className="space-y-3 px-5 pb-2">
            <div className="space-y-1.5">
              <Label htmlFor="room-order-notes">Special instructions</Label>
              <Textarea id="room-order-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="e.g. No chilli, extra napkins, knock on the door" rows={2} />
            </div>
            <div className="space-y-1 rounded-xl bg-muted/50 p-3 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-bold">{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="font-bold">{formatCurrency(tax)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 text-sm"><span className="font-bold">Total</span><span className="font-extrabold">{formatCurrency(total)}</span></div>
            </div>
          </div>
          <DialogFooter className="border-t border-border p-5 pt-4">
            <Button variant="outline" onClick={() => setCartOpen(false)}>Keep browsing</Button>
            <Button onClick={placeOrder} disabled={!cart.length}><Send /> Place order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
