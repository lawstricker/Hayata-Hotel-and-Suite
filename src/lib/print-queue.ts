import { usePrinterStore } from '@/store/printerStore'
import { sendPrintJob } from '@/lib/thermal-printer'

export interface FlushResult {
  sent: number
  failed: number
}

export async function flushQueuedPrints(): Promise<FlushResult> {
  const result: FlushResult = { sent: 0, failed: 0 }
  const store = usePrinterStore.getState()
  if (!store.settings.enabled || !store.queue.length) return result

  for (const job of store.queue) {
    if (job.processing) continue
    store.updateJob(job.id, { processing: true })
    try {
      await sendPrintJob({ ...job, processing: false }, usePrinterStore.getState().settings)
      usePrinterStore.getState().removeJob(job.id)
      result.sent += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Print request failed'
      usePrinterStore.getState().updateJob(job.id, {
        processing: false,
        attempts: job.attempts + 1,
        lastError: message,
      })
      result.failed += 1
    }
  }
  return result
}
