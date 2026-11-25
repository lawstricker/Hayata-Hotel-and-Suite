<?php
/**
 * Idempotent, non-destructive re-sync of the role / permission matrix.
 *
 * Unlike `setup.php` this script never drops tables, so it can be run against a
 * live database to repair access control that has drifted (for example when a
 * database was seeded from an older version of the schema).
 *
 * Usage: & "C:\xampp\php\php.exe" "server\php\seed_access.php"
 */
declare(strict_types=1);

require __DIR__ . '/db.php';
require __DIR__ . '/access-matrix.php';

$pdo = hayata_pdo();

$roles = hayata_access_roles();
$permissionKeys = hayata_access_permission_keys();
$grants = hayata_access_grants();

// 1. Roles ------------------------------------------------------------------
$roleStatement = $pdo->prepare(
    'INSERT INTO roles (id, name, label) VALUES (:id, :name, :label)
     ON DUPLICATE KEY UPDATE name = VALUES(name), label = VALUES(label)'
);
foreach ($roles as [$name, $label]) {
    $roleStatement->execute(['id' => strtolower($name), 'name' => $name, 'label' => $label]);
}

// 2. Permissions ------------------------------------------------------------
$permissionStatement = $pdo->prepare(
    'INSERT INTO permissions (permission_key, label) VALUES (:key, :label)
     ON DUPLICATE KEY UPDATE label = VALUES(label)'
);
foreach ($permissionKeys as $key) {
    $permissionStatement->execute(['key' => $key, 'label' => hayata_access_permission_label($key)]);
}

$permissionRows = $pdo->query('SELECT id, permission_key FROM permissions')->fetchAll(PDO::FETCH_KEY_PAIR);
$permissionIds = array_flip($permissionRows);

// 3. Role grants ------------------------------------------------------------
$grantStatement = $pdo->prepare(
    'INSERT INTO role_permissions (role_id, permission_id) VALUES (:role, :permission)
     ON DUPLICATE KEY UPDATE permission_id = permission_id'
);

$changes = 0;
foreach ($grants as $role => $keys) {
    $roleId = strtolower($role);
    $expected = [];
    foreach ($keys as $key) {
        if (!isset($permissionIds[$key])) continue;
        $expected[] = (int) $permissionIds[$key];
        $grantStatement->execute(['role' => $roleId, 'permission' => $permissionIds[$key]]);
    }

    // Remove grants that are no longer part of the matrix so the DB cannot drift.
    if ($expected) {
        $placeholders = implode(',', array_fill(0, count($expected), '?'));
        $remove = $pdo->prepare(
            "DELETE FROM role_permissions WHERE role_id = ? AND permission_id NOT IN ($placeholders)"
        );
        $remove->execute(array_merge([$roleId], $expected));
        $changes += $remove->rowCount();
    }
}

echo 'Roles synced: ' . count($roles) . PHP_EOL;
echo 'Permissions synced: ' . count($permissionKeys) . PHP_EOL;
echo 'Stale grants removed: ' . $changes . PHP_EOL;

// 4. Demo staff accounts ----------------------------------------------------
// Ensures every role has a usable login. Existing accounts keep their password.
$userStatement = $pdo->prepare(
    'INSERT INTO users (id, name, email, password_hash, role_id, department, status, last_active)
     VALUES (:id, :name, :email, :hash, :role, :department, \'Active\', \'Just now\')
     ON DUPLICATE KEY UPDATE name = VALUES(name), role_id = VALUES(role_id), department = VALUES(department)'
);
$usersCreated = 0;
foreach (hayata_access_users() as [$id, $name, $email, $role, $department]) {
    $exists = $pdo->prepare('SELECT id FROM users WHERE id = :id OR email = :email');
    $exists->execute(['id' => $id, 'email' => $email]);
    if ($exists->fetchColumn()) continue;
    $userStatement->execute([
        'id' => $id,
        'name' => $name,
        'email' => $email,
        'hash' => password_hash('demo123', PASSWORD_DEFAULT),
        'role' => strtolower($role),
        'department' => $department,
    ]);
    $usersCreated++;
}
echo 'Demo users created: ' . $usersCreated . PHP_EOL;

$verify = $pdo->query(
    "SELECT r.id AS role, COUNT(rp.permission_id) AS permissions
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     GROUP BY r.id
     ORDER BY r.id"
)->fetchAll();
foreach ($verify as $row) {
    echo '  ' . str_pad($row['role'], 24) . ' ' . $row['permissions'] . ' permissions' . PHP_EOL;
}
