import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PublicThemeState {
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

export const usePublicThemeStore = create<PublicThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'hayata-public-theme' },
  ),
)
