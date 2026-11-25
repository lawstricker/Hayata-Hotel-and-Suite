import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { demoUsers } from '@/mock/data'
import type { User } from '@/types/domain'
import { logActivity } from '@/lib/activity-log'

interface StaffState {
  addedStaff: User[]
  edits: Record<string, User>
  addStaff: (user: User) => void
  updateStaff: (user: User) => void
}

export const useStaffStore = create<StaffState>()(
  persist(
    (set) => ({
      addedStaff: [],
      edits: {},
      addStaff: (user) => {
        logActivity({ action: 'Staff member created', module: 'Staff & HR', detail: `${user.name} · ${user.role}` })
        set((state) => ({ addedStaff: [user, ...state.addedStaff] }))
      },
      updateStaff: (user) => {
        logActivity({ action: 'Staff member updated', module: 'Staff & HR', detail: `${user.name} · ${user.status}` })
        set((state) => ({
          addedStaff: state.addedStaff.map((candidate) => candidate.id === user.id ? user : candidate),
          edits: { ...state.edits, [user.id]: user },
        }))
      },
    }),
    {
      name: 'hayata-hms-staff',
      partialize: (state) => ({ addedStaff: state.addedStaff, edits: state.edits }),
    },
  ),
)

export function allStaff(): User[] {
  const { addedStaff, edits } = useStaffStore.getState()
  return [...addedStaff, ...demoUsers].map((user) => edits[user.id] ?? user)
}
