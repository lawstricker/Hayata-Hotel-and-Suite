import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { allStaff } from '@/store/staffStore'
import type { Role, User } from '@/types/domain'

interface AuthState {
  user: User | null
  theme: 'light' | 'dark'
  sidebarCollapsed: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  switchRole: (role: Role) => void
  setTheme: (theme: 'light' | 'dark') => void
  toggleSidebar: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      theme: 'light',
      sidebarCollapsed: false,
      login: async (email, password) => {
        await new Promise((resolve) => window.setTimeout(resolve, 650))
        const user = allStaff().find((candidate) => candidate.email.toLowerCase() === email.toLowerCase())
        if (!user || password !== 'demo123') throw new Error('Invalid email or password. Use demo123 for all accounts.')
        set({ user })
        return user
      },
      logout: () => set({ user: null }),
      switchRole: (role) => {
        const current = useAuthStore.getState().user
        const user = allStaff().find((candidate) => candidate.role === role)
        if (user) set({ user: { ...(current ?? user), ...user } })
      },
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'hayata-hms-session',
      partialize: (state) => ({ user: state.user, theme: state.theme, sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
)

export function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}
