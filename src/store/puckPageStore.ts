import type { Data } from '@puckeditor/core'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultHomeData } from '@/features/admin/puck-config'

interface PuckPageState {
  data: Data
  update: (data: Data) => void
  reset: () => void
}

export const usePuckPageStore = create<PuckPageState>()(
  persist(
    (set) => ({
      data: defaultHomeData,
      update: (data) => set({ data }),
      reset: () => set({ data: defaultHomeData }),
    }),
    { name: 'hayata-hms-puck-page', partialize: (state) => ({ data: state.data }) },
  ),
)
