import { apiGet, apiPost, SERVER_ENABLED, setApiToken, withFallback } from '@/lib/api-client'
import type { User } from '@/types/domain'

export async function serverLogin(email: string, password: string): Promise<User | null> {
  if (SERVER_ENABLED) {
    try {
      const result = await apiPost<{ token: string; user: User }>('/auth/login', { email, password })
      setApiToken(result.token)
      return result.user
    } catch {
      return null
    }
  }
  return null
}

export function serverCurrentUser() {
  return withFallback<User | null>(
    () => apiGet<{ user: User }>('/auth/me').then((result) => result.user),
    () => null,
  )
}
