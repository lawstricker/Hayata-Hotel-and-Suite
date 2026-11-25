import { motion, useReducedMotion } from 'framer-motion'
import { CalendarPlus, Check, Copy, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BookingStatusBadge, PriceBreakdown } from '@/features/public/components'
import { RevealText } from '@/features/public/animations'
import { useBookingByReference } from '@/hooks/public/use-public-api'
import { buildIcsDataUrl } from '@/lib/ics'
import { copyToClipboard, formatCurrency } from '@/lib/utils'

export function ConfirmationPage() {
  const { ref = '' } = useParams()
  const { data: booking, isLoading, isError } = useBookingByReference(ref)
  const reduceMotion = useReducedMotion()

  async function copyReference() {
    await copyToClipboard(ref)
    toast.success('Reference copied', { description: ref })
  }

  if (isLoading) return <div className="mx-auto max-w-3xl space-y-4 px-4 py-16"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full rounded-2xl" /></div>
  if (isError || !booking) return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><h1 className="font-editorial text-3xl font-bold">Booking not found</h1><p className="mt-2 text-sm text-muted-foreground">Check the reference in your confirmation or look it up from Manage Booking.</p><Button asChild className="mt-6"><Link to="/manage-booking">Manage booking</Link></Button></div>

  return (
    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="size-7" aria-hidden="true" /></div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">You’re booked</p>
        <h1 className="mt-2 font-editorial text-4xl sm:text-5xl"><RevealText text="We can’t wait to welcome you." /></h1>
        <p className="mt-3 text-sm text-muted-foreground">A summary of your stay is below. This is a demo — no email or real payment was sent.</p>
      </div>

      <Card className="mt-10 overflow-hidden border-primary/20">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Booking reference</p>
              <div className="mt-1 flex items-center gap-3"><p className="font-mono text-2xl font-extrabold tracking-wide">{booking.reference}</p><Button size="icon-sm" variant="ghost" onClick={copyReference} aria-label="Copy booking reference"><Copy /></Button></div>
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Stay</p>
              <p className="mt-2 font-display text-lg font-bold">{booking.roomName}</p>
              <p className="mt-1 text-sm text-muted-foreground">Room {booking.assignedRoomNumber}</p>
              <p className="mt-3 text-sm">{booking.checkIn} → {booking.checkOut}</p>
              <p className="text-xs text-muted-foreground">{booking.adults} adults · {booking.children} children</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Guest</p>
              <p className="mt-2 font-display text-lg font-bold">{booking.guest.firstName} {booking.guest.lastName}</p>
              <p className="mt-1 text-sm text-muted-foreground">{booking.guest.email}</p>
              <p className="text-sm text-muted-foreground">{booking.guest.phone}</p>
              {booking.guest.requests && <p className="mt-2 text-xs text-muted-foreground">Requests: {booking.guest.requests}</p>}
            </div>
          </div>
          <div className="mt-8 max-w-md border-t border-border pt-6"><PriceBreakdown quote={booking.quote} /></div>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild><a href={buildIcsDataUrl(booking)} download={`${booking.reference}.ics`}><CalendarPlus /> Add to calendar</a></Button>
        <Button variant="outline" onClick={() => window.print()}><Printer /> Print summary</Button>
        <Button asChild variant="outline"><Link to="/manage-booking">Manage booking</Link></Button>
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">Room service value: {formatCurrency(booking.quote.total)} · charged to your folio at the hotel.</p>
    </motion.div>
  )
}
