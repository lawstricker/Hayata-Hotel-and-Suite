import { useEffect } from 'react'
import { toast } from 'sonner'
import { apiGet, getApiToken } from '@/lib/api-client'
import { useAuthStore } from '@/store/authStore'
import { useHotelStore } from '@/store/hotelStore'

export function useServerBootstrap() {
  useEffect(() => {
    let active = true
    const load = async () => {
      if (!getApiToken()) return
      try {
        const data = await apiGet<{
          reservations?: ReturnType<typeof useHotelStore.getState>['reservations']
          rooms?: ReturnType<typeof useHotelStore.getState>['rooms']
          orders?: ReturnType<typeof useHotelStore.getState>['orders']
          inventory?: ReturnType<typeof useHotelStore.getState>['inventory']
        }>('/bootstrap')
        if (active) useHotelStore.getState().hydrateFromServer(data)
      } catch {
        // Keep the in-browser mock state when the API is unavailable.
      }
    }
    void load()
    window.addEventListener('hayata:token-change', load)
    return () => { active = false; window.removeEventListener('hayata:token-change', load) }
  }, [])

  // The API clears the token when it refuses a request, so the browser has to
  // end the session as well instead of showing a half-signed-in screen.
  useEffect(() => {
    const handleExpired = () => {
      if (!useAuthStore.getState().user) return
      useAuthStore.setState({ user: null })
      toast.warning('Your session has expired', { description: 'Please sign in again.' })
    }
    window.addEventListener('hayata:session-expired', handleExpired)
    return () => window.removeEventListener('hayata:session-expired', handleExpired)
  }, [])
}
