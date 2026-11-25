import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CalendarDays, Check, CreditCard, LockKeyhole, MapPin, Sparkles, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Label, Textarea } from '@/components/ui/input'
import { EmptyState } from '@/components/common/empty-state'
import { RevealText } from '@/features/public/animations'
import {
  useCreatePublicBooking,
  usePayPublicBooking,
  usePublicAvailability,
  usePublicQuote,
} from '@/hooks/public/use-public-api'
import { usePublicBookingStore, type BookingStep } from '@/store/public-booking-store'
import { usePaymentGatewayStore } from '@/store/paymentGatewayStore'
import { processPayment, recordTransaction } from '@/lib/payment-gateway'
import { cn, formatCurrency } from '@/lib/utils'
import type { Availability, Quote } from '@/types/public'

const steps: BookingStep[] = ['dates', 'room', 'details', 'addons', 'payment']
const stepLabels: Record<BookingStep, string> = { dates: 'Dates', room: 'Room', details: 'Guest', addons: 'Extras', payment: 'Payment' }

const guestSchema = z.object({
  firstName: z.string().min(2, 'Enter your first name.'),
  lastName: z.string().min(2, 'Enter your last name.'),
  email: z.email('Enter a valid email address.'),
  phone: z.string().min(7, 'Enter a phone number we can reach.'),
  requests: z.string().optional(),
  acceptTerms: z.boolean().refine((value) => value === true, 'Please accept the booking terms.'),
})

type GuestForm = z.infer<typeof guestSchema>

