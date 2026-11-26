<?php
declare(strict_types=1);

require __DIR__ . '/db.php';
require __DIR__ . '/mailer.php';

/**
 * Turns an unexpected failure into a JSON error.
 *
 * Without this a PHP fatal error ends the response halfway through, and the
 * browser reports it as "Failed to fetch" with no clue what went wrong.
 */
set_exception_handler(static function (Throwable $exception): void {
    $config = hayata_config();
    error_log('Hayata API error: ' . $exception->getMessage() . ' @ ' . $exception->getFile() . ':' . $exception->getLine());
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode([
        'error' => $config['debug']
            ? $exception->getMessage()
            : 'The server could not complete the request.',
        'code' => 'SERVER_ERROR',
    ]);
});

register_shutdown_function(static function (): void {
    $error = error_get_last();
    if ($error === null || !in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) return;
    error_log('Hayata API fatal: ' . $error['message'] . ' @ ' . $error['file'] . ':' . $error['line']);
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['error' => 'The server could not complete the request.', 'code' => 'SERVER_ERROR']);
});

// Preflight requests are answered with the CORS policy and nothing else.
if (hayata_method() === 'OPTIONS') {
    hayata_security_headers();
    hayata_apply_cors();
    http_response_code(204);
    exit;
}

$pdo = hayata_pdo();
$route = hayata_route();
$method = hayata_method();
$body = hayata_body();
$query = hayata_query();

// Throttle every caller. Signed-in staff are counted per session, anonymous
// callers per address; the public write endpoints get the tightest budget.
if ($route !== '/health') {
    $config = hayata_config();
    $token = hayata_bearer_token();
    $identity = $token !== null
        ? 'session:' . substr(hash('sha256', $token), 0, 32)
        : 'ip:' . hayata_client_ip();
    if (strpos($route, '/public/') === 0) {
        hayata_rate_limit($pdo, 'public:' . $identity, $method === 'GET' ? 60 : 20, 60);
    } else {
        hayata_rate_limit($pdo, 'api:' . $identity, $config['rate_limit_max'], $config['rate_limit_window']);
    }
}

function h_camel(string $value): string {
    return lcfirst(str_replace(' ', '', ucwords(preg_replace('/[^a-zA-Z0-9]+/', ' ', $value))));
}

function h_camel_keys(array $rows): array {
    $result = [];
    foreach ($rows as $key => $value) {
        $result[h_camel((string) $key)] = $value;
    }
    return $result;
}

function h_decode_row(array $row): array {
    $jsonFields = ['amenities','add_ons','preferences','notes','recipe','modifiers','guest','quote','instructions','setting_value'];
    $boolFields = ['available','acknowledged','age_restricted','resolved'];
    foreach ($row as $key => $value) {
        if (in_array($key, $jsonFields, true) && is_string($value)) {
            $decoded = json_decode($value, true);
            $row[$key] = $decoded === null ? $value : $decoded;
        } elseif (in_array($key, $boolFields, true)) {
            $row[$key] = (bool) $value;
        }
    }
    return h_camel_keys($row);
}

function h_decode_rows(array $rows): array {
    return array_map('h_decode_row', $rows);
}

function h_num($value): float {
    return is_numeric($value) ? (float) $value : 0.0;
}

/** Normalises an order line so the JSON contract matches the TypeScript OrderItem type. */
function h_normalize_order_item(array $item): array {
    $item['quantity'] = (int) h_num($item['quantity'] ?? 0);
    $item['price'] = h_num($item['price'] ?? 0);
    if (!is_array($item['modifiers'] ?? null)) $item['modifiers'] = [];
    return $item;
}

/**
 * Normalises an order so money/quantity fields are numbers and `items` is always an array.
 * MySQL returns DECIMAL columns as strings, which would otherwise break arithmetic on the client.
 */
function h_normalize_order(array $order): array {
    $order['items'] = array_map('h_normalize_order_item', is_array($order['items'] ?? null) ? $order['items'] : []);
    foreach (['subtotal', 'discount', 'tax', 'tip', 'total'] as $field) {
        $order[$field] = h_num($order[$field] ?? 0);
    }
    return $order;
}

/**
 * Attaches line items from the `order_items` table to the given orders.
 * The orders table has no `items` column, so every order needs its lines joined in.
 */
function h_attach_order_items(PDO $pdo, array $orders): array {
    if (!$orders) return [];
    $ids = array_values(array_unique(array_filter(array_column($orders, 'id'))));
    $grouped = [];
    if ($ids) {
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $statement = $pdo->prepare("SELECT * FROM order_items WHERE order_id IN ($placeholders)");
        $statement->execute($ids);
        foreach (h_decode_rows($statement->fetchAll()) as $item) {
            $grouped[(string) ($item['orderId'] ?? '')][] = h_normalize_order_item($item);
        }
    }
    foreach ($orders as &$order) {
        $order['items'] = $grouped[(string) ($order['id'] ?? '')] ?? [];
        $order = h_normalize_order($order);
    }
    unset($order);
    return $orders;
}

/**
 * Normalises a menu item so the JSON contract matches the TypeScript MenuItem type.
 *
 * MySQL returns DECIMAL columns as strings, which would break price arithmetic and
 * make the client show "18.00" instead of 18.
 */
function h_normalize_menu_item(array $item): array {
    foreach (['price', 'cost'] as $field) {
        $item[$field] = h_num($item[$field] ?? 0);
    }
    $item['prepMinutes'] = (int) h_num($item['prepMinutes'] ?? 0);
    if (array_key_exists('available', $item)) $item['available'] = (bool) $item['available'];
    if (array_key_exists('ageRestricted', $item)) $item['ageRestricted'] = (bool) $item['ageRestricted'];
    if (empty($item['image'])) $item['image'] = '';
    if (empty($item['description'])) $item['description'] = '';
    return $item;
}

/** Normalises a list of menu items. */
function h_normalize_menu_items(array $items): array {
    return array_map('h_normalize_menu_item', $items);
}

/**
 * Strips the fields that must never leave the server from a staff record.
 *
 * The password hash and the role id are removed so a client cannot read or
 * replay them.
 */
function h_public_user(array $user): array {
    unset($user['password_hash'], $user['passwordHash'], $user['role_id'], $user['roleId']);
    return $user;
}

/**
 * Lists the fields a write touched, so the activity log says what changed.
 */
function h_changed_fields(array $data): string {
    $fields = [];
    foreach (array_keys($data) as $key) {
        $name = (string) $key;
        // The credential columns are never named in the audit trail.
        if (in_array($name, ['password', 'password_hash', 'passwordHash'], true)) {
            $fields[] = 'password';
            continue;
        }
        $fields[] = h_snake($name);
    }
    return $fields ? implode(', ', $fields) : 'record';
}

/**
 * Writes an entry to the server-side audit trail.
 *
 * Every write through the generic CRUD is recorded, so the activity log in the
 * dashboard is complete even when the browser is offline.
 */
function h_audit(PDO $pdo, array $user, string $action, string $module, string $reference = '', string $detail = ''): void {
    try {
        $statement = $pdo->prepare('INSERT INTO audit_logs (id, timestamp, actor, module, action, detail, ip_address) VALUES (:id, NOW(), :actor, :module, :action, :detail, :ip)');
        $statement->execute([
            'id' => 'aud-' . bin2hex(random_bytes(8)),
            'actor' => (string) ($user['name'] ?? 'System'),
            'module' => substr($module, 0, 60),
            'action' => substr($action . ($reference !== '' ? ' · ' . $reference : ''), 0, 180),
            'detail' => substr($detail, 0, 255),
            'ip' => hayata_client_ip(),
        ]);
    } catch (Throwable $exception) {
        // Auditing must never break the request that triggered it.
    }
}

/**
 * Reads the column names and types of a table.
 *
 * The types are needed because a value that goes into a DATE or DATETIME
 * column has to be in the MySQL format, whatever the client sent.
 */
function h_table_column_types(PDO $pdo, string $table): array {
    $statement = $pdo->prepare('SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table');
    $statement->execute(['table' => $table]);
    $types = [];
    foreach ($statement->fetchAll() as $row) {
        $types[(string) $row['COLUMN_NAME']] = strtolower((string) $row['DATA_TYPE']);
    }
    return $types;
}

function h_table_columns(PDO $pdo, string $table): array {
    return array_keys(h_table_column_types($pdo, $table));
}

function h_snake(string $value): string {
    return strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $value));
}

function h_unsafe_sql_columns(array $columns): array {
    return array_values(array_filter($columns, fn($column) => preg_match('/^[A-Za-z0-9_]+$/', $column) === 1));
}

/**
 * Converts a date or time value into the format the column expects.
 *
 * Browsers send ISO-8601 (`2026-11-26T03:01:26.425Z`), while MySQL only
 * accepts `2026-11-26 03:01:26`. Without this conversion every write that
 * carries a timestamp from the browser fails with an invalid datetime error,
 * which is why the normalisation has to live in the data layer rather than in
 * one caller.
 *
 * The value is moved into the application timezone, so a timestamp written by
 * the browser and one written by `NOW()` describe the same wall-clock time.
 */
function h_datetime_value($value, string $type) {
    if (!is_string($value) || trim($value) === '') return $value;
    $type = strtolower($type);
    $isDate = $type === 'date';
    $isDateTime = in_array($type, ['datetime', 'timestamp'], true);
    if (!$isDate && !$isDateTime) return $value;
    $raw = trim($value);

    // A plain calendar date needs no parsing.
    if ($isDate && preg_match('/^\d{4}-\d{2}-\d{2}$/', $raw)) return $raw;

    // Already in the MySQL format.
    if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $raw)) return $raw;

    try {
        $moment = new DateTimeImmutable($raw);
    } catch (Throwable $exception) {
        // An unparsable value is passed through unchanged so the database
        // reports the problem with a clear error of its own.
        return $value;
    }
    $moment = $moment->setTimezone(new DateTimeZone(hayata_config()['app_timezone']));
    return $isDate ? $moment->format('Y-m-d') : $moment->format('Y-m-d H:i:s');
}

