import { apiGet, apiPost, apiPut, SERVER_ENABLED } from '@/lib/api-client'

export type NotificationEvent = 'order_placed' | 'booking_confirmed' | 'checked_in' | 'checked_out'
export type MailTransport = 'mail' | 'smtp'
export type MailSecurity = 'tls' | 'ssl' | 'none'

export interface NotificationEventFlags {
  order_placed: boolean
  booking_confirmed: boolean
  checked_in: boolean
  checked_out: boolean
}

export interface NotificationSettings {
  enabled: boolean
  transport: MailTransport
  host: string
  port: number
  username: string
  /** The SMTP password is never sent to the browser; this flag says if one is stored. */
  hasPassword: boolean
  secure: MailSecurity
  fromEmail: string
  fromName: string
  events: NotificationEventFlags
}

export const notificationEventLabels: Record<NotificationEvent, string> = {
  order_placed: 'Order placed',
  booking_confirmed: 'Booking confirmed',
  checked_in: 'Guest checked in',
  checked_out: 'Guest checked out',
}

export const notificationEventDescriptions: Record<NotificationEvent, string> = {
  order_placed: 'Confirmation email after a guest pays for an in-room dining order.',
  booking_confirmed: 'Confirmation email as soon as a booking is confirmed.',
  checked_in: 'Welcome email when the guest is checked into their room.',
  checked_out: 'Farewell email with the final folio when the guest checks out.',
}

export const defaultNotificationSettings: NotificationSettings = {
  enabled: true,
  transport: 'mail',
  host: '',
  port: 587,
  username: '',
  hasPassword: false,
  secure: 'tls',
  fromEmail: '',
  fromName: 'Hayata Hotel & Suite',
  events: { order_placed: true, booking_confirmed: true, checked_in: true, checked_out: true },
}

function coerceSettings(payload: Partial<NotificationSettings> | null | undefined): NotificationSettings {
  if (!payload) return { ...defaultNotificationSettings }
  return {
    ...defaultNotificationSettings,
    ...payload,
    port: Number(payload.port ?? defaultNotificationSettings.port) || defaultNotificationSettings.port,
    events: { ...defaultNotificationSettings.events, ...(payload.events ?? {}) },
  }
}

/** Reads the notification configuration from the server. */
export async function loadNotificationSettings(): Promise<NotificationSettings | null> {
  if (!SERVER_ENABLED) return null
  try {
    const payload = await apiGet<Partial<NotificationSettings>>('/notifications/settings')
    return coerceSettings(payload)
  } catch {
    return null
  }
}

/**
 * Saves the notification configuration.
 *
 * The password is only sent when the operator types a new one. An empty value
 * keeps the stored password, and the stored password is never read back.
 */
export async function saveNotificationSettings(settings: NotificationSettings, password?: string): Promise<NotificationSettings> {
  const body = {
    enabled: settings.enabled,
    transport: settings.transport,
    host: settings.host,
    port: settings.port,
    username: settings.username,
    secure: settings.secure,
    fromEmail: settings.fromEmail,
    fromName: settings.fromName,
    events: settings.events,
    ...(password ? { password } : {}),
  }
  const payload = await apiPut<Partial<NotificationSettings>>('/notifications/settings', body)
  return coerceSettings(payload)
}

/** Sends a test message to verify the mail configuration. */
export async function sendTestNotification(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiPost('/notifications/test', { email })
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The test message could not be sent.'
    return { ok: false, error: message }
  }
}

/**
 * Sends a guest notification.
 *
 * The call is intentionally fire-and-forget: a guest action must never fail
 * because the mail server is slow or unavailable.
 */
export function sendGuestNotification(event: NotificationEvent, email: string, data: Record<string, string | number | undefined>) {
  if (!SERVER_ENABLED || !email) return
  void apiPost('/notifications/send', { event, email, data }).catch(() => {})
}