function StepIndicator({ current }: { current: BookingStep }) {
  const index = steps.indexOf(current)
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Booking progress">
      {steps.map((step, stepIndex) => (
        <li key={step} className="flex items-center gap-2" aria-current={step === current ? 'step' : undefined}>
          <span className={cn('flex size-7 items-center justify-center rounded-full text-[11px] font-extrabold', stepIndex < index ? 'bg-emerald-500 text-white' : stepIndex === index ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
            {stepIndex < index ? <Check className="size-3.5" aria-hidden="true" /> : stepIndex + 1}
          </span>
          <span className={cn('text-xs font-bold', step === current ? 'text-foreground' : 'text-muted-foreground')}>{stepLabels[step]}</span>
          {stepIndex < steps.length - 1 && <span className="ml-1 hidden h-px w-5 bg-border sm:block" />}
        </li>
      ))}
    </ol>
  )
}

function DatesStep({ onNext }: { onNext: () => void }) {
  const { draft, patch } = usePublicBookingStore()
  const { data } = usePublicAvailability({ ...draft, category: 'all' })
  const totalAvailable = data?.reduce((sum, room) => sum + room.availableCount, 0) ?? 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="booking-check-in">Check in</Label><Input id="booking-check-in" type="date" value={draft.checkIn} onChange={(event) => patch({ checkIn: event.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="booking-check-out">Check out</Label><Input id="booking-check-out" type="date" value={draft.checkOut} min={draft.checkIn} onChange={(event) => patch({ checkOut: event.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="booking-adults">Adults</Label><select id="booking-adults" value={draft.adults} onChange={(event) => patch({ adults: Number(event.target.value) })} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
        <div className="space-y-1.5"><Label htmlFor="booking-children">Children</Label><select id="booking-children" value={draft.children} onChange={(event) => patch({ children: Number(event.target.value) })} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{[0, 1, 2, 3].map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
      </div>
      <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-semibold"><CalendarDays className="size-4 text-primary" aria-hidden="true" /> {draft.checkIn} → {draft.checkOut}</p>
          <Badge variant={totalAvailable > 0 ? 'success' : 'secondary'}>{data ? `${totalAvailable} rooms available` : 'Checking…'}</Badge>
        </div>
      </div>
      <div className="flex justify-end"><Button onClick={onNext} disabled={draft.checkOut <= draft.checkIn}>Choose a room <ArrowRight /></Button></div>
    </div>
  )
}

function RoomStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { draft, patch } = usePublicBookingStore()
  const { data, isLoading } = usePublicAvailability({ ...draft, category: 'all' })

  return (
    <div className="space-y-6">
      {isLoading ? <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-xl bg-muted" />)}</div> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data?.map((room: Availability) => {
            const selected = draft.slug === room.slug
            const unavailable = room.availableCount === 0
            return (
              <button key={room.slug} type="button" disabled={unavailable} onClick={() => patch({ slug: room.slug })} aria-pressed={selected} className={cn('flex gap-4 rounded-xl border p-4 text-left transition', selected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:bg-muted/50', unavailable && 'cursor-not-allowed opacity-50')}>
                <img src={room.images[0]} alt="" className="size-24 shrink-0 rounded-lg object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><p className="font-display font-bold">{room.name}</p>{selected && <Check className="size-4 text-primary" aria-hidden="true" />}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{room.category} · up to {room.sleeps}</p>
                  <p className="mt-3 font-display text-lg font-extrabold">{formatCurrency(room.roomSubtotal / Math.max(1, room.nights))}<span className="text-xs font-medium text-muted-foreground"> / night</span></p>
                  <p className="text-[11px] text-muted-foreground">{unavailable ? 'Fully booked' : `${room.availableCount} available`}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
      {!isLoading && data?.length === 0 && <EmptyState title="No rooms for these dates" description="Go back and try a different date range." />}
      <div className="flex justify-between"><Button variant="ghost" onClick={onBack}><ArrowLeft /> Dates</Button><Button onClick={onNext} disabled={!draft.slug}>Guest details <ArrowRight /></Button></div>
    </div>
  )
}

function DetailsStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { draft, setGuest } = usePublicBookingStore()
  const { register, handleSubmit, watch, formState: { errors } } = useForm<GuestForm>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      firstName: draft.guest?.firstName ?? '',
      lastName: draft.guest?.lastName ?? '',
      email: draft.guest?.email ?? '',
      phone: draft.guest?.phone ?? '',
      requests: draft.guest?.requests ?? '',
      acceptTerms: draft.guest?.acceptTerms ?? false,
    },
  })

  useEffect(() => {
    const subscription = watch((values) => {
      if (values.firstName || values.lastName || values.email || values.phone) setGuest(values as GuestForm)
    })
    return () => subscription.unsubscribe()
  }, [watch, setGuest])

  return (
    <form onSubmit={handleSubmit((values) => { setGuest(values); onNext() })} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="guest-first">First name</Label><Input id="guest-first" {...register('firstName')} aria-invalid={Boolean(errors.firstName)} />{errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}</div>
        <div className="space-y-1.5"><Label htmlFor="guest-last">Last name</Label><Input id="guest-last" {...register('lastName')} aria-invalid={Boolean(errors.lastName)} />{errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}</div>
        <div className="space-y-1.5"><Label htmlFor="guest-email">Email</Label><Input id="guest-email" type="email" {...register('email')} aria-invalid={Boolean(errors.email)} />{errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}</div>
        <div className="space-y-1.5"><Label htmlFor="guest-phone">Phone</Label><Input id="guest-phone" {...register('phone')} aria-invalid={Boolean(errors.phone)} />{errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}</div>
      </div>
      <div className="space-y-1.5"><Label htmlFor="guest-requests">Special requests (optional)</Label><Textarea id="guest-requests" rows={3} {...register('requests')} placeholder="Quiet floor, early arrival, dietary notes…" /></div>
      <label className="flex items-start gap-3 rounded-xl border border-border p-4 text-sm"><input type="checkbox" {...register('acceptTerms')} className="mt-0.5 size-4" aria-invalid={Boolean(errors.acceptTerms)} /><span>I accept the <Link className="font-semibold text-primary underline" to="/legal/terms" target="_blank" rel="noreferrer">booking terms</Link> and <Link className="font-semibold text-primary underline" to="/legal/privacy" target="_blank" rel="noreferrer">privacy policy</Link>.</span></label>
      {errors.acceptTerms && <p className="text-xs text-destructive">{errors.acceptTerms.message}</p>}
      <div className="flex justify-between"><Button type="button" variant="ghost" onClick={onBack}><ArrowLeft /> Room</Button><Button type="submit">Continue to extras <ArrowRight /></Button></div>
    </form>
  )
}

function AddOnsStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { draft, patch, toggleAddOn } = usePublicBookingStore()
  const quoteMutation = usePublicQuote()
  const [quote, setQuote] = useState<Quote | null>(null)
  const addOns = draft.addOns
  const promo = draft.promoCode ?? ''
  const key = `${draft.slug}-${draft.checkIn}-${draft.checkOut}-${draft.adults}-${draft.children}-${addOns.breakfast}-${addOns.airportPickup}-${addOns.lateCheckout}-${promo}`

  useEffect(() => {
    if (!draft.slug) return
    let active = true
    quoteMutation.mutateAsync({
      slug: draft.slug,
      checkIn: draft.checkIn,
      checkOut: draft.checkOut,
      adults: draft.adults,
      children: draft.children,
      addOns,
      promoCode: promo || undefined,
    }).then((result) => { if (active) setQuote(result) }).catch(() => {})
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const options = [
    { key: 'breakfast' as const, label: 'Daily breakfast', copy: 'Fresh breakfast for every guest, every morning.', price: '₦12,000 per guest / night' },
    { key: 'airportPickup' as const, label: 'Airport pickup', copy: 'A driver waiting for you on arrival.', price: '₦18,000 one way' },
    { key: 'lateCheckout' as const, label: 'Late checkout', copy: 'Stay until 14:00, subject to availability.', price: '₦15,000' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-3">
        {options.map((option) => (
          <button key={option.key} type="button" onClick={() => toggleAddOn(option.key)} aria-pressed={addOns[option.key]} className={cn('flex items-center gap-4 rounded-xl border p-4 text-left transition', addOns[option.key] ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50')}>
            <span className={cn('flex size-9 items-center justify-center rounded-lg', addOns[option.key] ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{addOns[option.key] ? <Check className="size-4" /> : <Sparkles className="size-4" />}</span>
            <span className="flex-1"><span className="block text-sm font-bold">{option.label}</span><span className="block text-xs text-muted-foreground">{option.copy}</span></span>
            <span className="text-xs font-bold text-primary">{option.price}</span>
          </button>
        ))}
      </div>
      <div className="space-y-1.5"><Label htmlFor="promo">Promo code</Label><div className="flex gap-2"><Input id="promo" value={promo} onChange={(event) => patch({ promoCode: event.target.value.toUpperCase() })} placeholder="HAYATA10" /><Button variant="outline" onClick={() => toast.info('Promo code applied at the next step')}>Apply</Button></div><p className="text-[11px] text-muted-foreground">Try HAYATA10, STAY5 or LONGSTAY7 for 3+ nights.</p></div>
      {quote && <Card className="bg-muted/40"><CardContent className="p-5"><p className="font-display text-lg font-bold">Your stay</p><div className="mt-3 space-y-2 text-sm"><div className="flex justify-between text-muted-foreground"><span>{quote.nights} nights</span><span>{formatCurrency(quote.roomSubtotal)}</span></div>{quote.addOnLines.map((line) => <div key={line.key} className="flex justify-between text-muted-foreground"><span>{line.label}</span><span>{formatCurrency(line.amount)}</span></div>)}{quote.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Promo {quote.promoCode}</span><span>−{formatCurrency(quote.discount)}</span></div>}<div className="flex justify-between text-muted-foreground"><span>Taxes</span><span>{formatCurrency(quote.taxes)}</span></div><div className="flex justify-between border-t border-border pt-3 text-base font-extrabold"><span>Total</span><span>{formatCurrency(quote.total)}</span></div></div></CardContent></Card>}
      <div className="flex justify-between"><Button variant="ghost" onClick={onBack}><ArrowLeft /> Guest</Button><Button onClick={onNext}>Continue to payment <ArrowRight /></Button></div>
    </div>
  )
}

function PaymentStep({ onBack }: { onBack: () => void }) {
  const { draft, patch } = usePublicBookingStore()
  const navigate = useNavigate()
  const createBooking = useCreatePublicBooking()
  const payBooking = usePayPublicBooking()
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' })
  const [conflict, setConflict] = useState<Availability[] | null>(null)
  const [amount, setAmount] = useState(0)
  const { settings } = usePaymentGatewayStore()
  const quoteMutation = usePublicQuote()
  const quoteKey = `${draft.slug ?? ''}-${draft.checkIn}-${draft.checkOut}-${draft.adults}-${draft.children}-${draft.promoCode ?? ''}-${JSON.stringify(draft.addOns)}`

  useEffect(() => {
    if (!draft.slug) return
    let active = true
    quoteMutation.mutateAsync({
      slug: draft.slug,
      checkIn: draft.checkIn,
      checkOut: draft.checkOut,
      adults: draft.adults,
      children: draft.children,
      addOns: draft.addOns,
      promoCode: draft.promoCode || undefined,
    }).then((quote) => { if (active) setAmount(quote.total) }).catch(() => {})
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.slug || !draft.guest) { toast.error('Missing booking details', { description: 'Please go back and complete the previous steps.' }); return }
    if (card.number.replace(/\D/g, '').length < 12 || !card.expiry || card.cvc.length < 3) { toast.error('Complete the demo card fields to continue.'); return }
    try {
      let chargeAmount = amount
      if (!chargeAmount) {
        const quote = await quoteMutation.mutateAsync({
          slug: draft.slug,
          checkIn: draft.checkIn,
          checkOut: draft.checkOut,
          adults: draft.adults,
          children: draft.children,
          addOns: draft.addOns,
          promoCode: draft.promoCode || undefined,
        })
        chargeAmount = quote.total
        setAmount(chargeAmount)
      }
      const paymentRequest = {
        amount: chargeAmount,
        email: draft.guest.email,
        description: `Room reservation · ${draft.slug}`,
        referenceHint: 'BOOK',
        method: 'Card' as const,
        card,
      }
      const payment = await processPayment(paymentRequest, settings)
      recordTransaction(payment, paymentRequest)
      if (!payment.ok) {
        toast.error('Payment declined', { description: payment.message })
        return
      }
      const booking = await createBooking.mutateAsync({
        slug: draft.slug,
        checkIn: draft.checkIn,
        checkOut: draft.checkOut,
        adults: draft.adults,
        children: draft.children,
        guest: draft.guest,
        addOns: draft.addOns,
        promoCode: draft.promoCode || undefined,
      })
      const confirmed = await payBooking.mutateAsync(booking.reference)
      patch({ reference: confirmed.reference })
      navigate(`/booking/confirmation/${confirmed.reference}`)
    } catch (error) {
      const apiError = error as { code?: string; availableRooms?: Availability[]; message?: string }
      if (apiError.code === 'CONFLICT') {
        setConflict(apiError.availableRooms ?? [])
        toast.error('That room was just taken', { description: 'Choose another room to continue.' })
      } else {
        toast.error('Booking could not be completed', { description: apiError.message ?? 'Please try again.' })
      }
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"><p className="flex items-center gap-2 font-bold"><LockKeyhole className="size-4" aria-hidden="true" /> Demo payment</p><p className="mt-1 text-xs">No real charge is made. Do not enter real card details; nothing leaves your browser.</p></div>
      {amount > 0 && <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-4"><span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount to authorise</span><span className="font-editorial text-2xl">{formatCurrency(amount)}</span></div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="card-name">Name on card</Label><Input id="card-name" value={card.name} onChange={(event) => setCard({ ...card, name: event.target.value })} placeholder="Demo Guest" /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="card-number">Card number</Label><Input id="card-number" inputMode="numeric" value={card.number} onChange={(event) => setCard({ ...card, number: event.target.value })} placeholder="4242 4242 4242 4242" /></div>
        <div className="space-y-1.5"><Label htmlFor="card-expiry">Expiry</Label><Input id="card-expiry" value={card.expiry} onChange={(event) => setCard({ ...card, expiry: event.target.value })} placeholder="12/28" /></div>
        <div className="space-y-1.5"><Label htmlFor="card-cvc">CVC</Label><Input id="card-cvc" value={card.cvc} onChange={(event) => setCard({ ...card, cvc: event.target.value })} placeholder="123" /></div>
      </div>
      {conflict && (
        <Card className="border-destructive/40"><CardContent className="p-5"><p className="font-bold">Available alternatives</p><p className="mt-1 text-xs text-muted-foreground">Your dates are still free in these stays.</p><div className="mt-3 space-y-2">{conflict.length ? conflict.map((room) => <Link key={room.slug} to={`/booking/room?room=${room.slug}`} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm hover:bg-muted"><span>{room.name}</span><span className="font-bold text-primary">{formatCurrency(room.roomSubtotal / Math.max(1, room.nights))} / night</span></Link>) : <p className="text-sm text-muted-foreground">No other rooms are free for these dates.</p>}</div></CardContent></Card>
      )}
      <div className="flex justify-between"><Button type="button" variant="ghost" onClick={onBack}><ArrowLeft /> Extras</Button><Button type="submit" disabled={createBooking.isPending || payBooking.isPending}><CreditCard /> {createBooking.isPending || payBooking.isPending ? 'Processing…' : 'Complete demo booking'}</Button></div>
    </form>
  )
}

export function BookingWizardPage() {
  const { step: rawStep } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { draft, patch } = usePublicBookingStore()
  const reduceMotion = useReducedMotion()
  const step = (rawStep ?? 'dates') as BookingStep

  useEffect(() => {
    const room = searchParams.get('room')
    if (room && room !== draft.slug) patch({ slug: room })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const memoStep = useMemo(() => steps.includes(step) ? step : 'dates', [step])
  if (rawStep && !steps.includes(memoStep)) return <Navigate to="/booking/dates" replace />

  const go = (next: BookingStep) => navigate(`/booking/${next}`)
  const index = steps.indexOf(memoStep)

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Reservation</p><h1 className="mt-2 font-editorial text-4xl"><RevealText text="Book your stay" /></h1></div>
        <StepIndicator current={memoStep} />
      </div>
      <Card className="border-border/70 shadow-card">
        <CardContent className="p-6 sm:p-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={memoStep} initial={reduceMotion ? false : { opacity: 0, x: 16 }} animate={reduceMotion ? undefined : { opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: -16 }} transition={{ duration: 0.22 }}>
              {memoStep === 'dates' && <DatesStep onNext={() => go('room')} />}
              {memoStep === 'room' && <RoomStep onBack={() => go('dates')} onNext={() => go('details')} />}
              {memoStep === 'details' && <DetailsStep onBack={() => go('room')} onNext={() => go('addons')} />}
              {memoStep === 'addons' && <AddOnsStep onBack={() => go('details')} onNext={() => go('payment')} />}
              {memoStep === 'payment' && <PaymentStep onBack={() => go('addons')} />}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
      <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground"><MapPin className="size-3.5" aria-hidden="true" /> Hayata Hotel & Suite · 88 Harbor Avenue, Metro City</p>
      <p className="mt-1 flex items-center justify-center gap-2 text-xs text-muted-foreground"><UserRound className="size-3.5" aria-hidden="true" /> Step {index + 1} of {steps.length}</p>
    </div>
  )
}
