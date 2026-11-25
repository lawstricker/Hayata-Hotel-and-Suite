import type { ReactNode } from 'react'
import { useCan } from './hooks'
import type { Permission } from '@/types/domain'

/** Route/component-level permission gate. */
export function Can({ permission, children, fallback = null }: { permission: Permission; children: ReactNode; fallback?: ReactNode }) {
  return useCan(permission) ? <>{children}</> : <>{fallback}</>
}
