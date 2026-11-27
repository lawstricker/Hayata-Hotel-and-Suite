<?php
/**
 * Outbound email for guest notifications.
 *
 * Two transports are supported:
 *  - `mail`  : PHP's mail() function (works with the default XAMPP setup)
 *  - `smtp`  : a small SMTP client over fsockopen, with optional STARTTLS
 *
 * The SMTP password is only ever read from the server side. It is never returned
 * to the browser: the settings endpoint sends a masked placeholder instead.
 */
declare(strict_types=1);

require_once __DIR__ . '/security.php';

/** The events that can trigger a guest notification. */
function hayata_notification_events(): array {
    return [
        'order_placed' => 'Order placed',
        'booking_confirmed' => 'Booking confirmed',
        'checked_in' => 'Guest checked in',
        'checked_out' => 'Guest checked out',
    ];
}

/** Reads the notification settings, falling back to the environment. */
function hayata_notification_settings(PDO $pdo): array {
    $config = hayata_config();
    $defaults = [
        'enabled' => true,
        'transport' => $config['mail_transport'],
        'host' => $config['smtp_host'],
        'port' => $config['smtp_port'],
        'username' => $config['smtp_username'],
        'password' => $config['smtp_password'],
        'secure' => $config['smtp_secure'],
        'fromEmail' => $config['smtp_from_email'],
        'fromName' => $config['smtp_from_name'],
        'events' => array_fill_keys(array_keys(hayata_notification_events()), true),
    ];

    try {
        $statement = $pdo->prepare('SELECT setting_value FROM notification_settings WHERE setting_key = :key');
        $statement->execute(['key' => 'email']);
        $row = $statement->fetch();
    } catch (Throwable $exception) {
        return $defaults;
    }
    if (!$row) return $defaults;

    $stored = json_decode((string) $row['setting_value'], true);
    if (!is_array($stored)) return $defaults;

    $settings = array_merge($defaults, $stored);
    $settings['events'] = array_merge($defaults['events'], is_array($stored['events'] ?? null) ? $stored['events'] : []);
    return $settings;
}

