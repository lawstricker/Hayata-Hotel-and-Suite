<?php
/**
 * Security hardening tables.
 *
 * - `rate_limits` stores the throttling counters for logins and public requests.
 * - `notification_settings` stores the SMTP configuration and the per-event
 *   notification switches.
 * - `email_log` records every notification the API tried to send.
 * - Existing bearer tokens are hashed so the database never holds a usable
 *   credential again.
 *
 * @return callable(PDO): void
 */
declare(strict_types=1);

return function (PDO $pdo): void {
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS rate_limits (
            bucket VARCHAR(120) PRIMARY KEY,
            hits INT NOT NULL DEFAULT 0,
            window_started_at DATETIME NOT NULL
        ) ENGINE=InnoDB'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS notification_settings (
            setting_key VARCHAR(60) PRIMARY KEY,
            setting_value JSON NOT NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS email_log (
            id VARCHAR(40) PRIMARY KEY,
            recipient VARCHAR(190) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            event VARCHAR(60) NOT NULL,
            status VARCHAR(30) NOT NULL,
            error TEXT NULL,
            created_at DATETIME NOT NULL
        ) ENGINE=InnoDB'
    );

    // Bearer tokens are stored hashed from now on. Hash the tokens that are
    // already in the table so signed-in staff stay signed in.
    $statement = $pdo->query('SELECT id, token FROM api_tokens');
    $update = $pdo->prepare('UPDATE api_tokens SET token = :token WHERE id = :id');
    foreach ($statement->fetchAll() as $row) {
        $token = (string) $row['token'];
        if (strlen($token) === 64 && !hash_equals($token, hayata_token_hash($token))) {
            $update->execute(['token' => hayata_token_hash($token), 'id' => $row['id']]);
        }
    }

    // Expired tokens are never useful.
    $pdo->exec('DELETE FROM api_tokens WHERE expires_at < NOW()');
};
