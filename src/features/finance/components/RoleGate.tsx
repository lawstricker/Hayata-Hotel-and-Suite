import type { ReactNode } from 'react'
import { useHasRole } from './hooks'
import type { Role } from '@/types/domain'

export function RoleGate({ roles, children, fallback = null }: { roles: Role[]; children: ReactNode; fallback?: ReactNode }) {
  return useHasRole(roles) ? <>{children}</> : <>{fallback}</>
}
