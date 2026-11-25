<?php
/**
 * Applies pending database migrations to an existing database.
 *
 * `setup.php` recreates the whole schema from scratch, which is destructive. This
 * runner applies small, additive migrations instead so a live database can be
 * brought up to date without losing data.
 *
 * Usage: & "C:\xampp\php\php.exe" "server\php\migrate.php"
 */
declare(strict_types=1);

require __DIR__ . '/db.php';

$pdo = hayata_pdo();

$pdo->exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(120) PRIMARY KEY,
        applied_at DATETIME NOT NULL
    ) ENGINE=InnoDB'
);

$applied = $pdo->query('SELECT version FROM schema_migrations')->fetchAll(PDO::FETCH_COLUMN);
$files = glob(__DIR__ . '/migrations/*.php') ?: [];
sort($files);

foreach ($files as $file) {
    $version = basename($file, '.php');
    if (in_array($version, $applied, true)) {
        echo "skip    $version (already applied)\n";
        continue;
    }
    echo "apply   $version\n";
    try {
        $pdo->beginTransaction();
        $migrate = require $file;
        if (is_callable($migrate)) $migrate($pdo);
        // DDL implicitly commits in MySQL, so the transaction may already be gone.
        if ($pdo->inTransaction()) $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        echo "FAILED  $version: " . $exception->getMessage() . "\n";
        exit(1);
    }
    $statement = $pdo->prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (:version, :applied)');
    $statement->execute(['version' => $version, 'applied' => date('Y-m-d H:i:s')]);
}

echo "Migrations complete.\n";