/**
 * Prepares one value for the database.
 *
 * Arrays become JSON, booleans become 0/1 and dates become the format the
 * column expects.
 */
function h_column_value($value, string $type) {
    if (is_array($value)) $value = json_encode($value, JSON_UNESCAPED_UNICODE);
    if (is_bool($value)) $value = $value ? 1 : 0;
    return h_datetime_value($value, $type);
}

function h_insert(PDO $pdo, string $table, array $data): string {
    $types = h_table_column_types($pdo, $table);
    $payload = [];
    foreach ($data as $key => $value) {
        $column = h_snake((string) $key);
        if (!array_key_exists($column, $types)) continue;
        $payload[$column] = h_column_value($value, $types[$column]);
    }
    $names = array_keys($payload);
    $sql = sprintf('INSERT INTO `%s` (%s) VALUES (%s)', $table, implode(',', array_map(fn($c) => "`$c`", h_unsafe_sql_columns($names))), implode(',', array_map(fn($c) => ':' . $c, h_unsafe_sql_columns($names))));
    $statement = $pdo->prepare($sql);
    foreach ($payload as $column => $value) $statement->bindValue(':' . $column, $value);
    $statement->execute();
    return $data['id'] ?? $data['reference'] ?? (string) $pdo->lastInsertId();
}

/**
 * Finds a free identifier for a line item.
 *
 * The identifier of a line is chosen by the client, but it is a primary key
 * for the whole table, so a line that already belongs to another order is
 * given a name of its own instead of failing the whole order.
 */
function h_unique_line_id(PDO $pdo, string $orderId, string $wanted, int $index): string {
    if ($wanted === '') return substr($orderId . '-line-' . ($index + 1), 0, 80);
    $statement = $pdo->prepare('SELECT order_id FROM order_items WHERE id = :id');
    $statement->execute(['id' => $wanted]);
    $owner = $statement->fetchColumn();
    if ($owner === false || (string) $owner === $orderId) return $wanted;
    $candidate = substr($orderId . '-' . $wanted, 0, 80);
    $suffix = 1;
    while (true) {
        $statement->execute(['id' => $candidate]);
        if ($statement->fetchColumn() === false) return $candidate;
        $suffix++;
        $candidate = substr($orderId . '-' . $wanted . '-' . $suffix, 0, 80);
    }
}

/**
 * Writes a row and, for an order, the line items that belong to it.
 *
 * The order and its lines are written in one transaction. `order_items.order_id`
 * is a foreign key to `orders.id`, so a separate request per line could leave
 * a ticket behind without the items the kitchen has to prepare.
 *
 * Sending the same order again replaces its lines instead of failing, so a
 * client that retries after a network error ends up with one ticket that
 * carries the current items.
 */
function h_insert_order_with_lines(PDO $pdo, string $table, array $body): string {
    $lines = $table === 'orders' && is_array($body['items'] ?? null) ? $body['items'] : null;
    if ($lines === null) return h_insert($pdo, $table, $body);

    $pdo->beginTransaction();
    try {
        $orderId = (string) ($body['id'] ?? ('ord-' . time() . '-' . random_int(100, 999)));
        $existing = $pdo->prepare('SELECT id FROM orders WHERE id = :id');
        $existing->execute(['id' => $orderId]);
        if ($existing->fetchColumn()) {
            // A repeat of the same order replaces the ticket and its lines.
            $clear = $pdo->prepare('DELETE FROM order_items WHERE order_id = :id');
            $clear->execute(['id' => $orderId]);
            h_update($pdo, 'orders', $orderId, $body);
        } else {
            $orderId = h_insert($pdo, $table, $body);
        }
        foreach (array_values($lines) as $index => $line) {
            if (!is_array($line)) continue;
            $wanted = (string) ($line['id'] ?? '');
            h_insert($pdo, 'order_items', [
                'id' => h_unique_line_id($pdo, $orderId, $wanted, $index),
                'order_id' => $orderId,
                'menu_item_id' => (string) ($line['menuItemId'] ?? $line['menu_item_id'] ?? ''),
                'name' => (string) ($line['name'] ?? 'Item'),
                'quantity' => max(1, (int) ($line['quantity'] ?? 1)),
                'price' => (float) ($line['price'] ?? 0),
                'modifiers' => $line['modifiers'] ?? [],
                'station' => (string) ($line['station'] ?? 'Kitchen'),
            ]);
        }
        $pdo->commit();
    } catch (Throwable $exception) {
        $pdo->rollBack();
        throw $exception;
    }
    return $orderId;
}

/**
 * The order a list is returned in.
 *
 * A table that records when a row was written is returned newest first, so a
 * limit never hides the entries that were just added. Every other table keeps
 * a stable order by its first column.
 */
function h_list_order(string $table): string {
    $newestFirst = [
        'orders' => 'created_at',
        'payments' => 'created_at',
        'order_items' => 'id',
        'reservations' => 'created_at',
        'public_bookings' => 'created_at',
        'audit_logs' => 'timestamp',
        'stock_movements' => 'timestamp',
        'guests' => 'created_at',
        'users' => 'id',
        'maintenance_tickets' => 'created_at',
        'purchase_orders' => 'created_at',
        'requisitions' => 'created_at',
        'transfers' => 'created_at',
        'stock_alerts' => 'created_at',
        'feedback' => 'created_at',
    ];
    if (isset($newestFirst[$table])) return '`'.$newestFirst[$table].'` DESC, `id` DESC';
    return '`id` ASC';
}

function h_update(PDO $pdo, string $table, string $id, array $data): void {
    $types = h_table_column_types($pdo, $table);
    $payload = [];
    foreach ($data as $key => $value) {
        $column = h_snake((string) $key);
        if (!array_key_exists($column, $types) || in_array($column, ['id', 'reference'], true)) continue;
        $payload[$column] = h_column_value($value, $types[$column]);
    }
    if (!$payload) return;
    $assignments = [];
    foreach (array_keys($payload) as $column) $assignments[] = "`$column` = :$column";
    $keyColumn = $table === 'public_bookings' ? 'reference' : 'id';
    $payload[$keyColumn] = $id;
    $sql = sprintf('UPDATE `%s` SET %s WHERE `%s` = :%s', $table, implode(',', $assignments), $keyColumn, $keyColumn);
    $statement = $pdo->prepare($sql);
    foreach ($payload as $column => $value) $statement->bindValue(':' . $column, $value);
    $statement->execute();
}

function h_slug(string $name): string {
    return strtolower(trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($name)), '-'));
}

function h_public_room_type(array $row): array {
    $slug = h_slug($row['name']);
    $weekend = ['deluxe-king' => 1.18, 'deluxe-twin' => 1.18, 'accessible-king' => 1.15, 'executive-suite' => 1.16, 'hayata-suite' => 1.14][$slug] ?? 1.15;
    $season = in_array($slug, ['executive-suite', 'hayata-suite'], true)
        ? [['from' => '2027-06-01', 'to' => '2027-08-31', 'multiplier' => 1.12, 'label' => 'Summer']]
        : [['from' => '2026-12-15', 'to' => '2027-01-05', 'multiplier' => 1.25, 'label' => 'Festive season']];
    return [
        'slug' => $slug, 'staffType' => $row['name'], 'name' => $row['name'] . (in_array($slug, ['executive-suite', 'hayata-suite'], true) ? ' Apartment' : ''),
        'category' => in_array($slug, ['executive-suite', 'hayata-suite'], true) ? 'Apartment' : 'Room',
        'tagline' => 'A considered ' . ($slug === 'hayata-suite' ? 'residence' : 'space') . ' at Hayata.',
        'description' => 'Comfort, quiet and thoughtful details.',
        'longDescription' => 'Designed around natural light, deep sleep and a calm city stay.',
        'images' => [
            'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=85',
            'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=85',
        ],
        'amenities' => is_array($row['amenities']) ? $row['amenities'] : (json_decode($row['amenities'], true) ?: []),
        'highlights' => ['City view', 'Daily housekeeping'],
        'sleeps' => (int) $row['capacity'],
        'bedrooms' => in_array($slug, ['executive-suite', 'hayata-suite'], true) ? ($slug === 'hayata-suite' ? 2 : 1) : 1,
        'bathrooms' => $slug === 'hayata-suite' ? 2 : 1,
        'sizeSqm' => 28 + (int) (array_search($slug, ['deluxe-king','deluxe-twin','accessible-king','executive-suite','hayata-suite'], true) + 1) * 12,
        'bed' => $slug === 'deluxe-twin' ? '2 single beds' : ($slug === 'hayata-suite' ? '2 king beds' : '1 king bed'),
        'baseRate' => (float) ($row['baseRate'] ?? $row['base_rate'] ?? 0), 'weekendUplift' => $weekend, 'seasonalOverrides' => $season,
        'cancellationHours' => in_array($slug, ['executive-suite', 'hayata-suite'], true) ? 72 : 48,
        'policies' => ['Free cancellation before arrival.', 'Check-in from 15:00, check-out by 11:00.'],
    ];
}

