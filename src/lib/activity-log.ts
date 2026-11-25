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

export function logActivity(input: { action: string; module: string; detail?: string; actor?: string }) {
  const entry: AuditLog = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action: input.action,
    module: input.module,
    actor: input.actor ?? currentActor(),
    timestamp: new Date().toISOString(),
    detail: input.detail ?? '',
    ipAddress: '127.0.0.1',
  }
  useActivityLogStore.getState().addActivity(entry)
  if (SERVER_ENABLED && getApiToken()) {
    void apiPost('/resource/audit-logs', { ...entry, ip_address: entry.ipAddress }).catch(() => {})
  }
  return entry
}
