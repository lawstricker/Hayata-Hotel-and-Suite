import type { Permission, Role } from '@/types/domain'

export type FinanceRole = 'ADMIN' | 'ACCOUNTANT' | 'APPROVER' | 'AUDITOR' | 'VIEWER'

export const FINANCE_ROLES: FinanceRole[] = ['ADMIN', 'ACCOUNTANT', 'APPROVER', 'AUDITOR', 'VIEWER']

const VIEW_PERMISSIONS: Permission[] = [
  'dashboard.view', 'finance:view', 'accounts:view', 'journal:view', 'invoice:view',
  'bill:view', 'expense:view', 'payment:view', 'bank:view', 'budget:view',
  'tax:view', 'report:finance', 'audit:view',
]

const CREATE_PERMISSIONS: Permission[] = [
  ...VIEW_PERMISSIONS,
  'accounts:create', 'accounts:edit', 'accounts:delete',
  'journal:create', 'journal:reverse',
  'invoice:create', 'bill:create',
  'payment:create', 'payment:reconcile', 'bank:reconcile',
  'budget:manage', 'tax:manage', 'settings:finance',
]

/** Single source of truth for finance access. Mirrored into the RBAC store at startup. */
export const financePermissionMatrix: Record<FinanceRole, Permission[]> = {
  ADMIN: [...CREATE_PERMISSIONS, 'journal:post', 'invoice:approve', 'bill:approve', 'expense:approve'],
  ACCOUNTANT: CREATE_PERMISSIONS,
  APPROVER: [...VIEW_PERMISSIONS, 'journal:post', 'journal:reverse', 'invoice:approve', 'bill:approve', 'expense:approve', 'payment:reconcile', 'bank:reconcile'],
  AUDITOR: [...VIEW_PERMISSIONS],
  VIEWER: VIEW_PERMISSIONS.filter((permission) => permission !== 'audit:view'),
}

export function canFinance(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false
  return (financePermissionMatrix[role as FinanceRole] ?? []).includes(permission)
}
