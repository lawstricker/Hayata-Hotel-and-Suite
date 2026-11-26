<?php
/**
 * Database access, security headers, authentication and rate limiting.
 */
declare(strict_types=1);

require_once __DIR__ . '/config.php';

// PHP and MySQL must read the same clock. Without this, PHP follows the
// server's daylight saving rules while MySQL follows the system's, and the
// two drift apart twice a year.
date_default_timezone_set(hayata_config()['app_timezone']);

/** Opens a hardened PDO connection. */
function hayata_pdo(?string $database = null): PDO {
    $config = hayata_config();
    $name = $database ?? $config['db_name'];
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_port'], $name);
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        // Real prepared statements, so user input is never interpolated into SQL.
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_STRINGIFY_FETCHES => false,
    ];
    // Stacked queries are refused. PHP 8.5 moved the driver constants.
    if (defined('Pdo\\Mysql::ATTR_MULTI_STATEMENTS')) {
        $options[constant('Pdo\\Mysql::ATTR_MULTI_STATEMENTS')] = false;
    } elseif (defined('PDO::MYSQL_ATTR_MULTI_STATEMENTS')) {
        $options[constant('PDO::MYSQL_ATTR_MULTI_STATEMENTS')] = false;
    }
    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], $options);
    $pdo->exec("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION,ERROR_FOR_DIVISION_BY_ZERO,NO_ZERO_DATE,NO_ZERO_IN_DATE,NO_ENGINE_SUBSTITUTION'");
    // The session uses the same timezone as PHP, so `NOW()` and the values the
    // API writes always describe the same moment. A named zone needs the
    // timezone tables to be loaded in the database; when they are missing the
    // current UTC offset of the application zone is used instead.
    try {
        $pdo->exec("SET time_zone = '" . str_replace("'", '', $config['app_timezone']) . "'");
    } catch (Throwable $exception) {
        $offset = (new DateTimeImmutable('now', new DateTimeZone($config['app_timezone'])))->format('P');
        $pdo->exec("SET time_zone = '" . $offset . "'");
    }
    return $pdo;
}

/** The client IP, used for rate limiting and the audit trail. */
function hayata_client_ip(): string {
    $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    return substr($remote, 0, 60);
}

/**
 * Sends the security headers every response must carry.
 *
 * The API only ever returns JSON, so the browser must never be allowed to sniff
 * a different content type or render a response as a page.
 */
function hayata_security_headers(): void {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()');
    header('Cross-Origin-Resource-Policy: same-site');
    header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    header('Cache-Control: no-store');
}

/**
 * Applies the CORS policy.
 *
 * Only origins that are explicitly listed are allowed; there is no wildcard, and
 * the response varies by origin so caches cannot serve one origin's response to
 * another.
 */
function hayata_apply_cors(): void {
    $config = hayata_config();
    $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
    if ($origin !== '') {
        $normalized = rtrim($origin, '/');
        if (in_array($normalized, $config['cors_origins'], true)) {
            header('Access-Control-Allow-Origin: ' . $normalized);
            header('Access-Control-Allow-Credentials: true');
        }
    }
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Max-Age: 600');
}

/** Sends a JSON response and stops the request. */
function hayata_json($data, int $status = 200): void {
    hayata_security_headers();
    hayata_apply_cors();
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Removes control characters and null bytes from incoming input.
 *
 * This blocks null-byte and header/log injection tricks without touching the
 * text a user actually typed.
 */
function hayata_sanitize($value) {
    if (is_array($value)) return array_map('hayata_sanitize', $value);
    if (!is_string($value)) return $value;
    $value = str_replace("\0", '', $value);
    return preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? $value;
}

/**
 * Strips HTML from a free-text field.
 *
 * Used for the public forms (enquiries, booking notes, guest messages) so a
 * stored value can never carry a script tag into a staff screen.
 */
function hayata_clean_text(string $value): string {
    $value = hayata_sanitize($value);
    $value = strip_tags($value);
    $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    return trim($value);
}

/** Reads and sanitises the JSON request body. */
function hayata_body(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    // Reject oversized payloads early.
    if (strlen($raw) > 2 * 1024 * 1024) hayata_json(['error' => 'Request body is too large.', 'code' => 'PAYLOAD_TOO_LARGE'], 413);
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) return [];
    return hayata_sanitize($decoded);
}

function hayata_route(): string {
    $route = $_GET['route'] ?? '';
    return '/' . trim((string) $route, '/');
}

