<?php
/**
 * Adds the picture columns to `room_types`.
 *
 * A room type carries two kinds of pictures:
 *
 * - `image`   the profile picture of the type, used on the room type card.
 * - `gallery` the extra pictures of the type, stored as a JSON array.
 *
 * Both are stored as data URLs (or as plain URLs), so the columns are
 * MEDIUMTEXT: a plain TEXT column only holds 64 KB, which a resized photo can
 * exceed.
 *
 * The migration is idempotent: a column that already exists is left alone.
 *
 * @return callable(PDO): void
 */
declare(strict_types=1);

return function (PDO $pdo): void {
    $columns = $pdo->query("SHOW COLUMNS FROM room_types")->fetchAll();
    $existing = array_map(fn($column) => strtolower((string) $column['Field']), $columns);

    if (!in_array('image', $existing, true)) {
        $pdo->exec('ALTER TABLE `room_types` ADD COLUMN `image` MEDIUMTEXT NULL AFTER `amenities`');
    }
    if (!in_array('gallery', $existing, true)) {
        $pdo->exec('ALTER TABLE `room_types` ADD COLUMN `gallery` MEDIUMTEXT NULL AFTER `image`');
    }
};
