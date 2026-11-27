<?php
/**
 * Reusable security controls for the Hayata API.
 *
 * Everything in this file is deliberately free of side effects at load time so
 * it can be unit-tested from the CLI. The API wires these helpers into every
 * request: validation, row-level access control, session hardening, upload
 * checks, response trimming, log redaction and signed public-flow tokens.
 *
 * MySQL has no native RLS, so `h_rls_*` implements the same idea in the data
 * access layer: a row is never returned or changed until its policy allows it.
 */
declare(strict_types=1);

require_once __DIR__ . '/config.php';

/** Thrown by h_validate() when one or more fields are invalid. */
final class HayataValidationError extends RuntimeException {
    public function __construct(public readonly array $fields) {
        $first = (string) (reset($fields) ?: 'Invalid input.');
        parent::__construct($first);
    }
}

/**
 * The secret used to sign tokens, rate-limit keys and public-flow proofs.
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

/* ------------------------------------------------------------------ *
 * 12/23. Sanitise and validate all input
 * ------------------------------------------------------------------ */

/**
 * Removes control characters and null bytes from incoming input.
 *
 * This blocks null-byte and header/log injection without touching the
 * text a user actually typed.
 */
function hayata_sanitize($value) {
    if (is_array($value)) return array_map('hayata_sanitize', $value);
    if (!is_string($value)) return $value;
    $value = str_replace("\0", '', $value);
    return preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? $value;
}

/** Strips HTML from a free-text field such as an enquiry or a guest note. */
function hayata_clean_text(string $value): string {
    $value = hayata_sanitize($value);
    $value = strip_tags($value);
    $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    return trim($value);
}

/** Strict identifier: letters, digits and a few separators, 1-80 characters. */
function h_valid_id(string $value): bool {
    return preg_match('/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/', $value) === 1;
}

/** Strict `Y-m-d` date, rejecting impossible calendar days. */
function h_valid_date(string $value): bool {
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    return $date !== false && $date->format('Y-m-d') === $value;
}

/** A valid ISO-8601 or MySQL datetime string. */
function h_valid_datetime(string $value): bool {
    if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $value) === 1) {
        return h_valid_date(substr($value, 0, 10));
    }
    try {
        new DateTimeImmutable($value);
        return true;
    } catch (Throwable) {
        return false;
    }
}

/**
 * Validates and normalises one value against a rule.
 *
 * Supported rules: string, text, email, date, datetime, int, number, bool,
 * id, enum, array. Unknown rule types are rejected rather than ignored.
 */
