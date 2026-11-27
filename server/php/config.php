<?php
/**
 * Application configuration.
 *
 * Secrets are never committed to the repository. Every value is read from the
 * environment, and for local development only from `config.local.php`, which is
 * listed in `.gitignore`. `config.local.example.php` documents the keys.
 *
 * Required in production:
 *   HAYATA_DB_PASS    - password for the least-privilege database user
 *   HAYATA_APP_SECRET - random secret used to sign tokens and rate-limit keys
 */
declare(strict_types=1);

/** Reads a value from the environment, falling back to the local config file. */
function hayata_config_value(array $local, string $key, string $default = ''): string {
    $value = getenv($key);
    if ($value !== false && $value !== '') return (string) $value;
    if (isset($local[$key]) && $local[$key] !== null && $local[$key] !== '') return (string) $local[$key];
    return $default;
}

/** Parses a "true-ish" string into a boolean. */
function hayata_config_bool(string $value): bool {
    return in_array(strtolower(trim($value)), ['1', 'true', 'yes', 'on'], true);
}

/**
 * @return array{
 *   db_host: string, db_name: string, db_user: string, db_pass: string, db_port: int,
 *   cors_origins: array<int, string>, app_env: string, debug: bool, app_secret: string,
 *   app_timezone: string,
 *   token_ttl: int, session_idle_ttl: int, rate_limit_max: int, rate_limit_window: int, login_max_attempts: int,
 *   login_lockout: int, mail_transport: string, smtp_host: string, smtp_port: int,
 *   smtp_username: string, smtp_password: string, smtp_secure: string,
 *   smtp_from_email: string, smtp_from_name: string
 * }
 */
function hayata_config(): array {
    static $config = null;
    if ($config !== null) return $config;

    $local = [];
    $localPath = __DIR__ . '/config.local.php';
    if (is_file($localPath)) {
        $loaded = require $localPath;
        if (is_array($loaded)) $local = $loaded;
    }

    $read = static fn(string $key, string $default = ''): string => hayata_config_value($local, $key, $default);

    $appEnv = strtolower($read('HAYATA_APP_ENV', 'development'));
    $debug = hayata_config_bool($read('HAYATA_DEBUG', 'false'));

    // Never expose PHP errors to the browser outside development.
    if (!$debug) {
        ini_set('display_errors', '0');
        ini_set('log_errors', '1');
        error_reporting(E_ALL);
    } else {
        ini_set('display_errors', '1');
        error_reporting(E_ALL);
    }

    $origins = array_values(array_filter(array_map(
        static fn(string $origin): string => rtrim(trim($origin), '/'),
        explode(',', $read('HAYATA_CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173'))
    )));

    $config = [
        'db_host' => $read('HAYATA_DB_HOST', '127.0.0.1'),
        'db_name' => $read('HAYATA_DB_NAME', 'hayata_data'),
        'db_user' => $read('HAYATA_DB_USER', 'root'),
        'db_pass' => $read('HAYATA_DB_PASS', ''),
        'db_port' => (int) $read('HAYATA_DB_PORT', '3306'),
        // A wildcard origin is never allowed: every origin must be listed.
        'cors_origins' => $origins,
        'app_env' => $appEnv,
        'debug' => $debug,
        'app_secret' => $read('HAYATA_APP_SECRET', ''),
        // The hotel operates in Africa/Lagos. PHP and MySQL must agree on the
        // clock, otherwise a timestamp written by the browser and one written
        // by `NOW()` would drift apart whenever one of them changes its
        // daylight saving rules.
        'app_timezone' => $read('HAYATA_APP_TIMEZONE', 'Africa/Lagos'),
        'token_ttl' => max(300, (int) $read('HAYATA_TOKEN_TTL', '43200')),
        // A session that has been idle for this long is revoked, even when its
        // absolute lifetime has not elapsed yet.
        'session_idle_ttl' => max(60, (int) $read('HAYATA_SESSION_IDLE_TTL', '7200')),
        'rate_limit_max' => max(1, (int) $read('HAYATA_RATE_LIMIT_MAX', '120')),
        'rate_limit_window' => max(1, (int) $read('HAYATA_RATE_LIMIT_WINDOW', '60')),
        'login_max_attempts' => max(1, (int) $read('HAYATA_LOGIN_MAX_ATTEMPTS', '5')),
        'login_lockout' => max(0, (int) $read('HAYATA_LOGIN_LOCKOUT', '900')),
        'mail_transport' => strtolower($read('HAYATA_MAIL_TRANSPORT', 'mail')),
        'smtp_host' => $read('HAYATA_SMTP_HOST', ''),
        'smtp_port' => (int) $read('HAYATA_SMTP_PORT', '587'),
        'smtp_username' => $read('HAYATA_SMTP_USERNAME', ''),
        'smtp_password' => $read('HAYATA_SMTP_PASSWORD', ''),
        'smtp_secure' => $read('HAYATA_SMTP_SECURE', 'tls'),
        'smtp_from_email' => $read('HAYATA_SMTP_FROM_EMAIL', ''),
        'smtp_from_name' => $read('HAYATA_SMTP_FROM_NAME', 'Hayata Hotel & Suite'),
    ];

    // Only a development machine may run without real secrets. Every other
    // environment refuses to start, so a deployment can never fall back to a
    // publicly known key.
    if ($config['app_env'] !== 'development') {
        $missing = [];
        if ($config['db_pass'] === '') $missing[] = 'HAYATA_DB_PASS';
        if ($config['app_secret'] === '') $missing[] = 'HAYATA_APP_SECRET';
        if ($missing) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => 'Server configuration is incomplete.', 'code' => 'CONFIG_ERROR', 'missing' => $missing]);
            exit;
        }
    }

    return $config;
}
