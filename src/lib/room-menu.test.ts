import { describe, expect, it } from 'vitest'
import { buildRoomMenuPath, buildRoomMenuUrl, findActiveRoomStay, findRoomStay, toActiveStay } from './room-menu'
import type { Reservation, Room } from '@/types/domain'
function room(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-410',
    number: '410',
    floor: 4,
    type: 'Deluxe King',
    status: 'Available',
    housekeepingStatus: 'Clean',
    rate: 240,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'res-001',
    guestId: 'guest-001',
    guestName: 'Ada Okafor',
    roomType: 'Deluxe King',
    roomNumber: '410',
    checkIn: '2026-01-02',
    checkOut: '2026-01-05',
    adults: 1,
    children: 0,
    status: 'Checked in',
    source: 'Direct',
    ratePlan: 'Flexible',
    rate: 240,
    deposit: 0,
    addOns: [],
    total: 720,
    ...overrides,
  }
}

describe('Room menu QR codes', () => {
  it('points at the room, not at the guest or the stay', () => {
    expect(buildRoomMenuPath('410')).toBe('/room/410/menu')
    expect(buildRoomMenuUrl('410')).toContain('/room/410/menu')
  })

  it('keeps the same URL for every guest who stays in the room', () => {
    const before = buildRoomMenuUrl('410')
    const after = buildRoomMenuUrl('410')
    expect(after).toBe(before)
  })
})

describe('Room stay resolution', () => {
  it('finds the checked-in reservation for a room', () => {
    const stay = findActiveRoomStay([room()], [reservation()], '410')
    expect(stay?.reservation.guestName).toBe('Ada Okafor')
    expect(stay?.room.number).toBe('410')
  })

  it('ignores the room once the guest has checked out', () => {
    const stay = findActiveRoomStay([room()], [reservation({ status: 'Checked out' })], '410')
    expect(stay).toBeNull()
  })

  it('keeps the menu open for the last guest who stayed in the room', () => {
    const stay = findRoomStay([room({ status: 'Clean' })], [reservation({ status: 'Checked out' })], '410')
    expect(stay?.reservation.guestName).toBe('Ada Okafor')
    expect(stay?.checkedIn).toBe(false)
  })

  it('opens the menu for a room that has no reservation yet', () => {
    const stay = findRoomStay([room({ status: 'Available' })], [], '410')
    expect(stay?.room.number).toBe('410')
    expect(stay?.checkedIn).toBe(false)
  })

  it('closes the menu for a room that does not exist', () => {
    expect(findRoomStay([], [], '410')).toBeNull()
  })

  it('maps a stay resolved by the server onto the local room and reservation', () => {
    const stay = toActiveStay({ roomNumber: '410', guestName: 'Ada Okafor', checkIn: '2026-01-02', checkOut: '2026-01-05' })
    expect(stay.room.number).toBe('410')
    expect(stay.room.status).toBe('Occupied')
    expect(stay.reservation.status).toBe('Checked in')
    expect(stay.reservation.guestName).toBe('Ada Okafor')
  })

  it('marks a stay the server reports as checked out', () => {
    const stay = toActiveStay({ roomNumber: '410', guestName: 'Ada Okafor', status: 'Checked out' })
    expect(stay.checkedIn).toBe(false)
    expect(stay.reservation.status).toBe('Checked out')
  })
})
