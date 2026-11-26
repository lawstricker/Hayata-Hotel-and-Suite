import { KeyRound, Loader2, Mail, Send, Server, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { logActivity } from '@/lib/activity-log'
import {
  defaultNotificationSettings,
  loadNotificationSettings,
  notificationEventDescriptions,
  notificationEventLabels,
  saveNotificationSettings,
  sendTestNotification,
  type NotificationEvent,
  type NotificationSettings,
} from '@/lib/notification-settings'
import { useSettingsStore } from '@/store/settingsStore'

const eventOrder: NotificationEvent[] = ['order_placed', 'booking_confirmed', 'checked_in', 'checked_out']

export function SmtpSettingsPanel() {
  const stored = useSettingsStore((state) => state.notificationSettings)
  const setStored = useSettingsStore((state) => state.setNotificationSettings)
  const [draft, setDraft] = useState<NotificationSettings>(stored ?? defaultNotificationSettings)
  const [password, setPassword] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    let active = true
    void loadNotificationSettings().then((settings) => {
      if (!active) return
      if (settings) {
        setDraft(settings)
        setStored(settings)
      }
      setLoading(false)
    })
    return () => { active = false }
  }, [setStored])

  function patch<K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function patchEvent(event: NotificationEvent, enabled: boolean) {
    setDraft((current) => ({ ...current, events: { ...current.events, [event]: enabled } }))
  }

  async function save() {
    setSaving(true)
    try {
      const saved = await saveNotificationSettings(draft, password.trim() || undefined)
      setDraft(saved)
      setStored(saved)
      setPassword('')
      logActivity({ action: 'SMTP settings updated', module: 'Settings', detail: `${saved.transport.toUpperCase()} · ${saved.host || 'system mailer'}` })
      toast.success('SMTP settings saved', { description: 'Guest notifications now use this configuration.' })
    } catch (error) {
      toast.error('Could not save the SMTP settings', { description: error instanceof Error ? error.message : 'The server rejected the request.' })
    } finally {
      setSaving(false)
    }
  }

  async function sendTest() {
    const recipient = testEmail.trim()
    if (!recipient) { toast.error('Enter an email address to test with'); return }
    setTesting(true)
    const result = await sendTestNotification(recipient)
    setTesting(false)
    if (result.ok) {
      logActivity({ action: 'Test notification sent', module: 'Settings', detail: recipient })
      toast.success('Test message sent', { description: `Check the inbox of ${recipient}.` })
    } else {
      toast.error('The test message was not sent', { description: result.error })
    }
  }

  const usingSmtp = draft.transport === 'smtp'

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><Mail className="size-4 text-primary" /> Email delivery</CardTitle>
            <CardDescription>How automatic guest emails leave the property.</CardDescription>
          </div>
          <Badge variant={draft.enabled ? 'success' : 'warning'} className="px-2.5 py-1">
            {draft.enabled ? 'Notifications on' : 'Notifications off'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-bold">Automatic guest notifications</p>
              <p className="text-xs text-muted-foreground">Turn every event off to stop all guest emails without losing the configuration.</p>
            </div>
            <Switch checked={draft.enabled} onCheckedChange={(value) => patch('enabled', value)} aria-label="Automatic guest notifications" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="smtp-transport">Delivery method</Label>
            <select
              id="smtp-transport"
              value={draft.transport}
              onChange={(event) => patch('transport', event.target.value as NotificationSettings['transport'])}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="mail">System mailer (PHP mail)</option>
              <option value="smtp">SMTP server</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              {usingSmtp ? 'Messages are handed to the SMTP server below.' : 'Messages are sent through the server’s own mail function.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Server className="size-4 text-primary" /> SMTP server</CardTitle>
          <CardDescription>The credentials the API uses to send guest emails. The password is stored on the server and never returned to the browser.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="smtp-host">Server host</Label>
            <Input id="smtp-host" value={draft.host} onChange={(event) => patch('host', event.target.value)} placeholder="smtp.example.com" disabled={!usingSmtp} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtp-port">Port</Label>
            <Input id="smtp-port" type="number" min={1} max={65535} value={draft.port} onChange={(event) => patch('port', Number(event.target.value) || 587)} disabled={!usingSmtp} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtp-secure">Encryption</Label>
            <select
              id="smtp-secure"
              value={draft.secure}
              onChange={(event) => patch('secure', event.target.value as NotificationSettings['secure'])}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              disabled={!usingSmtp}
            >
              <option value="tls">STARTTLS</option>
              <option value="ssl">SSL/TLS</option>
              <option value="none">None</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtp-username">Username</Label>
            <Input id="smtp-username" value={draft.username} onChange={(event) => patch('username', event.target.value)} autoComplete="off" disabled={!usingSmtp} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtp-password">Password</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="smtp-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={draft.hasPassword ? '•••••••• (stored)' : 'Not set'}
                autoComplete="new-password"
                className="pl-9"
                disabled={!usingSmtp}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {draft.hasPassword ? 'A password is stored on the server. Leave this blank to keep it.' : 'No password is stored yet.'}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtp-from-name">Sender name</Label>
            <Input id="smtp-from-name" value={draft.fromName} onChange={(event) => patch('fromName', event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtp-from-email">Sender email</Label>
            <Input id="smtp-from-email" type="email" value={draft.fromEmail} onChange={(event) => patch('fromEmail', event.target.value)} placeholder="notifications@hayatahotel.com" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Events that send an email</CardTitle>
          <CardDescription>Each guest event can be switched on or off on its own.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {eventOrder.map((event) => (
            <div key={event} className="flex items-center justify-between gap-4 border-b border-border py-3.5 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-bold">{notificationEventLabels[event]}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{notificationEventDescriptions[event]}</p>
              </div>
              <Switch checked={draft.events[event]} onCheckedChange={(value) => patchEvent(event, value)} aria-label={notificationEventLabels[event]} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="size-4 text-primary" /> Test the configuration</CardTitle>
          <CardDescription>Send a sample message to confirm the server accepts your settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="smtp-test-email">Test recipient</Label>
              <Input id="smtp-test-email" type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="manager@hayatahotel.com" />
            </div>
            <Button variant="outline" onClick={() => void sendTest()} disabled={testing}>
              {testing ? <Loader2 className="animate-spin" /> : <Send />} Send test
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <TriangleAlert className="size-3.5" /> Save the settings before sending a test message.
            </p>
            <Button onClick={() => void save()} disabled={saving || loading}>
              {saving ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Save SMTP settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
