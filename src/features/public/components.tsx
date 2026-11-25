import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, BedDouble, CalendarDays, ChevronRight, Users } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { usePublicBookingStore } from '@/store/public-booking-store'
import { cn, formatCurrency } from '@/lib/utils'
import type { Availability, BookingStatus, PublicRoomType, Quote } from '@/types/public'

export function SectionHeading({ eyebrow, title, description, center = false, as = 'h2' }: { eyebrow: string; title: ReactNode; description?: string; center?: boolean; as?: 'h1' | 'h2' }) {
  const Heading = as
  return (
    <div className={cn('max-w-2xl', center && 'mx-auto text-center')}>
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      <Heading className="mt-3 font-editorial text-3xl font-bold leading-tight sm:text-4xl">{title}</Heading>
      {description && <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>}
    </div>
  )
}

export function AvailabilitySearch({ compact = false }: { compact?: boolean }) {
  const { draft, patch } = usePublicBookingStore()
  const navigate = useNavigate()
  const [category, setCategory] = useState(draft.category)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (draft.checkOut <= draft.checkIn) {
      toast.error('Check-out must be after check-in.')
      return
    }
    patch({ category })
    navigate('/rooms')
  }

  return (
    <form onSubmit={submit} className={cn('grid gap-3 border border-champagne/30 bg-card/95 p-4 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.45)] backdrop-blur-xl', compact ? 'md:grid-cols-[1fr_1fr_0.7fr_0.7fr_0.8fr_auto]' : 'md:grid-cols-5')}>
      <div className="space-y-1.5">
        <Label htmlFor="search-check-in" className="text-[10px] font-bold uppercase tracking-[0.16em] text-champagne">Check in</Label>
        <Input id="search-check-in" type="date" value={draft.checkIn} onChange={(event) => patch({ checkIn: event.target.value })} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="search-check-out" className="text-[10px] font-bold uppercase tracking-[0.16em] text-champagne">Check out</Label>
        <Input id="search-check-out" type="date" value={draft.checkOut} onChange={(event) => patch({ checkOut: event.target.value })} required min={draft.checkIn} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="search-adults" className="text-[10px] font-bold uppercase tracking-[0.16em] text-champagne">Adults</Label>
        <select id="search-adults" value={draft.adults} onChange={(event) => patch({ adults: Number(event.target.value) })} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
          {[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="search-children" className="text-[10px] font-bold uppercase tracking-[0.16em] text-champagne">Children</Label>
        <select id="search-children" value={draft.children} onChange={(event) => patch({ children: Number(event.target.value) })} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
          {[0, 1, 2, 3].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>
      {!compact && (
        <div className="space-y-1.5">
          <Label htmlFor="search-category" className="text-[10px] font-bold uppercase tracking-[0.16em] text-champagne">Stay type</Label>
          <select id="search-category" value={category} onChange={(event) => setCategory(event.target.value as 'all' | 'Room' | 'Apartment')} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
            <option value="all">All stays</option>
            <option value="Room">Rooms</option>
            <option value="Apartment">Apartments</option>
          </select>
        </div>
      )}
      <Button type="submit" className="h-10 self-end rounded-none bg-ink px-6 text-cream hover:bg-ink/90"><CalendarDays /> Check availability</Button>
    </form>
  )
}

export function RoomCard({ room }: { room: PublicRoomType | Availability }) {
  const reduceMotion = useReducedMotion()
  const isAvailability = 'availableCount' in room
  const path = `/${room.category === 'Apartment' ? 'apartments' : 'rooms'}/${room.slug}`
  const price = isAvailability ? room.roomSubtotal / Math.max(1, room.nights) : room.baseRate

  return (
    <motion.div whileHover={reduceMotion ? undefined : { y: -8 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
      <Card className="group h-full overflow-hidden border-champagne/20 shadow-none transition-shadow duration-500 hover:shadow-[0_30px_70px_-35px_rgba(0,0,0,0.45)]">
        <Link to={path} className="block">
          <div className="aspect-[4/3] overflow-hidden bg-muted">
            <img src={room.images[0]} alt={room.name} loading="lazy" className="size-full object-cover transition duration-700 group-hover:scale-110" />
          </div>
        </Link>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="rounded-none border-champagne/40 text-[9px] uppercase tracking-[0.18em] text-champagne">{room.category}</Badge>
            {isAvailability && <Badge variant={room.availableCount > 0 ? 'success' : 'secondary'} className="rounded-none text-[9px] uppercase tracking-wider">{room.availableCount} left</Badge>}
          </div>
          <h3 className="mt-4 font-editorial text-3xl leading-tight">{room.name}</h3>
          <p className="mt-2 line-clamp-2 font-lux text-sm text-muted-foreground">{'tagline' in room ? room.tagline : room.highlights.join(' · ')}</p>
          <div className="mt-5 flex items-center gap-5 font-lux text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="size-3.5 text-champagne" aria-hidden="true" /> {room.sleeps} guests</span>
            <span className="flex items-center gap-1"><BedDouble className="size-3.5 text-champagne" aria-hidden="true" /> {room.sizeSqm} m²</span>
          </div>
          <div className="mt-6 flex items-end justify-between border-t border-border pt-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">From</p>
              <p className="font-editorial text-3xl text-champagne">{formatCurrency(price)}<span className="font-lux text-xs text-muted-foreground"> / night</span></p>
            </div>
            <Button asChild size="sm" variant="ghost" className="rounded-none text-champagne hover:bg-champagne/10"><Link to={path} aria-label={`View ${room.name}`}>View <ChevronRight /></Link></Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function PriceBreakdown({ quote, showNights = true }: { quote: Quote; showNights?: boolean }) {
  return (
    <div className="space-y-2 text-sm">
      {showNights && <div className="flex justify-between text-muted-foreground"><span>{quote.nights} night{quote.nights === 1 ? '' : 's'}</span><span>{formatCurrency(quote.roomSubtotal)}</span></div>}
      {quote.addOnLines.map((line) => <div key={line.key} className="flex justify-between text-muted-foreground"><span>{line.label}</span><span>{formatCurrency(line.amount)}</span></div>)}
      {quote.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Promo {quote.promoCode}</span><span>−{formatCurrency(quote.discount)}</span></div>}
      <div className="flex justify-between text-muted-foreground"><span>Taxes & fees</span><span>{formatCurrency(quote.taxes)}</span></div>
      <div className="flex justify-between border-t border-border pt-3 text-base font-extrabold"><span>Total</span><span>{formatCurrency(quote.total)}</span></div>
    </div>
  )
}

const statusStyles: Record<BookingStatus, string> = {
  PENDING_PAYMENT: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  CONFIRMED: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
  CHECKED_IN: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300',
  CHECKED_OUT: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  CANCELLED: 'border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <span className={cn('inline-flex rounded-full border px-3 py-1 text-[11px] font-bold', statusStyles[status])}>{status.replaceAll('_', ' ')}</span>
}

export function StickyBookingBar({ price, slug }: { price: number; slug: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-4 backdrop-blur lg:hidden" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-champagne">From</p><p className="font-display text-lg font-extrabold">{formatCurrency(price)}</p></div>
        <Button asChild><Link to={`/booking/dates?room=${slug}`}>Book now <ArrowRight /></Link></Button>
      </div>
    </div>
  )
}
