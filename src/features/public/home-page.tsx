import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowDownRight, ArrowRight, Coffee, MapPin, ShieldCheck, Sparkles, Star } from 'lucide-react'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AvailabilitySearch, RoomCard, SectionHeading } from '@/features/public/components'
import { CountUp, GoldRule, ParallaxImage, Reveal, RevealText } from '@/features/public/animations'
import { publicRoomTypes } from '@/mock/public/room-types'

const heroImage = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2200&q=90'

const promises = [
  { icon: Sparkles, label: 'Considered design' },
  { icon: Coffee, label: 'All-day dining' },
  { icon: MapPin, label: 'Harbourside address' },
  { icon: ShieldCheck, label: 'Flexible stays' },
]

export function HomePage() {
  const reduceMotion = useReducedMotion()
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 140])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  return (
    <div className="overflow-hidden">
      <section ref={heroRef} className="relative isolate min-h-[92vh] pt-16">
        <motion.div className="absolute inset-0 z-0" style={reduceMotion ? undefined : { y: heroY }}>
          <img src={heroImage} alt="" className="size-full object-cover" />
        </motion.div>
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-ink/85 via-ink/55 to-ink/95" />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_30%,rgba(201,168,76,0.16),transparent_45%)]" />

        <motion.div style={reduceMotion ? undefined : { opacity: heroOpacity }} className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.p initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-[11px] font-bold uppercase tracking-[0.34em] text-champagne">
            Metro City · A private address
          </motion.p>
          <h1 className="mt-6 max-w-5xl font-editorial text-[clamp(3.6rem,10vw,9rem)] font-medium leading-[0.86] tracking-[-0.045em] text-cream">
            <RevealText text="Stay beautifully." delay={0.15} />
          </h1>
          <GoldRule className="mt-8 w-64" />
          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <Reveal delay={0.5}>
              <p className="max-w-xl font-lux text-base leading-relaxed text-cream/75 sm:text-lg">
                Rooms, apartments and considered dining in a quiet corner of the city. Come for the sleep, stay for the feeling.
              </p>
            </Reveal>
            <Reveal delay={0.62}>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-none bg-champagne px-8 text-ink hover:bg-champagne/90"><Link to="/booking/dates">Reserve your stay <ArrowRight /></Link></Button>
                <Button asChild variant="outline" className="rounded-none border-cream/40 bg-transparent text-cream hover:bg-cream/10 hover:text-cream"><Link to="/rooms">Explore rooms</Link></Button>
              </div>
            </Reveal>
          </div>
          <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="mt-16 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.24em] text-cream/60">
            <ArrowDownRight className="size-4 text-champagne" aria-hidden="true" /> Scroll to discover
          </motion.div>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto -mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal y={40}>
          <AvailabilitySearch />
        </Reveal>
      </section>

      <section className="border-y border-border/70 bg-cream py-16 dark:bg-cream/5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-12 gap-y-6 px-4 sm:px-6 lg:px-8">
          {promises.map((promise, index) => (
            <Reveal key={promise.label} delay={index * 0.08}>
              <div className="flex items-center gap-3">
                <promise.icon className="size-5 text-champagne" aria-hidden="true" />
                <span className="font-lux text-xs font-bold uppercase tracking-[0.16em]">{promise.label}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <Reveal><SectionHeading eyebrow="Your space" title={<>Rooms made for <span className="italic text-champagne">slowing down</span></>} description="Every room and apartment is designed around light, quiet and a genuinely good night’s sleep." /></Reveal>
          </div>
          <Reveal delay={0.15}><Button asChild variant="ghost" className="text-champagne"><Link to="/rooms">View all stays <ArrowRight /></Link></Button></Reveal>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {publicRoomTypes.slice(0, 3).map((room, index) => <Reveal key={room.slug} delay={index * 0.1}><RoomCard room={room} /></Reveal>)}
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-ink py-24 text-cream">
        <div className="absolute inset-0 z-0"><ParallaxImage src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1800&q=85" alt="" className="size-full" /></div>
        <div className="absolute inset-0 z-[1] bg-ink/78" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-champagne">The Hayata way</p>
              <h2 className="mt-5 font-editorial text-5xl leading-[1.02] sm:text-6xl"><RevealText text="Small details, deeply felt." /></h2>
              <GoldRule className="mt-8 w-56" />
              <Reveal delay={0.2}>
                <p className="mt-6 max-w-xl font-lux text-base leading-relaxed text-cream/70">From the first greeting to the last quiet morning, we look after the things that make a stay feel effortless.</p>
              </Reveal>
              <div className="mt-10 grid grid-cols-3 gap-6 border-t border-cream/15 pt-8">
                {[{ value: 40, suffix: '', label: 'Rooms & apartments' }, { value: 24, suffix: '/7', label: 'Reception & dining' }, { value: 2019, suffix: '', label: 'Welcoming since' }].map((stat, index) => (
                  <Reveal key={stat.label} delay={0.1 * index}>
                    <p className="font-editorial text-4xl text-champagne"><CountUp value={stat.value} suffix={stat.suffix} /></p>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-cream/60">{stat.label}</p>
                  </Reveal>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Reveal delay={0.1}><ParallaxImage src="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=700&q=85" alt="Restaurant dining room" className="aspect-[4/5] rounded-sm" speed={0.08} /></Reveal>
              <Reveal delay={0.2}><ParallaxImage src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=700&q=85" alt="Hotel lounge" className="mt-10 aspect-[4/5] rounded-sm" speed={0.1} /></Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <Reveal><SectionHeading eyebrow="Apartments" center title={<>Stay a little <span className="italic text-champagne">longer</span></>} description="When a night turns into a week, our apartments give you room to live well." /></Reveal>
        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {publicRoomTypes.filter((room) => room.category === 'Apartment').map((room, index) => <Reveal key={room.slug} delay={index * 0.12}><RoomCard room={room} /></Reveal>)}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-8 sm:px-6 lg:px-8">
        <Reveal>
          <Card className="border-champagne/30 bg-champagne-soft/60">
            <CardContent className="flex flex-col items-start gap-6 p-10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-editorial text-4xl">Your next stay starts here.</p>
                <p className="mt-2 font-lux text-sm text-muted-foreground">Check live availability and book in a few calm steps.</p>
              </div>
              <Button asChild size="lg" className="rounded-none bg-ink text-cream hover:bg-ink/90"><Link to="/booking/dates">Check dates <ArrowRight /></Link></Button>
            </CardContent>
          </Card>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex items-center gap-3 border-t border-border pt-8 font-lux text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Star className="size-4 fill-champagne text-champagne" aria-hidden="true" /> Recognised for quiet luxury and considered service
          </div>
        </Reveal>
      </section>
    </div>
  )
}
