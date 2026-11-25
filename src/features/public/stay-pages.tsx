import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, BedDouble, Check, Clock3, MapPin, Maximize2, Users, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/empty-state'
import { AvailabilitySearch, RoomCard, SectionHeading, StickyBookingBar } from '@/features/public/components'
import { Reveal, RevealText } from '@/features/public/animations'
import { usePublicAvailability } from '@/hooks/public/use-public-api'
import { getPublicRoomType } from '@/mock/public/room-types'
import { usePublicBookingStore } from '@/store/public-booking-store'
import { cn, formatCurrency } from '@/lib/utils'
import type { PublicRoomCategory } from '@/types/public'

function StayListing({ category }: { category: PublicRoomCategory }) {
  const { draft, patch } = usePublicBookingStore()
  const { data, isLoading } = usePublicAvailability({ ...draft, category })
  const results = data?.filter((room) => room.category === category) ?? []
  const reduceMotion = useReducedMotion()

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Reveal>
        <SectionHeading
          as="h1"
          eyebrow={category === 'Apartment' ? 'Longer stays' : 'Your room'}
          title={category === 'Apartment' ? 'Apartments with room to live' : 'Rooms made for rest'}
          description={category === 'Apartment' ? 'Separate living spaces, kitchenettes and the freedom to settle in.' : 'Choose the space that suits your stay. Live availability and pricing below.'}
        />
      </Reveal>
      <div className="mt-8"><AvailabilitySearch /></div>
      <div className="mt-8 flex flex-wrap items-center gap-2">
        {(['all', 'Room', 'Apartment'] as const).map((value) => (
          <Button key={value} size="sm" variant={draft.category === value ? 'default' : 'outline'} onClick={() => patch({ category: value })}>
            {value === 'all' ? 'All stays' : `${value}s`}
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{draft.checkIn} → {draft.checkOut}</span>
      </div>

      {isLoading ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-96 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : results.length === 0 ? (
        <div className="mt-8"><EmptyState title="No stays available" description="Try a different date range or guest count." /></div>
      ) : (
        <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {results.map((room, index) => <Reveal key={room.slug} delay={index * 0.06}><RoomCard room={room} /></Reveal>)}
        </motion.div>
      )}
    </div>
  )
}

export function RoomsPage() { return <StayListing category="Room" /> }
export function ApartmentsPage() { return <StayListing category="Apartment" /> }

export function RoomDetailPage({ category }: { category: PublicRoomCategory }) {
  const { slug = '' } = useParams()
  const room = getPublicRoomType(slug)
  const { draft } = usePublicBookingStore()
  const { data } = usePublicAvailability({ ...draft, category })
  const availability = data?.find((candidate) => candidate.slug === slug)
  const [activeImage, setActiveImage] = useState<string | null>(null)
  const reduceMotion = useReducedMotion()

  if (!room || room.category !== category) {
    return <div className="mx-auto max-w-3xl px-4 py-24"><EmptyState title="Stay not found" description="This room or apartment is no longer listed." action={<Button asChild><Link to={category === 'Apartment' ? '/apartments' : '/rooms'}>Browse stays</Link></Button>} /></div>
  }

  const nightly = availability ? availability.roomSubtotal / Math.max(1, availability.nights) : room.baseRate

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" className="-ml-3 mb-5"><Link to={category === 'Apartment' ? '/apartments' : '/rooms'}><ArrowLeft /> All stays</Link></Button>
      <motion.div initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-10 lg:grid-cols-[1.4fr_0.8fr]">
        <div>
          <div className="grid grid-cols-2 gap-3">
            {room.images.map((image, index) => (
              <button key={image} type="button" onClick={() => setActiveImage(image)} className={cn('relative overflow-hidden rounded-2xl', index === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-[4/3]')} aria-label={`Open image ${index + 1} of ${room.name}`}>
                <img src={image} alt={`${room.name} view ${index + 1}`} className="size-full object-cover transition duration-500 hover:scale-105" loading={index === 0 ? 'eager' : 'lazy'} />
              </button>
            ))}
          </div>
          <div className="mt-10">
            <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{room.category}</Badge>{availability && <Badge variant={availability.availableCount > 0 ? 'success' : 'secondary'}>{availability.availableCount} available</Badge>}</div>
            <h1 className="mt-4 font-editorial text-4xl sm:text-5xl"><RevealText text={room.name} /></h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">{room.longDescription}</p>
            <div className="mt-8 grid grid-cols-2 gap-4 border-y border-border py-6 sm:grid-cols-4">
              {[
                { icon: Users, label: 'Sleeps', value: `${room.sleeps} guests` },
                { icon: BedDouble, label: 'Bed', value: room.bed },
                { icon: Maximize2, label: 'Space', value: `${room.sizeSqm} m²` },
                { icon: MapPin, label: 'Setting', value: 'City view' },
              ].map((item) => <div key={item.label}><item.icon className="size-4 text-primary" aria-hidden="true" /><p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</p><p className="text-sm font-bold">{item.value}</p></div>)}
            </div>
            <h2 className="mt-10 font-editorial text-2xl font-bold">What this stay includes</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">{room.amenities.map((amenity) => <p key={amenity} className="flex items-center gap-2 text-sm"><Check className="size-4 text-emerald-600" aria-hidden="true" /> {amenity}</p>)}</div>
            <h2 className="mt-10 font-editorial text-2xl font-bold">Good to know</h2>
            <div className="mt-4 space-y-2">{room.policies.map((policy) => <p key={policy} className="flex items-start gap-2 text-sm text-muted-foreground"><Clock3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> {policy}</p>)}</div>
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="border-border/70 shadow-card">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">From</p>
              <p className="mt-1 font-editorial text-4xl font-bold">{formatCurrency(nightly)}<span className="font-sans text-sm font-medium text-muted-foreground"> / night</span></p>
              <p className="mt-2 text-xs text-muted-foreground">{draft.checkIn} → {draft.checkOut} · {draft.adults + draft.children} guests</p>
              {availability && availability.nightlyRates.length > 0 && (
                <div className="mt-5 max-h-40 space-y-1 overflow-y-auto rounded-xl bg-muted/40 p-3 text-xs">
                  {availability.nightlyRates.map((night) => <div key={night.date} className="flex justify-between"><span className="text-muted-foreground">{night.date}{night.label ? ` · ${night.label}` : ''}</span><span className="font-semibold">{formatCurrency(night.rate)}</span></div>)}
                </div>
              )}
              <Button asChild size="lg" className="mt-6 w-full"><Link to={`/booking/dates?room=${room.slug}`}>Book this stay</Link></Button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">No card charge until the final step. This is a demo payment.</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>
      <StickyBookingBar price={nightly} slug={room.slug} />

      <Dialog open={Boolean(activeImage)} onOpenChange={(open) => { if (!open) setActiveImage(null) }}>
        <DialogContent className="max-w-4xl border-0 bg-transparent p-0 shadow-none">
          {activeImage && <div className="relative"><img src={activeImage} alt={room.name} className="max-h-[85vh] w-full rounded-2xl object-contain" /><Button size="icon" variant="secondary" className="absolute right-3 top-3" onClick={() => setActiveImage(null)} aria-label="Close image"><X /></Button></div>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
