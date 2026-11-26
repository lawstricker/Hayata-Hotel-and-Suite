import { apiGet, SERVER_ENABLED } from '@/lib/api-client'
import { useHotelStore } from '@/store/hotelStore'
import type { Reservation, Room } from '@/types/domain'
import type { PublicRoomStay } from '@/types/public'

export interface ActiveRoomStay {
  room: Room
  reservation: Reservation
  /** The address the guest's receipt is sent to, when it is known. */
  email?: string
}

function normalizeRoomNumber(roomNumber: string) {
  return decodeURIComponent(roomNumber ?? '').trim().toUpperCase()
}

/**
 * Maps a stay resolved by the server onto the local room/reservation pair used
 * by the guest menu screens.
 */
export function toActiveStay(stay: PublicRoomStay): ActiveRoomStay {
  const room: Room = {
    id: `room-${stay.roomNumber}`,
    number: stay.roomNumber,
    floor: 0,
    type: 'Room',
    status: 'Occupied',
    housekeepingStatus: 'Clean',
    rate: 0,
    updatedAt: new Date().toISOString(),
  }
  const reservation: Reservation = {
    id: `res-qr-${stay.roomNumber}`,
    guestId: `guest-qr-${stay.roomNumber}`,
    guestName: stay.guestName,
    roomType: 'Room',
    roomNumber: stay.roomNumber,
    checkIn: stay.checkIn ?? '',
    checkOut: stay.checkOut ?? '',
    adults: 1,
    children: 0,
    status: 'Checked in',
    source: 'ONLINE',
    ratePlan: 'Flexible',
    rate: 0,
    deposit: 0,
    addOns: [],
    total: 0,
  }
  return { room, reservation, email: stay.email }
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

/** The checked-in reservation that belongs to a room, if there is one. */
export function findActiveRoomStay(rooms: Room[], reservations: Reservation[], roomNumber: string): ActiveRoomStay | null {
  const normalizedRoom = normalizeRoomNumber(roomNumber)
  const reservation = reservations.find((candidate) => (
    candidate.status === 'Checked in'
    && candidate.roomNumber?.toUpperCase() === normalizedRoom
  ))
  if (!reservation?.roomNumber) return null
  const room = rooms.find((candidate) => candidate.number.toUpperCase() === reservation.roomNumber?.toUpperCase())
  return room ? { room, reservation } : null
}

/** The reservation that belongs to a room that is occupied without a check-in record. */
function toOccupiedRoomReservation(room: Room): Reservation {
  return {
    id: `res-room-${room.number}`,
    guestId: `guest-room-${room.number}`,
    guestName: room.guestName?.trim() || 'Guest',
    roomType: room.type,
    roomNumber: room.number,
    checkIn: '',
    checkOut: '',
    adults: 1,
    children: 0,
    status: 'Checked in',
    source: 'Direct',
    ratePlan: 'In-house',
    rate: room.rate,
    deposit: 0,
    addOns: [],
    total: 0,
  }
}

/**
 * The stay behind a room's permanent code, using only the in-browser mirror.
 *
 * A room that is marked as occupied is treated as occupied even when its
 * check-in has not reached the reservation list yet, so the printed card keeps
 * working for the guest who is in the room.
 */
export function findRoomStay(rooms: Room[], reservations: Reservation[], roomNumber: string): ActiveRoomStay | null {
  const checkedIn = findActiveRoomStay(rooms, reservations, roomNumber)
  if (checkedIn) return checkedIn
  const normalizedRoom = normalizeRoomNumber(roomNumber)
  const room = rooms.find((candidate) => normalizeRoomNumber(candidate.number) === normalizedRoom)
  if (!room || room.status !== 'Occupied') return null
  return { room, reservation: toOccupiedRoomReservation(room) }
}

/**
 * Resolves the stay behind a room's permanent QR code.
 *
 * The server is authoritative: when it answers, its answer decides whether the
 * menu is open, so a guest never sees a menu the kitchen would refuse. Only
 * when the API cannot be reached does the in-browser mirror step in.
 */
export async function fetchActiveRoomStay(roomNumber: string): Promise<ActiveRoomStay | null> {
  if (SERVER_ENABLED) {
    try {
      const stay = await apiGet<PublicRoomStay>(`/public/room-orders/stay?room=${encodeURIComponent(roomNumber)}`)
      if (stay?.roomNumber) return toActiveStay(stay)
      return null
    } catch (error) {
      const status = (error as { status?: number }).status
      // The server answered: it knows whether the room has a checked-in guest.
      if (typeof status === 'number' && status < 500) return null
      // The API is unreachable, so the in-browser mirror takes over below.
    }
  }
  const { rooms, reservations } = useHotelStore.getState()
  return findRoomStay(rooms, reservations, roomNumber)
}
