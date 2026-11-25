import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Mail, MapPin, Menu, Moon, Phone, Sun, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorBoundary } from '@/components/error-boundary'
import { Input } from '@/components/ui/input'
import { ScrollProgress, Reveal } from '@/features/public/animations'
import { useNewsletter } from '@/hooks/public/use-public-api'
import { usePublicThemeStore } from '@/store/public-theme-store'
import { cn } from '@/lib/utils'

const links = [
  { label: 'Rooms', to: '/rooms' },
  { label: 'Apartments', to: '/apartments' },
  { label: 'Amenities', to: '/amenities' },
  { label: 'Dining', to: '/dining' },
  { label: 'Gallery', to: '/gallery' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

const navClass = ({ isActive }: { isActive: boolean }) => cn(
  'group relative px-1 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors',
  isActive ? 'text-champagne' : 'text-cream/75 hover:text-champagne',
)

function PublicHeader() {
  const [open, setOpen] = useState(false)
  const { theme, toggleTheme } = usePublicThemeStore()
  const { scrollY } = useScroll()
  const padding = useTransform(scrollY, [0, 90], [22, 10])
  const backdrop = useTransform(scrollY, [0, 90], ['rgba(9, 15, 18, 0.55)', 'rgba(9, 15, 18, 0.92)'])

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-40 border-b border-white/10 text-cream backdrop-blur-xl"
      style={{ paddingTop: padding, paddingBottom: padding, backgroundColor: backdrop }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="Hayata Hotel and Suite home">
          <span className="flex size-11 items-center justify-center border border-champagne/60 font-editorial text-xl text-champagne">H</span>
          <span className="leading-tight">
            <span className="block font-editorial text-2xl tracking-tight">Hayata</span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.28em] text-champagne/80">Hotel & Suite</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={navClass}>
              {link.label}
              <span className={cn('absolute -bottom-1 left-0 h-px w-full origin-left bg-champagne transition-transform', 'scale-x-0 group-hover:scale-x-100')} />
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button type="button" onClick={toggleTheme} className="flex size-10 items-center justify-center rounded-full border border-white/15 transition-colors hover:border-champagne hover:text-champagne" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <Button asChild className="hidden rounded-none bg-champagne px-6 text-ink hover:bg-champagne/90 sm:inline-flex"><Link to="/booking/dates">Reserve <ArrowRight /></Link></Button>
          <button type="button" className="flex size-10 items-center justify-center rounded-full border border-white/15 lg:hidden" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="public-mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'}>
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav id="public-mobile-nav" aria-label="Mobile navigation" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-white/10 lg:hidden">
            <div className="grid gap-1 px-4 pb-4 pt-4 sm:px-6">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)} className={({ isActive }) => cn('rounded-md px-3 py-3 text-xs font-bold uppercase tracking-[0.14em]', isActive ? 'bg-champagne/10 text-champagne' : 'text-cream/80')}>
                  {link.label}
                </NavLink>
              ))}
              <Button asChild className="mt-3 rounded-none bg-champagne text-ink"><Link to="/booking/dates">Reserve your stay <ArrowRight /></Link></Button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

function PublicFooter() {
  const [email, setEmail] = useState('')
  const newsletter = useNewsletter()

  async function subscribe(event: FormEvent) {
    event.preventDefault()
    try {
      await newsletter.mutateAsync(email)
      toast.success('You’re on the list', { description: 'We will send occasional notes from Hayata.' })
      setEmail('')
    } catch (error) {
      toast.error('Could not subscribe', { description: error instanceof Error ? error.message : 'Try again shortly.' })
    }
  }

  return (
    <footer className="mt-24 bg-ink text-cream">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr_1.3fr]">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center border border-champagne/60 font-editorial text-xl text-champagne">H</span>
              <span className="font-editorial text-3xl">Hayata</span>
            </div>
            <p className="mt-5 max-w-sm font-lux text-sm leading-relaxed text-cream/65">A quieter kind of city stay. Rooms, apartments and thoughtful dining, delivered with warmth.</p>
            <div className="mt-6 space-y-2 font-lux text-sm text-cream/65">
              <p className="flex items-center gap-2"><MapPin className="size-4 text-champagne" aria-hidden="true" /> 88 Harbor Avenue, Metro City</p>
              <p className="flex items-center gap-2"><Phone className="size-4 text-champagne" aria-hidden="true" /> +1 (555) 010-8899</p>
              <p className="flex items-center gap-2"><Mail className="size-4 text-champagne" aria-hidden="true" /> hello@hayatahotel.com</p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-champagne">Explore</h2>
            <div className="mt-5 grid gap-3 font-lux text-sm text-cream/65">
              <Link className="hover:text-champagne" to="/rooms">Rooms</Link>
              <Link className="hover:text-champagne" to="/apartments">Apartments</Link>
              <Link className="hover:text-champagne" to="/dining">Dining</Link>
              <Link className="hover:text-champagne" to="/gallery">Gallery</Link>
            </div>
          </Reveal>
          <Reveal delay={0.14}>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-champagne">Guest tools</h2>
            <div className="mt-5 grid gap-3 font-lux text-sm text-cream/65">
              <Link className="hover:text-champagne" to="/manage-booking">Manage booking</Link>
              <Link className="hover:text-champagne" to="/booking/dates">Book a stay</Link>
              <Link className="hover:text-champagne" to="/contact">Contact us</Link>
              <Link className="hover:text-champagne" to="/legal/privacy">Privacy</Link>
              <Link className="hover:text-champagne" to="/legal/terms">Terms</Link>
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-champagne">Hayata notes</h2>
            <p className="mt-5 font-lux text-sm text-cream/65">Occasional stories, offers and local guides. No noise.</p>
            <form onSubmit={subscribe} className="mt-5 flex border border-white/20">
              <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required placeholder="Your email" aria-label="Email for newsletter" className="rounded-none border-0 bg-transparent text-cream placeholder:text-cream/40 focus-visible:ring-champagne" />
              <Button type="submit" disabled={newsletter.isPending} aria-label="Subscribe to newsletter" className="rounded-none bg-champagne text-ink hover:bg-champagne/90"><ArrowRight /></Button>
            </form>
          </Reveal>
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 font-lux text-xs text-cream/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Hayata Hotel & Suite. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link className="hover:text-champagne" to="/legal/privacy">Privacy</Link>
            <Link className="hover:text-champagne" to="/legal/terms">Terms</Link>
            <Link className="text-cream/35 hover:text-champagne" to="/staff/login">Staff login</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function PublicShell() {
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  const { theme } = usePublicThemeStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="min-h-screen bg-background text-foreground font-lux">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-champagne focus:px-4 focus:py-2 focus:text-ink">Skip to content</a>
      <ScrollProgress />
      <PublicHeader />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          id="main-content"
          key={location.pathname}
          className="pt-20"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </motion.main>
      </AnimatePresence>
      <PublicFooter />
    </div>
  )
}
