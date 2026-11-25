<?php
/**
 * Canonical role / permission matrix for Hayata Hotel & Suite.
 *
 * This file is the single source of truth shared by:
 *   - `setup.php`      (full database seed)
 *   - `seed_access.php` (idempotent, non-destructive re-sync for an existing database)
 *
 * Keeping both in sync prevents a deployed database from drifting away from the
 * permissions the client enforces (`src/lib/permission-data.ts`).
 */
declare(strict_types=1);

/** @return array<int, array{0: string, 1: string}> Role name => human label. */
function hayata_access_roles(): array {
    return [
        ['SUPER_ADMIN', 'Super Admin'], ['HOTEL_MANAGER', 'Hotel Manager'], ['FRONT_DESK', 'Front Desk'],
        ['HOUSEKEEPING', 'Housekeeping'], ['RESTAURANT_MANAGER', 'Restaurant Manager'], ['BAR_MANAGER', 'Bar Manager'],
        ['STORE_MANAGER', 'Store Manager'], ['ACCOUNTANT', 'Accountant'], ['WAITER', 'Waiter'], ['BARTENDER', 'Bartender'],
        ['FOOD_BEVERAGE_STAFF', 'Food & Beverage Staff'],
        ['ADMIN', 'Finance Admin'], ['APPROVER', 'Approver'], ['AUDITOR', 'Auditor'], ['VIEWER', 'Viewer'],
    ];
}

/** @return array<int, string> Every permission key understood by the API. */
function hayata_access_permission_keys(): array {
    return [
        'dashboard.view', 'reservation.view', 'reservation.create', 'reservation.edit', 'reservation.checkin',
        'reservation.checkout', 'reservation.cancel', 'room.view', 'room.manage', 'housekeeping.view',
        'housekeeping.manage', 'maintenance.view', 'maintenance.manage', 'guest.view', 'guest.manage',
        'guest.crm', 'restaurant.pos', 'restaurant.menu', 'restaurant.kds', 'restaurant.orders',
        'restaurant.inventory', 'bar.pos', 'bar.tabs', 'bar.kds', 'bar.inventory', 'inventory.view',
        'inventory.manage', 'inventory.alerts', 'inventory.po', 'inventory.transfer', 'inventory.requisition',
        'inventory.stocktake', 'supplier.manage', 'billing.view', 'billing.manage', 'report.view',
        'staff.view', 'staff.manage', 'event.view', 'event.manage', 'settings.view', 'settings.manage', 'settings.rbac',
        'finance:view', 'accounts:view', 'accounts:create', 'accounts:edit', 'accounts:delete',
        'journal:view', 'journal:create', 'journal:post', 'journal:reverse',
        'invoice:view', 'invoice:create', 'invoice:approve', 'bill:view', 'bill:create', 'bill:approve',
        'expense:view', 'expense:approve', 'payment:view', 'payment:create', 'payment:reconcile',
        'bank:view', 'bank:reconcile', 'budget:view', 'budget:manage', 'tax:view', 'tax:manage',
        'report:finance', 'audit:view', 'settings:finance',
    ];
}

/**
 * @return array<string, array<int, string>> Role name => permission keys it receives.
 */
