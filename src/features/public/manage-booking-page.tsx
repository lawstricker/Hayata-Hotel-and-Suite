import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, CalendarDays, Search, XCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { BookingStatusBadge, PriceBreakdown } from '@/features/public/components'
import { RevealText } from '@/features/public/animations'
import { useBookingLookup, useCancelPublicBooking } from '@/hooks/public/use-public-api'
import { usePublicBookingStore } from '@/store/public-booking-store'
import { formatCurrency } from '@/lib/utils'

export function ManageBookingPage() {
  const [form, setForm] = useState({ reference: '', email: '' })
  const [submitted, setSubmitted] = useState<{ reference: string; email: string } | null>(null)
  const query = useBookingLookup(submitted?.reference ?? null, submitted?.email ?? null)
  const cancel = useCancelPublicBooking()
  const { patch } = usePublicBookingStore()
  const reduceMotion = useReducedMotion()

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted({ reference: form.reference.trim().toUpperCase(), email: form.email.trim() })
  }

  async function cancelBooking() {
    if (!submitted || !query.data) return
    try {
      await cancel.mutateAsync({ reference: submitted.reference, email: submitted.email })
      toast.success('Booking cancelled', { description: 'The room is available again.' })
      query.refetch()
    } catch (error) {
      toast.error('Cancellation not allowed', { description: error instanceof Error ? error.message : 'Please contact reception.' })
    }
  }

  const booking = query.data

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Manage booking</p>
        <h1 className="mt-3 font-editorial text-4xl sm:text-5xl"><RevealText text="Find your reservation" /></h1>
        <p className="mt-3 text-sm text-muted-foreground">Enter the reference and email from your confirmation to view or cancel your stay.</p>
      </div>

      <Card className="mx-auto mt-10 max-w-2xl"><CardContent className="p-6 sm:p-8">
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5"><Label htmlFor="manage-ref">Booking reference</Label><Input id="manage-ref" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} placeholder="HYT-XXXXXX" required /></div>
          <div className="space-y-1.5"><Label htmlFor="manage-email">Email</Label><Input id="manage-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" required /></div>
          <Button type="submit" disabled={query.isFetching}><Search /> {query.isFetching ? 'Looking…' : 'Look up'}</Button>
        </form>
      </CardContent></Card>

      {query.isFetching && <div className="mx-auto mt-8 max-w-2xl"><Skeleton className="h-72 rounded-2xl" /></div>}
      {query.isError && !query.isFetching && <Card className="mt-8 border-destructive/40"><CardContent className="p-6 text-sm">No matching booking found. Check the reference and email, or <Link className="font-bold text-primary underline" to="/contact">contact us</Link>.</CardContent></Card>}

      {booking && (
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mt-8 border-primary/20">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
                <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Reference</p><p className="font-mono text-xl font-extrabold">{booking.reference}</p></div>
                <BookingStatusBadge status={booking.status} />
              </div>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Stay</p>
                  <p className="mt-2 font-display text-lg font-bold">{booking.roomName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Room {booking.assignedRoomNumber}</p>
                  <p className="mt-3 flex items-center gap-2 text-sm"><CalendarDays className="size-4 text-primary" aria-hidden="true" /> {booking.checkIn} → {booking.checkOut}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Guest</p>
                  <p className="mt-2 font-display text-lg font-bold">{booking.guest.firstName} {booking.guest.lastName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{booking.guest.email}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(booking.quote.total)} total</p>
                </div>
              </div>
              <div className="mt-6 max-w-md"><PriceBreakdown quote={booking.quote} /></div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="outline" onClick={() => patch({ reference: booking.reference })}><Link to={`/booking/confirmation/${booking.reference}`}>View summary <ArrowRight /></Link></Button>
                {booking.status !== 'CANCELLED' && <Button variant="destructive" onClick={cancelBooking} disabled={cancel.isPending}><XCircle /> {cancel.isPending ? 'Cancelling…' : 'Cancel booking'}</Button>}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
