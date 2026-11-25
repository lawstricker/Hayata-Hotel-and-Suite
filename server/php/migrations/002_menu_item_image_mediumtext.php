<?php
/**
 * Widens `menu_items.image` so uploaded menu photos fit.
 *
 * Menu managers can upload a picture for an item, which is stored as a data URL.
 * A plain TEXT column only holds 64 KB, which a resized photo can exceed, so the
 * column is widened to MEDIUMTEXT.
 *
 * @return callable(PDO): void
 */
declare(strict_types=1);

return function (PDO $pdo): void {
    $statement = $pdo->query("SHOW COLUMNS FROM menu_items LIKE 'image'");
    $column = $statement->fetch();
    if (!$column) return;
    $type = strtolower((string) $column['Type']);
    if (strpos($type, 'mediumtext') !== false || strpos($type, 'longtext') !== false) return;
    $pdo->exec('ALTER TABLE `menu_items` MODIFY COLUMN `image` MEDIUMTEXT NOT NULL');
};
