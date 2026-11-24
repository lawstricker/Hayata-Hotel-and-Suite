import type { Reservation, Room } from '@/types/domain'

export interface ActiveRoomStay {
  room: Room
  reservation: Reservation
}

/**
 * The QR code identifies the room, never the guest or reservation. The same code
 * stays on the room door and becomes active again for the next checked-in guest.
 */
export function buildRoomMenuPath(roomNumber: string) {
  return `/room/${encodeURIComponent(roomNumber)}/menu`
}

export function buildRoomMenuUrl(roomNumber: string) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return `${origin}${buildRoomMenuPath(roomNumber)}`
}

export function findActiveRoomStay(rooms: Room[], reservations: Reservation[], roomNumber: string): ActiveRoomStay | null {
  const normalizedRoom = decodeURIComponent(roomNumber).trim().toUpperCase()
  const reservation = reservations.find((candidate) => (
    candidate.status === 'Checked in'
    && candidate.roomNumber?.toUpperCase() === normalizedRoom
  ))
  if (!reservation?.roomNumber) return null
  const room = rooms.find((candidate) => candidate.number.toUpperCase() === reservation.roomNumber?.toUpperCase())
  return room ? { room, reservation } : null
}
