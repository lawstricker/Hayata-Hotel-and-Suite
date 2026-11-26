import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, ChefHat, Clock3, CreditCard, Loader2, LockKeyhole, Minus, Plus, QrCode, Search, ShoppingBag, Trash2, UtensilsCrossed } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Label, Textarea } from '@/components/ui/input'
import { StatusPill } from '@/components/common/status-pill'
import { findRoomStay, fetchActiveRoomStay, type ActiveRoomStay } from '@/lib/room-menu'
import { fetchPublicMenu } from '@/lib/menu-api'
import { fetchRoomOrderQuote, placePaidRoomOrder, toRoomOrderLines, type RoomOrderQuote } from '@/lib/room-orders'
import { processPayment, recordTransaction, reversePayment } from '@/lib/payment-gateway'
import { guests, menuItems as seedMenuItems } from '@/mock/data'
import { useHotelStore } from '@/store/hotelStore'
import { usePaymentGatewayStore } from '@/store/paymentGatewayStore'
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
              We could not find room {roomNumber || '—'} at Hayata Hotel, so the kitchen menu cannot be opened for this code.
            </p>
          </div>
          <div className="rounded-lg border border-dashed border-border bg-muted/35 p-3 text-left text-[11px] text-muted-foreground">
            <p className="font-bold text-foreground">The QR card in your room is permanent.</p>
            <p className="mt-1">It identifies the room and not your stay, so it keeps working after checkout and for the next guest. Please ask reception if you need help.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function OpeningMenu() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card shadow-card">
        <CardContent className="space-y-4 p-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
          <div>
            <h1 className="font-display text-xl font-extrabold">Opening the menu</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">We are checking that your room is checked in.</p>
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
  const [paymentReference, setPaymentReference] = useState('')

  // Checkout state
  const [checkoutStep, setCheckoutStep] = useState<'review' | 'payment'>('review')
  const [quote, setQuote] = useState<RoomOrderQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteOffline, setQuoteOffline] = useState(false)
  const [paying, setPaying] = useState(false)
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' })
  const [emailOverride, setEmailOverride] = useState('')

  const gatewaySettings = usePaymentGatewayStore((state) => state.settings)

  const localStay = useMemo(
    () => findRoomStay(rooms, reservations, roomNumber),
    [rooms, reservations, roomNumber],
  )

  // The guest is not signed in, so the stay is resolved from the API. The
  // permanent code identifies the room only: whichever guest is checked in to
  // that room is the one the menu belongs to.
  const [resolvedStay, setResolvedStay] = useState<{ roomNumber: string; stay: ActiveRoomStay | null } | null>(null)
  useEffect(() => {
    let active = true
    fetchActiveRoomStay(roomNumber)
      .then((stay) => {
        if (active) setResolvedStay({ roomNumber, stay })
      })
      .catch(() => {
        if (active) setResolvedStay({ roomNumber, stay: null })
      })
    return () => { active = false }
  }, [roomNumber])

  const serverStay = resolvedStay?.roomNumber === roomNumber ? resolvedStay.stay : null
  const stayResolved = resolvedStay?.roomNumber === roomNumber
  // The server decides once it has answered; the in-browser mirror only fills
  // the gap while the request is still running.
  const activeStay = stayResolved ? serverStay : localStay

  // The guest menu is served by the API so it matches the restaurant menu the
  // kitchen maintains. The bundled menu is only a fallback when the API is down.
  const [liveMenu, setLiveMenu] = useState<MenuItem[]>(seedMenuItems)
  useEffect(() => {
    let active = true
    fetchPublicMenu()
      .then((items) => {
        if (active && Array.isArray(items) && items.length > 0) setLiveMenu(items)
      })
      .catch(() => {
        // The API is unreachable: keep the bundled menu.
      })
    return () => { active = false }
  }, [])

  const menu = useMemo(() => liveMenu.filter((item) => item.outlet === 'RESTAURANT' && item.available), [liveMenu])
  const categories = useMemo(() => ['All', ...new Set(menu.map((item) => item.category))], [menu])
  const filtered = useMemo(() => menu.filter((item) => (
    (category === 'All' || item.category === category)
    && (!query || `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase()))
  )), [menu, category, query])

  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0)
  const tax = Math.round(subtotal * 0.08 * 100) / 100
  const total = Math.round((subtotal + tax) * 100) / 100
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0)
  const roomOrders = activeStay ? orders.filter((order) => order.roomNumber === activeStay.room.number && order.source === 'ROOM_SERVICE') : []

  // The server prices the basket; the local totals are only a fallback when the API is unreachable.
  const amountDue = quote ? quote.total : total

  const guestEmail = useMemo(() => {
    if (!activeStay) return ''
    if (activeStay.email) return activeStay.email
    const match = guests.find((guest) => guest.id === activeStay.reservation.guestId)
    return match?.email ?? ''
  }, [activeStay])

  // The guest can change the receipt address; otherwise we use the one on file.
  const email = emailOverride || quote?.email || guestEmail

  if (!activeStay) {
    return stayResolved ? <UnavailableRoom roomNumber={roomNumber} /> : <OpeningMenu />
  }

  const guestFirstName = activeStay.reservation.guestName.split(' ')[0] ?? 'Guest'

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

  /** Moves the guest from the basket to the payment step and loads the authoritative price. */
  async function startCheckout() {
    if (!cart.length) return
    setCheckoutStep('payment')
    setQuote(null)
    setQuoteOffline(false)
    setQuoteLoading(true)
    try {
      const priced = await fetchRoomOrderQuote(activeStay.room.number, toRoomOrderLines(cart))
      setQuote(priced)
    } catch (error) {
      const apiError = error as { status?: number; message?: string }
      if (apiError.status && apiError.status < 500) {
        // The server refused the basket, so there is nothing to pay for yet.
        setCheckoutStep('review')
        toast.error('We cannot take this order yet', { description: apiError.message ?? 'Please review your basket.' })
        return
      }
      // The API is unreachable: fall back to the menu prices shown in the basket.
      setQuoteOffline(true)
    } finally {
      setQuoteLoading(false)
    }
  }

  function closeCart() {
    setCartOpen(false)
    setCheckoutStep('review')
  }

  /**
   * Charges the guest and only then sends the order to the kitchen.
   *
   * The order is not created when the payment is declined, so an unpaid basket
   * can never reach the kitchen display.
   */
  async function payAndPlaceOrder() {
    if (!activeStay || !cart.length || paying) return
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error('Enter the email address for your receipt', { description: 'We use it to send your order confirmation.' })
      return
    }
    if (card.number.replace(/\D/g, '').length < 12 || !card.expiry || card.cvc.length < 3) {
      toast.error('Complete the card details to continue.', { description: 'Card number, expiry and CVC are all required.' })
      return
    }

    setPaying(true)
    try {
      const paymentRequest = {
        amount: amountDue,
        email: email.trim(),
        description: `In-room dining · room ${activeStay.room.number}`,
        referenceHint: 'RS',
        method: 'Card' as const,
        card,
      }
      const payment = await processPayment(paymentRequest, gatewaySettings)
      recordTransaction(payment, paymentRequest)
      if (!payment.ok) {
        toast.error('Payment declined', { description: payment.message })
        return
      }

      const eta = Math.max(15, ...cart.map((line) => liveMenu.find((item) => item.id === line.menuItemId)?.prepMinutes ?? 15)) + 10
      const draft: Order = {
        id: `room-${Date.now()}`,
        orderNumber: `RS-${Math.floor(2000 + Math.random() * 7000)}`,
        outlet: 'RESTAURANT',
        type: 'Room service',
        status: 'New',
        items: cart,
        guestName: activeStay.reservation.guestName,
        roomNumber: activeStay.room.number,
        server: 'In-room dining',
        createdAt: new Date().toISOString(),
        subtotal,
        discount: 0,
        tax,
        tip: 0,
        total: amountDue,
        paymentStatus: 'Paid',
        paymentReference: payment.reference,
        source: 'ROOM_SERVICE',
        instructions: notes.trim() || undefined,
      }

      let order = draft
      let persisted = false
      try {
        const result = await placePaidRoomOrder({
          roomNumber: activeStay.room.number,
          items: toRoomOrderLines(cart),
          instructions: notes.trim() || undefined,
          email: email.trim(),
          payment: {
            reference: payment.reference,
            amount: amountDue,
            method: 'Card',
            provider: payment.provider,
          },
        })
        order = result.order
        persisted = true
      } catch (error) {
        const apiError = error as { code?: string; status?: number; message?: string }
        // The server refused the order, so the charge is reversed and nothing reaches the kitchen.
        if (apiError.status && apiError.status < 500) {
          reversePayment(payment, paymentRequest, apiError.message ?? 'The order was refused by the kitchen system.')
          setCart([])
          setNotes('')
          setQuote(null)
          setCheckoutStep('review')
          closeCart()
          toast.error('We could not place your order', {
            description: `${apiError.message ?? 'Please try again.'} Your payment of ${formatCurrency(amountDue)} has been reversed.`,
          })
          return
        }
        toast.warning('Order saved on this device', { description: 'The kitchen system is unreachable right now. Reception has been notified.' })
      }

      addOrder(order, { persist: !persisted })
      setPlacedOrder(order)
      setPlacedEta(eta)
      setPaymentReference(payment.reference)
      setCart([])
      setNotes('')
      setQuote(null)
      setCheckoutStep('review')
      setCartOpen(false)
      toast.success('Payment received · order sent to the kitchen', { description: `${order.orderNumber} · ETA ${eta} min` })
      void dispatchKitchenPrint(
        order,
        { roomNumber: activeStay.room.number, guestName: activeStay.reservation.guestName },
        printerSettings,
        enqueuePrintJob,
      ).then((result) => {
        if (result.status === 'sent') toast.success('Kitchen ticket printed', { description: order.orderNumber })
        if (result.status === 'queued') toast.warning('Printer unavailable', { description: `${order.orderNumber} saved to the print queue.` })
      })
    } finally {
      setPaying(false)
    }
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
            <p className="text-xs font-extrabold">Room {activeStay.room.number}</p>
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
                <p className="mt-1 text-sm text-muted-foreground">Payment received and the kitchen has your ticket, {guestFirstName}.</p>
                <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white/70 px-4 py-3 dark:border-emerald-900 dark:bg-slate-950/40">
                  <span className="font-mono text-sm font-extrabold">{placedOrder.orderNumber}</span>
                  <span className="size-1 rounded-full bg-emerald-500" />
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300"><Clock3 className="size-3.5" /> About {placedEta} min</span>
                  <span className="size-1 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold">{formatCurrency(placedOrder.total)}</span>
                </div>
                {paymentReference && (
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Paid · <span className="font-mono font-bold">{paymentReference}</span>
                  </p>
                )}
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
                Freshly prepared by Hayata Kitchen and delivered to room {activeStay.room.number}. Pay for your order before it reaches the kitchen.
              </p>
              {!activeStay.checkedIn && (
                <p className="mt-3 max-w-xl rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  Your stay in room {activeStay.room.number} is closed, but this menu stays open for the room. You can still order, and the kitchen will deliver to room {activeStay.room.number}.
                </p>
              )}
            </section>

            {roomOrders.length > 0 && (
              <Card>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center gap-2"><Clock3 className="size-4 text-primary" /><h2 className="font-display text-sm font-bold">Your active orders</h2></div>
                  {roomOrders.slice(0, 3).map((order) => (
                    <div key={order.id} className="flex items-center gap-3 rounded-lg bg-muted/45 p-3">
                      <span className="font-mono text-xs font-extrabold">{order.orderNumber}</span>
                      <span className="text-[11px] text-muted-foreground">{(order.items ?? []).reduce((sum, line) => sum + line.quantity, 0)} items</span>
                      {order.paymentStatus === 'Paid' && <Badge variant="success">Paid</Badge>}
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

      <Dialog open={cartOpen} onOpenChange={(open) => { if (!open) closeCart(); else setCartOpen(true) }}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="border-b border-border p-5 pb-4">
            <DialogTitle>{checkoutStep === 'review' ? 'Your order' : 'Payment'}</DialogTitle>
            <DialogDescription>
              {checkoutStep === 'review'
                ? 'Review your items and add any instructions for the kitchen.'
                : 'Your order is sent to the kitchen once payment is approved.'}
            </DialogDescription>
          </DialogHeader>

          {checkoutStep === 'review' ? (
            <>
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
                <Button variant="outline" onClick={closeCart}>Keep browsing</Button>
                <Button onClick={() => void startCheckout()} disabled={!cart.length}><CreditCard /> Pay & place order</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="max-h-[55vh] space-y-4 overflow-y-auto px-5 py-4">
                <div className="flex items-center justify-between rounded-xl border border-primary/25 bg-primary/5 p-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Amount to pay</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{itemCount} {itemCount === 1 ? 'item' : 'items'} · room {activeStay.room.number}</p>
                  </div>
                  <p className="font-display text-2xl font-extrabold text-primary">
                    {quoteLoading ? <Loader2 className="size-6 animate-spin" /> : formatCurrency(amountDue)}
                  </p>
                </div>

                {quoteOffline && (
                  <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    We could not reach the kitchen system to confirm prices, so the amount shown is from the menu. Reception will confirm your order.
                  </p>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="room-order-email">Email for your receipt</Label>
                  <Input id="room-order-email" type="email" value={email} onChange={(event) => setEmailOverride(event.target.value)} placeholder="you@example.com" autoComplete="email" />
                </div>

                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <p className="flex items-center gap-2 font-bold"><LockKeyhole className="size-4" aria-hidden="true" /> Demo payment</p>
                  <p className="mt-1">No real charge is made and nothing leaves your browser. Use any card details, for example 4242 4242 4242 4242.</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="room-card-name">Name on card</Label>
                    <Input id="room-card-name" value={card.name} onChange={(event) => setCard({ ...card, name: event.target.value })} placeholder={activeStay.reservation.guestName} autoComplete="cc-name" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="room-card-number">Card number</Label>
                    <Input id="room-card-number" inputMode="numeric" value={card.number} onChange={(event) => setCard({ ...card, number: event.target.value })} placeholder="4242 4242 4242 4242" autoComplete="cc-number" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="room-card-expiry">Expiry</Label>
                    <Input id="room-card-expiry" value={card.expiry} onChange={(event) => setCard({ ...card, expiry: event.target.value })} placeholder="12/28" autoComplete="cc-exp" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="room-card-cvc">CVC</Label>
                    <Input id="room-card-cvc" inputMode="numeric" value={card.cvc} onChange={(event) => setCard({ ...card, cvc: event.target.value })} placeholder="123" autoComplete="cc-csc" />
                  </div>
                </div>
              </div>
              <DialogFooter className="border-t border-border p-5 pt-4">
                <Button variant="outline" onClick={() => setCheckoutStep('review')} disabled={paying}><ArrowLeft /> Back</Button>
                <Button onClick={() => void payAndPlaceOrder()} disabled={paying || quoteLoading}>
                  {paying ? <Loader2 className="animate-spin" /> : <CreditCard />}
                  {paying ? 'Processing…' : `Pay ${formatCurrency(amountDue)} & order`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
