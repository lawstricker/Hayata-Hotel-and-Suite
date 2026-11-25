import type { Reservation } from '@/types/domain'

const LIVE_RESERVATIONS_KEY = 'hayata-hms-live-reservations'

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readLiveReservations(): Reservation[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(LIVE_RESERVATIONS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as Reservation[] : []
  } catch {
    return []
  }
}

export function writeLiveReservations(reservations: Reservation[]) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(LIVE_RESERVATIONS_KEY, JSON.stringify(reservations))
  } catch {
    // Storage can be unavailable in private browsing; in-memory state still works.
  }
}

export function upsertLiveReservation(reservation: Reservation) {
  writeLiveReservations([reservation, ...readLiveReservations().filter((candidate) => candidate.id !== reservation.id)])
}

export function updateLiveReservationStatus(reservationId: string, status: Reservation['status'], roomNumber?: string) {
  writeLiveReservations(readLiveReservations().map((reservation) => (
    reservation.id === reservationId
      ? { ...reservation, status, roomNumber: roomNumber ?? reservation.roomNumber }
      : reservation
  )))
}

export function subscribeToLiveReservations(listener: () => void) {
  if (!isBrowser()) return () => {}
  const handler = (event: StorageEvent) => {
    if (event.key === LIVE_RESERVATIONS_KEY) listener()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
