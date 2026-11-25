import { useAuthStore } from '@/store/authStore'

export interface ApiErrorEnvelope {
  code: string
  message: string
  fieldErrors?: Record<string, string>
}

export class FinanceApiError extends Error {
  readonly code: string
  readonly fieldErrors: Record<string, string>
  readonly status: number

  constructor(envelope: ApiErrorEnvelope, status: number) {
    super(envelope.message)
    this.name = 'FinanceApiError'
    this.code = envelope.code
    this.fieldErrors = envelope.fieldErrors ?? {}
    this.status = status
  }
}

/** Typed client for /api/finance/* – fulfilled by MSW in dev, by the REST backend in production. */
export async function financeRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = useAuthStore.getState().user
  const response = await fetch(`/api/finance${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(user ? { 'x-finance-user': user.name } : {}),
      ...(init.headers ?? {}),
    },
  })
  let payload: { data?: T } & Partial<ApiErrorEnvelope> | null = null
  try { payload = await response.json() as typeof payload } catch { payload = null }
  if (!response.ok || !payload) {
    throw new FinanceApiError(payload && payload.message
      ? { code: payload.code ?? 'UNKNOWN_ERROR', message: payload.message, fieldErrors: payload.fieldErrors }
      : { code: 'NETWORK_ERROR', message: `Request failed (${response.status})` }, response.status)
  }
  return payload.data as T
}
