import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuditLog } from '@/types/domain'

interface ActivityLogState {
  activities: AuditLog[]
  addActivity: (entry: AuditLog) => void
  clearActivities: () => void
}

export const useActivityLogStore = create<ActivityLogState>()(
  persist(
    (set) => ({
      activities: [],
      addActivity: (entry) => set((state) => ({ activities: [entry, ...state.activities].slice(0, 200) })),
      clearActivities: () => set({ activities: [] }),
    }),
    {
      name: 'hayata-hms-activity',
      partialize: (state) => ({ activities: state.activities }),
    },
  ),
)