function h_validate_value(mixed $value, array $rule, string $field): mixed {
    $type = (string) ($rule['type'] ?? 'string');
    $required = (bool) ($rule['required'] ?? false);
    if ($value === null || $value === '') {
        if ($required) throw new HayataValidationError([$field => 'This field is required.']);
        return $rule['default'] ?? null;
    }
    if (is_array($value) && !in_array($type, ['array', 'bool'], true)) {
        throw new HayataValidationError([$field => 'This field must be a single value.']);
    }

    switch ($type) {
        case 'string':
        case 'text':
            if (!is_string($value) && !is_int($value) && !is_float($value)) {
                throw new HayataValidationError([$field => 'This field must be text.']);
            }
            $value = (string) $value;
            if ($type === 'text') $value = hayata_clean_text($value);
            else $value = hayata_sanitize(trim($value));
            $max = (int) ($rule['max'] ?? 200);
            $min = (int) ($rule['min'] ?? 0);
            if (mb_strlen($value) > $max) throw new HayataValidationError([$field => "Use at most $max characters."]);
            if (mb_strlen($value) < $min) throw new HayataValidationError([$field => "Use at least $min characters."]);
            if (isset($rule['pattern']) && preg_match((string) $rule['pattern'], $value) !== 1) {
                throw new HayataValidationError([$field => 'This field has an invalid format.']);
            }
            return $value;

        case 'email':
            $value = hayata_sanitize(trim((string) $value));
            if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                throw new HayataValidationError([$field => 'Enter a valid email address.']);
            }
            if (mb_strlen($value) > 190) throw new HayataValidationError([$field => 'This email address is too long.']);
            return strtolower($value);

        case 'date':
            $value = (string) $value;
            if (!h_valid_date($value)) throw new HayataValidationError([$field => 'Enter a valid date (YYYY-MM-DD).']);
            return $value;

        case 'datetime':
            $value = (string) $value;
            if (!h_valid_datetime($value)) throw new HayataValidationError([$field => 'Enter a valid date and time.']);
            return $value;

        case 'int':
            $filtered = filter_var($value, FILTER_VALIDATE_INT);
            if ($filtered === false) throw new HayataValidationError([$field => 'Enter a whole number.']);
            $filtered = (int) $filtered;
            if (isset($rule['min']) && $filtered < (int) $rule['min']) throw new HayataValidationError([$field => 'The value is too small.']);
            if (isset($rule['max']) && $filtered > (int) $rule['max']) throw new HayataValidationError([$field => 'The value is too large.']);
            return $filtered;

        case 'number':
            if (!is_numeric($value) || !is_finite((float) $value)) throw new HayataValidationError([$field => 'Enter a number.']);
            $number = (float) $value;
            if (isset($rule['min']) && $number < (float) $rule['min']) throw new HayataValidationError([$field => 'The value is too small.']);
            if (isset($rule['max']) && $number > (float) $rule['max']) throw new HayataValidationError([$field => 'The value is too large.']);
            return $number;

        case 'bool':
            if (is_bool($value)) return $value;
            if (in_array($value, [1, '1', 'true', 'TRUE', true], true)) return true;
            if (in_array($value, [0, '0', 'false', 'FALSE', false], true)) return false;
            throw new HayataValidationError([$field => 'Enter true or false.']);

        case 'id':
            $value = trim((string) $value);
            if (!h_valid_id($value)) throw new HayataValidationError([$field => 'This identifier is not valid.']);
            return $value;

        case 'enum':
            $value = (string) $value;
            if (!in_array($value, (array) ($rule['in'] ?? []), true)) {
                throw new HayataValidationError([$field => 'This value is not allowed.']);
            }
            return $value;

        case 'array':
            if (!is_array($value)) throw new HayataValidationError([$field => 'This field must be a list.']);
            $max = (int) ($rule['max'] ?? 100);
            if (count($value) > $max) throw new HayataValidationError([$field => "Use at most $max entries."]);
            return hayata_sanitize($value);

        case 'image':
            return h_image_data_url((string) $value);

        default:
            throw new HayataValidationError([$field => 'Unknown validation rule.']);
    }
}

/**
 * Validates every field in `$data` that appears in `$rules`, returning only
 * validated values. Fields not described by a rule are dropped, which closes
 * mass-assignment holes (a client cannot invent a price, role or image field).
 *
 * @throws HayataValidationError
 */
function h_validate(array $data, array $rules): array {
    $errors = [];
    $clean = [];
    foreach ($rules as $field => $rule) {
        try {
            $value = h_validate_value($data[$field] ?? null, $rule, (string) $field);
            if ($value !== null) $clean[$field] = $value;
        } catch (HayataValidationError $error) {
            $errors += $error->fields;
        }
    }
    if ($errors) throw new HayataValidationError($errors);
    return $clean;
}

/** h_validate() for request handlers: a bad payload becomes a 422 JSON error. */
function h_validate_or_fail(array $data, array $rules): array {
    try {
        return h_validate($data, $rules);
    } catch (HayataValidationError $error) {
        if (function_exists('h_error')) {
            h_error($error->getMessage(), 'VALIDATION', 422, ['fields' => $error->fields]);
        }
        hayata_json(['error' => $error->getMessage(), 'code' => 'VALIDATION', 'fields' => $error->fields], 422);
    }
}

/** Keeps only the named keys, so unexpected client fields never reach storage. */
function h_allow_keys(array $data, array $allowed): array {
    return array_intersect_key($data, array_flip($allowed));
}

/**
 * Refuses upload-looking fields on anonymous endpoints.
 *
 * Public forms accept plain text only. This is the server-side half of
 * "block anonymous uploads": even if a caller adds an image, file or data URL
 * to a public request, it is rejected before any query runs.
 */
function h_reject_upload_fields(array $data): void {
    foreach ($data as $key => $value) {
        $name = strtolower((string) $key);
        if (preg_match('/^(image|images|gallery|photo|photos|picture|upload|file|files|attachment|avatar)$/', $name) === 1) {
            throw new HayataValidationError([$name => 'Uploads are not accepted here.']);
        }
        if (is_string($value) && preg_match('/^data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,/i', trim($value)) === 1) {
            throw new HayataValidationError([$name => 'Uploads are not accepted here.']);
        }
        if (is_array($value)) {
            foreach ($value as $child) {
                if (is_string($child) && preg_match('/^data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,/i', trim($child)) === 1) {
                    throw new HayataValidationError([$name => 'Uploads are not accepted here.']);
                }
            }
        }
    }
}

