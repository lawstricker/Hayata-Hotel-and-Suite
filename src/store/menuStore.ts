import { create } from 'zustand'
import { logActivity } from '@/lib/activity-log'
import { createMenuItem, deleteMenuItem, fetchStaffMenu, updateMenuItem } from '@/lib/menu-api'
import { menuItems as seedMenu } from '@/mock/data'
import type { MenuItem } from '@/types/domain'

export type MenuSyncSource = 'server' | 'local'

export interface MenuWriteResult {
  item: MenuItem
  /** `false` when the API could not be reached and the change is only stored locally. */
  persisted: boolean
}

interface MenuState {
  items: MenuItem[]
  loading: boolean
  loaded: boolean
  /** `server` when the list came from the API, `local` when the API was unreachable. */
  source: MenuSyncSource
  load: () => Promise<void>
  create: (item: MenuItem) => Promise<MenuWriteResult>
  update: (item: MenuItem) => Promise<MenuWriteResult>
  remove: (id: string) => Promise<boolean>
  setAvailable: (id: string, available: boolean) => Promise<void>
}

export const useMenuStore = create<MenuState>()((set, get) => ({
  items: seedMenu,
  loading: false,
  loaded: false,
  source: 'local',

  async load() {
    if (get().loading) return
    set({ loading: true })
    try {
      const items = await fetchStaffMenu()
      if (!Array.isArray(items)) throw new Error('Unexpected menu payload')
      set({ items, source: 'server', loaded: true })
    } catch {
      // The API is unavailable: keep the in-browser menu so the screens still work.
      set((state) => ({ items: state.items.length ? state.items : seedMenu, source: 'local', loaded: true }))
    } finally {
      set({ loading: false })
    }
  },

  async create(item) {
    try {
      const saved = await createMenuItem(item)
      set((state) => ({ items: [saved, ...state.items.filter((candidate) => candidate.id !== saved.id)], source: 'server' }))
      logActivity({ action: 'Menu item created', module: 'Restaurant', detail: `${saved.name} · ${saved.price}` })
      return { item: saved, persisted: true }
    } catch {
      // Offline: keep the item locally so the manager does not lose their work.
      set((state) => ({ items: [item, ...state.items.filter((candidate) => candidate.id !== item.id)], source: 'local' }))
      logActivity({ action: 'Menu item created', module: 'Restaurant', detail: `${item.name} · ${item.price}` })
      return { item, persisted: false }
    }
  },

  async update(item) {
    try {
      const saved = await updateMenuItem(item)
      set((state) => ({ items: state.items.map((candidate) => candidate.id === saved.id ? saved : candidate), source: 'server' }))
      logActivity({ action: 'Menu item updated', module: 'Restaurant', detail: `${saved.name} · ${saved.price}` })
      return { item: saved, persisted: true }
    } catch {
      set((state) => ({ items: state.items.map((candidate) => candidate.id === item.id ? item : candidate), source: 'local' }))
      logActivity({ action: 'Menu item updated', module: 'Restaurant', detail: `${item.name} · ${item.price}` })
      return { item, persisted: false }
    }
  },

  async remove(id) {
    const removed = get().items.find((item) => item.id === id)
    let persisted = false
    try {
      await deleteMenuItem(id)
      persisted = true
    } catch {
      // Offline: remove it locally so the manager sees the intended result.
    }
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      source: persisted ? 'server' : 'local',
    }))
    if (removed) logActivity({ action: 'Menu item deleted', module: 'Restaurant', detail: removed.name })
    return persisted
  },

  async setAvailable(id, available) {
    const item = get().items.find((candidate) => candidate.id === id)
    if (!item) return
    await get().update({ ...item, available })
  },
}))
