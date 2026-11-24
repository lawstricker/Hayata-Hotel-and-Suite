import { CheckCircle2, Clock3, Printer, RefreshCw, Trash2, Wifi } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { StatusPill } from '@/components/common/status-pill'
import { flushQueuedPrints } from '@/lib/print-queue'
import { buildTestReceipt, sendPrintJob } from '@/lib/thermal-printer'
import { usePrinterStore, type PrintJob, type PrinterSettings } from '@/store/printerStore'
import { formatDate } from '@/lib/utils'

export function KitchenPrinterSettings() {
  const { settings, queue, updateSetting, removeJob, clearQueue } = usePrinterStore()
  const [testing, setTesting] = useState(false)
  const [flushing, setFlushing] = useState(false)

  async function testPrint() {
    setTesting(true)
    const job: PrintJob = {
      id: `test-${Date.now()}`,
      orderNumber: 'TEST',
      roomNumber: '—',
      guestName: 'Printer setup',
      receiptText: buildTestReceipt(settings),
      createdAt: new Date().toISOString(),
      attempts: 0,
    }
    try {
      await sendPrintJob(job, settings)
      toast.success('Test ticket printed', { description: 'The kitchen printer received the receipt.' })
    } catch (error) {
      toast.error('Test print failed', { description: error instanceof Error ? error.message : 'Print request failed' })
    } finally {
      setTesting(false)
    }
  }

  async function retryQueue() {
    setFlushing(true)
    try {
      const result = await flushQueuedPrints()
      if (result.sent > 0) toast.success(`${result.sent} queued ticket${result.sent === 1 ? '' : 's'} printed`)
      else if (result.failed > 0) toast.warning(`${result.failed} ticket${result.failed === 1 ? '' : 's'} still unreachable`)
      else toast.info('Print queue is empty')
    } finally {
      setFlushing(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><Printer className="size-4 text-primary" /> Kitchen thermal printer</CardTitle>
            <CardDescription>Room QR orders are sent to this printer as soon as a guest places an order.</CardDescription>
          </div>
          <StatusPill status={settings.enabled ? 'Active' : 'Inactive'} />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-4">
            <div>
              <p className="text-sm font-bold">Automatic printing</p>
              <p className="text-xs text-muted-foreground">Send a kitchen ticket after every successful room QR order.</p>
            </div>
            <Switch checked={settings.enabled} onCheckedChange={(value) => updateSetting('enabled', value)} aria-label="Toggle automatic kitchen printing" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bridge-host">Printer bridge IP / hostname</Label>
              <Input id="bridge-host" value={settings.bridgeHost} onChange={(event) => updateSetting('bridgeHost', event.target.value)} placeholder="192.168.1.25 or print.hayatahotel.com" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">Reachable address of the print bridge. The guest’s device sends the order here over the internet.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bridge-port">Bridge port</Label>
              <Input id="bridge-port" value={settings.bridgePort} onChange={(event) => updateSetting('bridgePort', event.target.value)} inputMode="numeric" placeholder="8787" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">Use 443 for an HTTPS reverse proxy, or the bridge server port on the local network.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="printer-ip">Thermal printer local IP</Label>
              <Input id="printer-ip" value={settings.printerIp} onChange={(event) => updateSetting('printerIp', event.target.value)} placeholder="192.168.1.50" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">The printer’s local address, forwarded by the bridge to the raw print port.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="printer-port">Printer port</Label>
              <Input id="printer-port" value={settings.printerPort} onChange={(event) => updateSetting('printerPort', event.target.value)} inputMode="numeric" placeholder="9100" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">Most network thermal printers listen on port 9100.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bridge-token">Bridge token (optional)</Label>
              <Input id="bridge-token" value={settings.authToken} onChange={(event) => updateSetting('authToken', event.target.value)} placeholder="Shared secret" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">Sent as <code className="font-mono">x-print-token</code> when the bridge requires authentication.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="paper-width">Paper width</Label>
                <select id="paper-width" value={settings.paperWidth} onChange={(event) => updateSetting('paperWidth', event.target.value as PrinterSettings['paperWidth'])} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="80mm">80 mm</option>
                  <option value="58mm">58 mm</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="copies">Copies</Label>
                <Input id="copies" value={settings.copies} onChange={(event) => updateSetting('copies', Math.max(1, Math.min(4, Number(event.target.value) || 1)))} inputMode="numeric" min={1} max={4} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={testPrint} disabled={testing}><Wifi /> {testing ? 'Sending test…' : 'Send test print'}</Button>
            <Button onClick={() => toast.success('Printer settings saved')}><CheckCircle2 /> Save settings</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Print queue</CardTitle>
            <CardDescription>Failed tickets are retried automatically every 15 seconds while this app is open.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={retryQueue} disabled={flushing || !queue.length}><RefreshCw /> {flushing ? 'Retrying…' : 'Retry now'}</Button>
            <Button size="sm" variant="ghost" onClick={clearQueue} disabled={!queue.length}><Trash2 /> Clear</Button>
          </div>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground"><CheckCircle2 className="size-4 text-emerald-500" /> No queued kitchen tickets.</div>
          ) : (
            <div className="space-y-2">
              {queue.map((job) => (
                <div key={job.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <Clock3 className="size-4 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-extrabold">{job.orderNumber}</span><span className="text-[11px] text-muted-foreground">Room {job.roomNumber} · {job.guestName}</span></div>
                    <p className="truncate text-[10px] text-muted-foreground">{job.lastError ?? 'Waiting to retry'}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{formatDate(job.createdAt, 'MMM d, h:mm a')}</span>
                  <Button size="icon-sm" variant="ghost" onClick={() => removeJob(job.id)} aria-label={`Remove ${job.orderNumber} from print queue`}><Trash2 /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
