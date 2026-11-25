import { useAuthStore } from '@/store/authStore'
import { devRequest } from './dev-fallback'

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
  if (import.meta.env.DEV) {
    // TODO(API): in development the finance API is served in-process so no service worker
    // interferes with public/guest routes. Production uses the REST backend below.
    const result = devRequest(path, init)
    if (result.status >= 400) {
      const { code = 'UNKNOWN_ERROR', message = 'Request failed', fieldErrors } = result.body as unknown as ApiErrorEnvelope
      throw new FinanceApiError({ code, message, fieldErrors }, result.status)
    }
    return result.body.data as T
  }
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
