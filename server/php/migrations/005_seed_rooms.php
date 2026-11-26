<?php
/**
 * Seeds the room reference data that the in-room QR codes depend on.
 *
 * A database that was created with an older `setup.php`, or one where the seed
 * stopped half way, can end up without any rows in `room_types` or `rooms`.
 * The staff screens then show their in-browser rooms while the API does not
 * know a single room, so every QR code fails with "does not match a room".
 *
 * The insert is idempotent: rows that already exist are left untouched.
 *
 * @return callable(PDO): void
 */
declare(strict_types=1);

return function (PDO $pdo): void {
    $roomTypes = [
        ['rt-001', 'Deluxe King', 'DLX-K', 185, 2, 14, '["King bed","Rain shower","Fast Wi-Fi"]'],
        ['rt-002', 'Deluxe Twin', 'DLX-T', 165, 2, 10, '["Two single beds","Rain shower","Fast Wi-Fi"]'],
        ['rt-003', 'Executive Suite', 'EXE-S', 320, 3, 8, '["Lounge","King bed","Bathtub"]'],
        ['rt-004', 'Hayata Suite', 'HYT-S', 475, 4, 5, '["Living room","Dining room","Butler service"]'],
        ['rt-005', 'Accessible King', 'ACC-K', 175, 2, 3, '["Step-free","Roll-in shower","Safety rails"]'],
    ];

    $known = $pdo->query('SELECT id FROM room_types')->fetchAll(PDO::FETCH_COLUMN);
    $insertType = $pdo->prepare(
        'INSERT INTO room_types (id, name, code, base_rate, capacity, total_rooms, amenities)
         VALUES (:id, :name, :code, :base_rate, :capacity, :total_rooms, :amenities)'
    );
    foreach ($roomTypes as $type) {
        if (in_array($type[0], $known, true)) continue;
        $insertType->execute([
            'id' => $type[0], 'name' => $type[1], 'code' => $type[2],
            'base_rate' => $type[3], 'capacity' => $type[4], 'total_rooms' => $type[5], 'amenities' => $type[6],
        ]);
    }

    $knownRooms = $pdo->query('SELECT number FROM rooms')->fetchAll(PDO::FETCH_COLUMN);
    $insertRoom = $pdo->prepare(
        'INSERT INTO rooms (id, number, floor, type, status, guest_name, housekeeping_status, rate, updated_at)
         VALUES (:id, :number, :floor, :type, :status, :guest_name, :housekeeping_status, :rate, :updated_at)'
    );
    $statuses = ['Occupied', 'Available', 'Dirty', 'Occupied', 'Clean', 'Reserved', 'Occupied', 'Available', 'Out of Order', 'Occupied'];
    for ($index = 0; $index < 40; $index++) {
        $floor = intdiv($index, 10) + 1;
        $number = $floor . str_pad((string) (($index % 10) + 1), 2, '0', STR_PAD_LEFT);
        if (in_array($number, $knownRooms, true)) continue;
        $type = $roomTypes[$index % 5];
        $status = $statuses[$index % 10];
        $insertRoom->execute([
            'id' => 'room-' . $number,
            'number' => $number,
            'floor' => $floor,
            'type' => $type[1],
            'status' => $status,
            'guest_name' => null,
            'housekeeping_status' => $status === 'Dirty' ? 'Dirty' : ($status === 'Clean' ? 'Clean' : 'Inspected'),
            'rate' => $type[3],
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }
};
