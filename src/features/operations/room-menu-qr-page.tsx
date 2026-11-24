import { BedDouble, ClipboardList, Copy, ExternalLink, Printer, QrCode, UtensilsCrossed } from 'lucide-react'
import { useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/empty-state'
import { KpiCard } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { StatusPill } from '@/components/common/status-pill'
import { buildRoomMenuUrl } from '@/lib/room-menu'
import { useHotelStore } from '@/store/hotelStore'
import { cn, copyToClipboard, formatCurrency } from '@/lib/utils'
import type { Reservation, Room } from '@/types/domain'

type RoomFilter = 'All' | 'Occupied' | 'Ready'

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
}

function QrRoomCard({ room, activeStay }: { room: Room; activeStay?: Reservation }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const url = buildRoomMenuUrl(room.number)

  async function copyLink() {
    await copyToClipboard(url)
    toast.success('Guest menu link copied', { description: `Room ${room.number} · works for every guest in this room` })
  }

  function printCard() {
    const image = canvasRef.current?.toDataURL('image/png')
    if (!image) return
    const popup = window.open('', '_blank')
    if (!popup) {
      toast.error('Popup blocked', { description: 'Allow popups to print the QR card.' })
      return
    }
    popup.document.write(`<!doctype html><html><head><title>Hayata in-room dining · Room ${escapeHtml(room.number)}</title><style>
      @page { size: A6 portrait; margin: 12mm; }
      body { font-family: Arial, sans-serif; color: #0f172a; text-align: center; margin: 0; }
      .brand { color: #0f766e; font-size: 12px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
      h1 { font-size: 22px; margin: 8px 0 2px; }
      p { color: #64748b; font-size: 12px; margin: 4px 0; }
      img { width: 92mm; height: 92mm; margin: 14px auto 8px; display: block; }
      .room { font-size: 26px; font-weight: 800; color: #0f766e; margin-top: 6px; }
      .steps { margin-top: 12px; font-size: 11px; line-height: 1.7; }
      .footer { margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 10px; color: #94a3b8; }
    </style></head><body>
      <div class="brand">Hayata Hotel & Suite</div>
      <h1>In-room dining</h1>
      <div class="room">Room ${escapeHtml(room.number)}</div>
      <p>Scan to open the kitchen menu for this room</p>
      <img src="${image}" alt="In-room dining QR code" />
      <div class="steps">Open your camera · Scan the code · Order from the kitchen<br />Delivered to your room and charged to your folio</div>
      <div class="footer">This card stays in the room and works for every guest.</div>
    </body></html>`)
    popup.document.close()
    popup.focus()
    window.setTimeout(() => popup.print(), 350)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2"><BedDouble className="size-4 text-primary" /> Room {room.number}</CardTitle>
          <CardDescription>{room.type} · Floor {room.floor}</CardDescription>
        </div>
        <StatusPill status={activeStay ? 'Checked in' : room.status} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center rounded-xl border border-border bg-white p-4">
          <QRCodeCanvas ref={canvasRef} value={url} size={148} level="M" marginSize={2} bgColor="#ffffff" fgColor="#0f766e" title={`In-room dining QR for room ${room.number}`} />
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">QR destination</p>
          <p className="mt-1 truncate font-mono text-[11px]">{url}</p>
          <p className={cn('mt-1 text-[11px] font-semibold', activeStay ? 'text-primary' : 'text-muted-foreground')}>
            {activeStay ? `${activeStay.guestName} is currently checked in` : 'Ready for the next guest'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={copyLink}><Copy /> Copy link</Button>
          <Button size="sm" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}><ExternalLink /> Preview</Button>
        </div>
        <Button size="sm" variant="ghost" className="w-full" onClick={printCard}><Printer /> Print room card</Button>
      </CardContent>
    </Card>
  )
}

export function RoomMenuQrPage() {
  const rooms = useHotelStore((state) => state.rooms)
  const reservations = useHotelStore((state) => state.reservations)
  const orders = useHotelStore((state) => state.orders)
  const [filter, setFilter] = useState<RoomFilter>('All')

  const activeStays = reservations.filter((reservation) => reservation.status === 'Checked in' && Boolean(reservation.roomNumber))
  const roomOrders = orders.filter((order) => order.source === 'ROOM_SERVICE')
  const stayForRoom = (roomNumber: string) => activeStays.find((reservation) => reservation.roomNumber === roomNumber)

  const filteredRooms = rooms.filter((room) => {
    if (filter === 'Occupied') return Boolean(stayForRoom(room.number))
    if (filter === 'Ready') return !stayForRoom(room.number) && room.status !== 'Out of Order'
    return true
  })

  const filters: Array<{ value: RoomFilter; label: string }> = [
    { value: 'All', label: `All rooms (${rooms.length})` },
    { value: 'Occupied', label: `Checked in (${activeStays.length})` },
    { value: 'Ready', label: `Ready for next guest (${rooms.length - activeStays.length})` },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="In-room QR menus"
        description="One permanent QR code per room. Leave the printed card in the room; it works for the current guest and every guest who checks in next."
        breadcrumbs={[{ label: 'Hotel operations' }, { label: 'In-room QR menus' }]}
        actions={<Button variant="outline" onClick={() => toast.info('How it works', { description: 'The code points to the room number only. When a guest checks in, that room’s menu becomes active automatically without replacing the card.' })}><QrCode /> How it works</Button>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Room codes" value={rooms.length} changeLabel="one per room" icon={BedDouble} tone="teal" />
        <KpiCard label="Currently active" value={activeStays.length} changeLabel="checked-in guests" icon={ClipboardList} tone="blue" live />
        <KpiCard label="QR orders" value={roomOrders.length} changeLabel="placed from rooms" icon={UtensilsCrossed} tone="violet" />
        <KpiCard label="Room service value" value={formatCurrency(roomOrders.reduce((sum, order) => sum + order.total, 0))} changeLabel="posted to folios" icon={Copy} tone="amber" />
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><QrCode className="size-4" /></div>
            <div>
              <p className="text-sm font-bold">Permanent room code</p>
              <p className="text-xs text-muted-foreground">The QR never changes at checkout. It activates for the next checked-in guest in that room and stops working while the room is vacant.</p>
            </div>
          </div>
          <StatusPill status="Active" />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2" aria-label="Filter room QR codes">
        {filters.map((option) => (
          <Button key={option.value} size="sm" variant={filter === option.value ? 'default' : 'outline'} onClick={() => setFilter(option.value)} aria-pressed={filter === option.value}>
            {option.label}
          </Button>
        ))}
      </div>

      {filteredRooms.length === 0 ? (
        <EmptyState icon={QrCode} title="No room codes found" description="No rooms match this filter." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredRooms.map((room) => <QrRoomCard key={room.id} room={room} activeStay={stayForRoom(room.number)} />)}
        </div>
      )}
    </div>
  )
}
