import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api-client'
import type { MenuItem } from '@/types/domain'

/**
 * Menu API helpers.
 *
 * Staff use the authenticated `/resource/menu-items` endpoints so changes are
 * stored in the database; guests use the public `/public/menu` read-only feed
 * for the in-room QR dining page.
 */

/** Loads every menu item for the staff menu management screens. */
export async function fetchStaffMenu(): Promise<MenuItem[]> {
  return apiGet<MenuItem[]>('/resource/menu-items')
}

/** Loads the items a guest can order from the in-room QR menu. */
export async function fetchPublicMenu(): Promise<MenuItem[]> {
  return apiGet<MenuItem[]>('/public/menu')
}

/** Creates a menu item on the server and returns the stored row. */
export async function createMenuItem(item: MenuItem): Promise<MenuItem> {
  return apiPost<MenuItem>('/resource/menu-items', item)
}

/** Saves changes to an existing menu item. */
export async function updateMenuItem(item: MenuItem): Promise<MenuItem> {
  return apiPut<MenuItem>(`/resource/menu-items/${encodeURIComponent(item.id)}`, item)
}

/** Removes a menu item from the menu. */
export async function deleteMenuItem(id: string): Promise<void> {
  await apiDelete<{ ok: boolean }>(`/resource/menu-items/${encodeURIComponent(id)}`)
}
