<?php
declare(strict_types=1);

function hayata_config(): array {
    static $config = null;
    if ($config === null) $config = require __DIR__ . '/config.php';
    return $config;
}

function hayata_pdo(?string $database = null): PDO {
    $config = hayata_config();
    $name = $database ?? $config['db_name'];
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_port'], $name);
    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function hayata_json($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: ' . hayata_config()['cors_origin']);
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function hayata_body(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function hayata_route(): string {
    $route = $_GET['route'] ?? '';
    return '/' . trim((string) $route, '/');
}

function hayata_method(): string {
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function hayata_query(): array {
    return $_GET;
}

function hayata_request_user(PDO $pdo): ?array {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$header && function_exists('getallheaders')) {
        foreach (getallheaders() as $key => $value) {
            if (strtolower($key) === 'authorization') { $header = $value; break; }
        }
    }
    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) return null;
    $token = trim($matches[1]);
    $statement = $pdo->prepare('SELECT u.id, u.name, u.email, u.department, u.status, u.last_active, r.name AS role, r.label AS role_label
        FROM api_tokens t JOIN users u ON u.id = t.user_id JOIN roles r ON r.id = u.role_id
        WHERE t.token = :token AND t.expires_at > NOW()');
    $statement->execute(['token' => $token]);
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

function hayata_reference(): string {
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return 'HYT-' . implode('', array_map(fn() => $alphabet[random_int(0, strlen($alphabet) - 1)], range(1, 6)));
}
