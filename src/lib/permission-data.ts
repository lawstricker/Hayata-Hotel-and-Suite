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
  ACCOUNTANT: ['dashboard.view', 'billing.view', 'billing.manage', 'report.view', 'guest.view'],
  WAITER: ['dashboard.view', 'restaurant.pos'],
  BARTENDER: ['dashboard.view', 'bar.pos'],
}
