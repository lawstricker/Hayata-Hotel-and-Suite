import { useRbacStore } from '@/store/rbacStore'
import type { Permission, Role } from '@/types/domain'

export { roleLabels } from '@/lib/permission-data'

export function can(role: Role, permission: Permission) {
  return useRbacStore.getState().permissions[role]?.includes(permission) ?? false
}

export function canAny(role: Role, permissions: Permission[]) {
  const rolePermissions = useRbacStore.getState().permissions[role] ?? []
  return permissions.some((permission) => rolePermissions.includes(permission))
}
