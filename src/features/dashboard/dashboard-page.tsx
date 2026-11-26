import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowRight,
  BedDouble,
  Boxes,
  CalendarCheck2,
  ClipboardCheck,
  Coffee,
  Download,
  Hotel,
  NigerianNaira,
  PackageCheck,
  ReceiptText,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Users,
  WalletCards,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiCard } from '@/components/common/kpi-card'
import { LiveIndicator } from '@/components/common/live-indicator'
import { StatusPill } from '@/components/common/status-pill'
import { menuItems, occupancyTrend, revenueTrend } from '@/mock/data'
import { mockApi } from '@/mock/api'
import { useAuthStore } from '@/store/authStore'
import { useHotelStore } from '@/store/hotelStore'
import { cn, downloadCsv, formatCurrency } from '@/lib/utils'
import { roleLabels } from '@/lib/rbac'
import { loadAuditLogs } from '@/lib/audit-log-api'
import { ActivityLogPanel } from '@/features/dashboard/activity-log-panel'
import type { AuditLog, Role } from '@/types/domain'

interface Metric {
  label: string
  value: string
  change?: number
  changeLabel: string
  icon: LucideIcon
  tone: 'teal' | 'blue' | 'amber' | 'violet' | 'rose' | 'slate'
  live?: boolean
}

