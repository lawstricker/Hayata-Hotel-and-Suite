<?php
/**
 * Second security batch: session, RLS audit and anti-replay storage.
 *
 * - `api_tokens.last_used_at` lets the API expire idle sessions.
 * - `security_events` keeps a record of denied row-level access attempts.
 * - `payment_references` makes every paid reference single-use, so a captured
 *   request cannot be replayed to create another paid order.
 *
 * @return callable(PDO): void
 */
declare(strict_types=1);

return function (PDO $pdo): void {
    $columns = $pdo->query("SHOW COLUMNS FROM api_tokens LIKE 'last_used_at'")->fetchAll();
    if (!$columns) {
        $pdo->exec('ALTER TABLE api_tokens ADD COLUMN last_used_at DATETIME NULL AFTER expires_at');
        $pdo->exec('UPDATE api_tokens SET last_used_at = created_at WHERE last_used_at IS NULL');
    }

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS security_events (
            id VARCHAR(40) PRIMARY KEY,
            event VARCHAR(60) NOT NULL,
            actor VARCHAR(80) NOT NULL,
            resource VARCHAR(60) NOT NULL,
            record_id VARCHAR(100) NOT NULL,
            detail VARCHAR(255) NULL,
            ip_hash VARCHAR(64) NULL,
            created_at DATETIME NOT NULL,
            INDEX idx_event_created (event, created_at)
        ) ENGINE=InnoDB'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS payment_references (
            reference VARCHAR(120) PRIMARY KEY,
            amount DECIMAL(12,2) NOT NULL,
            order_id VARCHAR(60) NOT NULL,
            created_at DATETIME NOT NULL
        ) ENGINE=InnoDB'
    );
};
