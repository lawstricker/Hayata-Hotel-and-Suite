import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHotelStore } from '@/store/hotelStore'
import type { Room } from '@/types/domain'

const { apiGet, apiPost, apiPut, apiDelete } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
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
    id: 'room-101',
    number: '101',
    floor: 1,
    type: 'Deluxe King',
    status: 'Available',
    housekeepingStatus: 'Clean',
    rate: 185,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  apiGet.mockReset()
  apiPost.mockReset()
  apiPut.mockReset()
  apiDelete.mockReset()
  useHotelStore.setState({ rooms: [room()] })
})

describe('Room writes', () => {
  it('adds a room and stores it on the server', async () => {
    const created = room({ id: 'room-105', number: '105' })
    apiPost.mockResolvedValue(created)
    const result = await useHotelStore.getState().addRoom(created)
    expect(apiPost).toHaveBeenCalledWith('/resource/rooms', created)
    expect(result.persisted).toBe(true)
    expect(useHotelStore.getState().rooms.map((candidate) => candidate.number)).toEqual(['101', '105'])
  })

  it('keeps a new room on the device when the server cannot be reached', async () => {
    const created = room({ id: 'room-105', number: '105' })
    apiPost.mockRejectedValue(new TypeError('Failed to fetch'))
    const result = await useHotelStore.getState().addRoom(created)
    expect(result.persisted).toBe(false)
    expect(useHotelStore.getState().rooms.map((candidate) => candidate.number)).toEqual(['101', '105'])
  })

  it('saves the changes made to a room', async () => {
    const changed = room({ status: 'Dirty', housekeepingStatus: 'Dirty' })
    apiPut.mockResolvedValue(changed)
    const result = await useHotelStore.getState().editRoom(changed)
    expect(apiPut).toHaveBeenCalledWith('/resource/rooms/room-101', changed)
    expect(result.persisted).toBe(true)
    expect(useHotelStore.getState().rooms[0].status).toBe('Dirty')
  })

  it('removes a room once the server has deleted it', async () => {
    apiDelete.mockResolvedValue({ ok: true })
    const removed = await useHotelStore.getState().removeRoom('room-101')
    expect(apiDelete).toHaveBeenCalledWith('/resource/rooms/room-101')
    expect(removed).toBe(true)
    expect(useHotelStore.getState().rooms).toHaveLength(0)
  })

  it('keeps a room that the server refuses to delete', async () => {
    apiDelete.mockRejectedValue(Object.assign(new Error('Room 101 still has a booking or a guest in it.'), { status: 409 }))
    const removed = await useHotelStore.getState().removeRoom('room-101')
    expect(removed).toBe(false)
    expect(useHotelStore.getState().rooms).toHaveLength(1)
  })
})
