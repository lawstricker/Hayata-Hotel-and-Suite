import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, Clock3, Coffee, ConciergeBell, Dumbbell, MapPin, Phone, ShieldCheck, Sparkles, Wifi, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input, Label, Textarea } from '@/components/ui/input'
import { SectionHeading } from '@/features/public/components'
import { GoldRule, Reveal, RevealText } from '@/features/public/animations'
import { usePublicEnquiry } from '@/hooks/public/use-public-api'
import { cn } from '@/lib/utils'

const amenities = [
  { icon: Wifi, title: 'Fast, quiet Wi-Fi', copy: 'Reliable connectivity in every room and apartment.' },
  { icon: Coffee, title: 'All-day dining', copy: 'Kitchen and bar service, plus in-room QR ordering.' },
  { icon: Dumbbell, title: 'Fitness studio', copy: 'A compact, well-equipped space open from 06:00.' },
  { icon: ConciergeBell, title: '24-hour reception', copy: 'A real person is always a call away.' },
  { icon: Sparkles, title: 'Daily housekeeping', copy: 'Thoughtful resets, never intrusive.' },
  { icon: ShieldCheck, title: 'Flexible booking', copy: 'Clear policies and simple cancellation.' },
]

const galleryImages = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85',
]

export function AmenitiesPage() {
  const reduceMotion = useReducedMotion()
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <Reveal><SectionHeading as="h1" eyebrow="At Hayata" title="Everything you need, nothing you don’t" description="Practical comforts and a few indulgences, all looked after with care." /></Reveal>
      <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {amenities.map((item) => (
          <Card key={item.title} className="border-border/70"><CardContent className="p-6"><item.icon className="size-6 text-primary" aria-hidden="true" /><h2 className="mt-4 font-display text-lg font-bold">{item.title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.copy}</p></CardContent></Card>
        ))}
      </motion.div>
      <div className="mt-16 grid gap-8 md:grid-cols-2 md:items-center">
        <div><SectionHeading eyebrow="For work" title="A calm place to get things done" description="Fast Wi-Fi, generous desks and quiet corners make Hayata an easy base for working away from home." /><Button asChild className="mt-6"><Link to="/rooms">Find your room <ArrowRight /></Link></Button></div>
        <img src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=80" alt="Workspace at Hayata" className="aspect-[4/3] rounded-2xl object-cover" loading="lazy" />
      </div>
    </div>
  )
}

export function DiningPage() {
  return (
    <div>
      <section className="relative isolate overflow-hidden">
        <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2000&q=85" alt="" className="absolute inset-0 z-0 size-full object-cover" />
        <div className="absolute inset-0 z-[1] bg-ink/70" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-24 text-center sm:px-6"><p className="text-[11px] font-bold uppercase tracking-[0.24em] text-champagne">Lumen Restaurant & Atlas Bar</p><h1 className="mt-4 font-editorial text-5xl text-cream sm:text-6xl"><RevealText text="Good food, unhurried." /></h1><GoldRule className="mx-auto mt-6 w-40" /><p className="mx-auto mt-5 max-w-xl font-lux text-base leading-relaxed text-cream/75">Seasonal plates, a thoughtful wine list and the ease of ordering from your room whenever the mood strikes.</p></div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          {[
            { title: 'Lumen Restaurant', copy: 'Breakfast, long lunches and quietly ambitious dinners. The kitchen sources close to home and lets ingredients speak.', hours: '07:00 – 22:30 daily', image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1000&q=80' },
            { title: 'Atlas Bar', copy: 'A small, well-versed bar for a nightcap, a conversation or a single perfect martini.', hours: '16:00 – 00:00 daily', image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1000&q=80' },
          ].map((venue) => (
            <Card key={venue.title} className="overflow-hidden"><img src={venue.image} alt={venue.title} className="aspect-[16/9] w-full object-cover" loading="lazy" /><CardContent className="p-6"><h2 className="font-editorial text-3xl font-bold">{venue.title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{venue.copy}</p><p className="mt-4 flex items-center gap-2 text-xs font-bold text-primary"><Clock3 className="size-4" aria-hidden="true" /> {venue.hours}</p></CardContent></Card>
          ))}
        </div>
        <div className="mt-14 rounded-2xl border border-primary/20 bg-primary/5 p-8">
          <SectionHeading eyebrow="In-room dining" title="Scan. Choose. Done." description="Every room has a permanent QR code. Scan it to see the kitchen menu, place an order and have it brought to your door. The same code works for the next guest too." />
          <Button asChild className="mt-6"><Link to="/rooms">Book a room <ArrowRight /></Link></Button>
        </div>
      </div>
    </div>
  )
}

export function GalleryPage() {
  const [active, setActive] = useState<string | null>(null)
  const reduceMotion = useReducedMotion()
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <Reveal><SectionHeading as="h1" eyebrow="The gallery" title="A few glimpses of Hayata" description="Spaces, details and the small moments that make a stay." /></Reveal>
      <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {galleryImages.map((image, index) => <button key={image} type="button" onClick={() => setActive(image)} className="mb-4 block w-full overflow-hidden rounded-2xl" aria-label={`Open gallery image ${index + 1}`}><img src={image} alt={`Hayata gallery image ${index + 1}`} loading="lazy" className="w-full object-cover transition duration-500 hover:scale-105" /></button>)}
      </motion.div>
      <Dialog open={Boolean(active)} onOpenChange={(open) => { if (!open) setActive(null) }}><DialogContent className="max-w-4xl border-0 bg-transparent p-0 shadow-none">{active && <div className="relative"><img src={active} alt="Hayata gallery" className="max-h-[85vh] w-full rounded-2xl object-contain" /><Button size="icon" variant="secondary" className="absolute right-3 top-3" onClick={() => setActive(null)} aria-label="Close image"><X /></Button></div>}</DialogContent></Dialog>
    </div>
  )
}

