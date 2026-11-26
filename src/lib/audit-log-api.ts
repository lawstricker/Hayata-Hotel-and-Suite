import { apiGet, SERVER_ENABLED } from '@/lib/api-client'
import { auditLogs as mockAuditLogs } from '@/mock/data'
import { useActivityLogStore } from '@/store/activityLogStore'
import type { AuditLog } from '@/types/domain'

export interface AuditLogFilters {
  module?: string
  actor?: string
  action?: string
  from?: string
  to?: string
  q?: string
  limit?: number
}

export interface AuditLogStats {
  total: number
  today: number
  returned: number
  actors: number
  modules: number
  topModule: string
  topActor: string
  byModule: Array<{ name: string; count: number }>
  byActor: Array<{ name: string; count: number }>
  byAction: Array<{ name: string; count: number }>
  byDay: Array<{ day: string; count: number }>
}

export interface AuditLogResponse {
  entries: AuditLog[]
  stats: AuditLogStats
  /** True when the entries came from the API rather than the offline fallback. */
  live: boolean
}

const emptyStats: AuditLogStats = {
  total: 0, today: 0, returned: 0, actors: 0, modules: 0,
  topModule: '', topActor: '',
  byModule: [], byActor: [], byAction: [], byDay: [],
}

function normalizeEntry(row: Partial<AuditLog> & { ip_address?: string; ipAddress?: string }): AuditLog {
  return {
    id: row.id ?? `audit-${Math.random().toString(36).slice(2, 10)}`,
    action: row.action ?? 'Recorded activity',
    module: row.module ?? 'General',
    actor: row.actor ?? 'System',
    timestamp: row.timestamp ?? new Date().toISOString(),
    detail: row.detail ?? '',
    ipAddress: row.ipAddress ?? row.ip_address ?? '',
  }
}

function isWithinRange(entry: AuditLog, filters: AuditLogFilters) {
  const time = new Date(entry.timestamp.replace(' ', 'T')).getTime()
  if (Number.isNaN(time)) return false
  if (filters.from) {
    const from = new Date(`${filters.from}T00:00:00`).getTime()
    if (!Number.isNaN(from) && time < from) return false
  }
  if (filters.to) {
    const to = new Date(`${filters.to}T23:59:59`).getTime()
    if (!Number.isNaN(to) && time > to) return false
  }
  return true
}

/** Applies the same filters the server applies, so both sources behave alike. */
export function filterAuditLogs(entries: AuditLog[], filters: AuditLogFilters): AuditLog[] {
  const query = (filters.q ?? '').trim().toLowerCase()
  return entries.filter((entry) => {
    if (filters.module && entry.module !== filters.module) return false
    if (filters.actor && entry.actor !== filters.actor) return false
    if (filters.action && entry.action !== filters.action) return false
    if (!isWithinRange(entry, filters)) return false
    if (query) {
      const haystack = `${entry.actor} ${entry.action} ${entry.module} ${entry.detail} ${entry.ipAddress}`.toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })
}

/** Builds the counters for the offline fallback, matching the server payload. */
export function summarizeAuditLogs(entries: AuditLog[]): AuditLogStats {
  const today = new Date().toISOString().slice(0, 10)
  const countBy = (key: (entry: AuditLog) => string) => {
    const map = new Map<string, number>()
    for (const entry of entries) {
      const name = key(entry)
      map.set(name, (map.get(name) ?? 0) + 1)
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((first, second) => second.count - first.count)
  }
  const byModule = countBy((entry) => entry.module)
  const byActor = countBy((entry) => entry.actor)
  const byAction = countBy((entry) => entry.action)
  const dayMap = new Map<string, number>()
  for (const entry of entries) {
    const day = entry.timestamp.slice(0, 10)
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1)
  }
  return {
    total: entries.length,
    today: entries.filter((entry) => entry.timestamp.slice(0, 10) === today).length,
    returned: entries.length,
    actors: byActor.length,
    modules: byModule.length,
    topModule: byModule[0]?.name ?? '',
    topActor: byActor[0]?.name ?? '',
    byModule,
    byActor,
    byAction,
    byDay: [...dayMap.entries()].map(([day, count]) => ({ day, count })).sort((first, second) => second.day.localeCompare(first.day)),
  }
}

function buildQuery(filters: AuditLogFilters) {
  const params = new URLSearchParams()
  if (filters.module) params.set('module', filters.module)
  if (filters.actor) params.set('actor', filters.actor)
  if (filters.action) params.set('action', filters.action)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.q) params.set('q', filters.q)
  params.set('limit', String(filters.limit ?? 300))
  return params.toString()
}

/**
 * Loads the activity log.
 *
 * The server is the source of truth. When the API is unreachable the entries
 * recorded in this browser are used instead, so the section still works.
 */
export async function loadAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogResponse> {
  if (SERVER_ENABLED) {
    try {
      const payload = await apiGet<{ entries?: unknown[]; stats?: Partial<AuditLogStats> }>(`/audit-logs?${buildQuery(filters)}`)
      const entries = (payload.entries ?? []).map((row) => normalizeEntry(row as Partial<AuditLog>))
      return {
        entries,
        stats: { ...emptyStats, ...(payload.stats ?? {}), returned: entries.length },
        live: true,
      }
    } catch {
      // Fall through to the offline records.
    }
  }

  const local = useActivityLogStore.getState().activities
  const offline = [...local, ...mockAuditLogs].map(normalizeEntry)
  const filtered = filterAuditLogs(offline, filters).slice(0, filters.limit ?? 300)
  return { entries: filtered, stats: summarizeAuditLogs(filtered), live: false }
}
