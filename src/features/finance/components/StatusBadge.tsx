import { Badge } from '@/components/ui/badge'

type Variant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral'

const map: Record<string, Variant> = {
  DRAFT: 'neutral', POSTED: 'success', REVERSED: 'danger',
  ACTIVE: 'success', ARCHIVED: 'neutral', OPEN: 'success', LOCKED: 'warning', CLOSED: 'neutral',
  SENT: 'info', PARTIALLY_PAID: 'warning', PAID: 'success', OVERDUE: 'danger', VOID: 'neutral',
  PENDING_APPROVAL: 'warning', APPROVED: 'success', SUBMITTED: 'info', REIMBURSED: 'success', REJECTED: 'danger',
}

export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ')
  return <Badge variant={map[status.toUpperCase()] ?? 'outline'}>{label.charAt(0) + label.slice(1).toLowerCase()}</Badge>
}
