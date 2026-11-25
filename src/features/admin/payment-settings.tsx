import { CheckCircle2, CreditCard, Eye, EyeOff, RefreshCw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { processPayment, recordTransaction } from '@/lib/payment-gateway'
import { logActivity } from '@/lib/activity-log'
import { usePaymentGatewayStore } from '@/store/paymentGatewayStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PaymentProvider } from '@/types/payment'

export function PaymentGatewaySettings() {
  const { settings, transactions, updateSetting, clearTransactions } = usePaymentGatewayStore()
  const [showSecret, setShowSecret] = useState(false)
  const [testing, setTesting] = useState(false)

  async function testGateway() {
    setTesting(true)
    const request = {
      amount: 1000,
      email: settings.publicKey || 'test@hayatahotel.com',
      description: 'Payment gateway test',
      referenceHint: 'TEST',
      method: 'Card' as const,
      card: { name: 'Test Guest', number: '4242424242424242', expiry: '12/30', cvc: '123' },
    }
    const result = await processPayment(request, settings)
    recordTransaction(result, request)
    setTesting(false)
    if (result.ok) toast.success('Test payment approved', { description: result.reference })
    else toast.error('Test payment declined', { description: result.message })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><CreditCard className="size-4 text-primary" /> Payment gateway</CardTitle>
            <CardDescription>Configure the gateway used for room reservations and restaurant/bar orders. All charges in this demo are simulated.</CardDescription>
          </div>
          <Badge variant={settings.enabled ? 'success' : 'secondary'}>{settings.enabled ? 'Enabled' : 'Demo approval'}</Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-4">
            <div>
              <p className="text-sm font-bold">Use payment gateway</p>
              <p className="text-xs text-muted-foreground">When off, checkouts are approved automatically in demo mode.</p>
            </div>
            <Switch checked={settings.enabled} onCheckedChange={(value) => updateSetting('enabled', value)} aria-label="Toggle payment gateway" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="payment-provider">Provider</Label>
              <select id="payment-provider" value={settings.provider} onChange={(event) => updateSetting('provider', event.target.value as PaymentProvider)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="mock">Mock gateway</option>
                <option value="paystack">Paystack (sandbox simulation)</option>
                <option value="stripe">Stripe (sandbox simulation)</option>
                <option value="custom">Custom HTTP gateway</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-mode">Mode</Label>
              <select id="payment-mode" value={settings.mode} onChange={(event) => updateSetting('mode', event.target.value as 'sandbox' | 'live')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="sandbox">Sandbox</option>
                <option value="live">Live</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-public-key">Public / publishable key</Label>
              <Input id="payment-public-key" value={settings.publicKey} onChange={(event) => updateSetting('publicKey', event.target.value)} placeholder="pk_test_..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-secret-key">Secret key</Label>
              <div className="flex gap-2">
                <Input id="payment-secret-key" type={showSecret ? 'text' : 'password'} value={settings.secretKey} onChange={(event) => updateSetting('secretKey', event.target.value)} placeholder="sk_test_..." />
                <Button variant="outline" size="icon" onClick={() => setShowSecret((current) => !current)} aria-label={showSecret ? 'Hide secret key' : 'Show secret key'}>{showSecret ? <EyeOff /> : <Eye />}</Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-webhook">Webhook secret</Label>
              <Input id="payment-webhook" value={settings.webhookSecret} onChange={(event) => updateSetting('webhookSecret', event.target.value)} placeholder="whsec_..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-endpoint">Gateway endpoint (optional)</Label>
              <Input id="payment-endpoint" value={settings.endpoint} onChange={(event) => updateSetting('endpoint', event.target.value)} placeholder="https://api.example.com/charge" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-bold">Decline test cards</p>
              <p className="text-xs text-muted-foreground">Cards ending in 0000 are declined so error states can be tested.</p>
            </div>
            <Switch checked={settings.declineTestCards} onCheckedChange={(value) => updateSetting('declineTestCards', value)} aria-label="Toggle decline test cards" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={testGateway} disabled={testing}><RefreshCw /> {testing ? 'Processing…' : 'Run test payment'}</Button>
            <Button variant="outline" onClick={() => { logActivity({ action: 'Payment gateway updated', module: 'Settings', detail: `${settings.provider} · ${settings.mode}` }); toast.success('Payment settings saved') }}><CheckCircle2 /> Save settings</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div><CardTitle>Recent transactions</CardTitle><CardDescription>Latest simulated gateway responses.</CardDescription></div>
          <Button size="sm" variant="ghost" onClick={clearTransactions} disabled={!transactions.length}><Trash2 /> Clear</Button>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No transactions yet.</p> : (
            <div className="space-y-2">
              {transactions.slice(0, 8).map((transaction) => (
                <div key={transaction.reference} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-xs">
                  <Badge variant={transaction.ok ? 'success' : 'danger'}>{transaction.status}</Badge>
                  <span className="font-mono font-bold">{transaction.reference}</span>
                  <span className="text-muted-foreground">{transaction.description}</span>
                  <span className="ml-auto font-bold">{formatCurrency(transaction.amount)}</span>
                  <span className="text-muted-foreground">{formatDate(transaction.createdAt, 'MMM d, h:mm a')}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
