import { apiPost, getApiToken, SERVER_ENABLED } from '@/lib/api-client'
import { useActivityLogStore } from '@/store/activityLogStore'
import type { AuditLog } from '@/types/domain'

function currentActor() {
  try {
    const raw = localStorage.getItem('hayata-hms-session')
    const parsed = raw ? JSON.parse(raw) : null
    return parsed?.state?.user?.name ?? 'System'
  } catch {
    return 'System'
  }
}

/** The timestamp is sent as ISO-8601; the API converts it for the database. */
export function logActivity(input: { action: string; module: string; detail?: string; actor?: string }) {
  const now = new Date()
  const entry: AuditLog = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action: input.action,
    module: input.module,
    actor: input.actor ?? currentActor(),
    timestamp: now.toISOString(),
    detail: input.detail ?? '',
    ipAddress: '127.0.0.1',
  }
  useActivityLogStore.getState().addActivity(entry)
  if (SERVER_ENABLED && getApiToken()) {
    // The timestamp is sent as ISO-8601. The API converts it to the format
    // the database expects, so there is only one place that decides how a
    // moment in time is written down.
    void apiPost('/resource/audit-logs', {
      id: entry.id,
      action: entry.action,
      module: entry.module,
      actor: entry.actor,
      detail: entry.detail,
      timestamp: entry.timestamp,
      ip_address: entry.ipAddress,
    }).catch(() => {})
  }
  return entry
}
