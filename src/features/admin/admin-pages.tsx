import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, CalendarDays, Check, CheckCircle2, Clock3, Copy, Download, FileClock, Pencil, Plus, RotateCcw, Save, ShieldCheck, Trash2, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { KitchenPrinterSettings } from '@/features/admin/printer-settings'
import { PaymentGatewaySettings } from '@/features/admin/payment-settings'
import { KpiCard } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { StatusPill } from '@/components/common/status-pill'
import { apiPost, apiPut, getApiToken, SERVER_ENABLED } from '@/lib/api-client'
import { logActivity } from '@/lib/activity-log'
import { roleLabels } from '@/lib/rbac'
import { auditLogs, demoUsers, eventBookings, shifts } from '@/mock/data'
import { useAuthStore } from '@/store/authStore'
import { defaultSeoSettings, useSeoStore, type SeoSettings } from '@/store/seoStore'
import { notificationRows, useSettingsStore, type OutletSetting } from '@/store/settingsStore'
import { useActivityLogStore } from '@/store/activityLogStore'
import { useRbacStore } from '@/store/rbacStore'
import { useStaffStore } from '@/store/staffStore'
import { cn, copyToClipboard, downloadCsv, formatCurrency, formatDate } from '@/lib/utils'
import type { EventBooking, Permission, Role, User } from '@/types/domain'

const staffSchema = z.object({
  name: z.string().min(2, 'Enter a full name.'),
  email: z.email('Enter a valid email address.'),
  role: z.enum(Object.keys(roleLabels) as [Role, ...Role[]]),
  department: z.string().min(2, 'Enter a department.'),
  status: z.enum(['Active', 'On leave', 'Inactive']),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
})
type StaffForm = z.infer<typeof staffSchema>

const staffDefaults: StaffForm = { name: '', email: '', role: 'WAITER', department: 'Restaurant', status: 'Active', password: 'demo123' }

