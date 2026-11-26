import { zodResolver } from '@hookform/resolvers/zod'
import { addDays, format } from 'date-fns'
import { BedDouble, Brush, CalendarCheck2, Check, CircleDot, DoorOpen, GripVertical, ImageOff, LogIn, Pencil, Plus, Sparkles, Trash2, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { KpiCard } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { StatusPill } from '@/components/common/status-pill'
import { RoomDialog } from '@/features/operations/room-dialog'
import { RoomTypeDialog } from '@/features/operations/room-type-dialog'
import { housekeepingTasks as seedTasks, maintenanceTickets as seedTickets } from '@/mock/data'
import { useHotelStore } from '@/store/hotelStore'
import { useRoomTypesStore } from '@/store/roomTypesStore'
import { cn, downloadCsv, formatCurrency } from '@/lib/utils'
import type { MaintenanceTicket, Room, RoomType, TaskStatus } from '@/types/domain'

const roomStatusStyles: Record<Room['status'], string> = {
  Available: 'border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  Occupied: 'border-blue-200 bg-blue-50/80 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
  Dirty: 'border-amber-200 bg-amber-50/80 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  Clean: 'border-teal-200 bg-teal-50/80 text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200',
  'Out of Order': 'border-red-200 bg-red-50/80 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200',
  Reserved: 'border-violet-200 bg-violet-50/80 text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200',
}

export function FrontDeskPage() {
  const navigate = useNavigate()
  const rooms = useHotelStore((state) => state.rooms)
  const reservations = useHotelStore((state) => state.reservations)
  const roomTypes = useRoomTypesStore((state) => state.items)
  const loadRoomTypes = useRoomTypesStore((state) => state.load)
  const updateStatus = useHotelStore((state) => state.updateReservationStatus)

  // The room types come from the database, so the list is loaded from the API.
  useEffect(() => { void loadRoomTypes() }, [loadRoomTypes])

  const arrivals = reservations.filter((reservation) => reservation.status === 'Confirmed' || reservation.status === 'Pending').slice(0, 8)
  const departures = reservations.filter((reservation) => reservation.status === 'Checked in').slice(0, 8)
  const available = rooms.filter((room) => room.status === 'Available' || room.status === 'Clean').length
  const dates = Array.from({ length: 7 }, (_, index) => addDays(new Date(), index))
  return (
    <div className="space-y-6">
      <PageHeader title="Front desk" description="Live room rack, arrivals and departures at a glance." breadcrumbs={[{ label: 'Hotel operations' }, { label: 'Front desk' }]} actions={<><Button variant="outline" onClick={() => navigate('/staff/reservations')}><Plus /> Walk-in</Button><Button onClick={() => { downloadCsv('arrival-report.csv', arrivals.map((reservation) => ({ guest: reservation.guestName, roomType: reservation.roomType, checkIn: reservation.checkIn, status: reservation.status, rate: reservation.rate }))); toast.success('Arrival report exported', { description: `${arrivals.length} arrivals written to CSV` }) }}><CalendarCheck2 /> Arrival report</Button></>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><KpiCard label="Available rooms" value={available} changeLabel={`${rooms.length - available} occupied`} icon={BedDouble} tone="teal" /><KpiCard label="Arrivals today" value="12" changeLabel="4 pending check-in" icon={LogIn} tone="blue" /><KpiCard label="Departures today" value="9" changeLabel="3 late check-outs" icon={DoorOpen} tone="amber" /><KpiCard label="Occupancy" value="78.4%" change={5.3} changeLabel="vs. last month" icon={Sparkles} tone="violet" /></div>
      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.8fr]">
        <Card><CardHeader className="flex-row items-start justify-between space-y-0"><div><CardTitle>Room rack</CardTitle><CardDescription>40 rooms across 4 floors</CardDescription></div><div className="flex flex-wrap gap-2">{[['Available', 'bg-emerald-500'], ['Occupied', 'bg-blue-500'], ['Dirty', 'bg-amber-500'], ['Out of Order', 'bg-red-500']].map(([label, color]) => <span key={label} className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"><i className={cn('size-2 rounded-full', color)} />{label}</span>)}</div></CardHeader><CardContent><div className="grid grid-cols-4 gap-2 sm:grid-cols-5 xl:grid-cols-8">{rooms.map((room) => <button key={room.id} type="button" onClick={() => toast.info(`Room ${room.number}`, { description: `${room.type} · ${room.guestName ?? 'No guest assigned'} · ${formatCurrency(room.rate)}/night` })} className={cn('group rounded-lg border p-2 text-left transition hover:-translate-y-0.5 hover:shadow-md', roomStatusStyles[room.status])}><div className="flex items-center justify-between"><span className="font-display text-sm font-extrabold">{room.number}</span><CircleDot className="size-3 opacity-50" /></div><p className="mt-1 truncate text-[9px] font-semibold opacity-70">{room.type.replace('Deluxe ', '')}</p><p className="mt-1 truncate text-[9px] opacity-60">{room.guestName ?? room.status}</p></button>)}</div></CardContent></Card>
        <div className="space-y-4"><Card><CardHeader><CardTitle>Arrivals</CardTitle><CardDescription>Expected today</CardDescription></CardHeader><CardContent className="space-y-1">{arrivals.map((reservation) => <div key={reservation.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50"><span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-[10px] font-extrabold text-primary">{reservation.guestName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{reservation.guestName}</p><p className="text-[10px] text-muted-foreground">{reservation.roomType}</p></div><Button size="sm" variant="outline" onClick={() => { updateStatus(reservation.id, 'Checked in', rooms.find((room) => room.status === 'Available')?.number); toast.success('Guest checked in', { description: 'In-room dining QR is ready under Rooms → In-room QR menus.' }) }}>Check in</Button></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Departures</CardTitle><CardDescription>Due out today</CardDescription></CardHeader><CardContent className="space-y-1">{departures.map((reservation) => <div key={reservation.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50"><span className="flex size-8 items-center justify-center rounded-full bg-blue-50 text-[10px] font-extrabold text-blue-600 dark:bg-blue-950"><DoorOpen className="size-3.5" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{reservation.guestName}</p><p className="text-[10px] text-muted-foreground">Room {reservation.roomNumber} · {reservation.status}</p></div><Button size="sm" variant="ghost" onClick={() => { updateStatus(reservation.id, 'Checked out'); toast.success('Guest checked out') }}>Out</Button></div>)}</CardContent></Card></div>
      </div>
      <Card><CardHeader><CardTitle>Availability grid</CardTitle><CardDescription>Next seven days by room type</CardDescription></CardHeader><CardContent className="overflow-x-auto"><div className="min-w-[820px]"><div className="grid grid-cols-[170px_repeat(7,1fr)] border-b border-border pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><span>Room type</span>{dates.map((date) => <span key={date.toISOString()} className="text-center">{format(date, 'EEE d')}</span>)}</div>{roomTypes.map((type, typeIndex) => <div key={type.id} className="grid grid-cols-[170px_repeat(7,1fr)] border-b border-border py-2 last:border-b-0"><span className="text-xs font-bold">{type.name}</span>{dates.map((date, dayIndex) => { const occupied = (typeIndex + dayIndex) % 4 !== 0; return <div key={date.toISOString()} className="mx-1 flex h-8 items-center justify-center rounded-md bg-muted/40"><span className={cn('size-2 rounded-full', occupied ? 'bg-blue-500' : 'bg-emerald-500')} /></div> })}</div>)}</div></CardContent></Card>
    </div>
  )
}

export function RoomsPage() {
  const rooms = useHotelStore((state) => state.rooms)
  const removeRoom = useHotelStore((state) => state.removeRoom)
  const roomTypes = useRoomTypesStore((state) => state.items)
  const roomTypesSource = useRoomTypesStore((state) => state.source)
  const loadRoomTypes = useRoomTypesStore((state) => state.load)
  const [roomTypeDialogOpen, setRoomTypeDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<RoomType | null>(null)
  const [roomTypeDialogKey, setRoomTypeDialogKey] = useState(0)
  const [roomDialogOpen, setRoomDialogOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [roomDialogKey, setRoomDialogKey] = useState(0)
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null)

  // The room types live in the database, so the list is loaded from the API.
  useEffect(() => { void loadRoomTypes() }, [loadRoomTypes])

  function openCreateType() {
    setEditingType(null)
    setRoomTypeDialogKey((key) => key + 1)
    setRoomTypeDialogOpen(true)
  }
  function openEditType(roomType: RoomType) {
    setEditingType(roomType)
    setRoomTypeDialogKey((key) => key + 1)
    setRoomTypeDialogOpen(true)
  }
  function openCreateRoom() {
    setEditingRoom(null)
    setRoomDialogKey((key) => key + 1)
    setRoomDialogOpen(true)
  }
  function openEditRoom(room: Room) {
    setEditingRoom(room)
    setRoomDialogKey((key) => key + 1)
    setRoomDialogOpen(true)
  }

  async function confirmDeleteRoom() {
    if (!deletingRoom) return
    const room = deletingRoom
    const removed = await removeRoom(room.id)
    if (removed) {
      toast.success(`Room ${room.number} deleted`, { description: 'Its in-room dining QR code no longer opens a menu.' })
    } else {
      toast.error('Room could not be deleted', { description: 'The room still has a guest or a booking in it, or the server could not be reached.' })
    }
  }

  const columns: DataTableColumn<Room>[] = [
    { key: 'number', header: 'Room', sortable: true, cell: (row) => <div><p className="font-display font-extrabold">{row.number}</p><p className="text-[10px] text-muted-foreground">Floor {row.floor}</p></div> },
    { key: 'type', header: 'Room type', cell: (row) => <span className="text-xs font-semibold">{row.type}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusPill status={row.status} dot /> },
    { key: 'housekeepingStatus', header: 'Housekeeping', cell: (row) => <StatusPill status={row.housekeepingStatus} /> },
    { key: 'guestName', header: 'Guest', cell: (row) => <span className="text-xs text-muted-foreground">{row.guestName ?? '—'}</span> },
    { key: 'rate', header: 'Rate', align: 'right', cell: (row) => <span className="text-xs font-bold">{formatCurrency(row.rate)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      exportValue: () => '',
      cell: (row) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={() => openEditRoom(row)}><Pencil /> Edit</Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeletingRoom(row)}><Trash2 /> Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rooms & room types"
        description="Manage physical rooms, categories, rates and amenities."
        breadcrumbs={[{ label: 'Hotel operations' }, { label: 'Rooms' }]}
        actions={
          <>
            <Button variant="outline" onClick={openCreateRoom}><Plus /> Add room</Button>
            <Button onClick={openCreateType}><Plus /> Add room type</Button>
          </>
        }
      />
      <Tabs defaultValue="rooms">
        <TabsList>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="types">Room types</TabsTrigger>
        </TabsList>
        <TabsContent value="rooms">
          <Card>
            <CardContent className="pt-5">
              <DataTable
                data={rooms}
                columns={columns}
                searchPlaceholder="Search room, type or guest…"
                searchKeys={[(row) => row.number, (row) => row.type, (row) => row.guestName ?? '']}
                pageSize={10}
                filename="rooms.csv"
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="types">
          <div className="space-y-4">
            {roomTypesSource === 'local' && (
              <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                These room types are the bundled ones. The server could not be reached, so a new room type is only saved on this device.
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {roomTypes.map((type) => {
                const gallery = type.gallery ?? []
                const cover = type.image || gallery[0]
                return (
                  <Card key={type.id} className="overflow-hidden">
                    {cover ? (
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                        <img src={cover} alt={type.name} className="size-full object-cover" />
                        {gallery.length > 1 && (
                          <div className="absolute bottom-2 right-2 flex gap-1">
                            {gallery.slice(1, 4).map((picture, index) => (
                              <img key={`${picture.slice(0, 40)}-${index}`} src={picture} alt="" className="size-9 rounded-md border border-white/70 object-cover shadow-sm" />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex aspect-[16/9] w-full items-center justify-center bg-muted/40">
                        <ImageOff className="size-6 text-muted-foreground" aria-hidden="true" />
                      </div>
                    )}
                    <CardHeader className="flex-row items-start justify-between space-y-0">
                      <div>
                        <CardTitle>{type.name}</CardTitle>
                        <CardDescription>{type.code} · {type.capacity} guests</CardDescription>
                      </div>
                      <Badge variant="success">{type.totalRooms} rooms</Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="font-display text-2xl font-extrabold">{formatCurrency(type.baseRate)}<span className="text-xs font-medium text-muted-foreground"> / night</span></p>
                      <div className="mt-4 flex flex-wrap gap-1.5">{type.amenities.map((amenity) => <Badge key={amenity} variant="outline">{amenity}</Badge>)}</div>
                      <Button variant="outline" size="sm" className="mt-5 w-full" onClick={() => openEditType(type)}><Pencil /> Edit room type</Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
      <RoomTypeDialog key={roomTypeDialogKey} open={roomTypeDialogOpen} onOpenChange={setRoomTypeDialogOpen} roomType={editingType} />
      <RoomDialog key={roomDialogKey} open={roomDialogOpen} onOpenChange={setRoomDialogOpen} room={editingRoom} />
      <ConfirmDialog
        open={Boolean(deletingRoom)}
        onOpenChange={(open) => { if (!open) setDeletingRoom(null) }}
        title={deletingRoom ? `Delete room ${deletingRoom.number}?` : 'Delete room?'}
        description="The room leaves the rack and its in-room dining QR code stops working. The past orders of the room are kept."
        confirmLabel="Delete room"
        destructive
        onConfirm={confirmDeleteRoom}
      />
    </div>
  )
}

const taskColumns: TaskStatus[] = ['Dirty', 'In Progress', 'Inspected', 'Clean']
const taskColumnStyles: Record<TaskStatus, string> = { Dirty: 'bg-amber-500', 'In Progress': 'bg-blue-500', Inspected: 'bg-violet-500', Clean: 'bg-emerald-500' }

export function HousekeepingPage() {
  const [tasks, setTasks] = useState(seedTasks)
  const [dragging, setDragging] = useState<string | null>(null)
  function drop(status: TaskStatus) {
    if (!dragging) return
    setTasks((current) => current.map((task) => task.id === dragging ? { ...task, status } : task))
    toast.success('Task moved', { description: `Board updated to ${status}.` })
    setDragging(null)
  }
  return <div className="space-y-6"><PageHeader title="Housekeeping board" description="Drag room tasks through cleaning, inspection and release." breadcrumbs={[{ label: 'Hotel operations' }, { label: 'Housekeeping' }]} actions={<Button onClick={() => toast.success('Room attendant rounds generated')}><Brush /> Generate rounds</Button>} /><div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">{taskColumns.map((status) => { const columnTasks = tasks.filter((task) => task.status === status); return <Card key={status} onDragOver={(event) => event.preventDefault()} onDrop={() => drop(status)} className="min-h-[420px] bg-muted/25"><CardHeader className="flex-row items-center justify-between"><div className="flex items-center gap-2"><span className={cn('size-2.5 rounded-full', taskColumnStyles[status])} /><CardTitle>{status}</CardTitle></div><Badge variant="secondary">{columnTasks.length}</Badge></CardHeader><CardContent className="space-y-2.5">{columnTasks.map((task) => <div key={task.id} draggable onDragStart={() => setDragging(task.id)} onDragEnd={() => setDragging(null)} className={cn('group cursor-grab rounded-xl border border-border bg-card p-3 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing', dragging === task.id && 'opacity-40')}><div className="flex items-start gap-2"><GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between"><p className="font-display text-sm font-extrabold">Room {task.roomNumber}</p><StatusPill status={task.priority} /></div><p className="mt-1 text-[11px] text-muted-foreground">{task.roomType} · Floor {task.floor}</p><div className="mt-3 flex items-center justify-between border-t border-border pt-2.5"><span className="text-[10px] font-semibold text-muted-foreground">{task.assignee}</span><span className="text-[10px] font-bold">{task.dueAt.split(' ').slice(1).join(' ')}</span></div>{task.notes && <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-[10px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">{task.notes}</p>}</div></div></div>)}</CardContent></Card> })}</div></div>
}

const ticketSchema = z.object({ title: z.string().min(4, 'Describe the issue'), roomNumber: z.string().optional(), category: z.enum(['HVAC', 'Plumbing', 'Electrical', 'Furniture', 'General']), priority: z.enum(['Low', 'Medium', 'High', 'Critical']), description: z.string().min(8, 'Add a short description') })
type TicketValues = z.infer<typeof ticketSchema>

export function MaintenancePage() {
  const [tickets, setTickets] = useState(seedTickets)
  const [open, setOpen] = useState(false)
  const form = useForm<TicketValues>({ resolver: zodResolver(ticketSchema), defaultValues: { category: 'General', priority: 'Medium' } })
  function submit(values: TicketValues) {
    const ticket: MaintenanceTicket = { id: `mnt-new-${Date.now()}`, title: values.title, roomNumber: values.roomNumber, category: values.category, priority: values.priority, status: 'Open', assignee: 'Unassigned', reportedBy: 'Elena Vasquez', createdAt: new Date().toISOString(), description: values.description }
    setTickets((current) => [ticket, ...current])
    toast.success('Maintenance ticket created', { description: `${ticket.id.toUpperCase()} · ${ticket.title}` })
    setOpen(false)
    form.reset()
  }
  const columns: DataTableColumn<MaintenanceTicket>[] = [
    { key: 'id', header: 'Ticket', sortable: true, cell: (row) => <div><p className="font-mono text-[10px] font-bold text-primary">{row.id.toUpperCase()}</p><p className="mt-0.5 font-bold">{row.title}</p></div> },
    { key: 'roomNumber', header: 'Location', cell: (row) => <span className="text-xs font-semibold">Room {row.roomNumber ?? 'Common'}</span> },
    { key: 'category', header: 'Category', cell: (row) => <Badge variant="outline">{row.category}</Badge> },
    { key: 'priority', header: 'Priority', cell: (row) => <StatusPill status={row.priority} /> },
    { key: 'status', header: 'Status', cell: (row) => <StatusPill status={row.status} /> },
    { key: 'assignee', header: 'Assigned to', cell: (row) => <span className="text-xs">{row.assignee}</span> },
    { key: 'actions', header: 'Action', align: 'right', cell: (row) => row.status === 'Resolved' ? <span className="text-xs text-muted-foreground">Closed</span> : <Button size="sm" variant="outline" onClick={() => { setTickets((current) => current.map((ticket) => ticket.id === row.id ? { ...ticket, status: 'Resolved' } : ticket)); toast.success('Ticket resolved') }}><Check /> Resolve</Button> },
  ]
  return <div className="space-y-6"><PageHeader title="Maintenance" description="Report, assign and resolve property maintenance issues." breadcrumbs={[{ label: 'Hotel operations' }, { label: 'Maintenance' }]} actions={<Button onClick={() => setOpen(true)}><Plus /> Report issue</Button>} /><Card><CardContent className="pt-5"><DataTable data={tickets} columns={columns} searchPlaceholder="Search ticket, room or issue…" searchKeys={[(row) => row.id, (row) => row.title, (row) => row.roomNumber ?? '', (row) => row.assignee]} pageSize={10} filename="maintenance-tickets.csv" selectable /></CardContent></Card><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Report maintenance issue</DialogTitle><DialogDescription>Create a traceable ticket for the technical team.</DialogDescription></DialogHeader><form onSubmit={form.handleSubmit(submit)} className="space-y-4"><div className="space-y-1.5"><Label>Issue title</Label><Input {...form.register('title')} placeholder="Short issue summary" /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>Room number</Label><Input {...form.register('roomNumber')} placeholder="Optional" /></div><div className="space-y-1.5"><Label>Category</Label><select {...form.register('category')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option>HVAC</option><option>Plumbing</option><option>Electrical</option><option>Furniture</option><option>General</option></select></div></div><div className="space-y-1.5"><Label>Priority</Label><select {...form.register('priority')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div><div className="space-y-1.5"><Label>Description</Label><Textarea {...form.register('description')} placeholder="What happened and when?" /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit"><Wrench /> Create ticket</Button></DialogFooter></form></DialogContent></Dialog></div>
}
