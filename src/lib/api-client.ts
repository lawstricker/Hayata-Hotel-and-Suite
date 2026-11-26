const DEFAULT_API_BASE = 'http://localhost/hayata-api/api.php'
const TOKEN_KEY = 'hayata-api-token'

export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || DEFAULT_API_BASE
export const SERVER_ENABLED = (import.meta.env.VITE_USE_SERVER as string | undefined)?.toLowerCase() !== 'false'

/**
 * The bearer token is kept in `sessionStorage`, so it is dropped when the
 * browser session ends and is never left behind on the machine.
 */
export function getApiToken() {
  const sessionToken = sessionStorage.getItem(TOKEN_KEY)
  if (sessionToken) return sessionToken
  // Tokens written by an earlier version lived in `localStorage`; move them
  // across once so an upgrade does not sign everybody out.
  const legacyToken = localStorage.getItem(TOKEN_KEY)
  if (legacyToken) {
    sessionStorage.setItem(TOKEN_KEY, legacyToken)
    localStorage.removeItem(TOKEN_KEY)
    return legacyToken
  }
  return null
}

export function setApiToken(token: string | null) {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token)
    localStorage.removeItem(TOKEN_KEY)
  } else {
    sessionStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_KEY)
  }
  window.dispatchEvent(new CustomEvent('hayata:token-change', { detail: token }))
}

/**
 * Builds the request URL.
 *
 * Only the route is encoded. A query string is appended as real query
 * parameters, because encoding it would make the server read
 * `/audit-logs?limit=5` as one route name instead of a route and a filter.
 */
export function apiUrl(route: string) {
  const [path, query] = route.split('?')
  const search = query ? `&${query}` : ''
  return `${API_BASE}?route=${encodeURIComponent(path)}${search}`
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
    // A rejected token means the session is gone: clear it so the browser
    // cannot keep sending a credential the server has already refused.
    if (response.status === 401) {
      setApiToken(null)
      window.dispatchEvent(new CustomEvent('hayata:session-expired'))
    }
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