function h_rate_for_date(array $roomType, string $iso): array {
    $date = new DateTime($iso);
    $weekend = in_array((int) $date->format('N'), [5, 6, 7], true);
    $rate = (float) $roomType['baseRate'];
    if ($weekend) $rate *= (float) $roomType['weekendUplift'];
    $label = $weekend ? 'Weekend' : null;
    foreach ($roomType['seasonalOverrides'] as $override) {
        if ($iso >= $override['from'] && $iso <= $override['to']) {
            $rate *= (float) $override['multiplier'];
            $label = $override['label'];
        }
    }
    return ['date' => $iso, 'rate' => round($rate, 2), 'label' => $label];
}

function h_nightly_rates(array $roomType, string $checkIn, string $checkOut): array {
    $start = new DateTime($checkIn);
    $end = new DateTime($checkOut);
    $rates = [];
    while ($start < $end) {
        $rates[] = h_rate_for_date($roomType, $start->format('Y-m-d'));
        $start->modify('+1 day');
    }
    return $rates;
}

function h_quote_from_data(array $roomType, string $checkIn, string $checkOut, array $addOns, ?string $promo, int $guests): array {
    $rates = h_nightly_rates($roomType, $checkIn, $checkOut);
    $nights = count($rates);
    $roomSubtotal = round(array_sum(array_column($rates, 'rate')), 2);
    $lines = [];
    if (!empty($addOns['breakfast'])) $lines[] = ['key' => 'breakfast', 'label' => 'Daily breakfast', 'amount' => 12000 * $guests * $nights];
    if (!empty($addOns['airportPickup'])) $lines[] = ['key' => 'airportPickup', 'label' => 'Airport pickup', 'amount' => 18000];
    if (!empty($addOns['lateCheckout'])) $lines[] = ['key' => 'lateCheckout', 'label' => 'Late checkout', 'amount' => 15000];
    $addOnSubtotal = round(array_sum(array_column($lines, 'amount')), 2);
    $normalized = strtoupper(trim((string) $promo));
    $promoRate = $normalized === 'HAYATA10' ? 0.1 : ($normalized === 'STAY5' ? 0.05 : ($normalized === 'LONGSTAY7' && $nights >= 3 ? 0.07 : 0));
    $discount = round(($roomSubtotal + $addOnSubtotal) * $promoRate, 2);
    $taxable = round($roomSubtotal + $addOnSubtotal - $discount, 2);
    $taxes = round($taxable * 0.08, 2);
    return [
        'nights' => $nights, 'nightlyRates' => $rates, 'roomSubtotal' => $roomSubtotal,
        'addOnLines' => $lines, 'addOnSubtotal' => $addOnSubtotal,
        'promoCode' => $promoRate ? $normalized : null, 'discount' => $discount,
        'taxableAmount' => $taxable, 'taxes' => $taxes, 'total' => round($taxable + $taxes, 2),
    ];
}

