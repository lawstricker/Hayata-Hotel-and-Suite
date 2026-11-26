import { apiGet, apiPost, SERVER_ENABLED, setApiToken } from '@/lib/api-client'
import type { User } from '@/types/domain'

/**
 * Signs in against the API.
 *
 * The server is the only authority on credentials. The browser never checks a
 * password itself, so a stolen bundle cannot be used to sign in.
 */
export async function serverLogin(email: string, password: string): Promise<User> {
  if (!SERVER_ENABLED) throw new Error('The server is not reachable, so signing in is not possible.')
  const result = await apiPost<{ token: string; user: User }>('/auth/login', { email, password })
  if (!result?.token || !result?.user) throw new Error('Invalid email or password.')
  setApiToken(result.token)
  return result.user
}

/** Revokes the token on the server so the session cannot be replayed. */
export async function serverLogout() {
  if (!SERVER_ENABLED) return
  try {
    await apiPost('/auth/logout', {})
  } catch {
    // The token is cleared locally whatever the server says.
  } finally {
    setApiToken(null)
  }
}

/** Reads the signed-in user from the server, or null when the session is gone. */
export async function serverCurrentUser(): Promise<User | null> {
  if (!SERVER_ENABLED) return null
  try {
    const result = await apiGet<{ user: User }>('/auth/me')
    return result.user ?? null
  } catch {
    return null
  }
}

/** Changes the password of the signed-in account. */
export async function serverChangePassword(currentPassword: string, newPassword: string) {
  return apiPost('/auth/password', { currentPassword, newPassword })
}
