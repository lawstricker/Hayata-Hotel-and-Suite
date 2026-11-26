import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRoomTypesStore } from '@/store/roomTypesStore'
import type { RoomType } from '@/types/domain'

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

function roomType(overrides: Partial<RoomType> = {}): RoomType {
  return {
    id: 'rt-009',
    name: 'Garden View King',
    code: 'GDN-K',
    baseRate: 210,
    capacity: 2,
    totalRooms: 6,
    amenities: ['King bed', 'Garden view'],
    ...overrides,
  }
}

beforeEach(() => {
  apiGet.mockReset()
  apiPost.mockReset()
  apiPut.mockReset()
  apiDelete.mockReset()
  useRoomTypesStore.setState({ items: [], loaded: false, loading: false, source: 'local' })
})

describe('Room types store', () => {
  it('loads the room types from the server', async () => {
    apiGet.mockResolvedValue([roomType()])
    await useRoomTypesStore.getState().load()
    expect(apiGet).toHaveBeenCalledWith('/resource/room-types')
    expect(useRoomTypesStore.getState().source).toBe('server')
    expect(useRoomTypesStore.getState().items[0].name).toBe('Garden View King')
  })

  it('keeps the bundled room types when the server cannot be reached', async () => {
    apiGet.mockRejectedValue(new TypeError('Failed to fetch'))
    await useRoomTypesStore.getState().load()
    expect(useRoomTypesStore.getState().source).toBe('local')
    expect(useRoomTypesStore.getState().items.length).toBeGreaterThan(0)
  })

  it('stores the profile picture and the gallery with a new room type', async () => {
    const payload = roomType({ image: 'data:image/jpeg;base64,AAA', gallery: ['data:image/jpeg;base64,BBB'] })
    apiPost.mockResolvedValue(payload)
    const result = await useRoomTypesStore.getState().create(payload)
    expect(apiPost).toHaveBeenCalledWith('/resource/room-types', expect.objectContaining({ image: payload.image, gallery: payload.gallery }))
    expect(result.persisted).toBe(true)
    expect(result.roomType.image).toBe(payload.image)
    expect(result.roomType.gallery).toEqual(payload.gallery)
  })

  it('saves the pictures of an edited room type', async () => {
    apiPut.mockResolvedValue(roomType({ image: 'https://example.com/new.jpg', gallery: [] }))
    const result = await useRoomTypesStore.getState().update(roomType({ image: 'https://example.com/new.jpg', gallery: [] }))
    expect(apiPut).toHaveBeenCalledWith('/resource/room-types/rt-009', expect.objectContaining({ image: 'https://example.com/new.jpg' }))
    expect(result.persisted).toBe(true)
  })

  it('keeps the room type when the server refuses the delete', async () => {
    useRoomTypesStore.setState({ items: [roomType()] })
    apiDelete.mockRejectedValue(Object.assign(new Error('Room type is in use'), { status: 409 }))
    const removed = await useRoomTypesStore.getState().remove('rt-009')
    expect(removed).toBe(false)
    expect(useRoomTypesStore.getState().items).toHaveLength(1)
  })

  it('removes the room type once the server has deleted it', async () => {
    useRoomTypesStore.setState({ items: [roomType()] })
    apiDelete.mockResolvedValue({ ok: true })
    const removed = await useRoomTypesStore.getState().remove('rt-009')
    expect(removed).toBe(true)
    expect(useRoomTypesStore.getState().items).toHaveLength(0)
  })
})