function metricsForRole(role: Role, revenue: number): Metric[] {
  if (role === 'STORE_MANAGER') return [
    { label: 'Total SKUs', value: '60', change: 4.2, changeLabel: 'across 4 outlets', icon: Boxes, tone: 'teal' },
    { label: 'Stock value', value: '₦284.6K', change: 2.8, changeLabel: 'vs. last month', icon: NigerianNaira, tone: 'blue' },
    { label: 'Below reorder', value: '15', change: -12.5, changeLabel: '3 critical', icon: TriangleAlert, tone: 'rose', live: true },
    { label: 'Open purchase orders', value: '7', changeLabel: '₦14.8K committed', icon: PackageCheck, tone: 'violet' },
    { label: 'Pending requisitions', value: '4', changeLabel: '2 need approval', icon: ClipboardCheck, tone: 'amber' },
    { label: 'Expiring soon', value: '8', changeLabel: 'next 30 days', icon: CalendarCheck2, tone: 'slate' },
  ]
  if (role === 'RESTAURANT_MANAGER' || role === 'BAR_MANAGER' || role === 'WAITER' || role === 'BARTENDER' || role === 'FOOD_BEVERAGE_STAFF') return [
    { label: 'Open orders', value: role.startsWith('BAR') || role === 'BARTENDER' ? '9' : '14', change: 8.4, changeLabel: '6 in preparation', icon: ReceiptText, tone: 'teal', live: true },
    { label: 'Sales today', value: '₦4,820', change: 14.2, changeLabel: 'vs. yesterday', icon: NigerianNaira, tone: 'blue' },
    { label: 'Covers served', value: role.startsWith('BAR') || role === 'BARTENDER' ? '186' : '248', change: 6.8, changeLabel: 'last 7 days', icon: Users, tone: 'violet' },
    { label: 'Average ticket', value: role.startsWith('BAR') || role === 'BARTENDER' ? '₦26.80' : '₦42.60', change: 3.1, changeLabel: 'this week', icon: WalletCards, tone: 'amber' },
    { label: 'Tables active', value: role.startsWith('BAR') || role === 'BARTENDER' ? '5' : '9', changeLabel: '3 requesting bills', icon: Coffee, tone: 'slate' },
    { label: 'Low-stock items', value: '15', change: -12.5, changeLabel: '3 critical', icon: TriangleAlert, tone: 'rose', live: true },
  ]
  if (role === 'HOUSEKEEPING') return [
    { label: 'Occupancy', value: '78.4%', change: 5.3, changeLabel: '32 occupied rooms', icon: Hotel, tone: 'teal' },
    { label: 'Dirty rooms', value: '8', change: -20, changeLabel: '2 urgent', icon: BedDouble, tone: 'amber' },
    { label: 'In progress', value: '5', changeLabel: '3 housekeepers active', icon: Sparkles, tone: 'blue' },
    { label: 'Inspected', value: '4', changeLabel: 'ready to release', icon: ClipboardCheck, tone: 'violet' },
    { label: 'Open tickets', value: '6', change: -15, changeLabel: '1 critical', icon: Wrench, tone: 'rose' },
    { label: 'Rooms clean', value: '23', change: 3.4, changeLabel: '58% of inventory', icon: BedDouble, tone: 'slate' },
  ]
  if (role === 'ACCOUNTANT') return [
    { label: 'Revenue today', value: formatCurrency(revenue), change: 8.2, changeLabel: 'vs. yesterday', icon: NigerianNaira, tone: 'teal' },
    { label: 'Receivables', value: '₦18.4K', change: -4.1, changeLabel: '4 overdue invoices', icon: ReceiptText, tone: 'rose' },
    { label: 'Payments today', value: '₦9,760', change: 12.8, changeLabel: '38 transactions', icon: WalletCards, tone: 'blue' },
    { label: 'Average ADR', value: '₦226.80', change: 2.9, changeLabel: 'this month', icon: BedDouble, tone: 'violet' },
    { label: 'RevPAR', value: '₦177.60', change: 6.2, changeLabel: 'this month', icon: TrendingUp, tone: 'amber' },
    { label: 'Pending invoices', value: '7', changeLabel: '₦12.7K outstanding', icon: ClipboardCheck, tone: 'slate' },
  ]
  if (role === 'FRONT_DESK') return [
    { label: 'Occupancy', value: '78.4%', change: 5.3, changeLabel: '32 of 40 rooms', icon: Hotel, tone: 'teal' },
    { label: 'Today’s arrivals', value: '12', change: 16.7, changeLabel: '4 awaiting check-in', icon: CalendarCheck2, tone: 'blue' },
    { label: 'Today’s departures', value: '9', changeLabel: '3 late check-outs', icon: BedDouble, tone: 'violet' },
    { label: 'Occupied rooms', value: '32', change: 3.1, changeLabel: '80% occupancy', icon: Users, tone: 'amber' },
    { label: 'Revenue today', value: formatCurrency(revenue), change: 8.2, changeLabel: 'rooms + outlets', icon: NigerianNaira, tone: 'slate' },
    { label: 'Open folios', value: '18', changeLabel: '₦7,480 balance', icon: WalletCards, tone: 'rose' },
  ]
  return [
    { label: 'Occupancy', value: '78.4%', change: 5.3, changeLabel: 'vs. last month', icon: Hotel, tone: 'teal' },
    { label: 'ADR', value: '₦226.80', change: 2.9, changeLabel: 'vs. last month', icon: WalletCards, tone: 'blue' },
    { label: 'RevPAR', value: '₦177.60', change: 6.2, changeLabel: 'vs. last month', icon: TrendingUp, tone: 'violet' },
    { label: 'Revenue today', value: formatCurrency(revenue), change: 8.2, changeLabel: 'vs. yesterday', icon: NigerianNaira, tone: 'slate' },
    { label: 'Arrivals / departures', value: '12 / 9', changeLabel: '4 pending check-in', icon: CalendarCheck2, tone: 'amber' },
    { label: 'Open orders', value: '23', change: 11.4, changeLabel: '6 ready to serve', icon: ReceiptText, tone: 'rose', live: true },
    { label: 'Low-stock count', value: '15', change: -12.5, changeLabel: '3 critical', icon: TriangleAlert, tone: 'rose', live: true },
    { label: 'Pending POs', value: '7', changeLabel: '₦14.8K committed', icon: PackageCheck, tone: 'slate' },
  ]
}

