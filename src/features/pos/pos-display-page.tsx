import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { CircleCheck, Clock3, Sparkles, UtensilsCrossed, Wine } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { tables } from '@/mock/data'
import { sessionTotals, usePosDisplayStore, type PosOutlet } from '@/store/posDisplayStore'
import { cn, formatCurrency } from '@/lib/utils'

function SummaryRow({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={cn('text-slate-500', accent && 'text-amber-700')}>{label}</span>
      <span className={cn('font-display font-bold tabular-nums', muted ? 'text-slate-400' : 'text-slate-900')}>{value}</span>
    </div>
  )
}

/** Full-screen, read-only order display for guests. Mirrors the active POS session. */
export function PosDisplayPage() {
  const { outlet: rawOutlet } = useParams()
  const outlet: PosOutlet = rawOutlet === 'bar' ? 'BAR' : 'RESTAURANT'
  const session = usePosDisplayStore((state) => state.sessions[outlet])
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const sync = () => usePosDisplayStore.getState().syncFromStorage()
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  if (rawOutlet !== 'restaurant' && rawOutlet !== 'bar') return <Navigate to="/" replace />

  const isBar = outlet === 'BAR'
  const { subtotal, tax, total } = sessionTotals(session)
  const table = tables.find((candidate) => candidate.id === session.tableId)

  return (
    <div className="min-h-screen bg-[#fbf9f5] text-slate-900 [background-image:radial-gradient(circle_at_15%_-10%,rgba(217,119,6,0.07),transparent_45%),radial-gradient(circle_at_85%_110%,rgba(13,148,136,0.07),transparent_45%)]">
      <header className="border-b border-slate-200 bg-white/70 px-6 py-5 backdrop-blur md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
              {isBar ? <Wine className="size-6" /> : <UtensilsCrossed className="size-6" />}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-amber-700">Hayata Hotel &amp; Suite</p>
              <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">{isBar ? 'Bar' : 'Restaurant'} order display</h1>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="font-display text-2xl font-extrabold tabular-nums md:text-3xl">{format(now, 'h:mm a')}</p>
              <p className="text-[11px] text-slate-500">{format(now, 'EEEE, d MMMM')}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
              <span className="size-1.5 animate-pulse rounded-full bg-current" /> Live
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-5 px-6 py-6 md:px-10 lg:grid-cols-[1.7fr_1fr]">
        <section className="flex min-h-[55vh] flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-card md:p-8">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Your order</p>
              <p className="mt-1 font-display text-xl font-extrabold md:text-2xl">{table ? `Table ${table.name}` : session.orderType}</p>
            </div>
            <div className="text-right">
              <p className="flex items-center justify-end gap-1.5 text-[11px] text-slate-500"><Clock3 className="size-3" /> Served by</p>
              <p className="mt-0.5 text-sm font-bold text-amber-700">{session.server?.name ?? 'Your server'}</p>
              <p className="text-[10px] text-slate-500">{session.server?.roleLabel ?? ''}</p>
            </div>
          </div>

          {session.lines.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              {session.phase === 'placed' ? (
                <>
                  <div className="flex size-16 items-center justify-center rounded-3xl border border-emerald-200 bg-emerald-50 text-emerald-600">
                    <CircleCheck className="size-8" />
                  </div>
                  <h2 className="mt-5 font-display text-2xl font-extrabold md:text-3xl">Order placed</h2>
                  <p className="mt-2 max-w-sm text-sm text-slate-500">Thank you. Your order is on its way — we hope you enjoy it.</p>
                </>
              ) : (
                <>
                  <div className="flex size-16 items-center justify-center rounded-3xl border border-amber-200 bg-amber-50 text-amber-600">
                    <Sparkles className="size-8" />
                  </div>
                  <h2 className="mt-5 font-display text-2xl font-extrabold md:text-3xl">Welcome to Hayata</h2>
                  <p className="mt-2 max-w-sm text-sm text-slate-500">Items you order will appear here as your server adds them.</p>
                </>
              )}
            </div>
          ) : (
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {session.lines.map((line) => (
                  <motion.div
                    key={line.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 font-display text-lg font-extrabold text-amber-800">{line.quantity}×</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-bold md:text-lg">{line.name}</p>
                      {line.modifiers.length > 0 && <p className="mt-0.5 truncate text-xs text-amber-700">{line.modifiers.join(' · ')}</p>}
                      <p className="mt-0.5 text-[11px] text-slate-500">{line.station}</p>
                    </div>
                    <p className="font-display text-lg font-extrabold tabular-nums">{formatCurrency(line.price * line.quantity)}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        <aside className="flex min-h-[55vh] flex-col gap-4">
          <div className="flex flex-1 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-card md:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Order summary</p>
            <div className="mt-6 space-y-3 text-sm">
              <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
              <SummaryRow label="Discount" value={`− ${formatCurrency(session.discount)}`} muted={session.discount === 0} />
              <SummaryRow label="Tax (8%)" value={formatCurrency(tax)} />
              <SummaryRow label="Tip" value={formatCurrency(session.tip)} muted={session.tip === 0} />
            </div>
            <div className="mt-auto pt-8">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Total</p>
                <p className="mt-1 font-display text-4xl font-extrabold tabular-nums text-amber-800 md:text-5xl">{formatCurrency(total)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-card">
            <p className="font-editorial text-lg italic text-slate-600">“Hospitality is the art of making guests feel at home.”</p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">Hayata Hotel &amp; Suite</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
