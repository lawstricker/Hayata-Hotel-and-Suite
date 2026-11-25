import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FieldError, Label, Textarea } from '@/components/ui/input'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  destructive?: boolean
  requireReason?: boolean
  onConfirm: (reason: string) => void
  children?: ReactNode
}

/** Every destructive action goes through this dialog; the reason is logged to the audit trail. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirm', destructive, requireReason, onConfirm, children }: ConfirmDialogProps) {
  const [reason, setReason] = useState('')
  const invalid = Boolean(requireReason && !reason.trim())
  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setReason('') }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        {children}
        {requireReason && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-reason">Reason (recorded in audit log)</Label>
            <Textarea id="confirm-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is this action necessary?" aria-invalid={invalid} />
            {invalid && <FieldError>A reason is required.</FieldError>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={destructive ? 'destructive' : 'default'} disabled={invalid} onClick={() => { onConfirm(reason.trim()); onOpenChange(false) }}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
