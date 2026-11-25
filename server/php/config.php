<?php
declare(strict_types=1);

return [
    'db_host' => getenv('HAYATA_DB_HOST') ?: '127.0.0.1',
    'db_name' => getenv('HAYATA_DB_NAME') ?: 'hayata_data',
    'db_user' => getenv('HAYATA_DB_USER') ?: 'root',
    'db_pass' => getenv('HAYATA_DB_PASS') !== false ? getenv('HAYATA_DB_PASS') : '',
    'db_port' => (int) (getenv('HAYATA_DB_PORT') ?: 3306),
    'cors_origin' => getenv('HAYATA_CORS_ORIGIN') ?: '*',
];
