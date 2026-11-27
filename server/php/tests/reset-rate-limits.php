<?php
/** Clears local throttling counters before a security test run. */
declare(strict_types=1);

require_once __DIR__ . '/../db.php';

try {
    hayata_pdo()->exec('DELETE FROM rate_limits');
    echo "rate limits cleared\n";
} catch (Throwable $exception) {
    echo "could not clear rate limits: " . h_redact($exception->getMessage()) . "\n";
    exit(1);
}
