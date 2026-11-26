import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api-client'
import type { RoomType } from '@/types/domain'

/**
 * Room type API helpers.
 *
 * Room types are the categories the physical rooms belong to. They are stored
 * in the `room_types` table and are written through the authenticated resource
 * endpoints, so a change made by a manager is visible to every other screen.
 */

/** Loads every room type for the Rooms & room types screen. */
export async function fetchStaffRoomTypes(): Promise<RoomType[]> {
  return apiGet<RoomType[]>('/resource/room-types')
}

/** Creates a room type on the server and returns the stored row. */
export async function createRoomType(roomType: RoomType): Promise<RoomType> {
  return apiPost<RoomType>('/resource/room-types', roomType)
}

/** Saves changes to an existing room type. */
export async function updateRoomType(roomType: RoomType): Promise<RoomType> {
  return apiPut<RoomType>(`/resource/room-types/${encodeURIComponent(roomType.id)}`, roomType)
}

/** Removes a room type from the server. */
export async function deleteRoomType(id: string): Promise<void> {
  await apiDelete(`/resource/room-types/${encodeURIComponent(id)}`)
}
