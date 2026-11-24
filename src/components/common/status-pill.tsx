import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusVariants: Record<string, NonNullable<BadgeProps['variant']>> = {
  Available: 'success', Clean: 'success', Paid: 'success', Completed: 'success', Confirmed: 'info', 'Checked in': 'info', Active: 'success', Ready: 'info', Received: 'success', Resolved: 'success', Approved: 'success', Preferred: 'success', Platinum: 'purple', Gold: 'warning', Silver: 'info', Bronze: 'warning', VIP: 'purple', Corporate: 'info', Repeat: 'success', Blacklisted: 'danger', Critical: 'danger', Urgent: 'danger', High: 'danger', Overdue: 'danger', Critical_low: 'danger',
  Dirty: 'warning', Pending: 'warning', Warning: 'warning', 'Pending approval': 'warning', 'Bill requested': 'warning', Low: 'neutral', 'At risk': 'warning', Draft: 'neutral', Scheduled: 'info', Inactive: 'neutral', Normal: 'neutral', Medium: 'warning',
  'Out of Order': 'danger', Cancelled: 'neutral', No_show: 'neutral', Rejected: 'danger', Unpaid: 'warning', Void: 'neutral', Failed: 'danger', Open: 'danger', Assigned: 'info', 'In Progress': 'info', 'In progress': 'info', Prepared: 'info', Sent: 'info', 'Partially received': 'warning', 'Partially paid': 'warning', Free: 'success', Seated: 'info', Ordered: 'warning', New: 'danger', Refunded: 'purple', Lead: 'neutral', 'First stay': 'info', 'Active guest': 'success', Lapsed: 'neutral', Enquiry: 'info', Clocked_in: 'success', Clocked: 'success', Absent: 'danger', Expiring: 'warning',
}

export function StatusPill({ status, className, dot = false, variant: variantOverride }: { status: string; className?: string; dot?: boolean; variant?: BadgeProps['variant'] }) {
  const normalized = status.replaceAll('_', ' ')
  const variant = variantOverride ?? statusVariants[status] ?? statusVariants[normalized] ?? 'neutral'
  return (
    <Badge variant={variant} className={cn('whitespace-nowrap', className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {normalized}
    </Badge>
  )
}
