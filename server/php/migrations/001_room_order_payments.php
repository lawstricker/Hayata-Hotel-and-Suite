<?php
/**
 * Adds the payment columns required by paid in-room dining orders.
 *
 * - `orders.payment_reference` links a room-service order to the gateway reference
 * - `payments.order_id` / `payments.room_number` / `payments.email` let finance
 *   reconcile an in-room dining payment against the order it paid for
 *
 * @return callable(PDO): void
 */
declare(strict_types=1);

return function (PDO $pdo): void {
    $columns = [];
    foreach ($pdo->query('SHOW COLUMNS FROM orders')->fetchAll() as $column) {
        $columns['orders'][(string) $column['Field']] = true;
    }
    foreach ($pdo->query('SHOW COLUMNS FROM payments')->fetchAll() as $column) {
        $columns['payments'][(string) $column['Field']] = true;
    }

    if (!isset($columns['orders']['payment_reference'])) {
        $pdo->exec('ALTER TABLE `orders` ADD COLUMN `payment_reference` VARCHAR(60) NULL AFTER `instructions`');
    }
    if (!isset($columns['payments']['order_id'])) {
        $pdo->exec('ALTER TABLE `payments` ADD COLUMN `order_id` VARCHAR(60) NULL AFTER `created_at`');
    }
    if (!isset($columns['payments']['room_number'])) {
        $pdo->exec('ALTER TABLE `payments` ADD COLUMN `room_number` VARCHAR(20) NULL AFTER `order_id`');
    }
    if (!isset($columns['payments']['email'])) {
        $pdo->exec('ALTER TABLE `payments` ADD COLUMN `email` VARCHAR(190) NULL AFTER `room_number`');
    }
};
