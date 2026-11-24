import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultPermissionMatrix } from '@/lib/permission-data'
import type { Permission, Role } from '@/types/domain'

interface RbacState {
  permissions: Record<Role, Permission[]>
  setPermission: (role: Role, permission: Permission, enabled: boolean) => void
  resetRole: (role: Role) => void
  resetAll: () => void
}

function cloneDefaults(): Record<Role, Permission[]> {
  return Object.fromEntries(
    (Object.entries(defaultPermissionMatrix) as Array<[Role, Permission[]]>).map(([role, permissions]) => [role, [...permissions]]),
  ) as Record<Role, Permission[]>
}

export const useRbacStore = create<RbacState>()(
  persist(
    (set) => ({
      permissions: cloneDefaults(),
      setPermission: (role, permission, enabled) => set((state) => {
        const current = state.permissions[role] ?? []
        const next = enabled
          ? current.includes(permission) ? current : [...current, permission]
          : current.filter((candidate) => candidate !== permission)
        return { permissions: { ...state.permissions, [role]: next } }
      }),
      resetRole: (role) => set((state) => ({
        permissions: { ...state.permissions, [role]: [...(defaultPermissionMatrix[role] ?? [])] },
      })),
      resetAll: () => set({ permissions: cloneDefaults() }),
    }),
    {
      name: 'hayata-hms-rbac',
      partialize: (state) => ({ permissions: state.permissions }),
    },
  ),
)
