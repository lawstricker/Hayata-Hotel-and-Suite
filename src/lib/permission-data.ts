import { financePermissionMatrix } from '@/lib/permissions'
import type { Permission, Role } from '@/types/domain'

export const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  HOTEL_MANAGER: 'Hotel Manager',
  FRONT_DESK: 'Front Desk',
  HOUSEKEEPING: 'Housekeeping',
  RESTAURANT_MANAGER: 'Restaurant Manager',
  BAR_MANAGER: 'Bar Manager',
  STORE_MANAGER: 'Store Manager',
  ACCOUNTANT: 'Accountant',
  WAITER: 'Waiter',
  BARTENDER: 'Bartender',
  FOOD_BEVERAGE_STAFF: 'Food & Beverage Staff',
  ADMIN: 'Finance Admin',
  APPROVER: 'Approver',
  AUDITOR: 'Auditor',
  VIEWER: 'Viewer',
}

const allPermissions: Permission[] = [
  'dashboard.view',
  'reservation.view', 'reservation.create', 'reservation.edit', 'reservation.checkin', 'reservation.checkout', 'reservation.cancel',
  'room.view', 'room.manage', 'housekeeping.view', 'housekeeping.manage', 'maintenance.view', 'maintenance.manage',
  'guest.view', 'guest.manage', 'guest.crm',
  'restaurant.pos', 'restaurant.menu', 'restaurant.kds', 'restaurant.orders', 'restaurant.inventory',
  'bar.pos', 'bar.tabs', 'bar.kds', 'bar.inventory',
  'inventory.view', 'inventory.manage', 'inventory.alerts', 'inventory.po', 'inventory.transfer', 'inventory.requisition', 'inventory.stocktake', 'supplier.manage',
  'billing.view', 'billing.manage', 'report.view', 'staff.view', 'staff.manage', 'event.view', 'event.manage',
  'settings.view', 'settings.manage', 'settings.rbac',
  'finance:view',
  'accounts:view', 'accounts:create', 'accounts:edit', 'accounts:delete',
  'journal:view', 'journal:create', 'journal:post', 'journal:reverse',
  'invoice:view', 'invoice:create', 'invoice:approve',
  'bill:view', 'bill:create', 'bill:approve',
  'expense:view', 'expense:approve',
  'payment:view', 'payment:create', 'payment:reconcile',
  'bank:view', 'bank:reconcile',
  'budget:view', 'budget:manage',
  'tax:view', 'tax:manage',
  'report:finance', 'audit:view', 'settings:finance',
]

export const defaultPermissionMatrix: Record<Role, Permission[]> = {
  SUPER_ADMIN: allPermissions,
  HOTEL_MANAGER: allPermissions.filter((permission) => permission !== 'settings.rbac'),
  FRONT_DESK: [
    'dashboard.view', 'reservation.view', 'reservation.create', 'reservation.edit', 'reservation.checkin', 'reservation.checkout', 'reservation.cancel',
    'room.view', 'guest.view', 'guest.manage', 'billing.view', 'billing.manage', 'report.view', 'event.view',
  ],
  HOUSEKEEPING: ['dashboard.view', 'room.view', 'housekeeping.view', 'housekeeping.manage', 'maintenance.view', 'maintenance.manage'],
  RESTAURANT_MANAGER: [
    'dashboard.view', 'restaurant.pos', 'restaurant.menu', 'restaurant.kds', 'restaurant.orders', 'restaurant.inventory',
    'inventory.view', 'inventory.manage', 'inventory.alerts', 'inventory.po', 'inventory.transfer', 'inventory.requisition', 'inventory.stocktake',
    'staff.view', 'report.view',
  ],
  BAR_MANAGER: [
    'dashboard.view', 'bar.pos', 'bar.tabs', 'bar.kds', 'bar.inventory',
    'inventory.view', 'inventory.manage', 'inventory.alerts', 'inventory.po', 'inventory.transfer', 'inventory.requisition', 'inventory.stocktake',
    'staff.view', 'report.view',
  ],
  STORE_MANAGER: [
    'dashboard.view', 'inventory.view', 'inventory.manage', 'inventory.alerts', 'inventory.po', 'inventory.transfer',
    'inventory.requisition', 'inventory.stocktake', 'supplier.manage', 'report.view', 'staff.view',
  ],
  ACCOUNTANT: [...financePermissionMatrix.ACCOUNTANT, 'billing.view', 'billing.manage', 'report.view', 'guest.view'],
  WAITER: ['dashboard.view', 'restaurant.pos'],
  BARTENDER: ['dashboard.view', 'bar.pos'],
  FOOD_BEVERAGE_STAFF: ['dashboard.view', 'restaurant.pos', 'restaurant.orders', 'restaurant.kds', 'bar.pos', 'bar.tabs', 'bar.kds'],
  ADMIN: allPermissions,
  APPROVER: [...financePermissionMatrix.APPROVER],
  AUDITOR: [...financePermissionMatrix.AUDITOR],
  VIEWER: [...financePermissionMatrix.VIEWER],
}
