const DEFAULT_API_BASE = 'http://localhost/hayata-api/api.php'
const TOKEN_KEY = 'hayata-api-token'

export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || DEFAULT_API_BASE
export const SERVER_ENABLED = (import.meta.env.VITE_USE_SERVER as string | undefined)?.toLowerCase() !== 'false'

export function getApiToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setApiToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
  window.dispatchEvent(new CustomEvent('hayata:token-change', { detail: token }))
}

export function apiUrl(route: string) {
  return `${API_BASE}?route=${encodeURIComponent(route)}`
}

export async function apiRequest<T>(route: string, init: RequestInit = {}): Promise<T> {
  if (!SERVER_ENABLED) throw new Error('Server integration disabled')
  const token = getApiToken()
  const response = await fetch(apiUrl(route), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  })
  const text = await response.text()
  let payload: unknown
  try { payload = text ? JSON.parse(text) : null } catch { payload = text }
  if (!response.ok) {
    const error = payload as { error?: string; code?: string; availableRooms?: unknown }
    throw Object.assign(new Error(error?.error ?? `Server returned ${response.status}`), {
      code: error?.code,
      availableRooms: error?.availableRooms,
      status: response.status,
    })
  }
  return payload as T
}

export function apiGet<T>(route: string) {
  return apiRequest<T>(route, { method: 'GET' })
}

export function apiPost<T>(route: string, body: unknown) {
  return apiRequest<T>(route, { method: 'POST', body: JSON.stringify(body) })
}

export function apiPut<T>(route: string, body: unknown) {
  return apiRequest<T>(route, { method: 'PUT', body: JSON.stringify(body) })
}

export function apiDelete<T>(route: string) {
  return apiRequest<T>(route, { method: 'DELETE' })
}

export async function withFallback<T>(serverCall: () => Promise<T>, fallbackCall: () => T | Promise<T>): Promise<T> {
  if (!SERVER_ENABLED) return fallbackCall()
  try {
    return await serverCall()
  } catch {
    return fallbackCall()
  }
}

export function serverWrite(route: string, body: unknown) {
  if (!SERVER_ENABLED) return
  void apiPost(route, body).catch(() => {})
}