function h_available_rooms(PDO $pdo, string $staffType, string $checkIn, string $checkOut): array {
    $statement = $pdo->prepare('SELECT r.number FROM rooms r WHERE r.type = :type AND r.status <> \'Out of Order\'
        AND NOT EXISTS (
          SELECT 1 FROM reservations v WHERE v.room_number = r.number
          AND v.status IN (\'Confirmed\',\'Pending\',\'Checked in\')
          AND v.check_in < :check_out AND v.check_out > :check_in
        ) ORDER BY r.number');
    $statement->execute(['type' => $staffType, 'check_in' => $checkIn, 'check_out' => $checkOut]);
    return $statement->fetchAll(PDO::FETCH_COLUMN);
}

function h_public_booking(PDO $pdo, array $row): array {
    $statement = $pdo->prepare('SELECT status FROM reservations WHERE id = :id');
    $statement->execute(['id' => $row['staff_reservation_id']]);
    $reservationStatus = $statement->fetchColumn();
    $status = match ($reservationStatus) {
        'Checked in' => 'CHECKED_IN', 'Checked out' => 'CHECKED_OUT', 'Cancelled' => 'CANCELLED',
        'Confirmed' => 'CONFIRMED', default => $row['status'],
    };
    return [
        'reference' => $row['reference'], 'status' => $status,
        'checkIn' => $row['check_in'], 'checkOut' => $row['check_out'],
        'adults' => (int) $row['adults'], 'children' => (int) $row['children'],
        'roomTypeId' => $row['slug'], 'slug' => $row['slug'], 'roomName' => $row['room_name'],
        'assignedRoomNumber' => $row['assigned_room_number'],
        'guest' => json_decode($row['guest'], true) ?: [], 'addOns' => json_decode($row['add_ons'], true) ?: [],
        'promoCode' => $row['promo_code'], 'quote' => json_decode($row['quote'], true) ?: [],
        'createdAt' => $row['created_at'], 'staffReservationId' => $row['staff_reservation_id'],
        'paymentStatus' => $row['payment_status'] === 'PAID' ? 'PAID' : 'PENDING',
    ];
}

function h_error(string $message, string $code = 'VALIDATION', int $status = 400, array $extra = []): void {
    hayata_json(array_merge(['error' => $message, 'code' => $code], $extra), $status);
}

// Health and auth
if ($route === '/health' && $method === 'GET') hayata_json(['ok' => true, 'database' => hayata_config()['db_name'], 'time' => date('c'), 'environment' => hayata_config()['app_env']]);

if ($route === '/auth/login' && $method === 'POST') {
    $config = hayata_config();
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    $password = (string) ($body['password'] ?? '');

    // Sign-in attempts are throttled per address and per account.
    hayata_rate_limit($pdo, 'login:ip:' . hayata_client_ip(), $config['login_max_attempts'] * 3, $config['login_lockout']);
    hayata_rate_limit($pdo, 'login:user:' . $email, $config['login_max_attempts'], $config['login_lockout']);

    if ($email === '' || $password === '') h_error('Enter your email address and password.', 'VALIDATION', 422);
    if (strlen($password) > 200) h_error('Invalid email or password.', 'UNAUTHORIZED', 401);

    $statement = $pdo->prepare('SELECT u.*, r.name AS role, r.label AS role_label FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = :email');
    $statement->execute(['email' => $email]);
    $user = $statement->fetch();

    // Always run a hash comparison so a missing account and a wrong password
    // take the same amount of time.
    $hash = $user['password_hash'] ?? '$2y$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin';
    $valid = password_verify($password, $hash) && $user;
    if (!$valid) h_error('Invalid email or password.', 'UNAUTHORIZED', 401);
    if (($user['status'] ?? '') !== 'Active') h_error('This account is not active.', 'ACCOUNT_DISABLED', 403);

    // Transparently upgrade the hash when the algorithm or cost changed.
    if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
        h_update($pdo, 'users', $user['id'], ['password_hash' => password_hash($password, PASSWORD_DEFAULT)]);
    }

    $token = bin2hex(random_bytes(32));
    h_insert($pdo, 'api_tokens', [
        'token' => hayata_token_hash($token),
        'user_id' => $user['id'],
        'created_at' => date('Y-m-d H:i:s'),
        'expires_at' => date('Y-m-d H:i:s', time() + $config['token_ttl']),
    ]);
    h_update($pdo, 'users', $user['id'], ['last_active' => 'Just now']);
    hayata_json(['token' => $token, 'expiresAt' => date('c', time() + $config['token_ttl']), 'user' => [
        'id' => $user['id'], 'name' => $user['name'], 'email' => $user['email'], 'role' => $user['role'],
        'department' => $user['department'], 'status' => $user['status'], 'lastActive' => $user['last_active'],
    ]]);
}

if ($route === '/auth/logout' && $method === 'POST') {
    // The token must be read the same way the session lookup reads it, or the
    // DELETE would match no rows and the session would stay alive.
    $token = hayata_bearer_token();
    if ($token !== null) {
        $statement = $pdo->prepare('DELETE FROM api_tokens WHERE token = :token');
        $statement->execute(['token' => hayata_token_hash($token)]);
    }
    hayata_json(['ok' => true]);
}

if ($route === '/auth/me' && $method === 'GET') {
    $user = hayata_require_user($pdo);
    hayata_json(['user' => h_camel_keys($user)]);
}

if ($route === '/auth/password' && $method === 'POST') {
    $user = hayata_require_user($pdo);
    $current = (string) ($body['currentPassword'] ?? '');
    $next = (string) ($body['newPassword'] ?? '');
    if (strlen($next) < 10) h_error('Use at least 10 characters for the new password.', 'VALIDATION', 422);
    if (!preg_match('/[A-Za-z]/', $next) || !preg_match('/[0-9]/', $next)) h_error('The new password must contain letters and numbers.', 'VALIDATION', 422);
    $statement = $pdo->prepare('SELECT password_hash FROM users WHERE id = :id');
    $statement->execute(['id' => $user['id']]);
    $hash = (string) $statement->fetchColumn();
    if (!password_verify($current, $hash)) h_error('Your current password is not correct.', 'UNAUTHORIZED', 401);
    h_update($pdo, 'users', $user['id'], ['password_hash' => password_hash($next, PASSWORD_DEFAULT)]);
    // Every other session for this account is invalidated.
    $revoke = $pdo->prepare('DELETE FROM api_tokens WHERE user_id = :user_id');
    $revoke->execute(['user_id' => $user['id']]);
    hayata_json(['ok' => true]);
}

// Public room types
if ($route === '/public/room-types' && $method === 'GET') {
    $rows = $pdo->query('SELECT * FROM room_types ORDER BY id')->fetchAll();
    $types = array_map(fn($row) => h_public_room_type(h_decode_row($row)), $rows);
    hayata_json($types);
}

// Public availability
if ($route === '/public/availability' && $method === 'GET') {
    $checkIn = (string) ($query['checkIn'] ?? '');
    $checkOut = (string) ($query['checkOut'] ?? '');
    if (!$checkIn || !$checkOut || $checkOut <= $checkIn) h_error('Choose a valid date range.', 'VALIDATION');
    $category = (string) ($query['category'] ?? 'all');
    $guests = (int) ($query['adults'] ?? 1) + (int) ($query['children'] ?? 0);
    $rows = $pdo->query('SELECT * FROM room_types ORDER BY id')->fetchAll();
    $results = [];
    foreach ($rows as $row) {
        $roomType = h_public_room_type(h_decode_row($row));
        if ($category !== 'all' && $roomType['category'] !== $category) continue;
        if ($roomType['sleeps'] < $guests) continue;
        $rates = h_nightly_rates($roomType, $checkIn, $checkOut);
        $subtotal = round(array_sum(array_column($rates, 'rate')), 2);
        $results[] = [
            'roomTypeId' => $roomType['slug'], 'slug' => $roomType['slug'], 'name' => $roomType['name'],
            'category' => $roomType['category'], 'images' => $roomType['images'], 'amenities' => $roomType['amenities'],
            'highlights' => $roomType['highlights'], 'sleeps' => $roomType['sleeps'], 'sizeSqm' => $roomType['sizeSqm'],
            'bed' => $roomType['bed'], 'checkIn' => $checkIn, 'checkOut' => $checkOut, 'nights' => count($rates),
            'availableCount' => count(h_available_rooms($pdo, $roomType['staffType'], $checkIn, $checkOut)),
            'nightlyRates' => $rates, 'roomSubtotal' => $subtotal, 'taxes' => round($subtotal * 0.08, 2),
            'total' => round($subtotal * 1.08, 2), 'cancellationHours' => $roomType['cancellationHours'], 'policies' => $roomType['policies'],
        ];
    }
    hayata_json($results);
}

// Public quote
if ($route === '/public/quote' && $method === 'POST') {
    $statement = $pdo->prepare('SELECT * FROM room_types WHERE name = :name');
    $statement->execute(['name' => $body['staffType'] ?? $body['roomName'] ?? '']);
    $row = $statement->fetch();
    if (!$row) {
        $rows = $pdo->query('SELECT * FROM room_types')->fetchAll();
        foreach ($rows as $candidate) {
            if (h_slug($candidate['name']) === ($body['slug'] ?? '')) { $row = $candidate; break; }
        }
    }
    if (!$row) h_error('Room type not found.', 'NOT_FOUND', 404);
    $roomType = h_public_room_type(h_decode_row($row));
    hayata_json(h_quote_from_data($roomType, (string) $body['checkIn'], (string) $body['checkOut'], $body['addOns'] ?? [], $body['promoCode'] ?? null, (int) ($body['adults'] ?? 1) + (int) ($body['children'] ?? 0)));
}

// Public booking create
if ($route === '/public/bookings' && $method === 'POST') {
    $rows = $pdo->query('SELECT * FROM room_types')->fetchAll();
    $roomType = null;
    foreach ($rows as $candidate) {
        if (h_slug($candidate['name']) === ($body['slug'] ?? '')) { $roomType = h_public_room_type(h_decode_row($candidate)); break; }
    }
    if (!$roomType) h_error('Room type not found.', 'NOT_FOUND', 404);
    $checkIn = (string) $body['checkIn']; $checkOut = (string) $body['checkOut'];
    $available = h_available_rooms($pdo, $roomType['staffType'], $checkIn, $checkOut);
    if (!$available) {
        $alternatives = [];
        foreach ($rows as $candidate) {
            $other = h_public_room_type(h_decode_row($candidate));
            if ($other['slug'] === $roomType['slug']) continue;
            $rooms = h_available_rooms($pdo, $other['staffType'], $checkIn, $checkOut);
            if (!$rooms) continue;
            $rates = h_nightly_rates($other, $checkIn, $checkOut);
            $subtotal = round(array_sum(array_column($rates, 'rate')), 2);
            $alternatives[] = ['slug' => $other['slug'], 'name' => $other['name'], 'category' => $other['category'], 'images' => $other['images'], 'amenities' => $other['amenities'], 'highlights' => $other['highlights'], 'sleeps' => $other['sleeps'], 'sizeSqm' => $other['sizeSqm'], 'bed' => $other['bed'], 'checkIn' => $checkIn, 'checkOut' => $checkOut, 'nights' => count($rates), 'availableCount' => count($rooms), 'nightlyRates' => $rates, 'roomSubtotal' => $subtotal, 'taxes' => round($subtotal * 0.08, 2), 'total' => round($subtotal * 1.08, 2), 'cancellationHours' => $other['cancellationHours'], 'policies' => $other['policies']];
        }
        h_error('Sorry, that room was just taken. Please choose another room.', 'CONFLICT', 409, ['availableRooms' => $alternatives]);
    }
    $guest = is_array($body['guest'] ?? null) ? $body['guest'] : [];
    // Free-text fields are cleaned before they are stored, so a payload can
    // never carry markup into a staff screen.
    foreach (['firstName', 'lastName', 'email', 'phone', 'country', 'notes', 'requests'] as $field) {
        if (isset($guest[$field]) && is_string($guest[$field])) $guest[$field] = hayata_clean_text($guest[$field]);
    }
    if (!empty($guest['email']) && !filter_var((string) $guest['email'], FILTER_VALIDATE_EMAIL)) {
        h_error('Enter a valid email address.');
    }
    if (empty($guest['acceptTerms'])) h_error('Please accept the booking terms.', 'VALIDATION');
    do { $reference = hayata_reference(); $check = $pdo->prepare('SELECT COUNT(*) FROM public_bookings WHERE reference = :ref'); $check->execute(['ref' => $reference]); } while ($check->fetchColumn() > 0);
    $quote = h_quote_from_data($roomType, $checkIn, $checkOut, $body['addOns'] ?? [], $body['promoCode'] ?? null, (int) ($body['adults'] ?? 1) + (int) ($body['children'] ?? 0));
    $reservationId = 'res-online-' . $reference;
    h_insert($pdo, 'reservations', [
        'id' => $reservationId, 'guest_id' => 'guest-online-' . $reference,
        'guest_name' => ($guest['firstName'] ?? 'Guest') . ' ' . ($guest['lastName'] ?? ''),
        'room_type' => $roomType['staffType'], 'room_number' => $available[0],
        'check_in' => $checkIn, 'check_out' => $checkOut, 'adults' => $body['adults'] ?? 1,
        'children' => $body['children'] ?? 0, 'status' => 'Pending', 'source' => 'ONLINE',
        'channel' => 'WEBSITE', 'rate_plan' => 'Website flexible',
        'rate' => round($quote['roomSubtotal'] / max(1, $quote['nights']), 2), 'deposit' => 0,
        'add_ons' => array_column($quote['addOnLines'], 'label'), 'total' => $quote['total'],
    ]);
    h_insert($pdo, 'public_bookings', [
        'reference' => $reference, 'status' => 'PENDING_PAYMENT', 'check_in' => $checkIn, 'check_out' => $checkOut,
        'adults' => $body['adults'] ?? 1, 'children' => $body['children'] ?? 0, 'slug' => $roomType['slug'],
        'room_name' => $roomType['name'], 'assigned_room_number' => $available[0],
        'guest' => $guest, 'add_ons' => $body['addOns'] ?? [], 'quote' => $quote,
        'promo_code' => $quote['promoCode'], 'payment_status' => 'PENDING', 'staff_reservation_id' => $reservationId,
    ]);
    $statement = $pdo->prepare('SELECT * FROM public_bookings WHERE reference = :ref');
    $statement->execute(['ref' => $reference]);
    hayata_json(h_public_booking($pdo, $statement->fetch()), 201);
}

if (preg_match('#^/public/bookings/([^/]+)/pay$#', $route, $matches) && $method === 'POST') {
    $reference = strtoupper($matches[1]);
    $statement = $pdo->prepare('SELECT * FROM public_bookings WHERE reference = :ref');
    $statement->execute(['ref' => $reference]);
    $booking = $statement->fetch();
    if (!$booking) h_error('Booking not found.', 'NOT_FOUND', 404);
    h_update($pdo, 'public_bookings', $reference, ['status' => 'CONFIRMED', 'payment_status' => 'PAID']);
    h_update($pdo, 'reservations', $booking['staff_reservation_id'], ['status' => 'Confirmed']);
    // The guest receives the booking confirmation by email.
    hayata_notify_reservation_event($pdo, 'booking_confirmed', (string) $booking['staff_reservation_id']);
    $statement->execute(['ref' => $reference]);
    hayata_json(h_public_booking($pdo, $statement->fetch()));
}

if (preg_match('#^/public/bookings/([^/]+)$#', $route, $matches) && $method === 'GET') {
    $reference = strtoupper($matches[1]);
    $statement = $pdo->prepare('SELECT * FROM public_bookings WHERE reference = :ref');
    $statement->execute(['ref' => $reference]);
    $booking = $statement->fetch();
    if (!$booking) h_error('Booking not found.', 'NOT_FOUND', 404);
    $email = strtolower(trim((string) ($query['email'] ?? '')));
    if ($email && strtolower($booking['guest_email'] ?? '') !== $email) {
        $guest = json_decode($booking['guest'], true) ?: [];
        if (strtolower($guest['email'] ?? '') !== $email) h_error('The email does not match this booking.', 'EMAIL_MISMATCH', 403);
    }
    hayata_json(h_public_booking($pdo, $booking));
}

if (preg_match('#^/public/bookings/([^/]+)/cancel$#', $route, $matches) && $method === 'POST') {
    $reference = strtoupper($matches[1]);
    $statement = $pdo->prepare('SELECT * FROM public_bookings WHERE reference = :ref');
    $statement->execute(['ref' => $reference]);
    $booking = $statement->fetch();
    if (!$booking) h_error('Booking not found.', 'NOT_FOUND', 404);
    $guest = json_decode($booking['guest'], true) ?: [];
    if (strtolower($guest['email'] ?? '') !== strtolower(trim((string) ($body['email'] ?? '')))) h_error('The email does not match this booking.', 'EMAIL_MISMATCH', 403);
    $hours = (strtotime($booking['check_in']) - time()) / 3600;
    $cancellationHours = (int) ($query['cancellationHours'] ?? 48);
    if ($booking['status'] === 'CONFIRMED' && $hours < $cancellationHours) h_error("This booking can only be cancelled more than {$cancellationHours} hours before arrival.", 'POLICY');
    h_update($pdo, 'public_bookings', $reference, ['status' => 'CANCELLED']);
    h_update($pdo, 'reservations', $booking['staff_reservation_id'], ['status' => 'Cancelled']);
    $statement->execute(['ref' => $reference]);
    hayata_json(h_public_booking($pdo, $statement->fetch()));
}

/**
 * Finds the stay behind a room's permanent in-room dining code.
 *
 * The code identifies the room, never the guest or reservation, so it keeps
 * working after a checkout: the guest who is checked in is used when there is
 * one, otherwise the last guest who stayed in that room. A room that has no
 * reservation yet still has a permanent code, so the menu opens for the room
 * itself and the order is delivered to that room.
 */
function h_room_stay(PDO $pdo, string $roomNumber): array {
    $statement = $pdo->prepare(
        "SELECT r.id, r.guest_name, r.room_number, r.check_in, r.check_out, r.status, g.email
         FROM reservations r
         LEFT JOIN guests g ON g.id = r.guest_id
         WHERE r.room_number = :room AND r.status IN ('Checked in', 'Checked out')
         ORDER BY (r.status = 'Checked in') DESC, r.check_in DESC LIMIT 1"
    );
    $statement->execute(['room' => $roomNumber]);
    $stay = $statement->fetch();

    $roomStatement = $pdo->prepare('SELECT number, guest_name FROM rooms WHERE number = :room LIMIT 1');
    $roomStatement->execute(['room' => $roomNumber]);
    $room = $roomStatement->fetch();

    if (!$stay && !$room) h_error('This in-room dining code does not match a room at Hayata Hotel.', 'ROOM_UNAVAILABLE', 403);
    if ($stay) return $stay;

    return [
        'id' => '',
        'guest_name' => (string) ($room['guest_name'] ?? ''),
        'room_number' => (string) ($room['number'] ?? $roomNumber),
        'check_in' => null,
        'check_out' => null,
        'status' => null,
        'email' => '',
    ];
}

/**
 * The stay behind a room's permanent in-room QR code.
 *
 * The code identifies the room only, so the guest sees the stay that is checked
 * in to that room right now, or the last guest who stayed in it.
 */
function h_public_room_stay(PDO $pdo, string $roomNumber): array {
    $stay = h_room_stay($pdo, $roomNumber);
    return [
        'roomNumber' => (string) $stay['room_number'],
        'guestName' => (string) ($stay['guest_name'] ?: 'Guest'),
        'email' => (string) ($stay['email'] ?? ''),
        'checkIn' => (string) ($stay['check_in'] ?? ''),
        'checkOut' => (string) ($stay['check_out'] ?? ''),
        'status' => (string) ($stay['status'] ?? ''),
    ];
}

/**
 * Re-prices a guest basket from the `menu_items` table.
 *
 * The browser never dictates prices: every line is priced again on the server so a
 * tampered basket cannot change what the guest is charged.
 */
function h_room_order_lines(PDO $pdo, array $requested): array {
    $lines = [];
    foreach ($requested as $line) {
        if (!is_array($line)) continue;
        $menuItemId = trim((string) ($line['menuItemId'] ?? ''));
        if ($menuItemId === '') continue;
        $quantity = (int) ($line['quantity'] ?? 0);
        if ($quantity < 1 || $quantity > 20) h_error('That quantity is not valid.', 'VALIDATION');
        $statement = $pdo->prepare('SELECT id, name, price, station, available FROM menu_items WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $menuItemId]);
        $menu = $statement->fetch();
        if (!$menu) h_error('One of the selected dishes is no longer on the menu.', 'ITEM_UNAVAILABLE', 409);
        if (!$menu['available']) h_error(sprintf('%s is currently unavailable.', $menu['name']), 'ITEM_UNAVAILABLE', 409);
        $modifiers = [];
        foreach ((array) ($line['modifiers'] ?? []) as $modifier) {
            $modifier = trim((string) $modifier);
            if ($modifier !== '') $modifiers[] = $modifier;
        }
        $lines[] = [
            'menuItemId' => $menu['id'],
            'name' => $menu['name'],
            'quantity' => $quantity,
            'price' => round((float) $menu['price'], 2),
            'modifiers' => $modifiers,
            'station' => $menu['station'],
        ];
    }
    if (!$lines) h_error('Your basket is empty.', 'VALIDATION');
    return $lines;
}

/** Builds the authoritative quote for an in-room dining order. */
function h_room_order_quote(PDO $pdo, string $roomNumber, array $requested): array {
    $stay = h_room_stay($pdo, $roomNumber);
    $lines = h_room_order_lines($pdo, $requested);
    $subtotal = 0.0;
    foreach ($lines as $line) $subtotal += $line['price'] * $line['quantity'];
    $subtotal = round($subtotal, 2);
    $tax = round($subtotal * 0.08, 2);
    return [
        'roomNumber' => (string) $stay['room_number'],
        'guestName' => (string) $stay['guest_name'],
        'email' => (string) ($stay['email'] ?? ''),
        'items' => $lines,
        'subtotal' => $subtotal,
        'tax' => $tax,
        'total' => round($subtotal + $tax, 2),
    ];
}

/** Generates a unique order number for a room-service order. */
function h_room_order_number(PDO $pdo): string {
    do {
        $candidate = 'RS-' . random_int(2000, 9999);
        $statement = $pdo->prepare('SELECT COUNT(*) FROM orders WHERE order_number = :number');
        $statement->execute(['number' => $candidate]);
    } while ((int) $statement->fetchColumn() > 0);
    return $candidate;
}

// Public menu for the in-room QR dining page. Only available items are exposed.
if ($route === '/public/menu' && $method === 'GET') {
    $statement = $pdo->query(
        'SELECT id, name, category, outlet, price, cost, available, image, description, station, age_restricted, prep_minutes
         FROM menu_items WHERE available = 1 ORDER BY category, name'
    );
    hayata_json(h_normalize_menu_items(h_decode_rows($statement->fetchAll())));
}

// The stay behind a room's permanent in-room QR code.
if ($route === '/public/room-orders/stay' && $method === 'GET') {
    $roomNumber = strtoupper(trim((string) ($query['room'] ?? '')));
    if ($roomNumber === '') h_error('Room number is required.', 'VALIDATION');
    hayata_json(h_public_room_stay($pdo, $roomNumber));
}

// Guest in-room dining: quote the basket before the guest pays.
if ($route === '/public/room-orders/quote' && $method === 'POST') {
    $roomNumber = strtoupper(trim((string) ($body['roomNumber'] ?? '')));
    if ($roomNumber === '') h_error('Room number is required.', 'VALIDATION');
    hayata_json(h_room_order_quote($pdo, $roomNumber, (array) ($body['items'] ?? [])));
}

// Guest in-room dining: a paid order is the only way a ticket reaches the kitchen.
if ($route === '/public/room-orders' && $method === 'POST') {
    $roomNumber = strtoupper(trim((string) ($body['roomNumber'] ?? '')));
    if ($roomNumber === '') h_error('Room number is required.', 'VALIDATION');
    $quote = h_room_order_quote($pdo, $roomNumber, (array) ($body['items'] ?? []));

    $payment = (array) ($body['payment'] ?? []);
    $reference = trim((string) ($payment['reference'] ?? ''));
    if ($reference === '') h_error('Payment is required before the order reaches the kitchen.', 'PAYMENT_REQUIRED', 402);
    $paidAmount = round((float) ($payment['amount'] ?? 0), 2);
    if ($paidAmount + 0.01 < $quote['total']) h_error('The payment does not cover the order total.', 'PAYMENT_INCOMPLETE', 402);

    $orderId = 'room-' . strtolower(bin2hex(random_bytes(8)));
    $paymentId = 'pay-' . strtolower(bin2hex(random_bytes(8)));
    $email = trim((string) ($body['email'] ?? ''));
    $instructions = trim((string) ($body['instructions'] ?? ''));

    try {
        $pdo->beginTransaction();
        h_insert($pdo, 'orders', [
            'id' => $orderId,
            'order_number' => h_room_order_number($pdo),
            'outlet' => 'RESTAURANT',
            'type' => 'Room service',
            'status' => 'New',
            'guest_name' => $quote['guestName'],
            'room_number' => $quote['roomNumber'],
            'server' => 'In-room dining',
            'created_at' => date('Y-m-d H:i:s'),
            'subtotal' => $quote['subtotal'],
            'discount' => 0,
            'tax' => $quote['tax'],
            'tip' => 0,
            'total' => $quote['total'],
            'payment_status' => 'Paid',
            'source' => 'ROOM_SERVICE',
            'instructions' => $instructions !== '' ? $instructions : null,
            'payment_reference' => $reference,
        ]);
        foreach ($quote['items'] as $index => $line) {
            h_insert($pdo, 'order_items', [
                'id' => $orderId . '-i' . ($index + 1),
                'order_id' => $orderId,
                'menu_item_id' => $line['menuItemId'],
                'name' => $line['name'],
                'quantity' => $line['quantity'],
                'price' => $line['price'],
                'modifiers' => $line['modifiers'],
                'station' => $line['station'],
            ]);
        }
        h_insert($pdo, 'payments', [
            'id' => $paymentId,
            'payment_number' => 'PAY-' . strtoupper(bin2hex(random_bytes(4))),
            'guest_name' => $quote['guestName'],
            'amount' => $paidAmount,
            'method' => (string) ($payment['method'] ?? 'Card'),
            'status' => 'Paid',
            'reference' => $reference,
            'created_at' => date('Y-m-d H:i:s'),
            'order_id' => $orderId,
            'room_number' => $quote['roomNumber'],
            'email' => $email !== '' ? $email : null,
        ]);
        $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        h_error('We could not complete your order. Please try again.', 'ORDER_FAILED', 500);
    }

    $statement = $pdo->prepare('SELECT * FROM orders WHERE id = :id');
    $statement->execute(['id' => $orderId]);
    $order = h_attach_order_items($pdo, [h_decode_row($statement->fetch())])[0];

    // The guest receives their confirmation by email. A mail failure never
    // invalidates the order that was already paid for and sent to the kitchen.
    $notification = ['sent' => false, 'skipped' => true];
    try {
        $settings = hayata_notification_settings($pdo);
        if ($settings['enabled'] && ($settings['events']['order_placed'] ?? false) && $email !== '') {
            $message = hayata_email_body('order_placed', [
                'guestName' => $quote['guestName'],
                'email' => $email,
                'orderNumber' => $order['orderNumber'] ?? $order['order_number'] ?? '',
                'roomNumber' => $quote['roomNumber'],
                'total' => '₦' . number_format((float) $quote['total'], 2),
                'eta' => '25',
            ]);
            $result = hayata_send_email($pdo, $settings, $email, $message['subject'], $message['text'], $message['html']);
            $notification = ['sent' => (bool) $result['ok'], 'error' => $result['error'] ?? null];
        }
    } catch (Throwable $exception) {
        $notification = ['sent' => false, 'error' => 'The confirmation email could not be sent.'];
    }

    hayata_json(['order' => $order, 'paymentReference' => $reference, 'notification' => $notification], 201);
}

if ($route === '/public/enquiries' && $method === 'POST') {
    if (empty($body['name']) || empty($body['email']) || empty($body['message'])) h_error('Please complete all required fields.');
    if (!filter_var((string) $body['email'], FILTER_VALIDATE_EMAIL)) h_error('Enter a valid email address.');
    if (mb_strlen((string) $body['message']) > 5000) h_error('Your message is too long.');
    h_insert($pdo, 'public_enquiries', [
        'name' => hayata_clean_text((string) $body['name']),
        'email' => hayata_clean_text((string) $body['email']),
        'subject' => hayata_clean_text((string) ($body['subject'] ?? 'General enquiry')),
        'message' => hayata_clean_text((string) $body['message']),
    ]);
    hayata_json(['ok' => true], 201);
}

if ($route === '/public/newsletter' && $method === 'POST') {
    $email = trim((string) ($body['email'] ?? ''));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) h_error('Enter a valid email address.');
    $statement = $pdo->prepare('INSERT IGNORE INTO newsletter_subscribers (email) VALUES (:email)');
    $statement->execute(['email' => $email]);
    hayata_json(['ok' => true], 201);
}

// Status transitions
if (preg_match('#^/reservations/([^/]+)/status$#', $route, $matches) && $method === 'POST') {
    hayata_require_permission($pdo, 'reservation.edit');
    $id = $matches[1];
    $status = (string) ($body['status'] ?? 'Confirmed');

    // The room is only replaced when one is sent. A check-out that carried no
    // room number used to erase the room from the reservation, which lost the
    // link between the stay and the folio.
    $updates = ['status' => $status];
    if (!empty($body['roomNumber'])) $updates['room_number'] = $body['roomNumber'];
    h_update($pdo, 'reservations', $id, $updates);

    if ($status === 'Checked in' && !empty($body['roomNumber'])) {
        $statement = $pdo->prepare('SELECT guest_name FROM reservations WHERE id = :id');
        $statement->execute(['id' => $id]);
        $guestName = $statement->fetchColumn();
        $roomStatement = $pdo->prepare('UPDATE rooms SET status = \'Occupied\', guest_name = :guest WHERE number = :number');
        $roomStatement->execute(['guest' => $guestName, 'number' => $body['roomNumber']]);
    }

    // A checked-out guest frees the room again, so the permanent QR code of
    // that room goes inactive until the next guest checks in.
    if ($status === 'Checked out' || $status === 'Cancelled') {
        $statement = $pdo->prepare('SELECT room_number FROM reservations WHERE id = :id');
        $statement->execute(['id' => $id]);
        $roomNumber = (string) $statement->fetchColumn();
        if ($roomNumber !== '') {
            $others = $pdo->prepare("SELECT COUNT(*) FROM reservations WHERE room_number = :room AND status = 'Checked in' AND id <> :id");
            $others->execute(['room' => $roomNumber, 'id' => $id]);
            if ((int) $others->fetchColumn() === 0) {
                $roomStatement = $pdo->prepare('UPDATE rooms SET status = \'Clean\', guest_name = NULL WHERE number = :number');
                $roomStatement->execute(['number' => $roomNumber]);
            }
        }
    }

    // The guest is notified about the stay, never about internal changes.
    $notification = ['sent' => false, 'skipped' => true];
    if ($status === 'Checked in') $notification = hayata_notify_reservation_event($pdo, 'checked_in', $id);
    if ($status === 'Checked out') $notification = hayata_notify_reservation_event($pdo, 'checked_out', $id);
    $statement = $pdo->prepare('SELECT * FROM reservations WHERE id = :id');
    $statement->execute(['id' => $id]);
    hayata_json(array_merge(h_decode_row($statement->fetch()), ['notification' => $notification]));
}

if (preg_match('#^/orders/([^/]+)/status$#', $route, $matches) && $method === 'POST') {
    hayata_require_permission($pdo, 'restaurant.orders');
    h_update($pdo, 'orders', $matches[1], ['status' => $body['status'] ?? 'New']);
    $statement = $pdo->prepare('SELECT * FROM orders WHERE id = :id');
    $statement->execute(['id' => $matches[1]]);
    hayata_json(h_decode_row($statement->fetch()));
}

if (preg_match('#^/inventory/([^/]+)/adjust$#', $route, $matches) && $method === 'POST') {
    hayata_require_permission($pdo, 'inventory.manage');
    $statement = $pdo->prepare('SELECT stock FROM inventory_items WHERE id = :id');
    $statement->execute(['id' => $matches[1]]);
    $current = (int) $statement->fetchColumn();
    $next = max(0, $current + (int) ($body['delta'] ?? 0));
    h_update($pdo, 'inventory_items', $matches[1], ['stock' => $next, 'last_updated' => date('Y-m-d H:i:s')]);
    $statement->execute(['id' => $matches[1]]);
    hayata_json(h_decode_row($statement->fetch()));
}

// Printer settings
if ($route === '/printer-settings' && $method === 'GET') {
    hayata_require_user($pdo);
    $value = $pdo->query("SELECT setting_value FROM printer_settings WHERE setting_key = 'default'")->fetchColumn();
    hayata_json(json_decode($value ?: '{}', true) ?: []);
}
if ($route === '/printer-settings' && $method === 'PUT') {
    hayata_require_permission($pdo, 'settings.manage');
    $statement = $pdo->prepare("UPDATE printer_settings SET setting_value = :value WHERE setting_key = 'default'");
    $statement->execute(['value' => json_encode($body, JSON_UNESCAPED_UNICODE)]);
    hayata_json($body);
}

// Guest notifications (SMTP)
if ($route === '/notifications/settings' && $method === 'GET') {
    hayata_require_permission($pdo, 'settings.manage');
    hayata_json(hayata_notification_settings_public(hayata_notification_settings($pdo)));
}
if ($route === '/notifications/settings' && $method === 'PUT') {
    hayata_require_permission($pdo, 'settings.manage');
    $current = hayata_notification_settings($pdo);
    $events = hayata_notification_events();
    $requested = (array) ($body['events'] ?? []);
    $cleanEvents = [];
    foreach ($events as $key => $label) {
        $cleanEvents[$key] = array_key_exists($key, $requested) ? (bool) $requested[$key] : (bool) ($current['events'][$key] ?? true);
    }
    $password = trim((string) ($body['password'] ?? ''));
    $settings = [
        'enabled' => (bool) ($body['enabled'] ?? $current['enabled']),
        'transport' => in_array(strtolower((string) ($body['transport'] ?? $current['transport'])), ['mail', 'smtp'], true)
            ? strtolower((string) ($body['transport'] ?? $current['transport'])) : 'mail',
        'host' => hayata_clean_text((string) ($body['host'] ?? $current['host'])),
        'port' => max(1, min(65535, (int) ($body['port'] ?? $current['port']))),
        'username' => hayata_clean_text((string) ($body['username'] ?? $current['username'])),
        // An empty password means "keep the stored one"; a value is never returned.
        'password' => $password !== '' ? $password : (string) $current['password'],
        'secure' => in_array(strtolower((string) ($body['secure'] ?? $current['secure'])), ['tls', 'ssl', 'none'], true)
            ? strtolower((string) ($body['secure'] ?? $current['secure'])) : 'tls',
        'fromEmail' => hayata_clean_text((string) ($body['fromEmail'] ?? $current['fromEmail'])),
        'fromName' => hayata_clean_text((string) ($body['fromName'] ?? $current['fromName'])),
        'events' => $cleanEvents,
    ];
    if ($settings['transport'] === 'smtp' && $settings['host'] === '') h_error('Enter the SMTP server address.', 'VALIDATION', 422);
    if ($settings['fromEmail'] !== '' && !filter_var($settings['fromEmail'], FILTER_VALIDATE_EMAIL)) {
        h_error('Enter a valid sender email address.', 'VALIDATION', 422);
    }
    hayata_save_notification_settings($pdo, $settings);
    hayata_json(hayata_notification_settings_public($settings));
}
if ($route === '/notifications/test' && $method === 'POST') {
    hayata_require_permission($pdo, 'settings.manage');
    $settings = hayata_notification_settings($pdo);
    $recipient = trim((string) ($body['email'] ?? ''));
    if ($recipient === '') $recipient = trim((string) ($body['fromEmail'] ?? ''));
    if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) h_error('Enter a valid test email address.', 'VALIDATION', 422);
    $message = hayata_email_body('order_placed', [
        'guestName' => 'Hayata',
        'message' => 'This is a test message from your Hayata HMS notification settings.',
        'total' => '₦0.00',
    ]);
    $result = hayata_send_email($pdo, $settings, $recipient, '[Test] ' . $message['subject'], $message['text'], $message['html']);
    hayata_json($result, $result['ok'] ? 200 : 502);
}
if ($route === '/notifications/send' && $method === 'POST') {
    $user = hayata_require_user($pdo);
    $event = (string) ($body['event'] ?? '');
    if (!array_key_exists($event, hayata_notification_events())) h_error('Unknown notification event.', 'VALIDATION', 422);
    $settings = hayata_notification_settings($pdo);
    if (!$settings['enabled'] || !($settings['events'][$event] ?? false)) {
        hayata_json(['sent' => false, 'skipped' => true, 'reason' => 'This notification is switched off.']);
    }
    $recipient = trim((string) ($body['email'] ?? ''));
    if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) h_error('Enter a valid recipient email address.', 'VALIDATION', 422);
    $data = is_array($body['data'] ?? null) ? $body['data'] : [];
    $message = hayata_email_body($event, $data);
    $result = hayata_send_email($pdo, $settings, $recipient, $message['subject'], $message['text'], $message['html']);
    if (!$result['ok']) hayata_json(['sent' => false, 'error' => $result['error']], 502);
    hayata_json(['sent' => true, 'recipient' => $recipient, 'sentBy' => $user['id']]);
}
if ($route === '/notifications/log' && $method === 'GET') {
    hayata_require_permission($pdo, 'settings.manage');
    $limit = min(200, max(1, (int) ($query['limit'] ?? 50)));
    $rows = $pdo->query("SELECT id, recipient, subject, event, status, error, created_at FROM email_log ORDER BY created_at DESC LIMIT $limit")->fetchAll();
    hayata_json(h_decode_rows($rows));
}

