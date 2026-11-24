import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PrinterSettings {
  enabled: boolean
  bridgeHost: string
  bridgePort: string
  printerIp: string
  printerPort: string
  authToken: string
  paperWidth: '80mm' | '58mm'
  copies: number
}

export interface PrintJob {
  id: string
  orderNumber: string
  roomNumber: string
  guestName: string
  receiptText: string
  createdAt: string
  attempts: number
  lastError?: string
  processing?: boolean
}

interface PrinterState {
  settings: PrinterSettings
  queue: PrintJob[]
  updateSetting: <K extends keyof PrinterSettings>(key: K, value: PrinterSettings[K]) => void
  enqueueJob: (job: Omit<PrintJob, 'id' | 'createdAt' | 'attempts'>) => void
  updateJob: (id: string, patch: Partial<PrintJob>) => void
  removeJob: (id: string) => void
  clearQueue: () => void
}

const defaultSettings: PrinterSettings = {
  enabled: true,
  bridgeHost: '127.0.0.1',
  bridgePort: '8787',
  printerIp: '127.0.0.1',
  printerPort: '9100',
  authToken: '',
  paperWidth: '80mm',
  copies: 1,
}

export const usePrinterStore = create<PrinterState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      queue: [],
      updateSetting: (key, value) => set((state) => ({ settings: { ...state.settings, [key]: value } })),
      enqueueJob: (job) => set((state) => ({
        queue: [...state.queue, { ...job, id: `print-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString(), attempts: 0 }],
      })),
      updateJob: (id, patch) => set((state) => ({
        queue: state.queue.map((job) => job.id === id ? { ...job, ...patch } : job),
      })),
      removeJob: (id) => set((state) => ({ queue: state.queue.filter((job) => job.id !== id) })),
      clearQueue: () => set({ queue: [] }),
    }),
    {
      name: 'hayata-hms-printer',
      partialize: (state) => ({ settings: state.settings, queue: state.queue }),
    },
  ),
)