export function StaffPage() {
  const addedStaff = useStaffStore((state) => state.addedStaff)
  const edits = useStaffStore((state) => state.edits)
  const addStaff = useStaffStore((state) => state.addStaff)
  const updateStaff = useStaffStore((state) => state.updateStaff)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<User | null>(null)
  const staff = [...addedStaff, ...demoUsers].map((user) => edits[user.id] ?? user)

  const form = useForm<StaffForm>({ resolver: zodResolver(staffSchema), defaultValues: staffDefaults })
  const editForm = useForm<StaffForm>({ resolver: zodResolver(staffSchema), defaultValues: staffDefaults })

  function openEdit(user: User) {
    setEditingStaff(user)
    editForm.reset({ name: user.name, email: user.email, role: user.role, department: user.department, status: user.status, password: 'demo123' })
    setEditOpen(true)
  }

  function exportRoster() {
    downloadCsv('staff-roster.csv', shifts.map((shift) => ({
      date: shift.date, staff: shift.staffName, department: shift.department,
      station: shift.station, start: shift.start, end: shift.end, status: shift.status,
    })))
    logActivity({ action: 'Shift roster exported', module: 'Staff & HR', detail: `${shifts.length} shifts` })
    toast.success('Shift roster exported', { description: `${shifts.length} shifts written to CSV` })
  }

  async function editSubmit(values: StaffForm) {
    if (!editingStaff) return
    const updated: User = { ...editingStaff, name: values.name, email: values.email, role: values.role, department: values.department, status: values.status }
    if (SERVER_ENABLED && getApiToken()) {
      try { await apiPut(`/resource/users/${editingStaff.id}`, { ...updated, password: values.password }) }
      catch (error) { toast.error('Staff member not updated', { description: error instanceof Error ? error.message : 'Please try again.' }); return }
    }
    updateStaff(updated)
    toast.success('Staff member updated', { description: `${updated.name} · ${roleLabels[updated.role]}` })
    setEditOpen(false)
    setEditingStaff(null)
  }

  async function submit(values: StaffForm) {
    const user: User = { id: `usr-${crypto.randomUUID()}`, name: values.name, email: values.email, role: values.role, department: values.department, status: values.status, lastActive: 'Just now' }
    if (SERVER_ENABLED && getApiToken()) {
      try { await apiPost('/resource/users', { ...user, password: values.password }) }
      catch (error) { toast.error('Staff member not added', { description: error instanceof Error ? error.message : 'Please try again.' }); return }
    }
    addStaff(user)
    toast.success('Staff member added', { description: `${user.name} · ${roleLabels[user.role]}` })
    setAddOpen(false)
    form.reset(staffDefaults)
  }

  const columns: DataTableColumn<User>[] = [
    { key: 'name', header: 'Team member', sortable: true, cell: (row) => <div className="flex min-w-[210px] items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">{row.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><div><p className="font-bold">{row.name}</p><p className="text-[10px] text-muted-foreground">{row.email}</p></div></div> },
    { key: 'department', header: 'Department', cell: (row) => <Badge variant="outline">{row.department}</Badge> },
    { key: 'role', header: 'Role', cell: (row) => <span className="text-xs font-semibold">{roleLabels[row.role]}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusPill status={row.status} /> },
    { key: 'lastActive', header: 'Last active', cell: (row) => <span className="text-xs text-muted-foreground">{row.lastActive}</span> },
    { key: 'actions', header: 'Action', align: 'right', cell: (row) => <Button size="sm" variant="outline" onClick={() => openEdit(row)}><Pencil /> Edit</Button> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Staff & HR" description="Team directory, roles, attendance and shift coverage." breadcrumbs={[{ label: 'People & events' }, { label: 'Staff & HR' }]} actions={<><Button variant="outline" onClick={exportRoster}><Download /> Roster</Button><Button onClick={() => setAddOpen(true)}><Plus /> Add staff</Button></>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Team members" value={staff.length} changeLabel="across departments" icon={Users} tone="teal" />
        <KpiCard label="On shift now" value={shifts.filter((shift) => shift.status === 'Clocked in').length} changeLabel="clocked in" icon={Clock3} tone="blue" live />
        <KpiCard label="Attendance rate" value="96.8%" change={1.4} changeLabel="this month" icon={Check} tone="violet" />
        <KpiCard label="Open positions" value="4" changeLabel="2 in operations" icon={UserRound} tone="amber" />
      </div>
      <Tabs defaultValue="directory">
        <TabsList><TabsTrigger value="directory">Directory</TabsTrigger><TabsTrigger value="schedule">Shift schedule</TabsTrigger><TabsTrigger value="attendance">Attendance</TabsTrigger></TabsList>
        <TabsContent value="directory"><Card><CardContent className="pt-5"><DataTable data={staff} columns={columns} searchPlaceholder="Search staff, role or department…" searchKeys={[(row) => row.name, (row) => row.email, (row) => row.role, (row) => row.department]} pageSize={10} filename="staff-directory.csv" /></CardContent></Card></TabsContent>
        <TabsContent value="schedule"><div className="grid grid-cols-2 gap-3 md:grid-cols-7">{Array.from({ length: 7 }).map((_, dayIndex) => <Card key={dayIndex} className="min-h-72 p-3"><p className="mb-3 text-center text-xs font-bold">{formatDate(shifts[0].date, 'EEE')}<span className="mt-1 block font-display text-lg">{dayIndex + 18}</span></p><div className="space-y-2">{shifts.filter((_, index) => index % 7 === dayIndex).map((shift) => <div key={shift.id} className="rounded-lg border border-border p-2"><p className="text-[11px] font-bold">{shift.staffName}</p><p className="text-[10px] text-muted-foreground">{shift.start}–{shift.end} · {shift.status}</p></div>)}</div></Card>)}</div></TabsContent>
        <TabsContent value="attendance"><Card><CardContent className="pt-5"><DataTable data={shifts} columns={[{ key: 'staffName', header: 'Team member', sortable: true, cell: (row) => <span className="text-xs font-bold">{row.staffName}</span> }, { key: 'department', header: 'Department', cell: (row) => <span className="text-xs">{row.department}</span> }, { key: 'start', header: 'Shift', cell: (row) => <Badge variant="outline">{row.start}–{row.end}</Badge> }, { key: 'status', header: 'Status', cell: (row) => <StatusPill status={row.status} /> }]} searchPlaceholder="Search shifts…" searchKeys={[(row) => row.staffName, (row) => row.department]} pageSize={10} filename="attendance.csv" /></CardContent></Card></TabsContent>
      </Tabs>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Add staff member</DialogTitle><DialogDescription>Create a new staff account. All demo accounts use the password demo123.</DialogDescription></DialogHeader>
          <form onSubmit={form.handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="staff-name">Full name</Label><Input id="staff-name" {...form.register('name')} aria-invalid={Boolean(form.formState.errors.name)} />{form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}</div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="staff-email">Work email</Label><Input id="staff-email" type="email" {...form.register('email')} aria-invalid={Boolean(form.formState.errors.email)} />{form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}</div>
            <div className="space-y-1.5"><Label htmlFor="staff-role">Role</Label><select id="staff-role" {...form.register('role')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{Object.keys(roleLabels).map((role) => <option key={role} value={role}>{roleLabels[role as Role]}</option>)}</select></div>
            <div className="space-y-1.5"><Label htmlFor="staff-department">Department</Label><Input id="staff-department" {...form.register('department')} aria-invalid={Boolean(form.formState.errors.department)} />{form.formState.errors.department && <p className="text-xs text-destructive">{form.formState.errors.department.message}</p>}</div>
            <div className="space-y-1.5"><Label htmlFor="staff-status">Status</Label><select id="staff-status" {...form.register('status')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option>Active</option><option>On leave</option><option>Inactive</option></select></div>
            <div className="space-y-1.5"><Label htmlFor="staff-password">Password</Label><Input id="staff-password" {...form.register('password')} /><p className="text-[10px] text-muted-foreground">Demo password only; no real account is created.</p></div>
            <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button type="submit" disabled={form.formState.isSubmitting}><Plus /> Add staff</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingStaff(null) }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Edit staff member</DialogTitle><DialogDescription>Update role, department and account status for {editingStaff?.name}.</DialogDescription></DialogHeader>
          <form onSubmit={editForm.handleSubmit(editSubmit)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="edit-staff-name">Full name</Label><Input id="edit-staff-name" {...editForm.register('name')} aria-invalid={Boolean(editForm.formState.errors.name)} />{editForm.formState.errors.name && <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>}</div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="edit-staff-email">Work email</Label><Input id="edit-staff-email" type="email" {...editForm.register('email')} aria-invalid={Boolean(editForm.formState.errors.email)} />{editForm.formState.errors.email && <p className="text-xs text-destructive">{editForm.formState.errors.email.message}</p>}</div>
            <div className="space-y-1.5"><Label htmlFor="edit-staff-role">Role</Label><select id="edit-staff-role" {...editForm.register('role')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{Object.keys(roleLabels).map((role) => <option key={role} value={role}>{roleLabels[role as Role]}</option>)}</select></div>
            <div className="space-y-1.5"><Label htmlFor="edit-staff-department">Department</Label><Input id="edit-staff-department" {...editForm.register('department')} aria-invalid={Boolean(editForm.formState.errors.department)} />{editForm.formState.errors.department && <p className="text-xs text-destructive">{editForm.formState.errors.department.message}</p>}</div>
            <div className="space-y-1.5"><Label htmlFor="edit-staff-status">Status</Label><select id="edit-staff-status" {...editForm.register('status')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option>Active</option><option>On leave</option><option>Inactive</option></select></div>
            <div className="space-y-1.5"><Label htmlFor="edit-staff-password">New password</Label><Input id="edit-staff-password" {...editForm.register('password')} /><p className="text-[10px] text-muted-foreground">Leave as demo123 unless changing the demo password.</p></div>
            <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button type="submit" disabled={editForm.formState.isSubmitting}><Save /> Save changes</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const eventSchema = z.object({
  eventName: z.string().min(2, 'Enter an event name'),
  clientName: z.string().min(2, 'Enter a client name'),
  contact: z.string().min(3, 'Enter a contact'),
  hall: z.string().min(2, 'Select a hall'),
  date: z.string().min(1, 'Choose a date'),
  pax: z.number().int().min(1),
  packageName: z.string().min(2, 'Enter a package'),
  deposit: z.number().min(0),
  total: z.number().min(0),
  status: z.enum(['Enquiry', 'Confirmed', 'Completed', 'Cancelled']),
})
type EventForm = z.infer<typeof eventSchema>
const eventDefaults: EventForm = { eventName: '', clientName: '', contact: '', hall: 'Grand Ballroom', date: new Date().toISOString().slice(0, 10), pax: 50, packageName: 'Classic package', deposit: 0, total: 0, status: 'Enquiry' }

export function EventsPage() {
  const [events, setEvents] = useState<EventBooking[]>(eventBookings)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EventBooking | null>(null)
  const form = useForm<EventForm>({ resolver: zodResolver(eventSchema), defaultValues: eventDefaults })

  function openNew() { setEditing(null); form.reset(eventDefaults); setFormOpen(true) }
  function openEdit(event: EventBooking) {
    setEditing(event)
    form.reset({ eventName: event.eventName, clientName: event.clientName, contact: event.contact, hall: event.hall, date: event.date, pax: event.pax, packageName: event.packageName, deposit: event.deposit, total: event.total, status: event.status })
    setFormOpen(true)
  }
  function submit(values: EventForm) {
    if (editing) {
      setEvents((current) => current.map((event) => event.id === editing.id ? { ...event, ...values } : event))
      toast.success('Event updated', { description: values.eventName })
    } else {
      setEvents((current) => [{ id: `evt-${Date.now()}`, ...values }, ...current])
      toast.success('Event enquiry created', { description: values.eventName })
    }
    logActivity({ action: editing ? 'Event updated' : 'Event enquiry created', module: 'Events', detail: `${values.eventName} · ${values.status}` })
    setFormOpen(false)
  }
  function setStatus(id: string, status: EventBooking['status']) {
    const event = events.find((candidate) => candidate.id === id)
    if (!event) return
    setEvents((current) => current.map((candidate) => candidate.id === id ? { ...candidate, status } : candidate))
    logActivity({ action: `Event ${status}`, module: 'Events', detail: `${event.eventName} · ${event.clientName}` })
    toast.success(`Event marked ${status.toLowerCase()}`, { description: event.eventName })
  }

  const columns: DataTableColumn<EventBooking>[] = [
    { key: 'eventName', header: 'Event', sortable: true, cell: (row) => <div><p className="font-bold">{row.eventName}</p><p className="text-[10px] text-muted-foreground">{row.clientName} · {row.contact}</p></div> },
    { key: 'hall', header: 'Venue', cell: (row) => <span className="text-xs font-semibold">{row.hall}</span> },
    { key: 'date', header: 'Date', sortable: true, cell: (row) => <span className="text-xs">{formatDate(row.date)}</span> },
    { key: 'pax', header: 'Guests', align: 'right', cell: (row) => <span className="text-xs font-bold">{row.pax}</span> },
    { key: 'deposit', header: 'Deposit', align: 'right', cell: (row) => <span className="text-xs font-bold">{formatCurrency(row.deposit)}</span> },
    { key: 'total', header: 'Value', align: 'right', cell: (row) => <span className="text-xs font-bold">{formatCurrency(row.total)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusPill status={row.status} /> },
    { key: 'actions', header: 'Action', align: 'right', cell: (row) => <div className="flex justify-end gap-1">{row.status === 'Enquiry' && <Button size="sm" onClick={() => setStatus(row.id, 'Confirmed')}><Check /> Confirm</Button>}<Button size="sm" variant="ghost" onClick={() => openEdit(row)}><Pencil /> Manage</Button>{row.status === 'Confirmed' && <Button size="sm" variant="ghost" onClick={() => setStatus(row.id, 'Cancelled')}><Trash2 /> Cancel</Button>}</div> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Events & banquet" description="Manage enquiries, deposits, menus and event delivery." breadcrumbs={[{ label: 'People & events' }, { label: 'Events & banquet' }]} actions={<Button onClick={openNew}><Plus /> New event</Button>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Enquiries" value={events.filter((event) => event.status === 'Enquiry').length} changeLabel="awaiting confirmation" icon={CalendarDays} tone="blue" />
        <KpiCard label="Confirmed events" value={events.filter((event) => event.status === 'Confirmed').length} changeLabel={formatCurrency(events.filter((event) => event.status === 'Confirmed').reduce((sum, event) => sum + event.total, 0)) + ' value'} icon={Check} tone="teal" />
        <KpiCard label="Guests expected" value={events.filter((event) => event.status !== 'Cancelled').reduce((sum, event) => sum + event.pax, 0)} changeLabel="across active events" icon={Users} tone="violet" />
        <KpiCard label="Deposit collected" value={formatCurrency(events.reduce((sum, event) => sum + event.deposit, 0))} changeLabel="towards event contracts" icon={FileClock} tone="amber" />
      </div>
      <Card><CardContent className="pt-5"><DataTable data={events} columns={columns} searchPlaceholder="Search event, client or venue…" searchKeys={[(row) => row.eventName, (row) => row.clientName, (row) => row.hall, (row) => row.contact]} initialSort={{ key: 'date', direction: 'asc' }} pageSize={8} filename="event-bookings.csv" /></CardContent></Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? 'Manage event' : 'New event enquiry'}</DialogTitle><DialogDescription>Edit the booking details or move it to another status.</DialogDescription></DialogHeader>
          <form onSubmit={form.handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2">
            {([['eventName', 'Event name'], ['clientName', 'Client'], ['contact', 'Contact'], ['date', 'Event date']] as const).map(([field, label]) => (
              <div key={field} className="space-y-1.5 sm:col-span-2"><Label htmlFor={`event-${field}`}>{label}</Label><Input id={`event-${field}`} type={field === 'date' ? 'date' : 'text'} {...form.register(field)} aria-invalid={Boolean(form.formState.errors[field])} />{form.formState.errors[field] && <p className="text-xs text-destructive">{form.formState.errors[field]?.message}</p>}</div>
            ))}
            <div className="space-y-1.5"><Label htmlFor="event-hall">Hall</Label><select id="event-hall" {...form.register('hall')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{['Grand Ballroom', 'Terrace Hall', 'Boardroom', 'Garden Pavilion'].map((hall) => <option key={hall}>{hall}</option>)}</select></div>
            <div className="space-y-1.5"><Label htmlFor="event-status">Status</Label><select id="event-status" {...form.register('status')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option>Enquiry</option><option>Confirmed</option><option>Completed</option><option>Cancelled</option></select></div>
            <div className="space-y-1.5"><Label htmlFor="event-pax">Guests</Label><Input id="event-pax" type="number" min={1} {...form.register('pax', { valueAsNumber: true })} /></div>
            <div className="space-y-1.5"><Label htmlFor="event-package">Package</Label><Input id="event-package" {...form.register('packageName')} /></div>
            <div className="space-y-1.5"><Label htmlFor="event-deposit">Deposit</Label><Input id="event-deposit" type="number" min={0} {...form.register('deposit', { valueAsNumber: true })} /></div>
            <div className="space-y-1.5"><Label htmlFor="event-total">Contract value</Label><Input id="event-total" type="number" min={0} {...form.register('total', { valueAsNumber: true })} /></div>
            <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button type="submit"><Save /> {editing ? 'Save event' : 'Create enquiry'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const hotelSchema = z.object({ name: z.string().min(2), email: z.email(), phone: z.string().min(7), address: z.string().min(5), timezone: z.string().min(2), currency: z.string().min(3) })
type HotelValues = z.infer<typeof hotelSchema>

function HotelProfileForm() {
  const hotel = useSettingsStore((state) => state.hotel)
  const updateHotel = useSettingsStore((state) => state.updateHotel)
  const markSaved = useSettingsStore((state) => state.markSaved)
  const form = useForm<HotelValues>({ resolver: zodResolver(hotelSchema), defaultValues: hotel })

  function save(values: HotelValues) {
    updateHotel(values)
    markSaved()
    logActivity({ action: 'Hotel profile updated', module: 'Settings', detail: values.name })
    toast.success('Hotel profile saved', { description: values.name })
  }

  return (
    <Card>
      <CardHeader><CardTitle>Hotel profile</CardTitle><CardDescription>Property identity and regional defaults</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(save)} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="hotel-name">Property name</Label><Input id="hotel-name" {...form.register('name')} />{form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}</div>
          <div className="space-y-1.5"><Label htmlFor="hotel-email">Contact email</Label><Input id="hotel-email" type="email" {...form.register('email')} />{form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}</div>
          <div className="space-y-1.5"><Label htmlFor="hotel-phone">Phone</Label><Input id="hotel-phone" {...form.register('phone')} /></div>
          <div className="space-y-1.5"><Label htmlFor="hotel-timezone">Timezone</Label><select id="hotel-timezone" {...form.register('timezone')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option>America/New_York</option><option>Europe/London</option><option>Asia/Dubai</option><option>Asia/Tokyo</option></select></div>
          <div className="space-y-1.5"><Label htmlFor="hotel-address">Address</Label><Input id="hotel-address" {...form.register('address')} /></div>
          <div className="space-y-1.5"><Label htmlFor="hotel-currency">Currency</Label><select id="hotel-currency" {...form.register('currency')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="NGN">NGN — Nigerian Naira (₦)</option></select></div>
          <div className="sm:col-span-2"><Button type="submit"><Save /> Save profile</Button></div>
        </form>
      </CardContent>
    </Card>
  )
}

const permissionGroups: Array<{ label: string; permissions: Permission[] }> = [
  { label: 'Overview', permissions: ['dashboard.view'] },
  { label: 'Reservations', permissions: ['reservation.view', 'reservation.create', 'reservation.edit', 'reservation.checkin', 'reservation.checkout', 'reservation.cancel'] },
  { label: 'Hotel operations', permissions: ['room.view', 'room.manage', 'housekeeping.view', 'housekeeping.manage', 'maintenance.view', 'maintenance.manage'] },
  { label: 'Guests & CRM', permissions: ['guest.view', 'guest.manage', 'guest.crm'] },
  { label: 'Restaurant', permissions: ['restaurant.pos', 'restaurant.menu', 'restaurant.kds', 'restaurant.orders', 'restaurant.inventory'] },
  { label: 'Bar', permissions: ['bar.pos', 'bar.tabs', 'bar.kds', 'bar.inventory'] },
  { label: 'Inventory', permissions: ['inventory.view', 'inventory.manage', 'inventory.alerts', 'inventory.po', 'inventory.transfer', 'inventory.requisition', 'inventory.stocktake', 'supplier.manage'] },
  { label: 'Finance & reporting', permissions: ['billing.view', 'billing.manage', 'report.view'] },
  { label: 'Accounting', permissions: ['finance:view', 'accounts:view', 'accounts:create', 'accounts:edit', 'accounts:delete', 'journal:view', 'journal:create', 'journal:post', 'journal:reverse', 'invoice:view', 'invoice:create', 'invoice:approve', 'bill:view', 'bill:create', 'bill:approve', 'expense:view', 'expense:approve', 'payment:view', 'payment:create', 'payment:reconcile', 'bank:view', 'bank:reconcile', 'budget:view', 'budget:manage', 'tax:view', 'tax:manage', 'report:finance', 'audit:view', 'settings:finance'] },
  { label: 'People & events', permissions: ['staff.view', 'staff.manage', 'event.view', 'event.manage'] },
  { label: 'Administration', permissions: ['settings.view', 'settings.manage', 'settings.rbac'] },
]

function SelectSimple({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-xs"><option>Nearest cent</option><option>Nearest 0.05</option></select>
}

function SeoSettingsPanel() {
  const settings = useSeoStore((state) => state.settings)
  const update = useSeoStore((state) => state.update)
  const reset = useSeoStore((state) => state.reset)
  const [draft, setDraft] = useState<SeoSettings>(settings)
  const [preview, setPreview] = useState(false)

  function patch<K extends keyof SeoSettings>(key: K, value: SeoSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }
  function save() {
    if (!/^https?:\/\/\S+/.test(draft.canonicalBaseUrl.trim())) {
      toast.error('Enter a full canonical URL', { description: 'Include https:// and your public domain.' })
      return
    }
    update(draft)
    useSettingsStore.getState().markSaved()
    logActivity({ action: 'SEO settings updated', module: 'Settings', detail: draft.canonicalBaseUrl })
    toast.success('SEO settings saved', { description: 'Metadata and structured data updated on the public website.' })
  }
  async function copySiteFiles() {
    const base = draft.canonicalBaseUrl.replace(/\/$/, '')
    const paths = ['/', '/rooms', '/apartments', '/amenities', '/dining', '/gallery', '/about', '/contact', '/booking/dates', '/manage-booking']
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((path) => `  <url><loc>${base}${path}</loc></url>`).join('\n')}\n</urlset>`
    const robots = `User-agent: *\nAllow: /\nDisallow: /staff/\nDisallow: /display/\nDisallow: /room/\n\nSitemap: ${base}/sitemap.xml`
    await copyToClipboard(`${sitemap}\n\n--- robots.txt ---\n\n${robots}`)
    toast.success('Site files copied', { description: 'Replace public/sitemap.xml and public/robots.txt on your host.' })
  }
  async function copyTags() {
    const tags = [
      `<title>${draft.defaultTitle}</title>`,
      `<meta name="description" content="${draft.description}" />`,
      `<link rel="canonical" href="${draft.canonicalBaseUrl.replace(/\/$/, '')}/" />`,
      `<meta property="og:title" content="${draft.defaultTitle}" />`,
      `<meta property="og:description" content="${draft.description}" />`,
      `<meta property="og:image" content="${draft.ogImage}" />`,
      draft.googleVerification ? `<meta name="google-site-verification" content="${draft.googleVerification}" />` : '',
    ].filter(Boolean)
    await copyToClipboard(tags.join('\n'))
    toast.success('Meta tags copied', { description: 'Paste these into your static host if needed.' })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Search engine settings</CardTitle>
          <CardDescription>These values drive page titles, meta tags, canonical URLs, social previews and Hotel structured data on the public website.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="seo-site-name">Site name</Label><Input id="seo-site-name" value={draft.siteName} onChange={(event) => patch('siteName', event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="seo-title">Default page title</Label><Input id="seo-title" value={draft.defaultTitle} onChange={(event) => patch('defaultTitle', event.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="seo-description">Meta description</Label><Textarea id="seo-description" value={draft.description} onChange={(event) => patch('description', event.target.value)} placeholder="150–160 characters works best" /><p className="text-[10px] text-muted-foreground">{draft.description.length} characters</p></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="seo-keywords">Keywords</Label><Input id="seo-keywords" value={draft.keywords} onChange={(event) => patch('keywords', event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="seo-base-url">Canonical base URL</Label><Input id="seo-base-url" value={draft.canonicalBaseUrl} onChange={(event) => patch('canonicalBaseUrl', event.target.value)} placeholder="https://your-domain.com" /><p className="text-[10px] text-muted-foreground">Use the public HTTPS domain registered in Search Console.</p></div>
          <div className="space-y-1.5"><Label htmlFor="seo-locale">Locale</Label><select id="seo-locale" value={draft.locale} onChange={(event) => patch('locale', event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="en_NG">English (Nigeria)</option><option value="en_US">English (US)</option><option value="en_GB">English (UK)</option></select></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="seo-og-image">Social preview image URL</Label><Input id="seo-og-image" value={draft.ogImage} onChange={(event) => patch('ogImage', event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="seo-twitter">Twitter handle</Label><Input id="seo-twitter" value={draft.twitterHandle} onChange={(event) => patch('twitterHandle', event.target.value)} placeholder="@hayatahotel" /></div>
          <div className="space-y-1.5"><Label htmlFor="seo-theme">Theme colour</Label><Input id="seo-theme" type="color" value={draft.themeColor} onChange={(event) => patch('themeColor', event.target.value)} className="h-10 w-full p-1" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Search Console verification</CardTitle><CardDescription>Paste the verification values from Google Search Console and Bing Webmaster Tools. They are added as meta tags on the homepage.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="seo-google">Google verification content</Label><Input id="seo-google" value={draft.googleVerification} onChange={(event) => patch('googleVerification', event.target.value)} placeholder="google-site-verification code" /></div>
          <div className="space-y-1.5"><Label htmlFor="seo-bing">Bing verification content</Label><Input id="seo-bing" value={draft.bingVerification} onChange={(event) => patch('bingVerification', event.target.value)} placeholder="msvalidate.01 code" /></div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3 sm:col-span-2"><div><p className="text-sm font-bold">Allow indexing</p><p className="text-xs text-muted-foreground">Turn off to add noindex to every public page (useful while staging).</p></div><Switch checked={draft.indexEnabled} onCheckedChange={(value) => patch('indexEnabled', value)} aria-label="Allow search engine indexing" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hotel structured data</CardTitle><CardDescription>Published as JSON-LD so search engines understand the property.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="seo-hotel-name">Hotel name</Label><Input id="seo-hotel-name" value={draft.hotel.name} onChange={(event) => patch('hotel', { ...draft.hotel, name: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="seo-hotel-phone">Telephone</Label><Input id="seo-hotel-phone" value={draft.hotel.telephone} onChange={(event) => patch('hotel', { ...draft.hotel, telephone: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="seo-hotel-address">Address</Label><Input id="seo-hotel-address" value={draft.hotel.address} onChange={(event) => patch('hotel', { ...draft.hotel, address: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="seo-hotel-price">Price range</Label><Input id="seo-hotel-price" value={draft.hotel.priceRange} onChange={(event) => patch('hotel', { ...draft.hotel, priceRange: event.target.value })} /></div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={save}><CheckCircle2 /> Save SEO settings</Button>
        <Button variant="outline" onClick={() => setPreview(true)}><ShieldCheck /> Preview Google result</Button>
        <Button variant="outline" onClick={() => void copyTags()}><Copy /> Copy meta tags</Button>
        <Button variant="outline" onClick={() => void copySiteFiles()}><Copy /> Copy sitemap &amp; robots</Button>
        <Button variant="ghost" onClick={() => { reset(); setDraft(defaultSeoSettings); toast.success('SEO settings reset') }}><RotateCcw /> Reset defaults</Button>
      </div>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Google result preview</DialogTitle><DialogDescription>Approximate snippet for the homepage.</DialogDescription></DialogHeader>
          <div className="rounded-xl border border-border p-5">
            <p className="text-xs text-muted-foreground">{draft.canonicalBaseUrl.replace(/\/$/, '')} › Home</p>
            <p className="mt-1 text-lg text-blue-700 dark:text-blue-400">{draft.defaultTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{draft.description}</p>
          </div>
          <DialogFooter><Button onClick={() => setPreview(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function SettingsPage() {
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const [selectedRole, setSelectedRole] = useState<Role>('HOTEL_MANAGER')
  const [outletOpen, setOutletOpen] = useState<string | null>(null)
  const [outletDraft, setOutletDraft] = useState<OutletSetting>({ name: '', type: '', skus: 0, enabled: true })
  const user = useAuthStore((state) => state.user)
  const permissionsByRole = useRbacStore((state) => state.permissions)
  const setPermission = useRbacStore((state) => state.setPermission)
  const activities = useActivityLogStore((state) => state.activities)
  const settings = useSettingsStore()
  const allAuditLogs = [...activities, ...auditLogs]
  const activePermissions = permissionsByRole[selectedRole] ?? []
  const canManageRoles = user ? permissionsByRole[user.role]?.includes('settings.rbac') ?? false : false

  function togglePermission(permission: Permission, enabled: boolean) {
    setPermission(selectedRole, permission, enabled)
    logActivity({ action: enabled ? 'Permission granted' : 'Permission revoked', module: 'Access control', detail: `${selectedRole} · ${permission}` })
  }
  function saveAll() {
    settings.markSaved()
    logActivity({ action: 'Settings saved', module: 'Settings', detail: 'Property configuration' })
    toast.success('Settings saved', { description: 'All changes were applied successfully.' })
  }
  function openOutlet(key: string) { setOutletOpen(key); setOutletDraft({ ...settings.outlets[key] }) }
  function saveOutlet() {
    if (!outletOpen) return
    settings.updateOutlet(outletOpen, outletDraft)
    logActivity({ action: 'Outlet configured', module: 'Settings', detail: outletDraft.name })
    toast.success('Outlet settings saved', { description: outletDraft.name })
    setOutletOpen(null)
  }
  function saveTaxRate(label: string) {
    const raw = settings.taxRates[label] ?? ''
    const rate = Number(raw.replace('%', ''))
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) { toast.error('Invalid tax rate', { description: 'Enter a percentage between 0 and 100.' }); return }
    logActivity({ action: 'Tax rate updated', module: 'Settings', detail: `${label} · ${rate}%` })
    toast.success('Tax rate applied', { description: `${label} · ${rate}%` })
  }

  const auditColumns: DataTableColumn<typeof auditLogs[number]>[] = [
    { key: 'timestamp', header: 'Time', sortable: true, cell: (row) => <span className="text-xs whitespace-nowrap">{formatDate(row.timestamp, 'MMM d, h:mm a')}</span> },
    { key: 'actor', header: 'Actor', cell: (row) => <span className="text-xs font-bold">{row.actor}</span> },
    { key: 'module', header: 'Module', cell: (row) => <Badge variant="outline">{row.module}</Badge> },
    { key: 'action', header: 'Action', cell: (row) => <span className="text-xs font-semibold">{row.action}</span> },
    { key: 'ipAddress', header: 'IP address', hideOnMobile: true, cell: (row) => <span className="font-mono text-[10px] text-muted-foreground">{row.ipAddress}</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure property operations, notifications, access and compliance." breadcrumbs={[{ label: 'Administration' }, { label: 'Settings' }]} actions={<Button onClick={saveAll}><Save /> Save changes</Button>} />
      {settings.savedAt && <p className="text-xs text-muted-foreground">Last saved {formatDate(settings.savedAt, 'MMM d, h:mm a')}</p>}
      <Tabs defaultValue={requestedTab ?? 'property'}>
        <TabsList className="flex h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="property">Property</TabsTrigger>
          <TabsTrigger value="outlets">Outlets</TabsTrigger>
          <TabsTrigger value="taxes">Taxes & currency</TabsTrigger>
          <TabsTrigger value="printer">Kitchen printer</TabsTrigger>
          <TabsTrigger value="payments">Payment gateway</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          {canManageRoles && <TabsTrigger value="roles">Roles & permissions</TabsTrigger>}
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="property"><HotelProfileForm /></TabsContent>

        <TabsContent value="outlets">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(settings.outlets).map(([key, outlet]) => (
              <Card key={key}>
                <CardContent className="p-5">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 className="size-4" /></div>
                  <p className="font-display font-bold">{outlet.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{outlet.type}</p>
                  <div className="mt-4 flex justify-between border-t border-border pt-3 text-xs"><span className="text-muted-foreground">Active SKUs</span><span className="font-bold">{outlet.skus}</span></div>
                  <div className="mt-2 flex justify-between text-xs"><span className="text-muted-foreground">Status</span><StatusPill status={outlet.enabled ? 'Active' : 'Inactive'} /></div>
                  <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => openOutlet(key)}><Pencil /> Configure</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="taxes">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Tax configuration</CardTitle><CardDescription>Rates by outlet and service</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {Object.keys(settings.taxRates).map((label) => (
                  <div key={label} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <span className="text-sm font-semibold">{label}</span>
                    <div className="flex items-center gap-2">
                      <Input aria-label={`${label} rate`} value={settings.taxRates[label]} onChange={(event) => settings.setTaxRate(label, event.target.value)} className="w-24 text-right" />
                      <Button size="icon-sm" variant="outline" aria-label={`Apply ${label} rate`} onClick={() => saveTaxRate(label)}><Check /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Service charges</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><p className="text-sm font-bold">Restaurant service charge</p><p className="text-xs text-muted-foreground">Applied to dine-in bills</p></div><div className="flex items-center gap-2"><span className="text-sm font-bold">10%</span><Switch checked={settings.serviceCharges.restaurant} onCheckedChange={(value) => settings.setServiceCharge('restaurant', value)} aria-label="Restaurant service charge" /></div></div>
                <div className="flex items-center justify-between"><div><p className="text-sm font-bold">Tax inclusive pricing</p><p className="text-xs text-muted-foreground">Display taxes within menu prices</p></div><Switch checked={settings.serviceCharges.taxInclusive} onCheckedChange={(value) => settings.setServiceCharge('taxInclusive', value)} aria-label="Tax inclusive pricing" /></div>
                <div className="flex items-center justify-between"><div><p className="text-sm font-bold">Rounding rule</p><p className="text-xs text-muted-foreground">Round to nearest cent</p></div><SelectSimple value={settings.serviceCharges.rounding} onChange={(value) => settings.setServiceCharge('rounding', value)} /></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seo"><SeoSettingsPanel /></TabsContent>
        <TabsContent value="printer"><KitchenPrinterSettings /></TabsContent>
        <TabsContent value="payments"><PaymentGatewaySettings /></TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle>Notification preferences</CardTitle><CardDescription>Choose what triggers alerts and emails</CardDescription></CardHeader>
            <CardContent className="space-y-1">
              {notificationRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-border py-4 last:border-0">
                  <div><p className="text-sm font-bold">{row.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{row.detail}</p></div>
                  <Switch checked={Boolean(settings.notifications[row.label])} onCheckedChange={(value) => settings.setNotification(row.label, value)} aria-label={row.label} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {canManageRoles && <TabsContent value="roles">
          <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
            <Card className="h-fit">
              <CardHeader><CardTitle>Roles</CardTitle><CardDescription>Select a role to edit</CardDescription></CardHeader>
              <CardContent className="space-y-1">
                {(Object.keys(roleLabels) as Role[]).map((role) => (
                  <button key={role} type="button" onClick={() => setSelectedRole(role)} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition', selectedRole === role ? 'bg-primary/10 text-primary' : 'hover:bg-muted')}>
                    <span className={cn('flex size-8 items-center justify-center rounded-lg', selectedRole === role ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}><ShieldCheck className="size-4" /></span>
                    <span><span className="block text-xs font-bold">{roleLabels[role]}</span><span className="text-[10px] text-muted-foreground">{permissionsByRole[role]?.length ?? 0} permissions</span></span>
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex-row items-start justify-between">
                <div><CardTitle>{roleLabels[selectedRole]} permissions</CardTitle><CardDescription>Changes apply immediately in this demo</CardDescription></div>
                <Badge variant="warning">Demo editor</Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                {permissionGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{group.label}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.permissions.map((permission) => (
                        <label key={permission} className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3 transition hover:bg-muted/40">
                          <span><span className="block text-xs font-semibold">{permission.split(/[.:]/)[1]?.replaceAll('_', ' ') ?? permission}</span><span className="text-[9px] text-muted-foreground">{permission}</span></span>
                          <Switch checked={activePermissions.includes(permission)} onCheckedChange={(checked) => togglePermission(permission, checked)} />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>}

        <TabsContent value="audit">
          <Card><CardContent className="pt-5"><DataTable data={allAuditLogs} columns={auditColumns} searchPlaceholder="Search actor, action or module…" searchKeys={[(row) => row.actor, (row) => row.action, (row) => row.module, (row) => row.ipAddress]} pageSize={10} filename="audit-log.csv" /></CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(outletOpen)} onOpenChange={(open) => { if (!open) setOutletOpen(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Configure outlet</DialogTitle><DialogDescription>Update how this outlet appears in operations settings.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="outlet-name">Name</Label><Input id="outlet-name" value={outletDraft.name} onChange={(event) => setOutletDraft({ ...outletDraft, name: event.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="outlet-type">Description</Label><Input id="outlet-type" value={outletDraft.type} onChange={(event) => setOutletDraft({ ...outletDraft, type: event.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="outlet-skus">Active SKUs</Label><Input id="outlet-skus" type="number" min={0} value={outletDraft.skus} onChange={(event) => setOutletDraft({ ...outletDraft, skus: Number(event.target.value) || 0 })} /></div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3"><div><p className="text-sm font-bold">Outlet active</p><p className="text-xs text-muted-foreground">Include this outlet in operations.</p></div><Switch checked={outletDraft.enabled} onCheckedChange={(value) => setOutletDraft({ ...outletDraft, enabled: value })} aria-label="Outlet active" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOutletOpen(null)}>Cancel</Button><Button onClick={saveOutlet}><Save /> Save outlet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