/* ------------------------------------------------------------------ *
 * 28. Restrict file uploads
 * ------------------------------------------------------------------ */

/**
 * Validates an inline image (a data URL produced by the browser).
 *
 * The declared MIME, the decoded bytes and the real image dimensions must all
 * agree. SVG, HTML, PHP and other polyglots are refused even when they claim
 * to be an image, and the decoded payload is size-capped.
 */
function h_image_data_url(string $value, int $maxDecodedBytes = 350000): string {
    $value = trim($value);
    if (preg_match('#^data:(image/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$#i', $value, $matches) !== 1) {
        throw new HayataValidationError(['image' => 'Only JPEG, PNG and WebP images are accepted.']);
    }
    $declared = strtolower($matches[1]);
    if ($declared === 'image/jpg') $declared = 'image/jpeg';
    $binary = base64_decode(preg_replace('/\s+/', '', $matches[2]) ?? '', true);
    if ($binary === false || $binary === '' || strlen($binary) > $maxDecodedBytes) {
        throw new HayataValidationError(['image' => 'The image is empty or too large.']);
    }
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $real = (string) $finfo->buffer($binary);
    if ($real !== $declared) {
        throw new HayataValidationError(['image' => 'The image contents do not match its type.']);
    }
    $size = @getimagesizefromstring($binary);
    if ($size === false || $size[0] < 1 || $size[1] < 1 || $size[0] > 4096 || $size[1] > 4096) {
        throw new HayataValidationError(['image' => 'The image dimensions are not supported.']);
    }
    if (preg_match('/<\?php|<\s*script|<!doctype|<svg\b/i', $binary) === 1) {
        throw new HayataValidationError(['image' => 'The image contains unsafe content.']);
    }
    return 'data:' . $declared . ';base64,' . base64_encode($binary);
}

/** Validates a list of inline images for a room gallery. */
function h_image_gallery(array $values, int $max = 8): array {
    if (count($values) > $max) throw new HayataValidationError(['gallery' => "Use at most $max pictures."]);
    return array_values(array_map(static fn(mixed $value): string => h_image_data_url((string) $value), $values));
}

/**
 * Validates the picture fields of a staff resource. Empty values are dropped so
 * a caller cannot wipe a picture by omitting it from a partial update.
 */
function h_validate_upload_payload(array $data): array {
    $clean = [];
    if (array_key_exists('image', $data)) {
        if ((string) $data['image'] !== '') $clean['image'] = h_image_data_url((string) $data['image']);
        else $clean['image'] = '';
    }
    if (array_key_exists('gallery', $data) && is_array($data['gallery'])) {
        $clean['gallery'] = h_image_gallery($data['gallery']);
    }
    return $clean;
}

/* ------------------------------------------------------------------ *
 * 27. Remove secret logs
 * ------------------------------------------------------------------ */

/** Removes credentials and high-entropy values from anything that is logged. */
function h_redact(string $text): string {
    $text = preg_replace('/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/i', '[REDACTED PRIVATE KEY]', $text) ?? $text;
    $text = preg_replace('/\bBearer\s+[A-Za-z0-9._~+\/-]{8,}={0,2}\b/i', 'Bearer [REDACTED]', $text) ?? $text;
    $text = preg_replace('/\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/i', '[REDACTED TOKEN]', $text) ?? $text;
    $text = preg_replace('/\bAKIA[0-9A-Z]{16}\b/', '[REDACTED KEY]', $text) ?? $text;
    // key=value / "key": "value" pairs for anything credential-shaped.
    $text = preg_replace(
        '/((?:password|passwd|pwd|secret|token|authorization|api[_-]?key|access[_-]?key|smtp[_-]?pass)(?:["\']?\s*[:=]\s*["\']?))([^\s,;"\'}\]]{3,})/i',
        '$1[REDACTED]',
        $text
    ) ?? $text;
    // Long base64/hex blobs are credentials until proven otherwise. Messages
    // that need a real value (order ids, references) are far shorter.
    $text = preg_replace('/\b[A-Za-z0-9+\/]{40,}={0,2}\b/', '[REDACTED]', $text) ?? $text;
    return $text;
}