// Full activity log for the dashboard.
//
// The list is filtered and counted on the server so the dashboard can show
// every recorded action, not only the first page of rows.
if ($route === '/audit-logs' && $method === 'GET') {
    hayata_require_user($pdo);
    $limit = min(1000, max(1, (int) ($query['limit'] ?? 300)));
    $conditions = [];
    $params = [];

    $module = trim((string) ($query['module'] ?? ''));
    if ($module !== '') { $conditions[] = 'module = :module'; $params['module'] = $module; }
    $actor = trim((string) ($query['actor'] ?? ''));
    if ($actor !== '') { $conditions[] = 'actor = :actor'; $params['actor'] = $actor; }
    $action = trim((string) ($query['action'] ?? ''));
    if ($action !== '') { $conditions[] = 'action = :action'; $params['action'] = $action; }
    $from = trim((string) ($query['from'] ?? ''));
    if ($from !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $from)) { $conditions[] = 'timestamp >= :from'; $params['from'] = $from . ' 00:00:00'; }
    $to = trim((string) ($query['to'] ?? ''));
    if ($to !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) { $conditions[] = 'timestamp <= :to'; $params['to'] = $to . ' 23:59:59'; }
    $search = trim((string) ($query['q'] ?? ''));
    if ($search !== '') {
        // MySQL native prepared statements cannot reuse a named placeholder,
        // so every column gets its own parameter.
        $conditions[] = '(actor LIKE :search_actor OR action LIKE :search_action OR module LIKE :search_module OR detail LIKE :search_detail OR ip_address LIKE :search_ip)';
        $params['search_actor'] = '%' . $search . '%';
        $params['search_action'] = '%' . $search . '%';
        $params['search_module'] = '%' . $search . '%';
        $params['search_detail'] = '%' . $search . '%';
        $params['search_ip'] = '%' . $search . '%';
    }

    $where = $conditions ? ' WHERE ' . implode(' AND ', $conditions) : '';
    $statement = $pdo->prepare("SELECT id, timestamp, actor, module, action, detail, ip_address FROM audit_logs$where ORDER BY timestamp DESC, id DESC LIMIT $limit");
    $statement->execute($params);
    $entries = h_decode_rows($statement->fetchAll());

    // The counters describe the whole filtered set, not just the returned page.
    $countStatement = $pdo->prepare("SELECT COUNT(*) FROM audit_logs$where");
    $countStatement->execute($params);
    $total = (int) $countStatement->fetchColumn();

    $groupStatement = $pdo->prepare("SELECT module, COUNT(*) AS hits FROM audit_logs$where GROUP BY module ORDER BY hits DESC");
    $groupStatement->execute($params);
    $byModule = array_map(
        fn(array $row): array => ['name' => (string) $row['module'], 'count' => (int) $row['hits']],
        $groupStatement->fetchAll()
    );
    $actorStatement = $pdo->prepare("SELECT actor, COUNT(*) AS hits FROM audit_logs$where GROUP BY actor ORDER BY hits DESC LIMIT 12");
    $actorStatement->execute($params);
    $byActor = array_map(
        fn(array $row): array => ['name' => (string) $row['actor'], 'count' => (int) $row['hits']],
        $actorStatement->fetchAll()
    );
    $actionStatement = $pdo->prepare("SELECT action, COUNT(*) AS hits FROM audit_logs$where GROUP BY action ORDER BY hits DESC LIMIT 12");
    $actionStatement->execute($params);
    $byAction = array_map(
        fn(array $row): array => ['name' => (string) $row['action'], 'count' => (int) $row['hits']],
        $actionStatement->fetchAll()
    );

    $dayStatement = $pdo->prepare("SELECT DATE(timestamp) AS day, COUNT(*) AS hits FROM audit_logs$where GROUP BY DATE(timestamp) ORDER BY day DESC LIMIT 14");
    $dayStatement->execute($params);
    $byDay = array_map(
        fn(array $row): array => ['day' => (string) $row['day'], 'count' => (int) $row['hits']],
        $dayStatement->fetchAll()
    );

    // The "today" counter adds its own condition, so it needs a WHERE clause
    // of its own when no other filter is active.
    $todayConditions = $conditions;
    $todayConditions[] = 'DATE(timestamp) = CURDATE()';
    $todayStatement = $pdo->prepare('SELECT COUNT(*) FROM audit_logs WHERE ' . implode(' AND ', $todayConditions));
    $todayStatement->execute($params);
    $today = (int) $todayStatement->fetchColumn();

    hayata_json([
        'entries' => $entries,
        'stats' => [
            'total' => $total,
            'today' => $today,
            'returned' => count($entries),
            'actors' => count($byActor),
            'modules' => count($byModule),
            'topModule' => $byModule[0]['name'] ?? '',
            'topActor' => $byActor[0]['name'] ?? '',
            'byModule' => $byModule,
            'byActor' => $byActor,
            'byAction' => $byAction,
            'byDay' => $byDay,
        ],
    ]);
}

