import { BellRing, ChefHat, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useHotelStore } from '@/store/hotelStore'
import { useSettingsStore } from '@/store/settingsStore'
import { apiGet, SERVER_ENABLED } from '@/lib/api-client'
import { playKitchenAlert } from '@/lib/alert-sound'
import { cn, formatCurrency } from '@/lib/utils'
import type { Order } from '@/types/domain'

/** How often the kitchen display asks the server for new tickets. */
const POLL_INTERVAL_MS = 10000
/**
 * A ticket only raises the alert when it is this recent. Older tickets are
 * treated as the backlog that was already on screen when the display opened.
 */
const ALERT_WINDOW_MS = 10 * 60 * 1000

interface KitchenAlertWatcherProps {
  outlet: 'RESTAURANT' | 'BAR'
}

/**
 * Watches for new tickets and raises the kitchen alert.
 *
 * The kitchen display asks the server for tickets every few seconds, so an
 * order placed on a guest's phone reaches the screen as well. The tickets that
 * are already on screen when the page opens are remembered first, so opening
 * the kitchen display does not replay old orders.
 */
export function KitchenAlertWatcher({ outlet }: KitchenAlertWatcherProps) {
  const mergeServerOrders = useHotelStore((state) => state.mergeServerOrders)
  const [incoming, setIncoming] = useState<Order[]>([])
  const [muted, setMuted] = useState(false)
  const knownIds = useRef<Set<string>>(new Set())
  const mutedRef = useRef(false)

  useEffect(() => { mutedRef.current = muted }, [muted])

  // Pull the tickets that were placed on other devices into the store.
  useEffect(() => {
    if (!SERVER_ENABLED) return
    let active = true
    const poll = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const result = await apiGet<Order[]>('/resource/orders?limit=100')
        if (!active || !Array.isArray(result)) return
        mergeServerOrders(result)
      } catch {
        // A failed poll simply retries on the next tick.
      }
    }
    void poll()
    const timer = window.setInterval(() => { void poll() }, POLL_INTERVAL_MS)
    return () => { active = false; window.clearInterval(timer) }
  }, [mergeServerOrders])

  useEffect(() => {
    // The tickets that are already on screen when the display opens are
    // remembered first, so opening the kitchen display does not replay the
    // orders of the previous shift.
    const existing = useHotelStore.getState().orders.filter((order) => order.outlet === outlet)
    knownIds.current = new Set(existing.map((order) => order.id))

    // The store is watched through a subscription rather than read inside an
    // effect, so the alert is raised by the event that brought the ticket in.
    const unsubscribe = useHotelStore.subscribe((state) => {
      const fresh: Order[] = []
      for (const order of state.orders) {
        if (order.outlet !== outlet) continue
        if (knownIds.current.has(order.id)) continue
        knownIds.current.add(order.id)
        if (order.status !== 'New') continue
        const created = new Date(order.createdAt ?? Date.now()).getTime()
        // A ticket that is older than the alert window is backlog, not news.
        if (!Number.isNaN(created) && Date.now() - created > ALERT_WINDOW_MS) continue
        fresh.push(order)
      }
      if (!fresh.length) return
      setIncoming((current) => [...current, ...fresh])
      const soundOn = useSettingsStore.getState().notifications['New restaurant or bar order'] ?? true
      if (!mutedRef.current && soundOn) playKitchenAlert()
    })
    return () => unsubscribe()
  }, [outlet])

  const acknowledge = useCallback(() => setIncoming([]), [])

  useEffect(() => {
    if (!incoming.length) return
    const ticket = incoming[0]
    toast.warning(`New ${outlet === 'BAR' ? 'bar' : 'kitchen'} order · ${ticket.orderNumber}`, {
      description: `${(ticket.items ?? []).reduce((total, item) => total + item.quantity, 0)} item(s) · ${formatCurrency(ticket.total)}`,
      duration: 8000,
    })
  }, [incoming, outlet])

  if (!incoming.length) return null

  const ticket = incoming[0]
  const extra = incoming.length - 1

  return (
    <Dialog open onOpenChange={(open) => { if (!open) acknowledge() }}>
      <DialogContent className="max-w-lg border-amber-300 dark:border-amber-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <BellRing className="size-5" /> New {outlet === 'BAR' ? 'bar' : 'kitchen'} order
          </DialogTitle>
          <DialogDescription>A new ticket just arrived and is waiting to be prepared.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-lg font-extrabold">{ticket.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {ticket.roomNumber ? `Room ${ticket.roomNumber}` : ticket.tableName ?? ticket.type} · {ticket.server}
                </p>
              </div>
              <Badge variant="warning" className="px-2.5 py-1"><ChefHat className="size-3" /> New</Badge>
            </div>
            <div className="mt-3 space-y-1.5 border-t border-amber-200 pt-3 dark:border-amber-900">
              {(ticket.items ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span><span className="mr-2 font-bold text-primary">{item.quantity}×</span>{item.name}</span>
                  <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            {ticket.instructions && <p className="mt-3 rounded-lg bg-amber-100 p-2 text-xs font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">Note: {ticket.instructions}</p>}
            <p className="mt-3 text-right font-display text-lg font-extrabold">{formatCurrency(ticket.total)}</p>
          </div>
          {extra > 0 && <p className="text-xs font-semibold text-muted-foreground">+ {extra} more new ticket{extra === 1 ? '' : 's'} waiting.</p>}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMuted((current) => !current)}
            className={cn(muted && 'text-muted-foreground')}
          >
            {muted ? <VolumeX /> : <Volume2 />} {muted ? 'Sound off' : 'Sound on'}
          </Button>
          <Button onClick={acknowledge}>Start preparation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