function hayata_access_grants(): array {
    $permissionKeys = hayata_access_permission_keys();
    $financeViewKeys = ['finance:view','accounts:view','journal:view','invoice:view','bill:view','expense:view','payment:view','bank:view','budget:view','tax:view','report:finance','audit:view'];
    $financeWriteKeys = ['accounts:create','accounts:edit','accounts:delete','journal:create','journal:reverse','invoice:create','bill:create','payment:create','payment:reconcile','bank:reconcile','budget:manage','tax:manage','settings:finance'];
    $financeApproveKeys = ['journal:post','invoice:approve','bill:approve','expense:approve'];

    return [
        'SUPER_ADMIN' => $permissionKeys,
        'HOTEL_MANAGER' => array_values(array_diff($permissionKeys, ['settings.rbac'])),
        'FRONT_DESK' => ['dashboard.view','reservation.view','reservation.create','reservation.edit','reservation.checkin','reservation.checkout','reservation.cancel','room.view','guest.view','guest.manage','billing.view','billing.manage','report.view','event.view'],
        'HOUSEKEEPING' => ['dashboard.view','room.view','housekeeping.view','housekeeping.manage','maintenance.view','maintenance.manage'],
        'RESTAURANT_MANAGER' => ['dashboard.view','restaurant.pos','restaurant.menu','restaurant.kds','restaurant.orders','restaurant.inventory','inventory.view','inventory.manage','inventory.alerts','inventory.po','inventory.transfer','inventory.requisition','inventory.stocktake','staff.view','report.view'],
        'BAR_MANAGER' => ['dashboard.view','bar.pos','bar.tabs','bar.kds','bar.inventory','inventory.view','inventory.manage','inventory.alerts','inventory.po','inventory.transfer','inventory.requisition','inventory.stocktake','staff.view','report.view'],
        'STORE_MANAGER' => ['dashboard.view','inventory.view','inventory.manage','inventory.alerts','inventory.po','inventory.transfer','inventory.requisition','inventory.stocktake','supplier.manage','report.view','staff.view'],
        'ACCOUNTANT' => array_merge(['dashboard.view','billing.view','billing.manage','report.view','guest.view'], $financeViewKeys, $financeWriteKeys),
        'ADMIN' => $permissionKeys,
        'APPROVER' => array_merge(['dashboard.view'], $financeViewKeys, $financeApproveKeys, ['journal:reverse','payment:reconcile','bank:reconcile']),
        'AUDITOR' => array_merge(['dashboard.view'], $financeViewKeys),
        'VIEWER' => array_merge(['dashboard.view'], array_diff($financeViewKeys, ['audit:view'])),
        'WAITER' => ['dashboard.view','restaurant.pos','restaurant.orders','restaurant.kds'],
        'BARTENDER' => ['dashboard.view','bar.pos','bar.tabs','bar.kds','restaurant.orders'],
        'FOOD_BEVERAGE_STAFF' => ['dashboard.view','restaurant.pos','restaurant.orders','restaurant.kds','bar.pos','bar.tabs','bar.kds'],
    ];
}

/** @return string Human label for a permission key, e.g. "restaurant.orders" => "Restaurant orders". */
function hayata_access_permission_label(string $key): string {
    return ucwords(str_replace(['.', ':'], ' ', $key));
}

/**
 * Demo staff accounts, one per role.
 *
 * @return array<int, array{0: string, 1: string, 2: string, 3: string, 4: string}>
 *         id, name, email, role, department
 */
function hayata_access_users(): array {
    return [
        ['usr-001','Elena Vasquez','elena@hayatahotel.com','SUPER_ADMIN','Executive'],
        ['usr-002','Marcus Chen','marcus@hayatahotel.com','HOTEL_MANAGER','Operations'],
        ['usr-003','Amara Okafor','amara@hayatahotel.com','FRONT_DESK','Front Office'],
        ['usr-004','Sofia Laurent','sofia@hayatahotel.com','HOUSEKEEPING','Housekeeping'],
        ['usr-005','Daniel Novak','daniel@hayatahotel.com','RESTAURANT_MANAGER','Restaurant'],
        ['usr-006','Nina Fischer','nina@hayatahotel.com','BAR_MANAGER','Bar'],
        ['usr-007','Omar Hassan','omar@hayatahotel.com','STORE_MANAGER','Store'],
        ['usr-008','Grace Liu','grace@hayatahotel.com','ACCOUNTANT','Finance'],
        ['usr-009','Leo Martins','leo@hayatahotel.com','WAITER','Restaurant'],
        ['usr-010','Maya Thompson','maya@hayatahotel.com','BARTENDER','Bar'],
        ['usr-011','Ada Nwosu','ada@hayatahotel.com','FOOD_BEVERAGE_STAFF','Food & Beverage'],
        ['usr-012','Tobias Reed','admin@hayatahotel.com','ADMIN','Finance'],
        ['usr-013','Priya Shah','approver@hayatahotel.com','APPROVER','Finance'],
        ['usr-014','Victor Cole','auditor@hayatahotel.com','AUDITOR','Finance'],
        ['usr-015','Noah Bell','viewer@hayatahotel.com','VIEWER','Finance'],
    ];
}
