<?php
/**
 * Fast, dependency-free tests for the security helpers.
 *
 * Usage: & "C:\xampp\php\php.exe" server\php\tests\security-unit.php
 * No database or web server is needed: every case exercises a pure function.
 */
declare(strict_types=1);

require_once __DIR__ . '/../security.php';

$passed = 0;
$failed = 0;

function check(string $name, bool $condition): void {
    global $passed, $failed;
    if ($condition) {
        $passed++;
        echo "PASS  $name\n";
    } else {
        $failed++;
        echo "FAIL  $name\n";
    }
}

/** Expects h_validate* to reject the payload with a validation error. */
function rejects(callable $callback): bool {
    try {
        $callback();
        return false;
    } catch (HayataValidationError) {
        return true;
    }
}

// 23. Input validation -------------------------------------------------------
check('valid email accepted', h_validate_value('Guest@Example.com', ['type' => 'email'], 'email') === 'guest@example.com');
check('invalid email rejected', rejects(fn() => h_validate_value('not-an-email', ['type' => 'email'], 'email')));
check('impossible date rejected', rejects(fn() => h_validate_value('2026-02-30', ['type' => 'date'], 'date')));
check('valid date accepted', h_validate_value('2026-11-28', ['type' => 'date'], 'date') === '2026-11-28');
check('integer range enforced', rejects(fn() => h_validate_value(999, ['type' => 'int', 'max' => 10], 'quantity')));
check('enum rejects unexpected value', rejects(fn() => h_validate_value('Dropped', ['type' => 'enum', 'in' => ['New', 'Ready']], 'status')));
check('SQLi-shaped id rejected', rejects(fn() => h_validate_value("1' OR 1=1--", ['type' => 'id'], 'id')));
check('script tag stripped from text', h_validate_value('<script>alert(1)</script>Hello', ['type' => 'text', 'max' => 100], 'name') === 'alert(1)Hello');
check('null byte removed', h_validate_value("abc\0def", ['type' => 'string'], 'name') === 'abcdef');
$cleaned = h_validate(['email' => 'a@b.com', 'role' => 'SUPER_ADMIN', 'price' => '1'], [
    'email' => ['type' => 'email'],
    'role' => ['type' => 'string'],
]);
check('unknown fields dropped', $cleaned === ['email' => 'a@b.com', 'role' => 'SUPER_ADMIN']);
check('upload field refused on public form', rejects(fn() => h_reject_upload_fields(['image' => 'data:image/png;base64,AAAA'])));

// 28. Upload restrictions ----------------------------------------------------
$png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==';
check('valid PNG data URL accepted', str_starts_with(h_image_data_url($png), 'data:image/png;base64,'));
check('SVG rejected even as image', rejects(fn() => h_image_data_url('data:image/svg+xml;base64,PHN2Zy8+')));
check('non-image rejected', rejects(fn() => h_image_data_url('data:text/html;base64,PHNjcmlwdD4=')));
check('declared type must match bytes', rejects(fn() => h_image_data_url(str_replace('image/png', 'image/jpeg', $png))));
check('oversized image rejected', rejects(fn() => h_image_data_url($png, 10)));

// 27. Log redaction ----------------------------------------------------------
$secretLog = 'Authorization: Bearer abcdef1234567890abcdef password="hunter2secret" token=abcdefghijklmnopqrstuvwxyz1234567890';
$redacted = h_redact($secretLog);
check('bearer token redacted', !str_contains($redacted, 'abcdef1234567890abcdef'));
check('password redacted', !str_contains($redacted, 'hunter2secret'));
check('long token redacted', !str_contains($redacted, 'abcdefghijklmnopqrstuvwxyz1234567890'));
check('harmless text kept', str_contains(h_redact('Order ord-123 was created'), 'ord-123'));

// 32. Tamper protection ------------------------------------------------------
$payload = ['ref' => 'HYT-ABC123', 'total' => 12500.0];
$signature = h_sign_payload($payload);
check('signature is deterministic', h_sign_payload(['total' => 12500.0, 'ref' => 'HYT-ABC123']) === $signature);
check('signature verifies', h_verify_payload($payload, $signature));
check('tampered payload rejected', !h_verify_payload(['ref' => 'HYT-ABC123', 'total' => 1.0], $signature));
$token = h_payment_token('HYT-ABC123', 12500.0, 'guest@example.com');
check('payment token bound to amount', !h_verify_payment_token('HYT-ABC123', 1.0, 'guest@example.com', $token));
check('payment token bound to email', !h_verify_payment_token('HYT-ABC123', 12500.0, 'other@example.com', $token));
check('status transitions are allowlisted', h_allowed_status('reservation') === ['Pending', 'Confirmed', 'Checked in', 'Checked out', 'Cancelled', 'No show']);

// 18/22/26/34. Row-level security -------------------------------------------
$user = ['id' => 'usr-003'];
check('owner can read own staff record', h_rls_is_owner('users', $user, ['id' => 'usr-003']));
check('other user cannot read staff record', !h_rls_is_owner('users', $user, ['id' => 'usr-001']));
$booking = ['guest' => ['email' => 'Guest@Example.com']];
check('guest email proves booking ownership', h_rls_is_owner('public_bookings', ['id' => 'anon'], $booking, ['email' => 'guest@example.com']));
check('wrong guest email denied', !h_rls_is_owner('public_bookings', ['id' => 'anon'], $booking, ['email' => 'other@example.com']));
check('no proof means no booking ownership', !h_rls_is_owner('public_bookings', ['id' => 'anon'], $booking));
check('token table scoped to user', h_rls_is_owner('api_tokens', $user, ['user_id' => 'usr-003']));
check('generic table has no ownership rule', !h_rls_is_owner('rooms', $user, ['id' => 'room-001']));

// 31. Response trimming ------------------------------------------------------
$menu = ['id' => 'm1', 'name' => 'Soup', 'price' => 10.0, 'cost' => 4.0, 'recipe' => 'secret'];
check('public menu hides cost', !array_key_exists('cost', h_public_menu_item($menu)));
check('public menu hides recipe', !array_key_exists('recipe', h_public_menu_item($menu)));
$staff = ['id' => 'usr-001', 'name' => 'Elena', 'password_hash' => '$2y$10$secret', 'role_id' => 'SUPER_ADMIN'];
check('staff response hides password hash', !array_key_exists('password_hash', h_trim_response('users', $staff)));
check('staff response hides role id', !array_key_exists('role_id', h_trim_response('users', $staff)));
check('health hides database name', !array_key_exists('database', h_public_health()));
check('booking response hides staff id', !array_key_exists('staffReservationId', h_public_booking_trim(['reference' => 'HYT-1', 'staffReservationId' => 'res-1'])));

echo "\n$passed passed, $failed failed\n";
exit($failed === 0 ? 0 : 1);
