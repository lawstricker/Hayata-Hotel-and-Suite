import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { AlertTriangle, ArrowRight, Boxes, ClipboardList, NigerianNaira, PackageCheck, Plus, RefreshCw, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { KpiCard } from '@/components/common/kpi-card'
import { LiveIndicator } from '@/components/common/live-indicator'
import { StatusPill } from '@/components/common/status-pill'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { useHotelStore } from '@/store/hotelStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { StockMovement } from '@/types/domain'

export function InventoryOverviewPage() {
  const inventory = useHotelStore((state) => state.inventory)
  const alerts = useHotelStore((state) => state.alerts)
  const movements = useHotelStore((state) => state.movements)
  const stockValue = inventory.reduce((sum, item) => sum + item.stock * item.cost, 0)
  const lowStock = inventory.filter((item) => item.stock <= item.reorderPoint)
  const critical = lowStock.filter((item) => item.stock < item.reorderPoint - 2)
  const expiring = inventory.filter((item) => item.expiry && new Date(item.expiry) <= new Date(Date.now() + 30 * 86400000))
  const outletData = ['STORE', 'RESTAURANT', 'BAR', 'HOUSEKEEPING'].map((outlet) => ({
    name: outlet.charAt(0) + outlet.slice(1).toLowerCase(),
    value: inventory.filter((item) => item.outlet === outlet).reduce((sum, item) => sum + item.stock * item.cost, 0),
    count: inventory.filter((item) => item.outlet === outlet).length,
  }))
  const colors = ['#0f766e', '#3b82f6', '#8b5cf6', '#f59e0b']

  const movementColumns: DataTableColumn<StockMovement>[] = [
    { key: 'itemName', header: 'Item', sortable: true, cell: (row) => <div><p className="font-semibold text-foreground">{row.itemName}</p><p className="text-[11px] text-muted-foreground">{row.sku} · {row.outlet}</p></div> },
    { key: 'type', header: 'Movement', cell: (row) => <StatusPill status={row.type} /> },
    { key: 'quantityIn', header: 'In', align: 'right', cell: (row) => <span className="font-bold text-emerald-600">{row.quantityIn ? `+${row.quantityIn}` : '—'}</span> },
    { key: 'quantityOut', header: 'Out', align: 'right', cell: (row) => <span className="font-bold text-red-600">{row.quantityOut ? `−${row.quantityOut}` : '—'}</span> },
    { key: 'runningBalance', header: 'Balance', align: 'right', cell: (row) => <span className="font-bold">{row.runningBalance}</span> },
    { key: 'reference', header: 'Reference', cell: (row) => <span className="font-mono text-xs">{row.reference}</span> },
    { key: 'timestamp', header: 'Time', cell: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.timestamp, 'MMM d, h:mm a')}</span> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="mb-1 flex items-center gap-2"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Store & inventory</p><LiveIndicator /></div><h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-[28px]">Inventory command center</h1><p className="mt-1 text-sm text-muted-foreground">Live stock position across store, restaurant, bar and housekeeping.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => window.location.reload()}><RefreshCw /> Sync</Button><Button asChild><a href="/staff/inventory/items"><Plus /> New item</a></Button></div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Total SKUs" value={inventory.length} change={4.2} changeLabel="across 4 outlets" icon={Boxes} tone="teal" />
        <KpiCard label="Stock value" value={formatCurrency(stockValue)} change={2.8} changeLabel="vs. last month" icon={NigerianNaira} tone="blue" />
        <KpiCard label="Below reorder" value={lowStock.length} change={-12.5} changeLabel={`${critical.length} critical`} icon={AlertTriangle} tone="rose" live />
        <KpiCard label="Expiring soon" value={expiring.length} changeLabel="next 30 days" icon={ClipboardList} tone="amber" />
        <KpiCard label="Open POs" value="7" changeLabel="₦14.8K committed" icon={PackageCheck} tone="violet" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.9fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Stock health</CardTitle><CardDescription>SKUs by reorder status</CardDescription></CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold">Healthy stock</span><span className="font-bold">{inventory.length - lowStock.length} SKUs</span></div><Progress value={((inventory.length - lowStock.length) / inventory.length) * 100} /></div>
              <div><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold">At reorder point</span><span className="font-bold text-amber-600">{lowStock.length - critical.length} SKUs</span></div><Progress value={((lowStock.length - critical.length) / inventory.length) * 100} indicatorClassName="bg-amber-500" /></div>
              <div><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold">Critical</span><span className="font-bold text-red-600">{critical.length} SKUs</span></div><Progress value={(critical.length / inventory.length) * 100} indicatorClassName="bg-red-500" /></div>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3">
              {outletData.map((outlet) => <div key={outlet.name} className="rounded-lg border border-border p-3"><div className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: colors[outletData.indexOf(outlet)] }} /><span className="text-xs font-bold">{outlet.name}</span></div><p className="mt-2 font-display text-lg font-extrabold">{formatCurrency(outlet.value)}</p><p className="text-[10px] text-muted-foreground">{outlet.count} SKUs</p></div>)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Value by outlet</CardTitle><CardDescription>Current stock valuation</CardDescription></CardHeader>
          <CardContent>
            <div className="h-[220px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={outletData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3} stroke="none">{outletData.map((entry, index) => <Cell key={entry.name} fill={colors[index]} />)}</Pie><Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} /></PieChart></ResponsiveContainer></div>
            <div className="space-y-2">{outletData.map((outlet, index) => <div key={outlet.name} className="flex items-center gap-2 text-xs"><span className="size-2 rounded-full" style={{ background: colors[index] }} /><span className="flex-1 text-muted-foreground">{outlet.name}</span><span className="font-bold">{formatCurrency(outlet.value)}</span></div>)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0"><div><CardTitle>Critical alerts</CardTitle><CardDescription>Items requiring immediate action</CardDescription></div><LiveIndicator /></CardHeader>
          <CardContent className="space-y-2.5">
            {alerts.filter((alert) => alert.type === 'critical').slice(0, 5).map((alert) => <div key={alert.id} className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50/50 p-3 dark:border-red-900/60 dark:bg-red-950/20"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/60"><AlertTriangle className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{alert.itemName}</p><p className="text-[10px] text-muted-foreground">{alert.currentStock} of {alert.threshold} remaining</p></div><Button asChild size="sm" variant="outline"><a href="/staff/inventory/purchase-orders"><ShoppingCart /></a></Button></div>)}
            <Button asChild variant="ghost" className="w-full"><a href="/staff/inventory/alerts">View all alerts <ArrowRight /></a></Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0"><div><CardTitle>Recent stock movements</CardTitle><CardDescription>Every quantity change is audit-traceable</CardDescription></div><Button asChild variant="outline" size="sm"><a href="/staff/inventory/ledger">Full ledger <ArrowRight /></a></Button></CardHeader>
        <CardContent><DataTable data={movements.slice(0, 8)} columns={movementColumns} searchPlaceholder="Search SKU or reference…" searchKeys={[(row) => row.itemName, (row) => row.sku, (row) => row.reference]} pageSize={8} filename="stock-movements.csv" /></CardContent>
      </Card>
    </div>
  )
}