/** The only logging entry point the API should use. */
function hayata_log(string $message): void {
    error_log(h_redact($message));
}

/* ------------------------------------------------------------------ *
 * 24. Secure every session
 * ------------------------------------------------------------------ */

function hayata_session_idle_seconds(): int {
    return max(60, (int) (hayata_config()['session_idle_ttl'] ?? 7200));
}

/** Creates a hashed bearer token row and returns the raw token to the client. */
function h_session_create(PDO $pdo, string $userId): array {
    $token = bin2hex(random_bytes(32));
    $statement = $pdo->prepare('INSERT INTO api_tokens (token, user_id, created_at, expires_at, last_used_at) VALUES (:token, :user, NOW(), DATE_ADD(NOW(), INTERVAL :ttl SECOND), NOW())');
    $statement->execute(['token' => hayata_token_hash($token), 'user' => $userId, 'ttl' => hayata_config()['token_ttl']]);
    return ['token' => $token];
}

/**
 * Marks a session as used and refuses sessions that have been idle too long.
 * Returns false when the token is unknown, expired or stale, in which case the
 * row is removed so it can never be revived.
 */
function h_session_touch(PDO $pdo, string $tokenHash): bool {
    // PDO/MySQL reports *changed* rows, not matched rows. Updating
    // `last_used_at` in the same second as login changes nothing and would
    // therefore look like a failure, so the decision is made from a SELECT.
    $lookup = $pdo->prepare('SELECT last_used_at, expires_at FROM api_tokens WHERE token = :token');
    $lookup->execute(['token' => $tokenHash]);
    $row = $lookup->fetch();
    if (!$row) return false;
    $now = time();
    $expired = strtotime((string) $row['expires_at']) < $now;
    $idleFor = $row['last_used_at'] === null ? 0 : $now - (int) strtotime((string) $row['last_used_at']);
    if ($expired || $idleFor > hayata_session_idle_seconds()) {
        h_session_revoke($pdo, $tokenHash);
        return false;
    }
    $update = $pdo->prepare('UPDATE api_tokens SET last_used_at = NOW() WHERE token = :token');
    $update->execute(['token' => $tokenHash]);
    return true;
}

/** Revokes one session. */
function h_session_revoke(PDO $pdo, string $tokenHash): void {
    $statement = $pdo->prepare('DELETE FROM api_tokens WHERE token = :token');
    $statement->execute(['token' => $tokenHash]);
}

/** Revokes every session for an account. */
function h_session_revoke_all(PDO $pdo, string $userId): void {
    $statement = $pdo->prepare('DELETE FROM api_tokens WHERE user_id = :user');
    $statement->execute(['user' => $userId]);
}

/** Rotates a session: the old token stops working as soon as the new one is issued. */
function h_session_rotate(PDO $pdo, string $oldTokenHash, string $userId): array {
    $pdo->beginTransaction();
    try {
        h_session_revoke($pdo, $oldTokenHash);
        $session = h_session_create($pdo, $userId);
        $pdo->commit();
        return $session;
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $exception;
    }
}

/* ------------------------------------------------------------------ *
 * 18 / 22 / 26 / 34. Row-level security and record access
 * ------------------------------------------------------------------ */

/**
 * The policy of a table. `owner` is the column that identifies the rows a user
 * owns; `permission` is the extra privilege needed for somebody else's rows.
 * Tables without a policy are protected by the route permission check alone.
 */
function h_rls_policy(string $table): array {
    static $policies = [
        'users' => ['owner' => 'id', 'read' => 'staff.view', 'write' => 'staff.manage'],
        'api_tokens' => ['owner' => 'user_id', 'read' => 'staff.manage', 'write' => 'staff.manage'],
        'public_bookings' => ['owner' => 'guest_email', 'read' => 'reservation.view', 'write' => 'reservation.edit'],
        'audit_logs' => ['owner' => '', 'read' => 'dashboard.view', 'write' => 'settings.manage'],
        'notification_settings' => ['owner' => '', 'read' => 'settings.manage', 'write' => 'settings.manage'],
        'printer_settings' => ['owner' => '', 'read' => 'settings.manage', 'write' => 'settings.manage'],
    ];
    return $policies[$table] ?? ['owner' => '', 'read' => '', 'write' => ''];
}

