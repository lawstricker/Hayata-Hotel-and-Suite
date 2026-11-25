import { ArrowDownRight, ArrowRight, Coffee, MapPin, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AvailabilitySearch, RoomCard, SectionHeading } from '@/features/public/components'
import { CountUp, GoldRule, ParallaxImage, Reveal, RevealText } from '@/features/public/animations'
import { publicRoomTypes } from '@/mock/public/room-types'
import type { PromiseIcon } from '@/store/pageBuilderStore'

const promiseIcons: Record<PromiseIcon, typeof Sparkles> = { Sparkles, Coffee, MapPin, ShieldCheck }

export type HeroProps = {
  eyebrow: string; title: string; description: string; image: string
  primaryLabel: string; primaryHref: string; secondaryLabel: string; secondaryHref: string; scrollLabel: string
}
export type PromiseProps = { label1: string; icon1: PromiseIcon; label2: string; icon2: PromiseIcon; label3: string; icon3: PromiseIcon; label4: string; icon4: PromiseIcon }
export type RoomsProps = { eyebrow: string; titleLead: string; titleAccent: string; description: string; linkLabel: string }
export type StoryProps = {
  eyebrow: string; title: string; description: string; image1: string; image2: string
  value1: number; suffix1: string; label1: string
  value2: number; suffix2: string; label2: string
  value3: number; suffix3: string; label3: string
}
export type ApartmentsProps = { eyebrow: string; titleLead: string; titleAccent: string; description: string }
export type CtaProps = { title: string; description: string; buttonLabel: string; buttonHref: string; recognition: string }

export function HeroView(props: HeroProps) {
  return (
    <section className="relative isolate min-h-[92vh] pt-16">
      <div className="absolute inset-0 z-0"><img src={props.image} alt="" className="size-full object-cover" /></div>
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-ink/85 via-ink/55 to-ink/95" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_30%,rgba(201,168,76,0.16),transparent_45%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal delay={0.05} y={16}><p className="text-[11px] font-bold uppercase tracking-[0.34em] text-champagne">{props.eyebrow}</p></Reveal>
        <h1 className="mt-6 max-w-5xl font-editorial text-[clamp(3.6rem,10vw,9rem)] font-medium leading-[0.86] tracking-[-0.045em] text-cream"><RevealText text={props.title} delay={0.15} /></h1>
        <GoldRule className="mt-8 w-64" />
        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <Reveal delay={0.5}><p className="max-w-xl font-lux text-base leading-relaxed text-cream/75 sm:text-lg">{props.description}</p></Reveal>
          <Reveal delay={0.62}>
            <div className="flex flex-wrap gap-3">
              {props.primaryLabel && <Button asChild className="rounded-none bg-champagne px-8 text-ink hover:bg-champagne/90"><Link to={props.primaryHref || '/booking/dates'}>{props.primaryLabel} <ArrowRight /></Link></Button>}
              {props.secondaryLabel && <Button asChild variant="outline" className="rounded-none border-cream/40 bg-transparent text-cream hover:bg-cream/10 hover:text-cream"><Link to={props.secondaryHref || '/rooms'}>{props.secondaryLabel}</Link></Button>}
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.8} y={10}>
          <button type="button" onClick={() => document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="mt-16 flex items-center gap-3 text-left text-[10px] font-bold uppercase tracking-[0.24em] text-cream/60 transition-colors hover:text-cream">
            <ArrowDownRight className="size-4 text-champagne" aria-hidden="true" /> {props.scrollLabel}
          </button>
        </Reveal>
      </div>
    </section>
  )
}

export function PromiseView(props: PromiseProps) {
  const items = [
    { label: props.label1, icon: promiseIcons[props.icon1] ?? Sparkles },
    { label: props.label2, icon: promiseIcons[props.icon2] ?? Coffee },
    { label: props.label3, icon: promiseIcons[props.icon3] ?? MapPin },
    { label: props.label4, icon: promiseIcons[props.icon4] ?? ShieldCheck },
  ]
  return (
    <>
      <section className="relative z-10 mx-auto -mt-6 max-w-7xl px-4 sm:px-6 lg:px-8"><Reveal y={40}><AvailabilitySearch /></Reveal></section>
      <section id="discover" className="border-y border-border/70 bg-cream py-16 dark:bg-cream/5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-12 gap-y-6 px-4 sm:px-6 lg:px-8">
          {items.map((item, index) => <Reveal key={index} delay={index * 0.08}><div className="flex items-center gap-3"><item.icon className="size-5 text-champagne" aria-hidden="true" /><span className="font-lux text-xs font-bold uppercase tracking-[0.16em]">{item.label}</span></div></Reveal>)}
        </div>
      </section>
    </>
  )
}

