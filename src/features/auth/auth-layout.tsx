import { Hotel, LockKeyhole, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

export function AuthLayout({ children, title, description }: { children: ReactNode; title: string; description: string }) {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-28 size-96 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-96 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.045]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-teal-500 shadow-xl shadow-teal-950/40"><Hotel className="size-5" /></span>
          <div><p className="font-display text-lg font-extrabold">Hayata</p><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Hotel & Suite</p></div>
        </div>
        <div className="relative max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1.5 text-xs font-bold text-teal-300"><Sparkles className="size-3.5" /> One connected operating system</div>
          <h1 className="font-display text-5xl font-extrabold leading-[1.08] tracking-[-0.04em]">Every stay,<br /><span className="text-teal-400">perfectly orchestrated.</span></h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-400">Unify hotel operations, guest relationships, food and beverage, and real-time inventory in one beautifully simple workspace.</p>
          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-8">
            <div><p className="font-display text-2xl font-extrabold">78%</p><p className="mt-1 text-xs text-slate-500">Occupancy today</p></div>
            <div><p className="font-display text-2xl font-extrabold">40</p><p className="mt-1 text-xs text-slate-500">Rooms managed</p></div>
            <div><p className="font-display text-2xl font-extrabold">99.8%</p><p className="mt-1 text-xs text-slate-500">Platform uptime</p></div>
          </div>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-slate-500"><LockKeyhole className="size-3.5" /> Enterprise-grade security · Role-based access · Audit trail</div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[430px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white"><Hotel className="size-5" /></span>
            <div><p className="font-display font-extrabold">Hayata</p><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Hotel & Suite</p></div>
          </div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  )
}
