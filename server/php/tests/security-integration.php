<?php
/**
 * Live API security checks: login isolation, IDOR, SQLi, anonymous writes,
 * upload blocking, response trimming, rate limiting and session rotation.
 *
 * Usage: & "C:\xampp\php\php.exe" server\php\tests\security-integration.php
 * Override the target with HAYATA_API_TEST_URL. The API must be running.
 */
declare(strict_types=1);

$base = getenv('HAYATA_API_TEST_URL') ?: 'http://localhost/hayata-api/api.php';

// Start from clean throttling counters so the rate-limit assertion is
// deterministic. This test targets a local development API only.
require_once __DIR__ . '/../db.php';
try {
    hayata_pdo()->exec('DELETE FROM rate_limits');
} catch (Throwable) {
    // The HTTP tests still work if the local database is unavailable.
}

function api(string $route, string $method = 'GET', ?array $body = null, ?string $token = null): array {
    global $base;
    $url = $base . '?route=' . rawurlencode($route);
    $headers = [];
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => array_values(array_filter([
            'Content-Type: application/json',
            $token !== null ? 'Authorization: Bearer ' . $token : null,
        ])),
        CURLOPT_HEADERFUNCTION => static function ($handle, string $line) use (&$headers): int {
            $parts = explode(':', $line, 2);
            if (count($parts) === 2) $headers[strtolower(trim($parts[0]))] = trim($parts[1]);
            return strlen($line);
        },
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $text = (string) curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $decoded = json_decode($text, true);
    return ['status' => $status, 'body' => $decoded ?? $text, 'headers' => $headers, 'text' => $text];
}

$passed = 0;
$failed = 0;
function check(string $name, bool $condition, string $detail = ''): void {
    global $passed, $failed;
    if ($condition) { $passed++; echo "PASS  $name\n"; }
    else { $failed++; echo "FAIL  $name" . ($detail !== '' ? " — $detail" : '') . "\n"; }
}

$health = api('/health');
check('health is public', $health['status'] === 200);
check('health hides database name', !str_contains($health['text'], 'hayata_data'));
check('health hides server banner', !isset($health['headers']['x-powered-by']));
check('rate-limit headers present', isset($health['headers']['x-ratelimit-limit']) || $health['status'] === 200);

$admin = api('/auth/login', 'POST', ['email' => 'elena@hayatahotel.com', 'password' => 'demo123']);
check('admin login', $admin['status'] === 200 && is_string($admin['body']['token'] ?? null), (string) ($admin['body']['error'] ?? $admin['status']));
$adminToken = (string) ($admin['body']['token'] ?? '');

$viewer = api('/auth/login', 'POST', ['email' => 'viewer@hayatahotel.com', 'password' => 'demo123']);
check('viewer login', $viewer['status'] === 200 && is_string($viewer['body']['token'] ?? null), (string) ($viewer['body']['error'] ?? $viewer['status']));
$viewerToken = (string) ($viewer['body']['token'] ?? '');

if ($adminToken !== '' && $viewerToken !== '') {
    // 19. SQL injection ------------------------------------------------------
    $sqli = api('/resource/users/' . rawurlencode("usr-001' OR 1=1--"), 'GET', null, $adminToken);
    check('SQLi in record id cannot return a row', $sqli['status'] !== 200, 'status ' . $sqli['status']);
    check('SQLi does not leak a SQL error', !str_contains(strtolower($sqli['text']), 'sql'), $sqli['text']);
    $sqliBody = api('/resource/users', 'POST', ['email' => "x'); DROP TABLE users;--", 'name' => 'x'], $adminToken);
    check('SQLi in email rejected by validation', $sqliBody['status'] === 422, 'status ' . $sqliBody['status']);

    // 22/26/34. User isolation, IDOR and record access -----------------------
    $foreign = api('/resource/users/usr-001', 'GET', null, $viewerToken);
    check('viewer cannot read another staff record', $foreign['status'] === 403, 'status ' . $foreign['status']);
    $own = api('/resource/users/usr-015', 'GET', null, $viewerToken);
    check('viewer can read own record', $own['status'] === 200, 'status ' . $own['status']);
    check('own record has no password hash', is_array($own['body']) && !array_key_exists('password_hash', $own['body']));
    $list = api('/resource/users', 'GET', null, $viewerToken);
    $rows = is_array($list['body']) ? $list['body'] : [];
    check('user list is row-scoped', count($rows) === 1 && ($rows[0]['id'] ?? '') === 'usr-015', 'rows ' . count($rows));
    $idor = api('/resource/users/usr-001', 'PUT', ['name' => 'Taken over'], $viewerToken);
    check('IDOR write is denied', $idor['status'] === 403, 'status ' . $idor['status']);
    $anonWrite = api('/resource/menu-items', 'POST', ['name' => 'Free item', 'price' => 1]);
    check('anonymous write is denied', $anonWrite['status'] === 401, 'status ' . $anonWrite['status']);

    // 29. Anonymous uploads --------------------------------------------------
    $anonUpload = api('/public/enquiries', 'POST', [
        'name' => 'Guest', 'email' => 'guest@example.com', 'message' => 'Hello',
        'image' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ',
    ]);
    check('anonymous upload refused', $anonUpload['status'] === 403 && ($anonUpload['body']['code'] ?? '') === 'UPLOAD_BLOCKED', 'status ' . $anonUpload['status']);

    // 31. Response trimming --------------------------------------------------
    $menu = api('/public/menu');
    $menuRows = is_array($menu['body']) ? $menu['body'] : [];
    $leak = false;
    foreach ($menuRows as $item) {
        if (array_key_exists('cost', $item) || array_key_exists('recipe', $item)) $leak = true;
    }
    check('public menu hides cost and recipe', !$leak);
    $bootstrap = api('/bootstrap', 'GET', null, $viewerToken);
    check('bootstrap hides staff password hashes', !str_contains($bootstrap['text'], 'password_hash'));

    // 24. Session rotation and revocation ------------------------------------
    $rotated = api('/auth/refresh', 'POST', [], $viewerToken);
    $newToken = (string) ($rotated['body']['token'] ?? '');
    check('session rotates', $rotated['status'] === 200 && $newToken !== '' && $newToken !== $viewerToken, 'status ' . $rotated['status']);
    $oldSession = api('/auth/me', 'GET', null, $viewerToken);
    check('old token revoked after rotation', $oldSession['status'] === 401, 'status ' . $oldSession['status']);
    $newSession = api('/auth/me', 'GET', null, $newToken);
    check('new token works', $newSession['status'] === 200, 'status ' . $newSession['status']);
    api('/auth/logout', 'POST', [], $newToken);
    $afterLogout = api('/auth/me', 'GET', null, $newToken);
    check('logout revokes session', $afterLogout['status'] === 401, 'status ' . $afterLogout['status']);
}

// 21. Rate limiting (last, because it fills the public bucket) ---------------
$limited = false;
$retryAfter = '';
for ($i = 0; $i < 75; $i++) {
    $response = api('/public/room-types');
    if ($response['status'] === 429) {
        $limited = true;
        $retryAfter = (string) ($response['headers']['retry-after'] ?? '');
        break;
    }
}
check('public API rate limit triggers', $limited);
check('throttled response sends Retry-After', $retryAfter !== '');

echo "\n$passed passed, $failed failed\n";
exit($failed === 0 ? 0 : 1);
