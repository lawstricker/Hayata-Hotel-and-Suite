export type PaymentProvider = 'mock' | 'paystack' | 'stripe' | 'custom'
export type PaymentMode = 'sandbox' | 'live'
export type PaymentMethod = 'Card' | 'Cash'

export interface PaymentGatewaySettings {
  enabled: boolean
  provider: PaymentProvider
  mode: PaymentMode
  publicKey: string
  secretKey: string
  webhookSecret: string
  endpoint: string
  currency: 'NGN'
  declineTestCards: boolean
}

export interface PaymentCard {
  name: string
  number: string
  expiry: string
  cvc: string
}

export interface PaymentRequest {
  amount: number
  email: string
  description: string
  referenceHint: string
  method: PaymentMethod
  card?: PaymentCard
}

export interface PaymentResult {
  ok: boolean
  status: 'approved' | 'declined' | 'reversed'
  reference: string
  message: string
  provider: PaymentProvider | 'demo'
  mode: PaymentMode | 'demo'
}

export interface PaymentTransaction extends PaymentResult {
  amount: number
  email: string
  description: string
  createdAt: string
}
