import { useQuery } from '@tanstack/react-query'
import type { AuditEvent, FiscalPeriod } from '@/types/domain'
import { financeRequest } from './client'

export interface FinanceMeta {
  totalAccounts: number
  activeAccounts: number
  archivedAccounts: number
  postedLines: number
  totalInvoices: number
  draftInvoices: number
  overdueInvoices: number
  paidInvoices: number
  receivables: string
  overdueAmount: string
  nextInvoiceNumber: string
  periods: FiscalPeriod[]
}

export function useFinanceMeta() {
  return useQuery({
    queryKey: ['finance', 'meta'],
    queryFn: () => financeRequest<FinanceMeta>('/meta'),
  })
}

export interface AuditFilters {
  entity?: string
  actor?: string
}

export function useFinanceAudit(filters: AuditFilters = {}) {
  const params = new URLSearchParams()
  if (filters.entity) params.set('entity', filters.entity)
  if (filters.actor) params.set('actor', filters.actor)
  const query = params.toString()
  return useQuery({
    queryKey: ['finance', 'audit', filters],
    queryFn: () => financeRequest<AuditEvent[]>(`/audit${query ? `?${query}` : ''}`),
  })
}

/** All mutations in later phases should call this so every change is audited. */
export function recordAudit(entry: Pick<AuditEvent, 'action' | 'entity' | 'entityId' | 'reason' | 'before' | 'after'>) {
  return financeRequest<{ ok: boolean }>('/audit', { method: 'POST', body: JSON.stringify(entry) })
}