export function RoomsView(props: RoomsProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <Reveal><SectionHeading eyebrow={props.eyebrow} title={<>{props.titleLead}<span className="italic text-champagne">{props.titleAccent}</span></>} description={props.description} /></Reveal>
        {props.linkLabel && <Reveal delay={0.15}><Button asChild variant="ghost" className="text-champagne"><Link to="/rooms">{props.linkLabel} <ArrowRight /></Link></Button></Reveal>}
      </div>
      <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {publicRoomTypes.slice(0, 3).map((room, index) => <Reveal key={room.slug} delay={index * 0.1}><RoomCard room={room} /></Reveal>)}
      </div>
    </section>
  )
}

export function StoryView(props: StoryProps) {
  const stats = [
    { value: props.value1, suffix: props.suffix1, label: props.label1 },
    { value: props.value2, suffix: props.suffix2, label: props.label2 },
    { value: props.value3, suffix: props.suffix3, label: props.label3 },
  ]
  return (
    <section className="relative isolate overflow-hidden bg-ink py-24 text-cream">
      <div className="absolute inset-0 z-0"><ParallaxImage src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1800&q=85" alt="" className="size-full" /></div>
      <div className="absolute inset-0 z-[1] bg-ink/78" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <Reveal y={16}><p className="text-[11px] font-bold uppercase tracking-[0.3em] text-champagne">{props.eyebrow}</p></Reveal>
            <h2 className="mt-5 font-editorial text-5xl leading-[1.02] sm:text-6xl"><RevealText text={props.title} /></h2>
            <GoldRule className="mt-8 w-56" />
            <Reveal delay={0.2}><p className="mt-6 max-w-xl font-lux text-base leading-relaxed text-cream/70">{props.description}</p></Reveal>
            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-cream/15 pt-8">
              {stats.map((stat, index) => <Reveal key={index} delay={0.1 * index}><p className="font-editorial text-4xl text-champagne"><CountUp value={stat.value} suffix={stat.suffix} /></p><p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-cream/60">{stat.label}</p></Reveal>)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Reveal delay={0.1}><ParallaxImage src={props.image1} alt="Restaurant dining room" className="aspect-[4/5] rounded-sm" speed={0.08} /></Reveal>
            <Reveal delay={0.2}><ParallaxImage src={props.image2} alt="Hotel lounge" className="mt-10 aspect-[4/5] rounded-sm" speed={0.1} /></Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

export function ApartmentsView(props: ApartmentsProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <Reveal><SectionHeading eyebrow={props.eyebrow} center title={<>{props.titleLead}<span className="italic text-champagne">{props.titleAccent}</span></>} description={props.description} /></Reveal>
      <div className="mt-14 grid gap-8 md:grid-cols-2">
        {publicRoomTypes.filter((room) => room.category === 'Apartment').map((room, index) => <Reveal key={room.slug} delay={index * 0.12}><RoomCard room={room} /></Reveal>)}
      </div>
    </section>
  )
}

export function CtaView(props: CtaProps) {
  return (
    <>
      <section className="mx-auto max-w-5xl px-4 pb-8 sm:px-6 lg:px-8">
        <Reveal>
          <Card className="border-champagne/30 bg-champagne-soft/60">
            <CardContent className="flex flex-col items-start gap-6 p-10 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-editorial text-4xl">{props.title}</p><p className="mt-2 font-lux text-sm text-muted-foreground">{props.description}</p></div>
              <Button asChild size="lg" className="rounded-none bg-ink text-cream hover:bg-ink/90"><Link to={props.buttonHref || '/booking/dates'}>{props.buttonLabel} <ArrowRight /></Link></Button>
            </CardContent>
          </Card>
        </Reveal>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <Reveal><div className="flex items-center gap-3 border-t border-border pt-8 font-lux text-xs uppercase tracking-[0.18em] text-muted-foreground"><Sparkles className="size-4 fill-champagne text-champagne" aria-hidden="true" /> {props.recognition}</div></Reveal>
      </section>
    </>
  )
}
