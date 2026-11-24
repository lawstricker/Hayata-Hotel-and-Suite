import { useEffect } from 'react'
import { toast } from 'sonner'
import { flushQueuedPrints } from '@/lib/print-queue'
import { usePrinterStore } from '@/store/printerStore'

export function usePrinterQueue() {
  const enabled = usePrinterStore((state) => state.settings.enabled)
  const queueLength = usePrinterStore((state) => state.queue.length)

  useEffect(() => {
    if (!enabled || queueLength === 0) return
    const interval = window.setInterval(async () => {
      const result = await flushQueuedPrints()
      if (result.sent > 0) {
        toast.success(`${result.sent} queued kitchen ${result.sent === 1 ? 'ticket' : 'tickets'} printed`)
      }
    }, 15_000)
    return () => window.clearInterval(interval)
  }, [enabled, queueLength])
}