// Bootstrap bundle for staff hydration
if ($route === '/bootstrap' && $method === 'GET') {
    hayata_require_user($pdo);
    $tables = [
        'roles' => 'roles', 'permissions' => 'permissions', 'users' => 'users', 'roomTypes' => 'room_types',
        'rooms' => 'rooms', 'guests' => 'guests', 'reservations' => 'reservations', 'orders' => 'orders',
        'menuItems' => 'menu_items', 'inventory' => 'inventory_items', 'suppliers' => 'suppliers',
        'purchaseOrders' => 'purchase_orders', 'transfers' => 'transfers', 'requisitions' => 'requisitions',
        'stockAlerts' => 'stock_alerts', 'stockMovements' => 'stock_movements', 'tables' => 'restaurant_tables',
        'folios' => 'folios', 'invoices' => 'invoices', 'payments' => 'payments', 'campaigns' => 'campaigns',
        'feedback' => 'feedback', 'shifts' => 'shifts', 'events' => 'events', 'auditLogs' => 'audit_logs',
        'housekeeping' => 'housekeeping_tasks', 'maintenance' => 'maintenance_tickets',
    ];
    $output = [];
    foreach ($tables as $key => $table) {
        $output[$key] = h_decode_rows($pdo->query("SELECT * FROM `$table` ORDER BY 1")->fetchAll());
    }
    // Orders store their lines in `order_items`; join them in so the client receives complete orders.
    $output['orders'] = h_attach_order_items($pdo, $output['orders'] ?? []);
    $output['menuItems'] = h_normalize_menu_items($output['menuItems'] ?? []);
    hayata_json($output);
}

