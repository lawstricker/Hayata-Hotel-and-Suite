import { create } from 'zustand'
import { roleLabels } from '@/lib/permission-data'
import { tables } from '@/mock/data'
import type { OrderItem, OrderType, Role, User } from '@/types/domain'
import { allStaff } from '@/store/staffStore'

export type PosOutlet = 'RESTAURANT' | 'BAR'

export interface AssignedServer {
  userId: string
  name: string
  role: Role
  roleLabel: string
}

export interface PosLine extends OrderItem {
  notes?: string
}

export interface PosSession {
  lines: PosLine[]
  orderType: OrderType
  tableId: string
  discount: number
  tip: number
  server: AssignedServer | null
  phase: 'active' | 'placed'
  updatedAt: string
}

/** Roles allowed to run each section of the onscreen POS. */
export const sectionRoles: Record<PosOutlet, Role[]> = {
  RESTAURANT: ['WAITER', 'FOOD_BEVERAGE_STAFF', 'RESTAURANT_MANAGER'],
  BAR: ['BARTENDER', 'FOOD_BEVERAGE_STAFF', 'BAR_MANAGER'],
}

export function eligibleStaffFor(outlet: PosOutlet, staff: User[] = allStaff()): User[] {
  const roles = sectionRoles[outlet]
  return staff.filter((user) => user.status === 'Active' && roles.includes(user.role))
}

function toAssigned(user: User): AssignedServer {
  return { userId: user.id, name: user.name, role: user.role, roleLabel: roleLabels[user.role] }
}

const STORAGE_KEY = 'hayata-hms-pos-display'

interface PersistedPosState {
  assignments: Record<PosOutlet, AssignedServer | null>
  sessions: Record<PosOutlet, PosSession>
}

function makeSession(outlet: PosOutlet, server: AssignedServer | null): PosSession {
  return {
    lines: [],
    orderType: 'Dine-in',
    tableId: outlet === 'RESTAURANT' ? (tables[0]?.id ?? '') : '',
    discount: 0,
    tip: 0,
    server,
    phase: 'active',
    updatedAt: new Date().toISOString(),
  }
}

function makeDefaults(): PersistedPosState {
  const defaultFor = (outlet: PosOutlet) => {
    const staff = eligibleStaffFor(outlet)
    // Prefer the front-of-house role (waiter/bartender), then the manager.
    const first = sectionRoles[outlet].map((role) => staff.find((user) => user.role === role)).find((user) => Boolean(user))
    return first ? toAssigned(first) : null
  }
  const assignments: Record<PosOutlet, AssignedServer | null> = {
    RESTAURANT: defaultFor('RESTAURANT'),
    BAR: defaultFor('BAR'),
  }
  return {
    assignments,
    sessions: {
      RESTAURANT: makeSession('RESTAURANT', assignments.RESTAURANT),
      BAR: makeSession('BAR', assignments.BAR),
    },
  }
}

function readStorage(): PersistedPosState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const value = parsed as Partial<PersistedPosState>
    const defaults = makeDefaults()
    return {
      assignments: { ...defaults.assignments, ...(value.assignments ?? {}) },
      sessions: { ...defaults.sessions, ...(value.sessions ?? {}) },
    }
  } catch {
    return null
  }
}

function persist(state: PersistedPosState) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ assignments: state.assignments, sessions: state.sessions }))
  } catch {
    // Storage can be unavailable in private browsing; the in-memory store still works.
  }
}

interface PosDisplayState extends PersistedPosState {
  updateSession: (outlet: PosOutlet, updater: (session: PosSession) => PosSession) => void
  setAssignment: (outlet: PosOutlet, user: User | null) => void
  completeOrder: (outlet: PosOutlet) => void
  syncFromStorage: () => void
}

export const usePosDisplayStore = create<PosDisplayState>()((set) => ({
  ...(readStorage() ?? makeDefaults()),
  updateSession: (outlet, updater) => set((state) => {
    const next: PosDisplayState = {
      ...state,
      sessions: {
        ...state.sessions,
        [outlet]: { ...updater(state.sessions[outlet]), phase: 'active', updatedAt: new Date().toISOString() },
      },
    }
    persist(next)
    return next
  }),
  setAssignment: (outlet, user) => set((state) => {
    const server = user ? toAssigned(user) : null
    const next: PosDisplayState = {
      ...state,
      assignments: { ...state.assignments, [outlet]: server },
      sessions: { ...state.sessions, [outlet]: { ...state.sessions[outlet], server } },
    }
    persist(next)
    return next
  }),
  completeOrder: (outlet) => set((state) => {
    const next: PosDisplayState = {
      ...state,
      sessions: { ...state.sessions, [outlet]: { ...makeSession(outlet, state.assignments[outlet]), phase: 'placed' } },
    }
    persist(next)
    return next
  }),
  syncFromStorage: () => {
    const stored = readStorage()
    if (stored) set(stored)
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) usePosDisplayStore.getState().syncFromStorage()
  })
}

export function sessionTotals(session: PosSession) {
  const subtotal = session.lines.reduce((sum, line) => sum + line.price * line.quantity, 0)
  const tax = subtotal * 0.08
  const total = Math.max(0, subtotal - session.discount) + tax + session.tip
  return { subtotal, tax, total }
}