function hayata_method(): string {
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function hayata_query(): array {
    return hayata_sanitize($_GET);
}

/**
 * The secret used to sign tokens and rate-limit keys.
 *
 * Outside development the configuration refuses to start without a real
 * secret, so the placeholder below can never protect a live deployment.
 */
function hayata_app_secret(): string {
    $secret = hayata_config()['app_secret'];
    if ($secret !== '') return $secret;
    if (hayata_config()['app_env'] === 'development') return 'hayata-development-only-placeholder';
    hayata_json(['error' => 'Server configuration is incomplete.', 'code' => 'CONFIG_ERROR'], 500);
}

/** Hashes a bearer token so the database never stores a usable credential. */
function hayata_token_hash(string $token): string {
    return hash_hmac('sha256', $token, hayata_app_secret());
}

/**
 * Reads the bearer token from the request.
 *
 * Not every Apache setup copies the `Authorization` header into
 * `$_SERVER`, so the raw header list is used as a fallback. Every caller that
 * needs the token must go through this helper, otherwise revocation and
 * throttling would silently disagree about who the caller is.
 */
function hayata_bearer_token(): ?string {
    $header = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if ($header === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $key => $value) {
            if (strtolower((string) $key) === 'authorization') {
                $header = (string) $value;
                break;
            }
        }
    }
    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) return null;
    $token = trim($matches[1]);
    return $token !== '' ? $token : null;
}

/** Resolves the signed-in staff member from the bearer token. */
function hayata_request_user(PDO $pdo): ?array {
    $token = hayata_bearer_token();
    if ($token === null) return null;
    $statement = $pdo->prepare('SELECT u.id, u.name, u.email, u.department, u.status, u.last_active, r.name AS role, r.label AS role_label
        FROM api_tokens t JOIN users u ON u.id = t.user_id JOIN roles r ON r.id = u.role_id
        WHERE t.token = :token AND t.expires_at > NOW() AND u.status = :status');
    $statement->execute(['token' => hayata_token_hash($token), 'status' => 'Active']);
    $user = $statement->fetch();
    return $user ?: null;
}

function hayata_require_user(PDO $pdo): array {
    $user = hayata_request_user($pdo);
    if (!$user) hayata_json(['error' => 'Authentication required', 'code' => 'UNAUTHORIZED'], 401);
    return $user;
}

function hayata_has_permission(PDO $pdo, string $userId, string $permission): bool {
    $statement = $pdo->prepare('SELECT COUNT(*) FROM role_permissions rp
        JOIN permissions p ON p.id = rp.permission_id
        JOIN users u ON u.role_id = rp.role_id
        WHERE u.id = :user_id AND p.permission_key = :permission');
    $statement->execute(['user_id' => $userId, 'permission' => $permission]);
    return (int) $statement->fetchColumn() > 0;
}

function hayata_require_permission(PDO $pdo, string $permission): array {
    $user = hayata_require_user($pdo);
    if (!hayata_has_permission($pdo, $user['id'], $permission)) hayata_json(['error' => 'Permission denied', 'code' => 'FORBIDDEN'], 403);
    return $user;
}

/**
 * Throttles a bucket of callers.
 *
 * The bucket key is hashed with the application secret so the table never stores
 * raw IP addresses or e-mail addresses.
 */
function hayata_rate_limit(PDO $pdo, string $bucket, int $max, int $window): void {
    $key = substr(hash_hmac('sha256', $bucket, hayata_app_secret()), 0, 120);
    $statement = $pdo->prepare(
        'INSERT INTO rate_limits (bucket, hits, window_started_at) VALUES (:bucket, 1, NOW())
         ON DUPLICATE KEY UPDATE
            hits = IF(window_started_at <= DATE_SUB(NOW(), INTERVAL :window_a SECOND), 1, hits + 1),
            window_started_at = IF(window_started_at <= DATE_SUB(NOW(), INTERVAL :window_b SECOND), NOW(), window_started_at)'
    );
    $statement->execute(['bucket' => $key, 'window_a' => $window, 'window_b' => $window]);
    $check = $pdo->prepare('SELECT hits FROM rate_limits WHERE bucket = :bucket');
    $check->execute(['bucket' => $key]);
    if ((int) $check->fetchColumn() > $max) {
        header('Retry-After: ' . $window);
        hayata_json(['error' => 'Too many requests. Please wait a moment and try again.', 'code' => 'RATE_LIMITED'], 429);
    }
}

/** Removes rate-limit buckets that are past their window. */
function hayata_prune_rate_limits(PDO $pdo): void {
    $pdo->exec('DELETE FROM rate_limits WHERE window_started_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)');
}

function hayata_reference(): string {
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return 'HYT-' . implode('', array_map(fn() => $alphabet[random_int(0, strlen($alphabet) - 1)], range(1, 6)));
}