const pieColors = ['#0f766e', '#3b82f6', '#8b5cf6', '#f59e0b']

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const alerts = useHotelStore((state) => state.alerts)
  const reservations = useHotelStore((state) => state.reservations)
  const rooms = useHotelStore((state) => state.rooms)
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: mockApi.getDashboard })
  const metrics = metricsForRole(user?.role ?? 'SUPER_ADMIN', data?.revenue ?? 12842)
  const liveAlerts = alerts.filter((alert) => !alert.acknowledged).slice(0, 4)
  const arrivals = reservations.filter((reservation) => reservation.status === 'Confirmed' || reservation.status === 'Pending').slice(0, 5)
  const outOfOrder = rooms.filter((room) => room.status === 'Out of Order')
  const salesByOutlet = [
    { name: 'Rooms', value: 62 },
    { name: 'Restaurant', value: 21 },
    { name: 'Bar', value: 11 },
    { name: 'Events', value: 6 },
  ]

  // The activity timeline uses the same live trail as the full log section.
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([])
  useEffect(() => {
    let active = true
    void loadAuditLogs({ limit: 5 }).then((result) => {
      if (active) setRecentActivity(result.entries)
    })
    return () => { active = false }
  }, [])

  if (isLoading) return <DashboardSkeleton />
  const role = user?.role ?? 'SUPER_ADMIN'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{roleLabels[role]}</p><LiveIndicator /></div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-[28px]">Good morning, {user?.name.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here’s what’s happening across Hayata today, {format(new Date(), 'EEEE, MMMM d')}.</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline">Last 30 days</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuItem>Last 7 days</DropdownMenuItem><DropdownMenuItem>Last 30 days</DropdownMenuItem><DropdownMenuItem>Last 90 days</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => { downloadCsv('hayata-dashboard.csv', revenueTrend.map((row) => ({ date: row.date, revenue: row.revenue, occupancy: row.occupancy }))); }}><Download /> Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
        {metrics.map((metric) => <KpiCard key={metric.label} {...metric} />)}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div><CardTitle>Revenue performance</CardTitle><CardDescription>Rooms, restaurant and bar revenue over time</CardDescription></div>
            <div className="flex items-center gap-4 text-[11px] font-semibold text-muted-foreground"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-primary" />Rooms</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-blue-500" />F&B</span></div>
          </CardHeader>
          <CardContent className="h-[320px] pl-1 pr-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0f766e" stopOpacity={0.24} /><stop offset="100%" stopColor="#0f766e" stopOpacity={0} /></linearGradient><linearGradient id="fbFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
                <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} interval={5} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value) => `₦${value / 1000}k`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', boxShadow: '0 10px 30px rgba(15,23,42,.12)', fontSize: 12 }} />
                <Area type="monotone" dataKey="rooms" name="Rooms" stroke="#0f766e" strokeWidth={2.2} fill="url(#revenueFill)" />
                <Area type="monotone" dataKey="restaurant" name="Restaurant" stroke="#3b82f6" strokeWidth={2} fill="url(#fbFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Sales by outlet</CardTitle><CardDescription>Revenue contribution this month</CardDescription></CardHeader>
          <CardContent>
            <div className="relative h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={salesByOutlet} dataKey="value" nameKey="name" innerRadius={55} outerRadius={78} paddingAngle={3} stroke="none">{salesByOutlet.map((entry, index) => <Cell key={entry.name} fill={pieColors[index]} />)}</Pie><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} /></PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</span><span className="font-display text-xl font-extrabold">₦84.2K</span></div>
            </div>
            <div className="mt-2 space-y-2.5">
              {salesByOutlet.map((outlet, index) => <div key={outlet.name} className="flex items-center gap-2 text-xs"><span className="size-2 rounded-full" style={{ background: pieColors[index] }} /><span className="flex-1 font-medium text-muted-foreground">{outlet.name}</span><span className="font-bold">{outlet.value}%</span></div>)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0"><div><CardTitle>Occupancy trend</CardTitle><CardDescription>Daily occupancy versus available inventory</CardDescription></div><StatusPill status="78.4% today" variant="success" /></CardHeader>
          <CardContent className="h-[260px] pl-1">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={occupancyTrend} margin={{ left: -20, right: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} /><XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} /><Bar dataKey="occupancy" name="Occupied %" fill="#0f766e" radius={[5, 5, 0, 0]} maxBarSize={30} /></BarChart></ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0"><div><CardTitle>Low-stock alerts</CardTitle><CardDescription>Updates as stock changes</CardDescription></div><LiveIndicator /></CardHeader>
          <CardContent className="space-y-2.5">
            {liveAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center gap-3 rounded-lg border border-border p-3 transition hover:bg-muted/40">
                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', alert.type === 'critical' ? 'bg-red-50 text-red-600 dark:bg-red-950/60' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60')}><TriangleAlert className="size-4" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{alert.itemName}</p><p className="text-[11px] text-muted-foreground">{alert.currentStock} left · reorder at {alert.threshold}</p></div>
                <span className="font-display text-sm font-extrabold text-red-600">{alert.currentStock}</span>
              </div>
            ))}
            <Button asChild variant="ghost" className="w-full"><a href="/staff/inventory/alerts">View all alerts <ArrowRight /></a></Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0"><div><CardTitle>Upcoming arrivals</CardTitle><CardDescription>Next check-ins</CardDescription></div><Button variant="ghost" size="sm">View all</Button></CardHeader>
          <CardContent className="space-y-1">
            {arrivals.map((reservation) => <div key={reservation.id} className="flex items-center gap-3 rounded-lg p-2.5 transition hover:bg-muted/50"><span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">{reservation.guestName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{reservation.guestName}</p><p className="text-[11px] text-muted-foreground">{reservation.roomType} · {reservation.source}</p></div><div className="text-right"><p className="text-xs font-bold">{reservation.checkIn}</p><StatusPill status={reservation.status} /></div></div>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0"><div><CardTitle>Top-selling items</CardTitle><CardDescription>Last 7 days</CardDescription></div><TrendingUp className="size-4 text-primary" /></CardHeader>
          <CardContent className="space-y-4">
            {menuItems.slice(0, 5).map((item, index) => <div key={item.id}><div className="mb-1.5 flex items-center gap-2 text-xs"><span className="w-4 font-extrabold text-muted-foreground">{index + 1}</span><span className="min-w-0 flex-1 truncate font-bold">{item.name}</span><span className="text-muted-foreground">{72 - index * 9} sold</span><span className="w-12 text-right font-bold">₦{(item.price * (72 - index * 9)).toLocaleString()}</span></div><Progress value={100 - index * 15} /></div>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle><CardDescription>Live property timeline</CardDescription></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => <div key={activity.id} className="relative flex gap-3"><div className="relative flex w-7 shrink-0 justify-center"><span className={cn('z-10 mt-1 size-2 rounded-full ring-4 ring-card', index === 0 ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600')} />{index < recentActivity.length - 1 && <span className="absolute bottom-[-18px] top-4 w-px bg-border" />}</div><div className="min-w-0 flex-1 pb-1"><p className="text-xs font-bold">{activity.action}</p><p className="truncate text-[11px] text-muted-foreground">{activity.detail || activity.module}</p><p className="mt-0.5 text-[10px] text-muted-foreground/75">{activity.actor} · {activity.timestamp}</p></div></div>)}
              {!recentActivity.length && <p className="text-xs text-muted-foreground">No activity recorded yet.</p>}
            </div>
            {outOfOrder.length > 0 && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40"><p className="text-xs font-bold text-red-700 dark:text-red-300">{outOfOrder.length} room out of order</p><p className="mt-0.5 text-[11px] text-red-600/80 dark:text-red-300/70">Rooms {outOfOrder.map((room) => room.number).join(', ')}</p></div>}
          </CardContent>
        </Card>
      </div>

      <ActivityLogPanel />
    </div>
  )
}

function DashboardSkeleton() {
  return <div className="space-y-6"><div className="space-y-2"><Skeleton className="h-7 w-64" /><Skeleton className="h-4 w-80" /></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}</div><div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]"><Skeleton className="h-[400px] rounded-xl" /><Skeleton className="h-[400px] rounded-xl" /></div></div>
}
