import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRbacStore } from '@/store/rbacStore'
import type { Permission } from '@/types/domain'
import { UnauthorizedPage } from '@/features/error/unauthorized-page'

export function RequireAuth() {
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <Outlet />
}

export function PermissionRoute({ permission, children }: { permission: Permission; children: ReactNode }) {
  const role = useAuthStore((state) => state.user?.role)
  const permissionsByRole = useRbacStore((state) => state.permissions)
  const rolePermissions = role ? permissionsByRole[role] : []
  if (!role) return <Navigate to="/login" replace />
  if (!rolePermissions.includes(permission)) return <UnauthorizedPage />
  return <>{children}</>
}