// Generic resource CRUD
if (preg_match('#^/resource/([a-z-]+)(?:/([^/]+))?$#', $route, $matches)) {
    $map = [
        'rooms' => 'rooms', 'room-types' => 'room_types', 'guests' => 'guests', 'reservations' => 'reservations',
        'orders' => 'orders', 'order-items' => 'order_items', 'inventory' => 'inventory_items', 'menu-items' => 'menu_items', 'suppliers' => 'suppliers',
        'purchase-orders' => 'purchase_orders', 'transfers' => 'transfers', 'requisitions' => 'requisitions',
        'stock-alerts' => 'stock_alerts', 'stock-movements' => 'stock_movements', 'stock-takes' => 'stock_takes',
        'tables' => 'restaurant_tables', 'folios' => 'folios', 'invoices' => 'invoices', 'payments' => 'payments',
        'campaigns' => 'campaigns', 'feedback' => 'feedback', 'shifts' => 'shifts', 'events' => 'events',
        'audit-logs' => 'audit_logs', 'housekeeping' => 'housekeeping_tasks', 'maintenance' => 'maintenance_tickets',
        'users' => 'users', 'roles' => 'roles', 'permissions' => 'permissions', 'public-bookings' => 'public_bookings',
    ];
    $resource = $matches[1];
    if (!isset($map[$resource])) h_error('Unknown resource.', 'NOT_FOUND', 404);
    $table = $map[$resource];
    hayata_require_user($pdo);
    $id = $matches[2] ?? null;

    if ($method === 'GET' && !$id) {
        $limit = min(500, max(1, (int) ($query['limit'] ?? 200)));
        $rows = h_decode_rows($pdo->query("SELECT * FROM `$table` ORDER BY " . h_list_order($table) . " LIMIT $limit")->fetchAll());
        if ($table === 'orders') $rows = h_attach_order_items($pdo, $rows);
        if ($table === 'menu_items') $rows = h_normalize_menu_items($rows);
        // The staff directory only exposes the columns the screen needs, and
        // never the password hash.
        if ($table === 'users') $rows = array_map('h_public_user', $rows);
        hayata_json($rows);
    }
    if ($method === 'GET' && $id) {
        $statement = $pdo->prepare("SELECT * FROM `$table` WHERE id = :id LIMIT 1");
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();
        if (!$row) h_error('Not found.', 'NOT_FOUND', 404);
        $decoded = h_decode_row($row);
        if ($table === 'orders') $decoded = h_attach_order_items($pdo, [$decoded])[0];
        if ($table === 'menu_items') $decoded = h_normalize_menu_item($decoded);
        // A member of staff may read their own record; reading anyone else's
        // record needs the staff permission.
        if ($table === 'users') {
            $caller = hayata_require_user($pdo);
            if ($id !== $caller['id'] && !hayata_has_permission($pdo, $caller['id'], 'staff.view')) {
                h_error('You can only view your own account.', 'FORBIDDEN', 403);
            }
            $decoded = h_public_user($decoded);
        }
        hayata_json($decoded);
    }
    // Orders, their lines and the menu are edited by F&B staff (waiters, bartenders,
    // managers), not only by administrators, so they get outlet-scoped permissions instead.
    $resourcePermissions = [
        'orders' => 'restaurant.orders',
        'order_items' => 'restaurant.orders',
        'menu_items' => 'restaurant.menu',
    ];

    if ($method === 'POST') {
        if (isset($resourcePermissions[$table])) {
            $caller = hayata_require_permission($pdo, $resourcePermissions[$table]);
        } else {
            $caller = hayata_require_permission($pdo, 'settings.manage');
        }
        if ($table === 'users') {
            $email = trim((string) ($body['email'] ?? ''));
            if ($email === '') h_error('Email is required.', 'VALIDATION');
            $duplicate = $pdo->prepare('SELECT COUNT(*) FROM users WHERE email = :email');
            $duplicate->execute(['email' => $email]);
            if ($duplicate->fetchColumn() > 0) h_error('A staff member with that email already exists.', 'CONFLICT', 409);
            $role = strtolower((string) ($body['role'] ?? $body['roleId'] ?? 'waiter'));
            $roleCheck = $pdo->prepare('SELECT id FROM roles WHERE id = :id');
            $roleCheck->execute(['id' => $role]);
            if (!$roleCheck->fetchColumn()) $role = 'waiter';
            $newId = (string) ($body['id'] ?? ('usr-' . time() . random_int(10, 99)));
            h_insert($pdo, 'users', [
                'id' => $newId,
                'name' => $body['name'] ?? 'New Staff',
                'email' => $email,
                'password_hash' => password_hash((string) ($body['password'] ?? 'demo123'), PASSWORD_DEFAULT),
                'role_id' => $role,
                'department' => $body['department'] ?? 'Operations',
                'status' => $body['status'] ?? 'Active',
                'last_active' => $body['lastActive'] ?? 'Just now',
            ]);
        } else {
            $newId = h_insert_order_with_lines($pdo, $table, $body);
        }
        $statement = $pdo->prepare("SELECT * FROM `$table` WHERE id = :id");
        $statement->execute(['id' => $newId]);
        $created = h_decode_row($statement->fetch() ?: $body);
        if ($table === 'menu_items') $created = h_normalize_menu_item($created);
        if ($table === 'users') $created = h_public_user($created);
        // A ticket without its lines is useless in the kitchen, so the created
        // order is returned with the items that were written with it.
        if ($table === 'orders') $created = h_attach_order_items($pdo, [$created])[0];
        h_audit($pdo, $caller ?? hayata_require_user($pdo), 'Created', ucfirst(str_replace('_', ' ', $table)), $newId, 'New ' . str_replace('_', ' ', $table) . ' record · ' . h_changed_fields($body));
        // A confirmed booking tells the guest straight away.
        if ($table === 'reservations' && in_array((string) ($body['status'] ?? ''), ['Confirmed', 'Pending'], true)) {
            hayata_notify_reservation_event($pdo, 'booking_confirmed', $newId);
        }
        hayata_json($created, 201);
    }
    if ($method === 'PUT' && $id) {
        if (isset($resourcePermissions[$table])) {
            $caller = hayata_require_permission($pdo, $resourcePermissions[$table]);
        } else {
            $caller = hayata_require_permission($pdo, 'settings.manage');
        }
        if ($table === 'users') {
            // A member of staff may only edit their own account, and never their role.
            $isSelf = $id === $caller['id'];
            if (!$isSelf && !hayata_has_permission($pdo, $caller['id'], 'staff.manage')) {
                h_error('You can only edit your own account.', 'FORBIDDEN', 403);
            }
            $email = trim((string) ($body['email'] ?? ''));
            if ($email !== '') {
                $duplicate = $pdo->prepare('SELECT COUNT(*) FROM users WHERE email = :email AND id <> :id');
                $duplicate->execute(['email' => $email, 'id' => $id]);
                if ($duplicate->fetchColumn() > 0) h_error('A staff member with that email already exists.', 'CONFLICT', 409);
            }
            $payload = [
                'name' => $body['name'] ?? null,
                'email' => $email !== '' ? $email : null,
                'department' => $body['department'] ?? null,
                'status' => $body['status'] ?? null,
                'last_active' => $body['lastActive'] ?? null,
            ];
            if (!$isSelf) {
                if (isset($body['role']) || isset($body['roleId'])) {
                    $role = strtolower((string) ($body['role'] ?? $body['roleId']));
                    $roleCheck = $pdo->prepare('SELECT id FROM roles WHERE id = :id');
                    $roleCheck->execute(['id' => $role]);
                    if ($roleCheck->fetchColumn()) $payload['role_id'] = $role;
                }
                if (!empty($body['password'])) {
                    $newPassword = (string) $body['password'];
                    if (strlen($newPassword) < 10) h_error('Use at least 10 characters for the password.', 'VALIDATION', 422);
                    $payload['password_hash'] = password_hash($newPassword, PASSWORD_DEFAULT);
                }
            }
            h_update($pdo, $table, $id, array_filter($payload, fn($value) => $value !== null));
            $changed = $payload;
        } else {
            h_update($pdo, $table, $id, $body);
            $changed = $body;
        }
        $statement = $pdo->prepare("SELECT * FROM `$table` WHERE id = :id");
        $statement->execute(['id' => $id]);
        $updated = h_decode_row($statement->fetch() ?: $body);
        if ($table === 'menu_items') $updated = h_normalize_menu_item($updated);
        if ($table === 'users') $updated = h_public_user($updated);
        h_audit($pdo, $caller, 'Updated', ucfirst(str_replace('_', ' ', $table)), $id, 'Changed: ' . h_changed_fields($changed));
        hayata_json($updated);
    }
    if ($method === 'DELETE' && $id) {
        if (isset($resourcePermissions[$table])) {
            $caller = hayata_require_permission($pdo, $resourcePermissions[$table]);
        } else {
            $caller = hayata_require_permission($pdo, 'settings.manage');
        }
        if ($table === 'users' && $id === $caller['id']) {
            h_error('You cannot delete your own account.', 'VALIDATION', 422);
        }
        // The lines of an order are tied to it by a foreign key, so they have
        // to go first. Otherwise deleting a ticket fails on the constraint and
        // the order stays in the kitchen.
        $pdo->beginTransaction();
        try {
            if ($table === 'orders') {
                $lines = $pdo->prepare('DELETE FROM order_items WHERE order_id = :id');
                $lines->execute(['id' => $id]);
            }
            $statement = $pdo->prepare("DELETE FROM `$table` WHERE id = :id");
            $statement->execute(['id' => $id]);
            $pdo->commit();
        } catch (Throwable $exception) {
            $pdo->rollBack();
            throw $exception;
        }
        h_audit($pdo, $caller, 'Deleted', ucfirst(str_replace('_', ' ', $table)), $id, 'Record removed');
        hayata_json(['ok' => true]);
    }
}

h_error('Endpoint not found.', 'NOT_FOUND', 404);
