import type { PaymentGatewaySettings, PaymentRequest, PaymentResult, PaymentTransaction } from '@/types/payment'
import { usePaymentGatewayStore } from '@/store/paymentGatewayStore'
import { logActivity } from '@/lib/activity-log'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function token() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function paymentReference(hint = 'PAY') {
  return `${hint}-${Date.now().toString(36).toUpperCase()}-${token()}`
}

export async function processPayment(request: PaymentRequest, settings: PaymentGatewaySettings): Promise<PaymentResult> {
  const reference = paymentReference(request.referenceHint)

  if (!settings.enabled) {
    await delay(220)
    return { ok: true, status: 'approved', reference, message: 'Demo approval (gateway disabled)', provider: 'demo', mode: 'demo' }
  }

  if (request.amount <= 0) {
    return { ok: false, status: 'declined', reference, message: 'Invalid payment amount.', provider: settings.provider, mode: settings.mode }
  }

  await delay(650)

  if (request.method === 'Card') {
    const card = request.card
    const digits = card?.number.replace(/\D/g, '') ?? ''
    if (digits.length < 12 || !card?.expiry || card.cvc.length < 3) {
      return { ok: false, status: 'declined', reference, message: 'Complete the card details to continue.', provider: settings.provider, mode: settings.mode }
    }
    if (settings.declineTestCards && digits.endsWith('0000')) {
      return { ok: false, status: 'declined', reference, message: 'Card declined by the gateway (test decline card).', provider: settings.provider, mode: settings.mode }
    }
  }

  return {
    ok: true,
    status: 'approved',
    reference,
    message: `${settings.provider.toUpperCase()} ${settings.mode} approval`,
    provider: settings.provider,
    mode: settings.mode,
  }
}

export function recordTransaction(result: PaymentResult, request: PaymentRequest) {
  const transaction: PaymentTransaction = {
    ...result,
    amount: request.amount,
    email: request.email,
    description: request.description,
    createdAt: new Date().toISOString(),
  }
  usePaymentGatewayStore.getState().addTransaction(transaction)
  logActivity({
    action: result.ok ? 'Payment approved' : 'Payment declined',
    module: 'Payments',
    detail: `${result.reference} · ${request.description} · ${request.amount}`,
  })
  return transaction
}
