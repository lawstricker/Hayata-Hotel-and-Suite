import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchActiveRoomStay } from './room-menu'
import { useHotelStore } from '@/store/hotelStore'
import type { Room } from '@/types/domain'

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }))

vi.mock('@/lib/api-client', () => ({
  apiGet,
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  apiRequest: vi.fn(),
  serverWrite: vi.fn(),
  withFallback: vi.fn(),
  SERVER_ENABLED: true,
  API_BASE: 'http://localhost/hayata-api/api.php',
  getApiToken: vi.fn(() => null),
  setApiToken: vi.fn(),
}))

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

beforeEach(() => {
  apiGet.mockReset()
  useHotelStore.setState({ rooms: [room({ status: 'Occupied', guestName: 'Ada Okafor' })], reservations: [] })
})

describe('Server stay resolution', () => {
  it('uses the stay the server returns', async () => {
    apiGet.mockResolvedValue({ roomNumber: '410', guestName: 'Ada Okafor', email: 'ada@example.com' })
    const stay = await fetchActiveRoomStay('410')
    expect(apiGet).toHaveBeenCalledWith('/public/room-orders/stay?room=410')
    expect(stay?.reservation.guestName).toBe('Ada Okafor')
    expect(stay?.email).toBe('ada@example.com')
  })

  it('keeps the menu open for a guest who has checked out', async () => {
    apiGet.mockResolvedValue({ roomNumber: '410', guestName: 'Ada Okafor', status: 'Checked out' })
    const stay = await fetchActiveRoomStay('410')
    expect(stay?.checkedIn).toBe(false)
    expect(stay?.reservation.guestName).toBe('Ada Okafor')
  })

  it('keeps the menu open when the server does not know the room yet', async () => {
    // The database can be behind the staff application: the in-browser mirror
    // then keeps the printed card working.
    apiGet.mockRejectedValue(Object.assign(new Error('This in-room dining code does not match a room at Hayata Hotel.'), { status: 403, code: 'ROOM_UNAVAILABLE' }))
    const stay = await fetchActiveRoomStay('410')
    expect(stay?.room.number).toBe('410')
  })

  it('closes the menu when neither the server nor the mirror know the room', async () => {
    apiGet.mockRejectedValue(Object.assign(new Error('This in-room dining code does not match a room at Hayata Hotel.'), { status: 403, code: 'ROOM_UNAVAILABLE' }))
    const stay = await fetchActiveRoomStay('999')
    expect(stay).toBeNull()
  })

  it('falls back to the in-browser mirror when the API is unreachable', async () => {
    apiGet.mockRejectedValue(new TypeError('Failed to fetch'))
    const stay = await fetchActiveRoomStay('410')
    expect(stay?.room.number).toBe('410')
  })
})
