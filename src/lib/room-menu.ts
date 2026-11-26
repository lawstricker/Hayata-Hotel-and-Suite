import { apiGet, SERVER_ENABLED } from '@/lib/api-client'
import { useHotelStore } from '@/store/hotelStore'
import type { Reservation, Room } from '@/types/domain'
import type { PublicRoomStay } from '@/types/public'

export interface ActiveRoomStay {
  room: Room
  reservation: Reservation
  /** The address the guest's receipt is sent to, when it is known. */
  email?: string
  /** False once the guest has checked out: the code still opens the menu. */
  checkedIn: boolean
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
  const checkedIn = stay.status ? stay.status === 'Checked in' : true
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
    status: checkedIn ? 'Checked in' : 'Checked out',
    source: 'ONLINE',
    ratePlan: 'Flexible',
    rate: 0,
    deposit: 0,
    addOns: [],
    total: 0,
  }
  return { room, reservation, email: stay.email, checkedIn }
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
  return room ? { room, reservation, checkedIn: true } : null
}

/** The reservation that belongs to a room that has no reservation of its own. */
function toRoomReservation(room: Room): Reservation {
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
    status: 'Checked out',
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
 * The code identifies the room, so it keeps working after a checkout: the last
 * guest who stayed in the room is used when nobody is checked in, and a room
 * that has no reservation yet still opens its own menu.
 */
export function findRoomStay(rooms: Room[], reservations: Reservation[], roomNumber: string): ActiveRoomStay | null {
  const checkedIn = findActiveRoomStay(rooms, reservations, roomNumber)
  if (checkedIn) return checkedIn

  const normalizedRoom = normalizeRoomNumber(roomNumber)
  const room = rooms.find((candidate) => normalizeRoomNumber(candidate.number) === normalizedRoom)
  if (!room) return null

  // The last guest who stayed in the room, so a guest who has just checked out
  // can still order from the kitchen.
  const lastStay = reservations
    .filter((candidate) => candidate.status === 'Checked out' && candidate.roomNumber?.toUpperCase() === normalizedRoom)
    .sort((left, right) => (right.checkIn ?? '').localeCompare(left.checkIn ?? ''))[0]
  if (lastStay) return { room, reservation: lastStay, checkedIn: false }

  return { room, reservation: toRoomReservation(room), checkedIn: false }
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
      // The server answered: it knows whether the room exists.
      if (typeof status === 'number' && status < 500) return null
      // The API is unreachable, so the in-browser mirror takes over below.
    }
  }
  const { rooms, reservations } = useHotelStore.getState()
  return findRoomStay(rooms, reservations, roomNumber)
}
