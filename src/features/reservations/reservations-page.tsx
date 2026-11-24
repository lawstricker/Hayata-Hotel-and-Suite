import { zodResolver } from '@hookform/resolvers/zod'
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, DoorOpen, List, LogIn, Plus, Search, Users, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { PageHeader } from '@/components/common/page-header'
import { StatusPill } from '@/components/common/status-pill'
import { guests, roomTypes } from '@/mock/data'
import { useHotelStore } from '@/store/hotelStore'
import { cn, formatCurrency } from '@/lib/utils'
import type { Reservation } from '@/types/domain'

const reservationSchema = z.object({
  guestId: z.string().min(1, 'Select a guest'),
  roomType: z.string().min(1, 'Select a room type'),
  checkIn: z.string().min(1, 'Select arrival date'),
  checkOut: z.string().min(1, 'Select departure date'),
  adults: z.number().int().min(1, 'At least one adult'),
  children: z.number().int().min(0),
  source: z.enum(['Direct', 'Booking.com', 'Expedia', 'Corporate', 'Walk-in']),
  ratePlan: z.string().min(1),
  deposit: z.number().min(0),
})
type ReservationValues = z.infer<typeof reservationSchema>

function CreateReservationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const addReservation = useHotelStore((state) => state.addReservation)
  const form = useForm<ReservationValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: { checkIn: new Date().toISOString().slice(0, 10), checkOut: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), adults: 1, children: 0, source: 'Direct', ratePlan: 'Flexible', deposit: 100 },
  })
  function submit(values: ReservationValues) {
    const guest = guests.find((candidate) => candidate.id === values.guestId)
    const roomType = roomTypes.find((candidate) => candidate.name === values.roomType)
    const nights = Math.max(1, Math.round((new Date(values.checkOut).getTime() - new Date(values.checkIn).getTime()) / 86400000))
    const rate = roomType?.baseRate ?? 0
    addReservation({
      id: `res-new-${Date.now()}`,
      guestId: values.guestId,
      guestName: guest ? `${guest.firstName} ${guest.lastName}` : 'New guest',
      roomType: values.roomType,
      checkIn: values.checkIn,
      checkOut: values.checkOut,
      adults: values.adults,
      children: values.children,
      status: 'Confirmed',
      source: values.source,
      ratePlan: values.ratePlan,
      rate,
      deposit: values.deposit,
      addOns: [],
      total: rate * nights,
    })
    toast.success('Reservation confirmed', { description: `${guest?.firstName ?? 'Guest'} · ${values.checkIn} to ${values.checkOut}` })
    onOpenChange(false)
    form.reset()
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New reservation</DialogTitle><DialogDescription>Search an existing guest or create a booking record.</DialogDescription></DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-1.5 sm:col-span-2"><Label>Guest</Label><select {...form.register('guestId')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Search guest directory</option>{guests.map((guest) => <option key={guest.id} value={guest.id}>{guest.firstName} {guest.lastName} · {guest.email}</option>)}</select>{form.formState.errors.guestId && <p className="text-xs text-destructive">{form.formState.errors.guestId.message}</p>}</div>
          <div className="space-y-1.5"><Label>Room type</Label><select {...form.register('roomType')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Select room type</option>{roomTypes.map((type) => <option key={type.id}>{type.name}</option>)}</select>{form.formState.errors.roomType && <p className="text-xs text-destructive">{form.formState.errors.roomType.message}</p>}</div>
          <div className="space-y-1.5"><Label>Booking source</Label><select {...form.register('source')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option>Direct</option><option>Booking.com</option><option>Expedia</option><option>Corporate</option><option>Walk-in</option></select></div>
          <div className="space-y-1.5"><Label>Arrival</Label><Input type="date" {...form.register('checkIn')} /></div>
          <div className="space-y-1.5"><Label>Departure</Label><Input type="date" {...form.register('checkOut')} /></div>
          <div className="space-y-1.5"><Label>Adults</Label><Input type="number" {...form.register('adults', { valueAsNumber: true })} /></div>
          <div className="space-y-1.5"><Label>Children</Label><Input type="number" {...form.register('children', { valueAsNumber: true })} /></div>
          <div className="space-y-1.5"><Label>Rate plan</Label><select {...form.register('ratePlan')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option>Flexible</option><option>Non-refundable</option><option>Corporate</option></select></div>
          <div className="space-y-1.5"><Label>Deposit</Label><Input type="number" {...form.register('deposit', { valueAsNumber: true })} /></div>
          <div className="sm:col-span-2"><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit"><CalendarDays /> Confirm reservation</Button></DialogFooter></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CheckInDialog({ reservation, onOpenChange }: { reservation: Reservation | null; onOpenChange: (open: boolean) => void }) {
  const updateStatus = useHotelStore((state) => state.updateReservationStatus)
  const rooms = useHotelStore((state) => state.rooms)
  const availableRooms = rooms.filter((room) => room.status === 'Available' || room.status === 'Clean')
  const [roomNumber, setRoomNumber] = useState('')
  function submit() {
    if (!reservation || !roomNumber) return
    updateStatus(reservation.id, 'Checked in', roomNumber)
    toast.success('Guest checked in', { description: `${reservation.guestName} · Room ${roomNumber}` })
    onOpenChange(false)
  }
  return (
    <Dialog open={Boolean(reservation)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Check in {reservation?.guestName}</DialogTitle><DialogDescription>Assign a room and capture the arrival.</DialogDescription></DialogHeader>{reservation && <div className="space-y-4"><div className="rounded-lg border border-border bg-muted/40 p-3"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Stay</span><span className="font-bold">{reservation.checkIn} → {reservation.checkOut}</span></div><div className="mt-2 flex justify-between text-sm"><span className="text-muted-foreground">Room type</span><span className="font-bold">{reservation.roomType}</span></div></div><div className="space-y-1.5"><Label>Assign room</Label><select value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Select available room</option>{availableRooms.map((room) => <option key={room.id} value={room.number}>{room.number} · {room.type} · {room.rate}/night</option>)}</select></div><div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"><Users className="size-4" /> {reservation.adults} adults · {reservation.children} children · ID capture ready</div></div>}<DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={!roomNumber}><LogIn /> Complete check-in</Button></DialogFooter></DialogContent>
    </Dialog>
  )
}

export function ReservationsPage() {
  const reservations = useHotelStore((state) => state.reservations)
  const updateStatus = useHotelStore((state) => state.updateReservationStatus)
  const [createOpen, setCreateOpen] = useState(false)
  const [checkInReservation, setCheckInReservation] = useState<Reservation | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const filtered = useMemo(() => reservations.filter((reservation) => statusFilter === 'all' || reservation.status === statusFilter), [reservations, statusFilter])

  const columns: DataTableColumn<Reservation>[] = [
    { key: 'guestName', header: 'Guest', sortable: true, cell: (row) => <div><p className="font-bold">{row.guestName}</p><p className="text-[10px] font-mono text-muted-foreground">{row.id.toUpperCase()}</p></div> },
    { key: 'roomType', header: 'Room type', cell: (row) => <span className="text-xs font-semibold">{row.roomType}{row.roomNumber ? ` · ${row.roomNumber}` : ''}</span> },
    { key: 'checkIn', header: 'Arrival', sortable: true, cell: (row) => <span className="text-xs font-semibold">{format(new Date(`${row.checkIn}T00:00:00`), 'MMM d, yyyy')}</span> },
    { key: 'checkOut', header: 'Departure', cell: (row) => <span className="text-xs text-muted-foreground">{format(new Date(`${row.checkOut}T00:00:00`), 'MMM d')}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusPill status={row.status} /> },
    { key: 'source', header: 'Source', hideOnMobile: true, cell: (row) => <Badge variant="outline">{row.source}</Badge> },
    { key: 'total', header: 'Total', align: 'right', cell: (row) => <span className="text-xs font-bold">{formatCurrency(row.total)}</span> },
    { key: 'actions', header: 'Actions', align: 'right', cell: (row) => row.status === 'Confirmed' || row.status === 'Pending' ? <Button size="sm" onClick={() => setCheckInReservation(row)}><LogIn /> Check in</Button> : row.status === 'Checked in' ? <Button size="sm" variant="outline" onClick={() => { updateStatus(row.id, 'Checked out'); toast.success('Guest checked out', { description: 'Room departure and folio review completed.' }) }}><DoorOpen /> Check out</Button> : row.status !== 'Cancelled' ? <Button size="sm" variant="ghost" onClick={() => { updateStatus(row.id, 'Cancelled'); toast.success('Reservation cancelled') }}><XCircle /> Cancel</Button> : <span className="text-xs text-muted-foreground">—</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Reservations" description="Manage arrivals, departures and stays across every channel." breadcrumbs={[{ label: 'Front office' }, { label: 'Reservations' }]} actions={<><Button variant="outline" onClick={() => toast.info('Availability search', { description: 'Use the room rack to view and assign inventory.' })}><Search /> Find availability</Button><Button onClick={() => setCreateOpen(true)}><Plus /> New reservation</Button></>} />
      <Tabs defaultValue="calendar">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><TabsList><TabsTrigger value="calendar"><CalendarDays /> Calendar</TabsTrigger><TabsTrigger value="list"><List /> List</TabsTrigger></TabsList><div className="flex items-center gap-2"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-semibold"><option value="all">All statuses</option>{['Confirmed', 'Pending', 'Checked in', 'Checked out', 'Cancelled', 'No-show'].map((status) => <option key={status}>{status}</option>)}</select><Button variant="outline" size="icon-sm" aria-label="Previous week" onClick={() => setWeekOffset((current) => current - 1)}><ChevronLeft /></Button><span className="min-w-36 text-center text-xs font-bold">{format(weekStart, 'MMM d')} – {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}</span><Button variant="outline" size="icon-sm" aria-label="Next week" onClick={() => setWeekOffset((current) => current + 1)}><ChevronRight /></Button></div></div>
        <TabsContent value="calendar">
          <Card className="overflow-hidden"><div className="overflow-x-auto"><div className="min-w-[980px]"><div className="grid grid-cols-7 border-b border-border bg-muted/45">{weekDays.map((day) => <div key={day.toISOString()} className={cn('border-r border-border p-3 last:border-r-0', day.toDateString() === new Date().toDateString() && 'bg-primary/5')}><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{format(day, 'EEE')}</p><p className="mt-1 font-display text-lg font-extrabold">{format(day, 'd')}</p></div>)}</div><div className="relative grid min-h-[430px] grid-cols-7">{weekDays.map((day) => <div key={day.toISOString()} className="border-r border-border last:border-r-0" />)}{filtered.filter((reservation) => { const start = new Date(`${reservation.checkIn}T00:00:00`); const end = new Date(`${reservation.checkOut}T00:00:00`); return start <= endOfWeek(weekStart, { weekStartsOn: 1 }) && end >= weekStart; }).map((reservation) => { const startOffset = Math.max(0, Math.floor((new Date(`${reservation.checkIn}T00:00:00`).getTime() - weekStart.getTime()) / 86400000)); const endOffset = Math.min(6, Math.ceil((new Date(`${reservation.checkOut}T00:00:00`).getTime() - weekStart.getTime()) / 86400000)); const span = Math.max(1, endOffset - startOffset); return <button key={reservation.id} type="button" onClick={() => setCheckInReservation(reservation)} className={cn('absolute top-3 overflow-hidden rounded-lg border-l-4 p-2.5 text-left shadow-sm transition hover:z-20 hover:scale-[1.015] hover:shadow-lg', reservation.status === 'Checked in' ? 'border-l-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40' : reservation.status === 'Pending' ? 'border-l-amber-500 bg-amber-50/80 dark:bg-amber-950/40' : reservation.status === 'Cancelled' ? 'border-l-slate-400 bg-slate-100/70 opacity-60 dark:bg-slate-800/60' : 'border-l-teal-600 bg-teal-50/80 dark:bg-teal-950/40')} style={{ left: `calc(${(startOffset / 7) * 100}% + 4px)`, width: `calc(${(span / 7) * 100}% - 8px)` }}><p className="truncate text-xs font-bold">{reservation.guestName}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{reservation.roomType} · {reservation.roomNumber ?? 'Unassigned'}</p><div className="mt-2"><StatusPill status={reservation.status} /></div></button> })}</div></div></div></Card>
        </TabsContent>
        <TabsContent value="list"><Card><CardContent className="pt-5"><DataTable data={filtered} columns={columns} searchPlaceholder="Search guest, booking ID or room…" searchKeys={[(row) => row.guestName, (row) => row.id, (row) => roomTypes.find((type) => type.name === row.roomType)?.name ?? row.roomType]} initialSort={{ key: 'checkIn', direction: 'asc' }} pageSize={10} filename="reservations.csv" selectable /></CardContent></Card></TabsContent>
      </Tabs>
      <CreateReservationDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CheckInDialog reservation={checkInReservation} onOpenChange={(open) => { if (!open) setCheckInReservation(null) }} />
    </div>
  )
}
