import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { serverLogin, serverLogout } from '@/lib/auth-api'
import { allStaff } from '@/store/staffStore'
import type { Role, User } from '@/types/domain'

interface AuthState {
  user: User | null
  theme: 'light' | 'dark'
  sidebarCollapsed: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
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
      /**
       * Signs in through the API.
       *
       * The password is never checked in the browser. When the server is
       * unavailable the sign-in fails, because a local check would let anyone
       * who can run the bundle sign in without a credential.
       */
      login: async (email, password) => {
        const user = await serverLogin(email, password)
        set({ user })
        return user
      },
      logout: async () => {
        await serverLogout()
        set({ user: null })
      },
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
