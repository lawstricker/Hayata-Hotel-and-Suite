<?php
/**
 * Local configuration template.
 *
 * Copy this file to `config.local.php` and fill in your values. `config.local.php`
 * is listed in `.gitignore` and must never be committed.
 *
 * Keys can also be supplied as real environment variables, which take priority.
 */
return [
    // Database. Use a dedicated least-privilege account in production instead of root.
    'HAYATA_DB_HOST' => '127.0.0.1',
    'HAYATA_DB_NAME' => 'hayata_data',
    'HAYATA_DB_USER' => 'hayata_app',
    'HAYATA_DB_PASS' => '',

    // 'development' or 'production'. Production refuses to boot without a secret.
    'HAYATA_APP_ENV' => 'development',
    'HAYATA_DEBUG' => 'false',

    // Random string, at least 32 characters. Signs tokens and rate-limit keys.
    'HAYATA_APP_SECRET' => '',

    // The timezone the property operates in. It is applied to PHP and to the
    // database session, so both read the same clock.
    'HAYATA_APP_TIMEZONE' => 'Africa/Lagos',

    // Comma separated list of browser origins allowed to call the API.
    'HAYATA_CORS_ORIGINS' => 'http://localhost:5173,http://127.0.0.1:5173',

    // Token lifetime in seconds and request throttling.
    'HAYATA_TOKEN_TTL' => '43200',
    // A session unused for this many seconds is revoked even before it expires.
    'HAYATA_SESSION_IDLE_TTL' => '7200',
    'HAYATA_RATE_LIMIT_MAX' => '120',
    'HAYATA_RATE_LIMIT_WINDOW' => '60',
    'HAYATA_LOGIN_MAX_ATTEMPTS' => '5',
    'HAYATA_LOGIN_LOCKOUT' => '900',

    // Mail. 'mail' uses PHP mail(), 'smtp' connects to an SMTP server.
    'HAYATA_MAIL_TRANSPORT' => 'mail',
    'HAYATA_SMTP_HOST' => '',
    'HAYATA_SMTP_PORT' => '587',
    'HAYATA_SMTP_USERNAME' => '',
    'HAYATA_SMTP_PASSWORD' => '',
    'HAYATA_SMTP_SECURE' => 'tls',
    'HAYATA_SMTP_FROM_EMAIL' => '',
    'HAYATA_SMTP_FROM_NAME' => 'Hayata Hotel & Suite',
];
