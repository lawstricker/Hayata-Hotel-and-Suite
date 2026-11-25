import { Command } from 'cmdk'
import { BedDouble, Boxes, CalendarDays, ReceiptText, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { guests, inventoryItems, orders } from '@/mock/data'
import { useHotelStore } from '@/store/hotelStore'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const reservations = useHotelStore((state) => state.reservations)

  const groups = useMemo(() => {
    const normalized = query.toLowerCase().trim()
    const match = (...values: string[]) => !normalized || values.join(' ').toLowerCase().includes(normalized)
    return [
      {
        heading: 'Guests',
        icon: Users,
        items: guests.filter((guest) => match(guest.firstName, guest.lastName, guest.email, guest.phone, guest.segment)).slice(0, 5).map((guest) => ({
          id: guest.id,
          label: `${guest.firstName} ${guest.lastName}`,
          detail: `${guest.email} · ${guest.segment}`,
          path: `/staff/guests/${guest.id}`,
        })),
      },
      {
        heading: 'Reservations',
        icon: CalendarDays,
        items: reservations.filter((reservation) => match(reservation.guestName, reservation.id, reservation.status, reservation.roomType)).slice(0, 5).map((reservation) => ({
          id: reservation.id,
          label: `${reservation.guestName} · ${reservation.id.toUpperCase()}`,
          detail: `${reservation.checkIn} → ${reservation.checkOut} · ${reservation.status}`,
          path: '/staff/reservations',
        })),
      },
      {
        heading: 'Inventory',
        icon: Boxes,
        items: inventoryItems.filter((item) => match(item.name, item.sku, item.category, item.outlet)).slice(0, 6).map((item) => ({
          id: item.id,
          label: item.name,
          detail: `${item.sku} · ${item.stock} ${item.unit} · ${item.outlet}`,
          path: '/staff/inventory/items',
        })),
      },
      {
        heading: 'Orders',
        icon: ReceiptText,
        items: orders.filter((order) => match(order.orderNumber, order.guestName, order.server, order.status)).slice(0, 5).map((order) => ({
          id: order.id,
          label: `${order.orderNumber} · ${order.outlet === 'BAR' ? 'Bar' : 'Restaurant'}`,
          detail: `${order.tableName ?? order.type} · ${order.status} · ₦${order.total.toFixed(2)}`,
          path: order.outlet === 'BAR' ? '/staff/bar/pos' : '/staff/restaurant/orders',
        })),
      },
    ].filter((group) => group.items.length)
  }, [query, reservations])

  function select(path: string) {
    navigate(path)
    onOpenChange(false)
    setQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-content top-[18%] max-w-2xl translate-y-0 gap-0 overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Global search</DialogTitle>
          <DialogDescription>Search guests, reservations, inventory, and orders.</DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false} className="w-full">
          <div className="flex h-14 items-center border-b border-border px-4">
            <Search className="mr-3 size-4 text-muted-foreground" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search guests, reservations, inventory, orders…"
              className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">ESC</kbd>
          </div>
          <Command.List className="max-h-[430px] overflow-y-auto p-2">
            {!groups.length && (
              <div className="flex flex-col items-center py-14 text-center">
                <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-muted"><Search className="size-4 text-muted-foreground" /></div>
                <p className="text-sm font-semibold">No results for “{query}”</p>
                <p className="mt-1 text-xs text-muted-foreground">Try a guest name, SKU, booking ID, or order number.</p>
              </div>
            )}
            {groups.map((group) => (
              <Command.Group key={group.heading} heading={group.heading} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
                {group.items.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${group.heading} ${item.label} ${item.detail}`}
                    onSelect={() => select(item.path)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-muted"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><group.icon className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-foreground">{item.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">↵</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
            <span>Search across the entire property</span>
            <span className="flex items-center gap-2"><BedDouble className="size-3" /> Press ⌘K anytime</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