/** Stores the notification settings. */
function hayata_save_notification_settings(PDO $pdo, array $settings): void {
    $statement = $pdo->prepare(
        'INSERT INTO notification_settings (setting_key, setting_value, updated_at) VALUES (:key, :value, NOW())
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()'
    );
    $statement->execute(['key' => 'email', 'value' => json_encode($settings, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
}

/** The settings as they may be sent to the browser: the password is never included. */
function hayata_notification_settings_public(array $settings): array {
    return [
        'enabled' => (bool) $settings['enabled'],
        'transport' => $settings['transport'],
        'host' => $settings['host'],
        'port' => (int) $settings['port'],
        'username' => $settings['username'],
        'hasPassword' => $settings['password'] !== '',
        'secure' => $settings['secure'],
        'fromEmail' => $settings['fromEmail'],
        'fromName' => $settings['fromName'],
        'events' => array_map('boolval', $settings['events']),
    ];
}

/** Builds the plain-text and HTML body for a notification. */
function hayata_email_body(string $event, array $data): array {
    $property = 'Hayata Hotel & Suite';
    $lines = [];
    $heading = '';

    switch ($event) {
        case 'order_placed':
            $heading = 'Your order is confirmed';
            $lines = [
                'Hello ' . ($data['guestName'] ?? 'Guest') . ',',
                'We have received your order' . (!empty($data['orderNumber']) ? ' (' . $data['orderNumber'] . ')' : '') . '.',
                !empty($data['roomNumber']) ? 'It will be delivered to room ' . $data['roomNumber'] . '.' : '',
                !empty($data['total']) ? 'Total paid: ' . $data['total'] : '',
                !empty($data['eta']) ? 'Estimated delivery: ' . $data['eta'] . ' minutes.' : '',
                'Thank you for staying with us.',
            ];
            break;
        case 'booking_confirmed':
            $heading = 'Your booking is confirmed';
            $lines = [
                'Hello ' . ($data['guestName'] ?? 'Guest') . ',',
                'Your booking is confirmed.',
                !empty($data['reference']) ? 'Booking reference: ' . $data['reference'] : '',
                !empty($data['checkIn']) ? 'Check-in: ' . $data['checkIn'] : '',
                !empty($data['checkOut']) ? 'Check-out: ' . $data['checkOut'] : '',
                !empty($data['roomType']) ? 'Room type: ' . $data['roomType'] : '',
                !empty($data['total']) ? 'Total: ' . $data['total'] : '',
                'We look forward to welcoming you.',
            ];
            break;
        case 'checked_in':
            $heading = 'Welcome to Hayata';
            $lines = [
                'Hello ' . ($data['guestName'] ?? 'Guest') . ',',
                'You are checked in' . (!empty($data['roomNumber']) ? ' to room ' . $data['roomNumber'] : '') . '.',
                !empty($data['checkOut']) ? 'Your check-out date is ' . $data['checkOut'] . '.' : '',
                'Our team is at your service for anything you need.',
            ];
            break;
        case 'checked_out':
            $heading = 'Thank you for staying with us';
            $lines = [
                'Hello ' . ($data['guestName'] ?? 'Guest') . ',',
                'You have been checked out' . (!empty($data['roomNumber']) ? ' from room ' . $data['roomNumber'] : '') . '.',
                !empty($data['total']) ? 'Final folio total: ' . $data['total'] : '',
                'Thank you for choosing Hayata Hotel & Suite. We hope to welcome you back soon.',
            ];
            break;
        default:
            $heading = 'Notification from Hayata';
            $lines = ['Hello ' . ($data['guestName'] ?? 'Guest') . ',', (string) ($data['message'] ?? '')];
    }

    $lines = array_values(array_filter(array_map('trim', $lines), static fn(string $line): bool => $line !== ''));
    $text = $heading . "\n\n" . implode("\n", $lines) . "\n\n" . $property . "\n" . ($data['email'] ?? '');
    $html = '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">'
        . '<h2 style="margin:0 0 12px;font-size:20px;color:#0f766e">' . htmlspecialchars($heading, ENT_QUOTES, 'UTF-8') . '</h2>'
        . implode('', array_map(static fn(string $line): string => '<p style="margin:0 0 10px;line-height:1.5">' . htmlspecialchars($line, ENT_QUOTES, 'UTF-8') . '</p>', $lines))
        . '<hr style="border:0;border-top:1px solid #e5e7eb;margin:20px 0" />'
        . '<p style="margin:0;font-size:12px;color:#6b7280">' . htmlspecialchars($property, ENT_QUOTES, 'UTF-8') . '</p>'
        . '</div>';

    return ['subject' => $heading, 'text' => $text, 'html' => $html];
}

/** Sends an email using the configured transport. */
function hayata_send_email(PDO $pdo, array $settings, string $to, string $subject, string $text, string $html): array {
    $to = trim($to);
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return ['ok' => false, 'error' => 'The recipient address is not valid.'];
    }
    $fromEmail = trim((string) $settings['fromEmail']);
    if ($fromEmail === '' || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
        return ['ok' => false, 'error' => 'The sender address is not configured.'];
    }
    $fromName = trim((string) $settings['fromName']) ?: 'Hayata Hotel & Suite';
    $headers = [
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/html; charset=UTF-8',
        'From' => sprintf('%s <%s>', $fromName, $fromEmail),
        'Reply-To' => $fromEmail,
        'X-Mailer' => 'Hayata HMS',
    ];

    try {
        if (strtolower((string) $settings['transport']) === 'smtp') {
            $result = hayata_smtp_send($settings, $to, $subject, $html, $headers);
        } else {
            $boundary = 'b' . bin2hex(random_bytes(8));
            $body = "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n" . $text
                . "\r\n--$boundary\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n" . $html
                . "\r\n--$boundary--";
            $mailHeaders = 'MIME-Version: 1.0' . "\r\n"
                . 'Content-Type: multipart/alternative; boundary="' . $boundary . '"' . "\r\n"
                . 'From: ' . $headers['From'] . "\r\n"
                . 'Reply-To: ' . $headers['Reply-To'] . "\r\n"
                . 'X-Mailer: ' . $headers['X-Mailer'];
            $sent = @mail($to, $subject, $body, $mailHeaders);
            $result = $sent ? ['ok' => true] : ['ok' => false, 'error' => 'The mail server rejected the message.'];
        }
    } catch (Throwable $exception) {
        // SMTP/PHP exceptions can quote an AUTH line or a token. Nothing that
        // looks like a credential is ever logged or returned to the browser.
        $result = ['ok' => false, 'error' => h_redact($exception->getMessage())];
    }
    if (isset($result['error'])) $result['error'] = h_redact((string) $result['error']);

    try {
        $statement = $pdo->prepare('INSERT INTO email_log (id, recipient, subject, event, status, error, created_at) VALUES (:id, :recipient, :subject, :event, :status, :error, NOW())');
        $statement->execute([
            'id' => 'eml-' . bin2hex(random_bytes(8)),
            'recipient' => $to,
            'subject' => $subject,
            'event' => 'notification',
            'status' => $result['ok'] ? 'Sent' : 'Failed',
            'error' => $result['ok'] ? null : ($result['error'] ?? 'Unknown error'),
        ]);
    } catch (Throwable $exception) {
        // The log is best effort; a failure to log must not fail the send.
    }

    return $result;
}

/** Formats a money amount for an email body. */
function hayata_email_money($amount): string {
    return '₦' . number_format((float) $amount, 2);
}

/**
 * Collects the guest details of a reservation.
 *
 * The address comes from the guest record, so a notification always reaches
 * the address that is on file for the stay.
 */
function hayata_reservation_guest(PDO $pdo, string $reservationId): array {
    $statement = $pdo->prepare(
        'SELECT r.id, r.guest_id, r.guest_name, r.room_type, r.room_number, r.check_in, r.check_out, r.total, r.status,
                g.email AS guest_email, g.first_name, g.last_name
         FROM reservations r LEFT JOIN guests g ON g.id = r.guest_id
         WHERE r.id = :id LIMIT 1'
    );
    $statement->execute(['id' => $reservationId]);
    $row = $statement->fetch();
    if (!$row) return [];
    $email = trim((string) ($row['guest_email'] ?? ''));
    if ($email === '') {
        // Online bookings are not always in the guest directory yet.
        $publicStatement = $pdo->prepare("SELECT guest FROM public_bookings WHERE staff_reservation_id = :id LIMIT 1");
        $publicStatement->execute(['id' => $reservationId]);
        $public = $publicStatement->fetch();
        if ($public) {
            $guest = json_decode((string) $public['guest'], true);
            if (is_array($guest)) $email = trim((string) ($guest['email'] ?? ''));
        }
    }
    return [
        'email' => $email,
        'guestName' => trim((string) $row['guest_name']) ?: trim((string) ($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? '')) ?: 'Guest',
        'roomNumber' => (string) ($row['room_number'] ?? ''),
        'roomType' => (string) ($row['room_type'] ?? ''),
        'checkIn' => (string) ($row['check_in'] ?? ''),
        'checkOut' => (string) ($row['check_out'] ?? ''),
        'total' => hayata_email_money($row['total'] ?? 0),
        'reference' => (string) $row['id'],
    ];
}

/**
 * Sends the notification for a reservation event.
 *
 * Nothing is sent when the event is switched off or the guest has no address
 * on file. A mail failure never breaks the reservation that triggered it.
 */
function hayata_notify_reservation_event(PDO $pdo, string $event, string $reservationId): array {
    $result = ['sent' => false, 'skipped' => true];
    try {
        $settings = hayata_notification_settings($pdo);
        if (!$settings['enabled'] || !($settings['events'][$event] ?? false)) return $result;
        $guest = hayata_reservation_guest($pdo, $reservationId);
        if (!$guest || $guest['email'] === '') return $result;
        $message = hayata_email_body($event, $guest);
        $sent = hayata_send_email($pdo, $settings, $guest['email'], $message['subject'], $message['text'], $message['html']);
        $result = ['sent' => (bool) $sent['ok'], 'error' => $sent['error'] ?? null];
    } catch (Throwable $exception) {
        $result = ['sent' => false, 'error' => 'The guest notification could not be sent.'];
    }
    return $result;
}

/** Minimal SMTP client with optional STARTTLS and AUTH LOGIN. */function hayata_smtp_send(array $settings, string $to, string $subject, string $html, array $headers): array {
    $host = trim((string) $settings['host']);
    $port = (int) $settings['port'];
    if ($host === '') return ['ok' => false, 'error' => 'No SMTP host is configured.'];

    $secure = strtolower((string) $settings['secure']);
    $remote = ($secure === 'ssl' || $secure === 'smtps') ? 'ssl://' : 'tcp://';
    $context = stream_context_create(['ssl' => ['verify_peer' => false, 'verify_peer_name' => false]]);
    $socket = @stream_socket_client($remote . $host . ':' . $port, $errno, $error, 15, STREAM_CLIENT_CONNECT, $context);
    if (!$socket) return ['ok' => false, 'error' => 'Could not reach the SMTP server: ' . $error];

    stream_set_timeout($socket, 20);
    $read = static function () use ($socket): string {
        $response = '';
        while (($line = fgets($socket, 515)) !== false) {
            $response .= $line;
            if (strlen($line) < 4 || $line[3] !== '-') break;
        }
        return $response;
    };
    $write = static function (string $line) use ($socket): void {
        fwrite($socket, $line . "\r\n");
    };

    try {
        $greeting = $read();
        if (!str_contains($greeting, '220')) return ['ok' => false, 'error' => 'Unexpected SMTP greeting.'];

        $write('EHLO hayata-hotel.local');
        $response = $read();
        if (!str_contains($response, '250')) return ['ok' => false, 'error' => 'The SMTP server rejected EHLO.'];

        if ($secure === 'tls') {
            $write('STARTTLS');
            $response = $read();
            if (!str_contains($response, '220')) return ['ok' => false, 'error' => 'The SMTP server refused STARTTLS.'];
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                return ['ok' => false, 'error' => 'The TLS handshake failed.'];
            }
            $write('EHLO hayata-hotel.local');
            $read();
        }

        $username = (string) $settings['username'];
        $password = (string) $settings['password'];
        if ($username !== '') {
            $write('AUTH LOGIN');
            $read();
            $write(base64_encode($username));
            $read();
            $write(base64_encode($password));
            $response = $read();
            if (!str_contains($response, '235')) return ['ok' => false, 'error' => 'The SMTP server rejected the credentials.'];
        }

        $fromEmail = trim((string) $settings['fromEmail']);
        $write('MAIL FROM:<' . $fromEmail . '>');
        if (!str_contains($read(), '250')) return ['ok' => false, 'error' => 'The SMTP server rejected the sender address.'];
        $write('RCPT TO:<' . $to . '>');
        if (!str_contains($read(), '250')) return ['ok' => false, 'error' => 'The SMTP server rejected the recipient address.'];
        $write('DATA');
        if (!str_contains($read(), '354')) return ['ok' => false, 'error' => 'The SMTP server refused the message body.'];

        $body = "To: {$to}\r\n"
            . 'Subject: ' . $subject . "\r\n"
            . 'Date: ' . date('r') . "\r\n"
            . implode('', array_map(static fn(string $key): string => $key . ': ' . $headers[$key] . "\r\n", array_keys($headers)))
            . "\r\n"
            . str_replace("\r\n.", "\r\n..", $html) . "\r\n.";
        fwrite($socket, $body);
        $response = $read();
        if (!str_contains($response, '250')) return ['ok' => false, 'error' => 'The SMTP server rejected the message.'];

        $write('QUIT');
        fclose($socket);
        return ['ok' => true];
    } catch (Throwable $exception) {
        @fclose($socket);
        return ['ok' => false, 'error' => $exception->getMessage()];
    }
}
