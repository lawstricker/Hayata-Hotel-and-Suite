import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, CalendarDays, Check, Clock3, FileClock, Pencil, Plus, Save, ShieldCheck, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { KitchenPrinterSettings } from '@/features/admin/printer-settings'
import { PaymentGatewaySettings } from '@/features/admin/payment-settings'
import { KpiCard } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { StatusPill } from '@/components/common/status-pill'
import { auditLogs, demoUsers, eventBookings, shifts } from '@/mock/data'
import { roleLabels } from '@/lib/rbac'
import { useAuthStore } from '@/store/authStore'
import { useRbacStore } from '@/store/rbacStore'
import { useStaffStore } from '@/store/staffStore'
import { apiPost, apiPut, getApiToken, SERVER_ENABLED } from '@/lib/api-client'
import { useActivityLogStore } from '@/store/activityLogStore'
import { logActivity } from '@/lib/activity-log'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { EventBooking, Permission, Role, User } from '@/types/domain'

export function StaffPage() {
  const addedStaff = useStaffStore((state) => state.addedStaff)
  const addStaff = useStaffStore((state) => state.addStaff)
  const updateStaff = useStaffStore((state) => state.updateStaff)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<User | null>(null)
  const staff = [...addedStaff, ...demoUsers]
  const roleOptions = Object.keys(roleLabels) as Role[]

  const staffSchema = z.object({
    name: z.string().min(2, 'Enter a full name.'),
    email: z.email('Enter a valid email address.'),
    role: z.enum(roleOptions as [Role, ...Role[]]),
    department: z.string().min(2, 'Enter a department.'),
    status: z.enum(['Active', 'On leave', 'Inactive']),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
  })
  type StaffForm = z.infer<typeof staffSchema>

  const form = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: '', email: '', role: 'WAITER', department: 'Restaurant', status: 'Active', password: 'demo123',
    },
  })
  const editForm = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: '', email: '', role: 'WAITER', department: 'Restaurant', status: 'Active', password: 'demo123',
    },
  })

  function openEdit(user: User) {
    setEditingStaff(user)
    editForm.reset({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status,
      password: 'demo123',
    })
    setEditOpen(true)
  }

  async function editSubmit(values: StaffForm) {
    if (!editingStaff) return
    const updated: User = {
      ...editingStaff,
      name: values.name,
      email: values.email,
      role: values.role,
      department: values.department,
      status: values.status,
    }
    if (SERVER_ENABLED && getApiToken()) {
      try {
        await apiPut(`/resource/users/${editingStaff.id}`, { ...updated, password: values.password })
      } catch (error) {
        toast.error('Staff member not updated', { description: error instanceof Error ? error.message : 'Please try again.' })
        return
      }
    }
    updateStaff(updated)
    toast.success('Staff member updated', { description: `${updated.name} · ${roleLabels[updated.role]}` })
    setEditOpen(false)
    setEditingStaff(null)
  }

  async function submit(values: StaffForm) {
    const user: User = {
      id: `usr-${Date.now()}`,
      name: values.name,
      email: values.email,
      role: values.role,
      department: values.department,
      status: values.status,
      lastActive: 'Just now',
    }
    if (SERVER_ENABLED && getApiToken()) {
      try {
        await apiPost('/resource/users', { ...user, password: values.password })
      } catch (error) {
        toast.error('Staff member not added', { description: error instanceof Error ? error.message : 'Please try again.' })
        return
      }
    }
    addStaff(user)
    toast.success('Staff member added', { description: `${user.name} · ${roleLabels[user.role]}` })
    setAddOpen(false)
    form.reset()
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
      <PageHeader title="Staff & HR" description="Team directory, roles, attendance and shift coverage." breadcrumbs={[{ label: 'People & events' }, { label: 'Staff & HR' }]} actions={<><Button variant="outline" onClick={() => toast.success('Shift roster exported')}><CalendarDays /> Roster</Button><Button onClick={() => setAddOpen(true)}><Plus /> Add staff</Button></>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Team members" value={staff.length} changeLabel="across departments" icon={Users} tone="teal" />
        <KpiCard label="On shift now" value="6" changeLabel="3 departments covered" icon={Clock3} tone="blue" live />
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
            <div className="space-y-1.5"><Label htmlFor="staff-role">Role</Label><select id="staff-role" {...form.register('role')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{roleOptions.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></div>
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
            <div className="space-y-1.5"><Label htmlFor="edit-staff-role">Role</Label><select id="edit-staff-role" {...editForm.register('role')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{roleOptions.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></div>
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

export function EventsPage() {
  const [events, setEvents] = useState(eventBookings)
  const columns: DataTableColumn<EventBooking>[] = [
    { key: 'eventName', header: 'Event', sortable: true, cell: (row) => <div><p className="font-bold">{row.eventName}</p><p className="text-[10px] text-muted-foreground">{row.clientName} · {row.contact}</p></div> },
    { key: 'hall', header: 'Venue', cell: (row) => <span className="text-xs font-semibold">{row.hall}</span> },
    { key: 'date', header: 'Date', sortable: true, cell: (row) => <span className="text-xs">{formatDate(row.date)}</span> },
    { key: 'pax', header: 'Guests', align: 'right', cell: (row) => <span className="text-xs font-bold">{row.pax}</span> },
    { key: 'deposit', header: 'Deposit', align: 'right', cell: (row) => <span className="text-xs font-bold">{formatCurrency(row.deposit)}</span> },
    { key: 'total', header: 'Value', align: 'right', cell: (row) => <span className="text-xs font-bold">{formatCurrency(row.total)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusPill status={row.status} /> },
    { key: 'actions', header: 'Action', align: 'right', cell: (row) => row.status === 'Enquiry' ? <Button size="sm" onClick={() => { setEvents((current) => current.map((event) => event.id === row.id ? { ...event, status: 'Confirmed' } : event)); toast.success('Event confirmed') }}><Check /> Confirm</Button> : <Button size="sm" variant="ghost"><Pencil /> Manage</Button> },
  ]
  return <div className="space-y-6"><PageHeader title="Events & banquet" description="Manage enquiries, deposits, menus and event delivery." breadcrumbs={[{ label: 'People & events' }, { label: 'Events & banquet' }]} actions={<Button onClick={() => toast.info('New event enquiry', { description: 'Select a hall, package and event date.' })}><Plus /> New event</Button>} /><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><KpiCard label="Enquiries" value="8" changeLabel="next 30 days" icon={CalendarDays} tone="blue" /><KpiCard label="Confirmed events" value="12" changeLabel="₦84.6K value" icon={Check} tone="teal" /><KpiCard label="Guests expected" value="486" changeLabel="this quarter" icon={Users} tone="violet" /><KpiCard label="Deposit collected" value="₦42.8K" change={12.4} changeLabel="54% of contract" icon={FileClock} tone="amber" /></div><Card><CardContent className="pt-5"><DataTable data={events} columns={columns} searchPlaceholder="Search event, client or venue…" searchKeys={[(row) => row.eventName, (row) => row.clientName, (row) => row.hall, (row) => row.contact]} initialSort={{ key: 'date', direction: 'asc' }} pageSize={8} filename="event-bookings.csv" /></CardContent></Card></div>
}

const hotelSchema = z.object({ name: z.string().min(2), email: z.email(), phone: z.string().min(7), address: z.string().min(5), timezone: z.string().min(2), currency: z.string().min(3) })
type HotelValues = z.infer<typeof hotelSchema>

function HotelProfileForm() {
  const form = useForm<HotelValues>({ resolver: zodResolver(hotelSchema), defaultValues: { name: 'Hayata Hotel & Suite', email: 'hello@hayatahotel.com', phone: '+1 (555) 010-8899', address: '88 Harbor Avenue, Metro City', timezone: 'America/New_York', currency: 'NGN' } })
  return <Card><CardHeader><CardTitle>Hotel profile</CardTitle><CardDescription>Property identity and regional defaults</CardDescription></CardHeader><CardContent><form onSubmit={form.handleSubmit((values) => { logActivity({ action: 'Hotel profile updated', module: 'Settings', detail: values.name }); toast.success('Hotel profile saved', { description: values.name }) })} className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>Property name</Label><Input {...form.register('name')} /></div><div className="space-y-1.5"><Label>Contact email</Label><Input type="email" {...form.register('email')} /></div><div className="space-y-1.5"><Label>Phone</Label><Input {...form.register('phone')} /></div><div className="space-y-1.5"><Label>Timezone</Label><select {...form.register('timezone')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option>America/New_York</option><option>Europe/London</option><option>Asia/Dubai</option><option>Asia/Tokyo</option></select></div><div className="space-y-1.5"><Label>Address</Label><Input {...form.register('address')} /></div><div className="space-y-1.5"><Label>Currency</Label><select {...form.register('currency')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="NGN">NGN — Nigerian Naira (₦)</option></select></div><div className="sm:col-span-2"><Button type="submit"><Save /> Save profile</Button></div></form></CardContent></Card>
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
  { label: 'People & events', permissions: ['staff.view', 'staff.manage', 'event.view', 'event.manage'] },
  { label: 'Administration', permissions: ['settings.view', 'settings.manage', 'settings.rbac'] },
]

export function SettingsPage() {
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const [selectedRole, setSelectedRole] = useState<Role>('HOTEL_MANAGER')
  const user = useAuthStore((state) => state.user)
  const permissionsByRole = useRbacStore((state) => state.permissions)
  const setPermission = useRbacStore((state) => state.setPermission)
  const activities = useActivityLogStore((state) => state.activities)
  const allAuditLogs = [...activities, ...auditLogs]
  const activePermissions = permissionsByRole[selectedRole] ?? []
  const canManageRoles = user ? permissionsByRole[user.role]?.includes('settings.rbac') ?? false : false
  function chooseRole(role: Role) { setSelectedRole(role) }
  function togglePermission(permission: Permission, enabled: boolean) { setPermission(selectedRole, permission, enabled); logActivity({ action: enabled ? 'Permission granted' : 'Permission revoked', module: 'Access control', detail: `${selectedRole} · ${permission}` }) }
  const auditColumns: DataTableColumn<typeof auditLogs[number]>[] = [
    { key: 'timestamp', header: 'Time', sortable: true, cell: (row) => <span className="text-xs whitespace-nowrap">{formatDate(row.timestamp, 'MMM d, h:mm a')}</span> },
    { key: 'actor', header: 'Actor', cell: (row) => <span className="text-xs font-bold">{row.actor}</span> },
    { key: 'module', header: 'Module', cell: (row) => <Badge variant="outline">{row.module}</Badge> },
    { key: 'action', header: 'Action', cell: (row) => <span className="text-xs font-semibold">{row.action}</span> },
    { key: 'ipAddress', header: 'IP address', hideOnMobile: true, cell: (row) => <span className="font-mono text-[10px] text-muted-foreground">{row.ipAddress}</span> },
  ]
  return <div className="space-y-6"><PageHeader title="Settings" description="Configure property operations, notifications, access and compliance." breadcrumbs={[{ label: 'Administration' }, { label: 'Settings' }]} actions={<Button onClick={() => { logActivity({ action: 'Settings saved', module: 'Settings', detail: 'Property configuration' }); toast.success('Settings saved', { description: 'All changes were applied successfully.' }) }}><Save /> Save changes</Button>} /><Tabs defaultValue={requestedTab ?? 'property'}><TabsList className="flex h-auto w-full justify-start overflow-x-auto"><TabsTrigger value="property">Property</TabsTrigger><TabsTrigger value="outlets">Outlets</TabsTrigger><TabsTrigger value="taxes">Taxes & currency</TabsTrigger><TabsTrigger value="printer">Kitchen printer</TabsTrigger><TabsTrigger value="payments">Payment gateway</TabsTrigger><TabsTrigger value="notifications">Notifications</TabsTrigger>{canManageRoles && <TabsTrigger value="roles">Roles & permissions</TabsTrigger>}<TabsTrigger value="audit">Audit log</TabsTrigger></TabsList><TabsContent value="property"><HotelProfileForm /></TabsContent><TabsContent value="outlets"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[{ name: 'Hotel Store', type: 'Warehouse & procurement', skus: 15, color: 'bg-teal-50 text-teal-600 dark:bg-teal-950/60' }, { name: 'Lumen Restaurant', type: 'Dining & kitchen', skus: 15, color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60' }, { name: 'Atlas Bar', type: 'Bar & cellar', skus: 15, color: 'bg-violet-50 text-violet-600 dark:bg-violet-950/60' }, { name: 'Housekeeping', type: 'Guest supplies', skus: 15, color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60' }].map((outlet) => <Card key={outlet.name}><CardContent className="p-5"><div className={cn('mb-4 flex size-10 items-center justify-center rounded-xl', outlet.color)}><Building2 className="size-4" /></div><p className="font-display font-bold">{outlet.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{outlet.type}</p><div className="mt-4 flex justify-between border-t border-border pt-3 text-xs"><span className="text-muted-foreground">Active SKUs</span><span className="font-bold">{outlet.skus}</span></div><Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => toast.info(`${outlet.name} settings opened`)}><Pencil /> Configure</Button></CardContent></Card>)}</div></TabsContent><TabsContent value="taxes"><div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Tax configuration</CardTitle><CardDescription>Rates by outlet and service</CardDescription></CardHeader><CardContent className="space-y-3">{[['Room accommodation', '8.25%'], ['Restaurant dining', '8.00%'], ['Bar sales', '10.00%'], ['Events & banquet', '8.25%']].map(([label, rate]) => <div key={label} className="flex items-center justify-between rounded-lg border border-border p-3"><span className="text-sm font-semibold">{label}</span><div className="flex items-center gap-2"><Input defaultValue={rate} className="w-24 text-right" /><Button size="icon-sm" variant="outline"><Check /></Button></div></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Service charges</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between"><div><p className="text-sm font-bold">Restaurant service charge</p><p className="text-xs text-muted-foreground">Applied to dine-in bills</p></div><div className="flex items-center gap-2"><span className="text-sm font-bold">10%</span><Switch defaultChecked /></div></div><div className="flex items-center justify-between"><div><p className="text-sm font-bold">Tax inclusive pricing</p><p className="text-xs text-muted-foreground">Display taxes within menu prices</p></div><Switch /></div><div className="flex items-center justify-between"><div><p className="text-sm font-bold">Rounding rule</p><p className="text-xs text-muted-foreground">Round to nearest cent</p></div><SelectSimple /></div></CardContent></Card></div></TabsContent><TabsContent value="printer"><KitchenPrinterSettings /></TabsContent><TabsContent value="payments"><PaymentGatewaySettings /></TabsContent><TabsContent value="notifications"><Card><CardHeader><CardTitle>Notification preferences</CardTitle><CardDescription>Choose what triggers alerts and emails</CardDescription></CardHeader><CardContent className="space-y-1">{[['Low-stock threshold crossed', 'Email, in-app and live toast'], ['New restaurant or bar order', 'Kitchen display and sound alert'], ['Reservation check-in', 'Front desk and room service'], ['Critical maintenance ticket', 'Email, SMS and in-app'], ['Guest feedback score below 3', 'CRM manager and operations lead'], ['Purchase order ready to receive', 'Store manager and receiving team']].map(([label, detail], index) => <div key={label} className="flex items-center justify-between border-b border-border py-4 last:border-0"><div><p className="text-sm font-bold">{label}</p><p className="mt-0.5 text-xs text-muted-foreground">{detail}</p></div><Switch defaultChecked={index !== 3} /></div>)}</CardContent></Card></TabsContent>{canManageRoles && <TabsContent value="roles"><div className="grid gap-4 xl:grid-cols-[280px_1fr]"><Card className="h-fit"><CardHeader><CardTitle>Roles</CardTitle><CardDescription>Select a role to edit</CardDescription></CardHeader><CardContent className="space-y-1">{(Object.keys(roleLabels) as Role[]).map((role) => <button key={role} type="button" onClick={() => chooseRole(role)} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition', selectedRole === role ? 'bg-primary/10 text-primary' : 'hover:bg-muted')}><span className={cn('flex size-8 items-center justify-center rounded-lg', selectedRole === role ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}><ShieldCheck className="size-4" /></span><span><span className="block text-xs font-bold">{roleLabels[role]}</span><span className="text-[10px] text-muted-foreground">{permissionsByRole[role]?.length ?? 0} permissions</span></span></button>)}</CardContent></Card><Card><CardHeader className="flex-row items-start justify-between"><div><CardTitle>{roleLabels[selectedRole]} permissions</CardTitle><CardDescription>Changes apply immediately in this demo</CardDescription></div><Badge variant="warning">Demo editor</Badge></CardHeader><CardContent className="space-y-6">{permissionGroups.map((group) => <div key={group.label}><p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{group.label}</p><div className="grid gap-2 sm:grid-cols-2">{group.permissions.map((permission) => <label key={permission} className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3 transition hover:bg-muted/40"><span><span className="block text-xs font-semibold">{permission.split('.')[1].replaceAll('_', ' ')}</span><span className="text-[9px] text-muted-foreground">{permission}</span></span><Switch checked={activePermissions.includes(permission)} onCheckedChange={(checked) => togglePermission(permission, checked)} /></label>)}</div></div>)}</CardContent></Card></div></TabsContent>}<TabsContent value="audit"><Card><CardContent className="pt-5"><DataTable data={allAuditLogs} columns={auditColumns} searchPlaceholder="Search actor, action or module…" searchKeys={[(row) => row.actor, (row) => row.action, (row) => row.module, (row) => row.ipAddress]} pageSize={10} filename="audit-log.csv" /></CardContent></Card></TabsContent></Tabs></div>
}

function SelectSimple() { return <select className="h-9 rounded-lg border border-input bg-background px-3 text-xs"><option>Nearest cent</option><option>Nearest 0.05</option></select> }
