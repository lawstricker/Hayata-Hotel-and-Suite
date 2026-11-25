import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PaymentGatewaySettings, PaymentTransaction } from '@/types/payment'

interface PaymentGatewayState {
  settings: PaymentGatewaySettings
  transactions: PaymentTransaction[]
  updateSetting: <K extends keyof PaymentGatewaySettings>(key: K, value: PaymentGatewaySettings[K]) => void
  addTransaction: (transaction: PaymentTransaction) => void
  clearTransactions: () => void
}

const defaults: PaymentGatewaySettings = {
  enabled: true,
  provider: 'mock',
  mode: 'sandbox',
  publicKey: '',
  secretKey: '',
  webhookSecret: '',
  endpoint: '',
  currency: 'NGN',
  declineTestCards: true,
}

export const usePaymentGatewayStore = create<PaymentGatewayState>()(
  persist(
    (set) => ({
      settings: defaults,
      transactions: [],
      updateSetting: (key, value) => set((state) => ({ settings: { ...state.settings, [key]: value } })),
      addTransaction: (transaction) => set((state) => ({ transactions: [transaction, ...state.transactions].slice(0, 100) })),
      clearTransactions: () => set({ transactions: [] }),
    }),
    {
      name: 'hayata-hms-payment',
      partialize: (state) => ({ settings: state.settings, transactions: state.transactions }),
    },
  ),
)