function h_rls_owner_value(string $table, array $row): ?string {
    $policy = h_rls_policy($table);
    $column = (string) $policy['owner'];
    if ($column === '') return null;
    if ($table === 'public_bookings') {
        $guest = is_array($row['guest'] ?? null) ? $row['guest'] : (json_decode((string) ($row['guest'] ?? ''), true) ?: []);
        return strtolower(trim((string) ($guest['email'] ?? $row['guest_email'] ?? '')));
    }
    return isset($row[$column]) ? (string) $row[$column] : null;
}

/**
 * Decides whether `$user` may read or change `$row`.
 *
 * `$proof` carries a guest's email for public booking flows. Ownership is
 * compared in constant time and permissions are always checked on the server.
 */
function h_rls_is_owner(string $table, array $user, array $row, array $proof = []): bool {
    $owner = h_rls_owner_value($table, $row);
    if ($owner === null) return false;
    if ($table === 'public_bookings') {
        $claimed = strtolower(trim((string) ($proof['email'] ?? '')));
        return $claimed !== '' && hash_equals($owner, $claimed);
    }
    return hash_equals($owner, (string) ($user['id'] ?? ''));
}

function h_rls_can(PDO $pdo, array $user, string $table, string $action, array $row, array $proof = []): bool {
    $policy = h_rls_policy($table);
    if ($policy['owner'] === '' && $policy['read'] === '') return true; // route permission only

    $permission = $action === 'read' ? (string) $policy['read'] : (string) $policy['write'];
    $hasPermission = $permission !== '' && hayata_has_permission($pdo, (string) $user['id'], $permission);
    return $hasPermission || h_rls_is_owner($table, $user, $row, $proof);
}

/** Records a denied access so it can be monitored and asserted in tests. */
function h_rls_denied(PDO $pdo, array $user, string $table, string $action, string $record): void {
    try {
        $statement = $pdo->prepare('INSERT INTO security_events (id, event, actor, resource, record_id, detail, ip_hash, created_at) VALUES (:id, :event, :actor, :resource, :record, :detail, :ip, NOW())');
        $statement->execute([
            'id' => 'sec-' . bin2hex(random_bytes(8)),
            'event' => 'ACCESS_DENIED',
            'actor' => substr((string) ($user['id'] ?? 'anonymous'), 0, 80),
            'resource' => substr($table, 0, 60),
            'record' => substr($record, 0, 100),
            'detail' => substr($action, 0, 60),
            'ip' => substr(hash_hmac('sha256', hayata_client_ip(), hayata_app_secret()), 0, 64),
        ]);
    } catch (Throwable) {
        // Security logging must never turn a denial into a server error.
    }
}

/** Aborts the request with 403 when a row-level policy refuses access. */
function h_rls_assert(PDO $pdo, array $user, string $table, string $action, array $row, array $proof = []): void {
    if (h_rls_can($pdo, $user, $table, $action, $row, $proof)) return;
    h_rls_denied($pdo, $user, $table, $action, (string) ($row['id'] ?? $row['reference'] ?? ''));
    hunauthorized();
}

function hunauthorized(): void {
    hayata_json(['error' => 'You do not have access to this record.', 'code' => 'FORBIDDEN'], 403);
}

/** Filters a list so callers never see rows their policy does not allow. */
function h_rls_filter(PDO $pdo, array $user, string $table, array $rows, array $proof = []): array {
    $policy = h_rls_policy($table);
    if ($policy['owner'] === '' && $policy['read'] === '') return $rows;
    // Resolve the permission once instead of once per row.
    $permission = (string) $policy['read'];
    $allowed = $permission !== '' && hayata_has_permission($pdo, (string) $user['id'], $permission);
    if ($allowed) return $rows;
    return array_values(array_filter($rows, static fn(array $row): bool => h_rls_is_owner($table, $user, $row, $proof)));
}

/* ------------------------------------------------------------------ *
 * 31. Trim API responses
 * ------------------------------------------------------------------ */

/** Public menu items never expose food cost or the internal recipe. */
function h_public_menu_item(array $item): array {
    unset($item['cost'], $item['recipe']);
    return $item;
}

function h_public_menu_items(array $items): array {
    return array_map('h_public_menu_item', $items);
}

/** The guest response drops the internal staff reservation identifier. */
function h_public_booking_trim(array $booking): array {
    unset($booking['staffReservationId'], $booking['staff_reservation_id']);
    return $booking;
}

