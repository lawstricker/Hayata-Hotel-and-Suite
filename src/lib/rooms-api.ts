import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api-client'
import type { Room } from '@/types/domain'

/**
 * Room API helpers.
 *
 * A room is the physical room a guest stays in. Its number is the permanent
 * identity of the room: it is the code in the in-room dining QR and the
 * address the kitchen delivers to, so a room number is never reused by a
 * second room.
 */

/** Loads every room for the Rooms & room types screen. */
export async function fetchStaffRooms(): Promise<Room[]> {
  return apiGet<Room[]>('/resource/rooms')
}

/** Creates a room on the server and returns the stored row. */
export async function createRoom(room: Room): Promise<Room> {
  return apiPost<Room>('/resource/rooms', room)
}

/** Saves changes to an existing room. */
export async function updateRoom(room: Room): Promise<Room> {
  return apiPut<Room>(`/resource/rooms/${encodeURIComponent(room.id)}`, room)
}

/** Removes a room from the server, which also stops its QR code. */
export async function deleteRoom(id: string): Promise<void> {
  await apiDelete(`/resource/rooms/${encodeURIComponent(id)}`)
}
