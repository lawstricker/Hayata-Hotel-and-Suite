import { create } from 'zustand'
import { logActivity } from '@/lib/activity-log'
import { createRoomType, deleteRoomType, fetchStaffRoomTypes, updateRoomType } from '@/lib/room-types-api'
import { roomTypes as seedRoomTypes } from '@/mock/data'
import type { RoomType } from '@/types/domain'

export type RoomTypeSyncSource = 'server' | 'local'

export interface RoomTypeWriteResult {
  roomType: RoomType
  /** `false` when the API could not be reached and the change is only stored locally. */
  persisted: boolean
}

interface RoomTypeState {
  items: RoomType[]
  loading: boolean
  loaded: boolean
  /** `server` when the list came from the API, `local` when the API was unreachable. */
  source: RoomTypeSyncSource
  load: () => Promise<void>
  create: (roomType: RoomType) => Promise<RoomTypeWriteResult>
  update: (roomType: RoomType) => Promise<RoomTypeWriteResult>
  remove: (id: string) => Promise<boolean>
}

/**
 * Brings a room type into the shape the screens expect.
 *
 * The API stores the pictures as a data URL and a JSON array, and MySQL hands
 * the nightly rate over as a string, so the payload is tidied up here.
 */
function normalizeRoomType(roomType: RoomType): RoomType {
  const gallery = Array.isArray(roomType.gallery) ? roomType.gallery.filter(Boolean) : []
  return {
    ...roomType,
    baseRate: Number(roomType.baseRate) || 0,
    capacity: Number(roomType.capacity) || 0,
    totalRooms: Number(roomType.totalRooms) || 0,
    amenities: Array.isArray(roomType.amenities) ? roomType.amenities.filter(Boolean) : [],
    image: roomType.image ?? '',
    gallery,
  }
}

export const useRoomTypesStore = create<RoomTypeState>()((set, get) => ({
  items: seedRoomTypes.map(normalizeRoomType),
  loading: false,
  loaded: false,
  source: 'local',

  async load() {
    if (get().loading) return
    // A successful load is not repeated: several screens use these room types.
    if (get().loaded && get().source === 'server') return
    set({ loading: true })
    try {
      const items = await fetchStaffRoomTypes()
      if (!Array.isArray(items)) throw new Error('Unexpected room type payload')
      set({ items: items.map(normalizeRoomType), source: 'server', loaded: true })
    } catch {
      // The API is unavailable: keep the in-browser room types so the screen still works.
      set((state) => ({ items: state.items.length ? state.items : seedRoomTypes.map(normalizeRoomType), source: 'local', loaded: true }))
    } finally {
      set({ loading: false })
    }
  },

  async create(roomType) {
    const payload = normalizeRoomType(roomType)
    try {
      const saved = normalizeRoomType(await createRoomType(payload))
      set((state) => ({ items: [...state.items.filter((candidate) => candidate.id !== saved.id), saved], source: 'server' }))
      logActivity({ action: 'Room type created', module: 'Rooms', detail: `${saved.name} · ${saved.code} · ${saved.baseRate}` })
      return { roomType: saved, persisted: true }
    } catch {
      // Offline: keep the room type locally so the manager does not lose their work.
      set((state) => ({ items: [...state.items.filter((candidate) => candidate.id !== payload.id), payload], source: 'local' }))
      logActivity({ action: 'Room type created', module: 'Rooms', detail: `${payload.name} · ${payload.code} · ${payload.baseRate}` })
      return { roomType: payload, persisted: false }
    }
  },

  async update(roomType) {
    const payload = normalizeRoomType(roomType)
    try {
      const saved = normalizeRoomType(await updateRoomType(payload))
      set((state) => ({ items: state.items.map((candidate) => candidate.id === saved.id ? saved : candidate), source: 'server' }))
      logActivity({ action: 'Room type updated', module: 'Rooms', detail: `${saved.name} · ${saved.code} · ${saved.baseRate}` })
      return { roomType: saved, persisted: true }
    } catch {
      set((state) => ({ items: state.items.map((candidate) => candidate.id === payload.id ? payload : candidate), source: 'local' }))
      logActivity({ action: 'Room type updated', module: 'Rooms', detail: `${payload.name} · ${payload.code} · ${payload.baseRate}` })
      return { roomType: payload, persisted: false }
    }
  },

  async remove(id) {
    const roomType = get().items.find((candidate) => candidate.id === id)
    try {
      await deleteRoomType(id)
      set((state) => ({ items: state.items.filter((candidate) => candidate.id !== id) }))
      logActivity({ action: 'Room type deleted', module: 'Rooms', detail: roomType ? `${roomType.name} · ${roomType.code}` : id })
      return true
    } catch {
      // The server could not be reached: the room type stays, so the screen
      // never shows a room type that the database still has.
      return false
    }
  },
}))