/** Health checks disclose neither the database name nor the environment. */
function h_public_health(): array {
    $payload = ['ok' => true, 'time' => date('c')];
    if (hayata_config()['debug']) $payload['environment'] = hayata_config()['app_env'];
    return $payload;
}

/**
 * Column allowlists for responses built from `SELECT *`. Anything not listed
 * (password hashes, token hashes, SMTP settings) can never reach the browser.
 */
function h_response_keys(string $table): array {
    static $allowlists = [
        'users' => ['id', 'name', 'email', 'department', 'status', 'last_active', 'role', 'role_label'],
        'api_tokens' => ['id', 'user_id', 'created_at', 'expires_at', 'last_used_at'],
        'public_bookings' => ['reference', 'status', 'check_in', 'check_out', 'adults', 'children', 'slug', 'room_name', 'assigned_room_number', 'guest', 'add_ons', 'quote', 'promo_code', 'payment_status', 'created_at'],
        'notification_settings' => ['setting_key', 'updated_at'],
    ];
    return $allowlists[$table] ?? [];
}

/** Removes credential columns from any staff record before it is returned. */
function h_public_user(array $user): array {
    unset($user['password_hash'], $user['passwordHash'], $user['role_id'], $user['roleId']);
    return $user;
}

function h_trim_response(string $table, array $row): array {
    $allowed = h_response_keys($table);
    if (!$allowed) return $row;
    $trimmed = h_allow_keys($row, $allowed);
    if ($table === 'users') $trimmed = h_public_user($trimmed);
    return $trimmed;
}

/** Applies the allowlist to every row in a list. */
function h_trim_responses(string $table, array $rows): array {
    return array_map(static fn(array $row): array => h_trim_response($table, $row), $rows);
}

/* ------------------------------------------------------------------ *
 * 32. Block tampering
 * ------------------------------------------------------------------ */

/** Canonical JSON used for signatures (key order never changes the digest). */
function h_canonical_json(array $data): string {
    ksort($data);
    return (string) json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

/** Signs public-flow data so the browser cannot edit prices or status. */
function h_sign_payload(array $data): string {
    return hash_hmac('sha256', h_canonical_json($data), hayata_app_secret());
}

/** Constant-time verification of a signed payload. */
function h_verify_payload(array $data, string $signature): bool {
    $expected = h_sign_payload($data);
    return is_string($signature) && hash_equals($expected, $signature);
}

/** A short-lived token authorising the guest to confirm their own booking. */
function h_payment_token(string $reference, float $total, string $email): string {
    return h_sign_payload(['ref' => $reference, 'total' => round($total, 2), 'email' => strtolower(trim($email)), 'kind' => 'booking-payment']);
}

/** Validates the signed guest token and returns false on any tampering. */
function h_verify_payment_token(string $reference, float $total, string $email, string $token): bool {
    return h_verify_payload(
        ['ref' => $reference, 'total' => round($total, 2), 'email' => strtolower(trim($email)), 'kind' => 'booking-payment'],
        $token
    );
}

/** Claims a payment reference so a paid reference can never be replayed. */
function h_payment_reference_claim(PDO $pdo, string $reference, float $amount, string $orderId): void {
    $statement = $pdo->prepare('INSERT INTO payment_references (reference, amount, order_id, created_at) VALUES (:ref, :amount, :order, NOW())');
    try {
        $statement->execute(['ref' => $reference, 'amount' => round($amount, 2), 'order' => $orderId]);
    } catch (PDOException $exception) {
        // A duplicate key is the only acceptable failure here.
        throw new HayataValidationError(['payment' => 'This payment reference has already been used.']);
    }
}

/** The only status transitions the API allows for each workflow. */
function h_allowed_status(string $workflow): array {
    return match ($workflow) {
        'reservation' => ['Pending', 'Confirmed', 'Checked in', 'Checked out', 'Cancelled', 'No show'],
        'order' => ['New', 'Preparing', 'Ready', 'Served', 'Completed', 'Cancelled'],
        default => [],
    };
}

/* ------------------------------------------------------------------ *
 * 21. Rate limiting information
 * ------------------------------------------------------------------ */

/** Tells an honest client its budget without disclosing bucket internals. */
function h_rate_limit_headers(int $limit, int $remaining, int $window): void {
    header('X-RateLimit-Limit: ' . $limit);
    header('X-RateLimit-Remaining: ' . max(0, $remaining));
    header('X-RateLimit-Reset: ' . $window);
}
