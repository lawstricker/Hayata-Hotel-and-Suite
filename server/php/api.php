<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

if (hayata_method() === 'OPTIONS') {
    hayata_json(['ok' => true]);
}

$pdo = hayata_pdo();
$route = hayata_route();
$method = hayata_method();
$body = hayata_body();
$query = hayata_query();

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

function h_table_columns(PDO $pdo, string $table): array {
    $statement = $pdo->prepare('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table');
    $statement->execute(['table' => $table]);
    return $statement->fetchAll(PDO::FETCH_COLUMN);
}

function h_snake(string $value): string {
    return strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $value));
}

function h_unsafe_sql_columns(array $columns): array {
    return array_values(array_filter($columns, fn($column) => preg_match('/^[A-Za-z0-9_]+$/', $column) === 1));
}

function h_insert(PDO $pdo, string $table, array $data): string {
    $columns = h_table_columns($pdo, $table);
    $payload = [];
    foreach ($data as $key => $value) {
        $column = h_snake((string) $key);
        if (!in_array($column, $columns, true)) continue;
        if (is_array($value)) $value = json_encode($value, JSON_UNESCAPED_UNICODE);
        if (is_bool($value)) $value = $value ? 1 : 0;
        $payload[$column] = $value;
    }
    $names = array_keys($payload);
    $sql = sprintf('INSERT INTO `%s` (%s) VALUES (%s)', $table, implode(',', array_map(fn($c) => "`$c`", h_unsafe_sql_columns($names))), implode(',', array_map(fn($c) => ':' . $c, h_unsafe_sql_columns($names))));
    $statement = $pdo->prepare($sql);
    foreach ($payload as $column => $value) $statement->bindValue(':' . $column, $value);
    $statement->execute();
    return $data['id'] ?? $data['reference'] ?? (string) $pdo->lastInsertId();
}

function h_update(PDO $pdo, string $table, string $id, array $data): void {
    $columns = h_table_columns($pdo, $table);
    $payload = [];
    foreach ($data as $key => $value) {
        $column = h_snake((string) $key);
        if (!in_array($column, $columns, true) || in_array($column, ['id', 'reference'], true)) continue;
        if (is_array($value)) $value = json_encode($value, JSON_UNESCAPED_UNICODE);
        if (is_bool($value)) $value = $value ? 1 : 0;
        $payload[$column] = $value;
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
if ($route === '/health' && $method === 'GET') hayata_json(['ok' => true, 'database' => 'hayata_data', 'time' => date('c')]);

if ($route === '/auth/login' && $method === 'POST') {
    $statement = $pdo->prepare('SELECT u.*, r.name AS role, r.label AS role_label FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = :email');
    $statement->execute(['email' => $body['email'] ?? '']);
    $user = $statement->fetch();
    if (!$user || !password_verify((string) ($body['password'] ?? ''), $user['password_hash'])) h_error('Invalid email or password.', 'UNAUTHORIZED', 401);
    $token = bin2hex(random_bytes(32));
    h_insert($pdo, 'api_tokens', ['token' => $token, 'user_id' => $user['id'], 'expires_at' => date('Y-m-d H:i:s', time() + 86400)]);
    hayata_json(['token' => $token, 'user' => [
        'id' => $user['id'], 'name' => $user['name'], 'email' => $user['email'], 'role' => $user['role'],
        'department' => $user['department'], 'status' => $user['status'], 'lastActive' => $user['last_active'],
    ]]);
}

if ($route === '/auth/me' && $method === 'GET') {
    $user = hayata_require_user($pdo);
    hayata_json(['user' => h_camel_keys($user)]);
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
    $guest = $body['guest'] ?? [];
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

if ($route === '/public/enquiries' && $method === 'POST') {
    if (empty($body['name']) || empty($body['email']) || empty($body['message'])) h_error('Please complete all required fields.');
    h_insert($pdo, 'public_enquiries', ['name' => $body['name'], 'email' => $body['email'], 'subject' => $body['subject'] ?? 'General enquiry', 'message' => $body['message']]);
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
    h_update($pdo, 'reservations', $id, ['status' => $body['status'] ?? 'Confirmed', 'room_number' => $body['roomNumber'] ?? null]);
    if (($body['status'] ?? '') === 'Checked in' && !empty($body['roomNumber'])) {
        $statement = $pdo->prepare('SELECT guest_name FROM reservations WHERE id = :id');
        $statement->execute(['id' => $id]);
        $guestName = $statement->fetchColumn();
        $roomStatement = $pdo->prepare('UPDATE rooms SET status = \'Occupied\', guest_name = :guest WHERE number = :number');
        $roomStatement->execute(['guest' => $guestName, 'number' => $body['roomNumber']]);
    }
    $statement = $pdo->prepare('SELECT * FROM reservations WHERE id = :id');
    $statement->execute(['id' => $id]);
    hayata_json(h_decode_row($statement->fetch()));
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
        hayata_json(h_decode_rows($pdo->query("SELECT * FROM `$table` ORDER BY 1 LIMIT $limit")->fetchAll()));
    }
    if ($method === 'GET' && $id) {
        $statement = $pdo->prepare("SELECT * FROM `$table` WHERE id = :id LIMIT 1");
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();
        if (!$row) h_error('Not found.', 'NOT_FOUND', 404);
        hayata_json(h_decode_row($row));
    }
    if ($method === 'POST') {
        hayata_require_permission($pdo, 'settings.manage');
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
            $newId = h_insert($pdo, $table, $body);
        }
        $statement = $pdo->prepare("SELECT * FROM `$table` WHERE id = :id");
        $statement->execute(['id' => $newId]);
        hayata_json(h_decode_row($statement->fetch() ?: $body), 201);
    }
    if ($method === 'PUT' && $id) {
        hayata_require_permission($pdo, 'settings.manage');
        if ($table === 'users') {
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
            if (isset($body['role']) || isset($body['roleId'])) {
                $role = strtolower((string) ($body['role'] ?? $body['roleId']));
                $roleCheck = $pdo->prepare('SELECT id FROM roles WHERE id = :id');
                $roleCheck->execute(['id' => $role]);
                if ($roleCheck->fetchColumn()) $payload['role_id'] = $role;
            }
            if (!empty($body['password'])) $payload['password_hash'] = password_hash((string) $body['password'], PASSWORD_DEFAULT);
            h_update($pdo, $table, $id, array_filter($payload, fn($value) => $value !== null));
        } else {
            h_update($pdo, $table, $id, $body);
        }
        $statement = $pdo->prepare("SELECT * FROM `$table` WHERE id = :id");
        $statement->execute(['id' => $id]);
        hayata_json(h_decode_row($statement->fetch() ?: $body));
    }
    if ($method === 'DELETE' && $id) {
        hayata_require_permission($pdo, 'settings.manage');
        $statement = $pdo->prepare("DELETE FROM `$table` WHERE id = :id");
        $statement->execute(['id' => $id]);
        hayata_json(['ok' => true]);
    }
}

h_error('Endpoint not found.', 'NOT_FOUND', 404);
