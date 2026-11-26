<?php
/**
 * Adds the free-text detail column to the audit trail.
 *
 * The dashboard activity log shows what actually changed, not only that
 * something changed. The column is nullable, so existing rows stay valid.
 *
 * @return callable(PDO): void
 */
declare(strict_types=1);

return function (PDO $pdo): void {
    $columns = $pdo->query("SHOW COLUMNS FROM audit_logs LIKE 'detail'")->fetchAll();
    if (!$columns) {
        $pdo->exec("ALTER TABLE audit_logs ADD COLUMN detail VARCHAR(255) NULL AFTER action");
    }
};
