import { useEffect } from 'react'
import { apiGet, getApiToken } from '@/lib/api-client'
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
}