export function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <Reveal><SectionHeading as="h1" eyebrow="About Hayata" title="A hotel built around the way people actually travel" description="We opened Hayata with a simple idea: a city stay should feel calm, personal and quietly capable." /></Reveal>
      <div className="mt-10 prose prose-slate max-w-none space-y-5 text-sm leading-relaxed text-muted-foreground dark:prose-invert">
        <p>Hayata Hotel & Suite sits a short walk from the harbour, but feels a world away. Our rooms and apartments are designed around natural light, deep sleep and the small rituals that make a place feel like yours.</p>
        <p>Service here is warm rather than formal. We remember how you like your coffee, we keep the quiet floors quiet, and we make sure the kitchen can reach you whenever you want it to.</p>
        <p>We are also quietly obsessive about the details behind the scenes — from live stock levels to housekeeping rhythms — because the best hospitality is the kind you never have to think about.</p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[{ value: '40', label: 'Rooms & apartments' }, { value: '24/7', label: 'Reception & dining' }, { value: '2019', label: 'Welcoming guests since' }].map((stat) => <Card key={stat.label}><CardContent className="p-6 text-center"><p className="font-editorial text-4xl font-bold">{stat.value}</p><p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</p></CardContent></Card>)}
      </div>
      <Button asChild className="mt-10"><Link to="/contact">Say hello <ArrowRight /></Link></Button>
    </div>
  )
}

export function ContactPage() {
  const enquiry = usePublicEnquiry()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      await enquiry.mutateAsync(form)
      toast.success('Message sent', { description: 'Our team will reply shortly.' })
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch (error) {
      toast.error('Could not send message', { description: error instanceof Error ? error.message : 'Try again.' })
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <Reveal><SectionHeading as="h1" eyebrow="Contact" title="We’re here whenever you need us" description="Questions about a stay, an event, or anything else? Send a note and we will take it from there." /></Reveal>
      <div className="mt-10 grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-5">
          <Card><CardContent className="p-6"><MapPin className="size-5 text-primary" aria-hidden="true" /><p className="mt-3 text-sm font-bold">Visit us</p><p className="mt-1 text-sm text-muted-foreground">88 Harbor Avenue, Metro City</p></CardContent></Card>
          <Card><CardContent className="p-6"><Phone className="size-5 text-primary" aria-hidden="true" /><p className="mt-3 text-sm font-bold">Call reception</p><p className="mt-1 text-sm text-muted-foreground">+1 (555) 010-8899 · 24 hours</p></CardContent></Card>
          <Card><CardContent className="p-6"><Check className="size-5 text-primary" aria-hidden="true" /><p className="mt-3 text-sm font-bold">In-room dining</p><p className="mt-1 text-sm text-muted-foreground">Scan the QR code in your room to order from the kitchen.</p></CardContent></Card>
        </div>
        <Card><CardContent className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="contact-name">Name</Label><Input id="contact-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></div>
              <div className="space-y-1.5"><Label htmlFor="contact-email">Email</Label><Input id="contact-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="contact-subject">Subject</Label><Input id="contact-subject" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required /></div>
            <div className="space-y-1.5"><Label htmlFor="contact-message">Message</Label><Textarea id="contact-message" rows={5} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} required /></div>
            <Button type="submit" disabled={enquiry.isPending}>Send message <ArrowRight /></Button>
          </form>
        </CardContent></Card>
      </div>
    </div>
  )
}

export function LegalPage({ type }: { type: 'privacy' | 'terms' }) {
  const privacy = type === 'privacy'
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <Reveal><SectionHeading as="h1" eyebrow="Legal" title={privacy ? 'Privacy policy' : 'Terms of stay'} /></Reveal>
      <div className={cn('mt-8 space-y-5 text-sm leading-relaxed text-muted-foreground')}>
        <p>{privacy ? 'This demo stores booking drafts in your browser session and booking records in browser storage. No personal data is sent to a server.' : 'Bookings made through this demo are simulated. No payment is taken and no confirmation email is sent.'}</p>
        <p>{privacy ? 'Staff session, permission, printer and live-order data belong to the staff application and are not written by the public website.' : 'Room availability is calculated from the same in-browser mock inventory used by the staff application, so a confirmed booking blocks that room for the selected dates.'}</p>
        <p>{privacy ? 'You can clear all demo data at any time by clearing your browser storage.' : 'Cancellation follows the policy shown on each room page. Pending-payment bookings may be cancelled at any time from Manage Booking.'}</p>
      </div>
      <Button asChild variant="ghost" className="mt-8"><Link to="/">Back home <ArrowRight /></Link></Button>
    </div>
  )
}
