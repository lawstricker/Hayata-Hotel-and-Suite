import { useAuthStore } from '@/store/authStore'
import { useRbacStore } from '@/store/rbacStore'
import type { Permission, Role } from '@/types/domain'

export function useCan(permission: Permission): boolean {
  const role = useAuthStore((state) => state.user?.role)
  const permissions = useRbacStore((state) => state.permissions)
  return Boolean(role && permissions[role]?.includes(permission))
}

export function useHasRole(roles: Role[]): boolean {
  const role = useAuthStore((state) => state.user?.role)
  return Boolean(role && roles.includes(role))
}
