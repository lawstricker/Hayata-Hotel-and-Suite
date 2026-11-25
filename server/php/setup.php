<?php
declare(strict_types=1);

require __DIR__ . '/db.php';
require __DIR__ . '/access-matrix.php';

$config = hayata_config();
$rootDsn = sprintf('mysql:host=%s;port=%d;charset=utf8mb4', $config['db_host'], $config['db_port']);
$root = new PDO($rootDsn, $config['db_user'], $config['db_pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$root->exec('CREATE DATABASE IF NOT EXISTS `hayata_data` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$pdo = hayata_pdo();
$pdo->exec('SET FOREIGN_KEY_CHECKS = 0');

$tables = [
    'api_tokens', 'order_items', 'orders', 'restaurant_tables', 'menu_items',
    'stock_movements', 'stock_alerts', 'stock_takes', 'requisitions', 'transfers',
    'purchase_orders', 'inventory_items', 'suppliers', 'payments', 'invoices', 'folios',
    'feedback', 'campaigns', 'shifts', 'events', 'audit_logs', 'housekeeping_tasks',
    'maintenance_tickets', 'role_permissions', 'permissions', 'users', 'public_bookings',
    'public_enquiries', 'newsletter_subscribers', 'reservations', 'guests', 'rooms',
    'room_types', 'roles', 'printer_settings',
];
foreach ($tables as $table) $pdo->exec("DROP TABLE IF EXISTS `$table`");

$schema = <<<SQL
CREATE TABLE roles (
  id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  label VARCHAR(80) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  permission_key VARCHAR(80) NOT NULL UNIQUE,
  label VARCHAR(120) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE role_permissions (
  role_id VARCHAR(40) NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
) ENGINE=InnoDB;
CREATE TABLE users (
  id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id VARCHAR(40) NOT NULL,
  department VARCHAR(80) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  last_active VARCHAR(80) NOT NULL DEFAULT 'Just now',
  FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;
CREATE TABLE api_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(255) NOT NULL UNIQUE,
  user_id VARCHAR(40) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE room_types (
  id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(30) NOT NULL,
  base_rate DECIMAL(12,2) NOT NULL,
  capacity INT NOT NULL,
  total_rooms INT NOT NULL,
  amenities TEXT
) ENGINE=InnoDB;
CREATE TABLE rooms (
  id VARCHAR(40) PRIMARY KEY,
  number VARCHAR(20) NOT NULL UNIQUE,
  floor INT NOT NULL,
  type VARCHAR(120) NOT NULL,
  status VARCHAR(30) NOT NULL,
  guest_name VARCHAR(160) NULL,
  housekeeping_status VARCHAR(30) NOT NULL,
  rate DECIMAL(12,2) NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB;
CREATE TABLE guests (
  id VARCHAR(40) PRIMARY KEY,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(60) NOT NULL,
  nationality VARCHAR(80) NOT NULL,
  segment VARCHAR(40) NOT NULL,
  lifecycle VARCHAR(40) NOT NULL,
  tier VARCHAR(40) NOT NULL,
  points INT NOT NULL DEFAULT 0,
  spend_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  open_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  stays INT NOT NULL DEFAULT 0,
  last_stay DATE NOT NULL,
  next_stay DATE NULL,
  preferences TEXT,
  notes TEXT,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB;
CREATE TABLE reservations (
  id VARCHAR(60) PRIMARY KEY,
  guest_id VARCHAR(40) NOT NULL,
  guest_name VARCHAR(160) NOT NULL,
  room_type VARCHAR(120) NOT NULL,
  room_number VARCHAR(20) NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  adults INT NOT NULL,
  children INT NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL,
  source VARCHAR(60) NOT NULL,
  channel VARCHAR(40) NULL,
  rate_plan VARCHAR(80) NOT NULL,
  rate DECIMAL(12,2) NOT NULL,
  deposit DECIMAL(12,2) NOT NULL DEFAULT 0,
  add_ons TEXT,
  total DECIMAL(12,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE public_bookings (
  reference VARCHAR(20) PRIMARY KEY,
  status VARCHAR(40) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  adults INT NOT NULL,
  children INT NOT NULL DEFAULT 0,
  slug VARCHAR(80) NOT NULL,
  room_name VARCHAR(140) NOT NULL,
  assigned_room_number VARCHAR(20) NOT NULL,
  guest JSON NOT NULL,
  add_ons JSON NOT NULL,
  quote JSON NOT NULL,
  promo_code VARCHAR(40) NULL,
  payment_status VARCHAR(30) NOT NULL,
  staff_reservation_id VARCHAR(60) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE public_enquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  subject VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE newsletter_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  subscribed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE menu_items (
  id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  category VARCHAR(60) NOT NULL,
  outlet VARCHAR(20) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  cost DECIMAL(12,2) NOT NULL,
  available TINYINT(1) NOT NULL DEFAULT 1,
  image TEXT NOT NULL,
  description TEXT NOT NULL,
  station VARCHAR(60) NOT NULL,
  age_restricted TINYINT(1) NOT NULL DEFAULT 0,
  prep_minutes INT NOT NULL DEFAULT 10,
  recipe TEXT
) ENGINE=InnoDB;
CREATE TABLE restaurant_tables (
  id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  seats INT NOT NULL,
  status VARCHAR(30) NOT NULL,
  area VARCHAR(40) NOT NULL,
  server VARCHAR(120) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE orders (
  id VARCHAR(60) PRIMARY KEY,
  order_number VARCHAR(30) NOT NULL,
  outlet VARCHAR(20) NOT NULL,
  type VARCHAR(40) NOT NULL,
  status VARCHAR(30) NOT NULL,
  guest_name VARCHAR(160) NULL,
  room_number VARCHAR(20) NULL,
  server VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  tip DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  payment_status VARCHAR(30) NOT NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'POS',
  instructions TEXT
) ENGINE=InnoDB;
CREATE TABLE order_items (
  id VARCHAR(80) PRIMARY KEY,
  order_id VARCHAR(60) NOT NULL,
  menu_item_id VARCHAR(40) NOT NULL,
  name VARCHAR(140) NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  modifiers TEXT,
  station VARCHAR(60) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB;
CREATE TABLE inventory_items (
  id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  sku VARCHAR(40) NOT NULL UNIQUE,
  outlet VARCHAR(30) NOT NULL,
  category VARCHAR(60) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  cost DECIMAL(12,2) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  supplier_id VARCHAR(40) NOT NULL,
  reorder_point INT NOT NULL,
  reorder_qty INT NOT NULL,
  batch VARCHAR(40) NOT NULL,
  expiry DATE NULL,
  location VARCHAR(120) NOT NULL,
  bin VARCHAR(30) NULL,
  stock INT NOT NULL,
  maximum_stock INT NOT NULL,
  barcode VARCHAR(60) NOT NULL,
  last_updated DATETIME NOT NULL
) ENGINE=InnoDB;
CREATE TABLE stock_movements (
  id VARCHAR(60) PRIMARY KEY,
  item_id VARCHAR(40) NOT NULL,
  item_name VARCHAR(140) NOT NULL,
  sku VARCHAR(40) NOT NULL,
  outlet VARCHAR(30) NOT NULL,
  type VARCHAR(40) NOT NULL,
  quantity_in INT NOT NULL DEFAULT 0,
  quantity_out INT NOT NULL DEFAULT 0,
  running_balance INT NOT NULL,
  user VARCHAR(120) NOT NULL,
  timestamp DATETIME NOT NULL,
  reference VARCHAR(60) NOT NULL,
  note TEXT
) ENGINE=InnoDB;
CREATE TABLE stock_alerts (
  id VARCHAR(60) PRIMARY KEY,
  item_id VARCHAR(40) NOT NULL,
  item_name VARCHAR(140) NOT NULL,
  sku VARCHAR(40) NOT NULL,
  outlet VARCHAR(30) NOT NULL,
  type VARCHAR(30) NOT NULL,
  current_stock INT NOT NULL,
  threshold INT NOT NULL,
  expiry DATE NULL,
  created_at DATETIME NOT NULL,
  acknowledged TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB;
CREATE TABLE suppliers (
  id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  contact VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(60) NOT NULL,
  category VARCHAR(80) NOT NULL,
  address TEXT NOT NULL
) ENGINE=InnoDB;
CREATE TABLE purchase_orders (
  id VARCHAR(60) PRIMARY KEY,
  po_number VARCHAR(40) NOT NULL,
  supplier_id VARCHAR(40) NOT NULL,
  item_name VARCHAR(140) NOT NULL,
  quantity INT NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  status VARCHAR(40) NOT NULL,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB;
CREATE TABLE transfers (
  id VARCHAR(60) PRIMARY KEY,
  transfer_number VARCHAR(40) NOT NULL,
  from_outlet VARCHAR(30) NOT NULL,
  to_outlet VARCHAR(30) NOT NULL,
  item_name VARCHAR(140) NOT NULL,
  quantity INT NOT NULL,
  status VARCHAR(40) NOT NULL,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB;
CREATE TABLE requisitions (
  id VARCHAR(60) PRIMARY KEY,
  req_number VARCHAR(40) NOT NULL,
  outlet VARCHAR(30) NOT NULL,
  item_name VARCHAR(140) NOT NULL,
  quantity INT NOT NULL,
  status VARCHAR(40) NOT NULL,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB;
CREATE TABLE stock_takes (
  id VARCHAR(60) PRIMARY KEY,
  item_name VARCHAR(140) NOT NULL,
  counted INT NOT NULL,
  variance INT NOT NULL,
  user VARCHAR(120) NOT NULL,
  counted_at DATETIME NOT NULL
) ENGINE=InnoDB;
CREATE TABLE housekeeping_tasks (
  id VARCHAR(40) PRIMARY KEY,
  room_number VARCHAR(20) NOT NULL,
  floor INT NOT NULL,
  room_type VARCHAR(120) NOT NULL,
  status VARCHAR(30) NOT NULL,
  priority VARCHAR(30) NOT NULL,
  assignee VARCHAR(120) NOT NULL,
  due_at DATETIME NOT NULL,
  notes TEXT
) ENGINE=InnoDB;
CREATE TABLE maintenance_tickets (
  id VARCHAR(40) PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  room_number VARCHAR(20) NULL,
  category VARCHAR(40) NOT NULL,
  priority VARCHAR(30) NOT NULL,
  status VARCHAR(40) NOT NULL,
  assignee VARCHAR(120) NOT NULL,
  reported_by VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL,
  description TEXT
) ENGINE=InnoDB;
CREATE TABLE folios (
  id VARCHAR(40) PRIMARY KEY,
  guest_name VARCHAR(160) NOT NULL,
  room_number VARCHAR(20) NULL,
  balance DECIMAL(12,2) NOT NULL,
  status VARCHAR(30) NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB;
CREATE TABLE invoices (
  id VARCHAR(40) PRIMARY KEY,
  invoice_number VARCHAR(40) NOT NULL,
  guest_name VARCHAR(160) NOT NULL,
  outlet VARCHAR(40) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(30) NOT NULL,
  issued_at DATE NOT NULL
) ENGINE=InnoDB;
CREATE TABLE payments (
  id VARCHAR(40) PRIMARY KEY,
  payment_number VARCHAR(40) NOT NULL,
  guest_name VARCHAR(160) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  method VARCHAR(40) NOT NULL,
  status VARCHAR(30) NOT NULL,
  reference VARCHAR(60) NOT NULL,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB;
CREATE TABLE campaigns (
  id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  segment VARCHAR(60) NOT NULL,
  channel VARCHAR(60) NOT NULL,
  audience INT NOT NULL,
  sent INT NOT NULL,
  status VARCHAR(30) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE feedback (
  id VARCHAR(40) PRIMARY KEY,
  guest_name VARCHAR(160) NOT NULL,
  rating INT NOT NULL,
  comment TEXT NOT NULL,
  resolved TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB;
CREATE TABLE shifts (
  id VARCHAR(40) PRIMARY KEY,
  staff_name VARCHAR(160) NOT NULL,
  department VARCHAR(80) NOT NULL,
  shift VARCHAR(40) NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(30) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE events (
  id VARCHAR(40) PRIMARY KEY,
  event_name VARCHAR(180) NOT NULL,
  client_name VARCHAR(160) NOT NULL,
  hall VARCHAR(80) NOT NULL,
  date DATE NOT NULL,
  pax INT NOT NULL,
  deposit DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  status VARCHAR(30) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE audit_logs (
  id VARCHAR(40) PRIMARY KEY,
  timestamp DATETIME NOT NULL,
  actor VARCHAR(120) NOT NULL,
  module VARCHAR(60) NOT NULL,
  action VARCHAR(180) NOT NULL,
  ip_address VARCHAR(60) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE printer_settings (
  setting_key VARCHAR(60) PRIMARY KEY,
  setting_value JSON NOT NULL
) ENGINE=InnoDB;
SQL;
foreach (explode(';', $schema) as $statement) {
    $statement = trim($statement);
    if ($statement !== '') $pdo->exec($statement);
}
$pdo->exec('SET FOREIGN_KEY_CHECKS = 1');

function ins(PDO $pdo, string $table, array $data): void {
    $columns = array_keys($data);
    $placeholders = array_map(fn($c) => ':' . $c, $columns);
    $sql = sprintf('INSERT INTO `%s` (%s) VALUES (%s)', $table, implode(',', array_map(fn($c) => "`$c`", $columns)), implode(',', $placeholders));
    $statement = $pdo->prepare($sql);
    foreach ($data as $key => $value) {
        $statement->bindValue(':' . $key, $value);
    }
    $statement->execute();
}

$roles = hayata_access_roles();
foreach ($roles as [$name, $label]) ins($pdo, 'roles', ['id' => strtolower($name), 'name' => $name, 'label' => $label]);

$permissionKeys = hayata_access_permission_keys();
foreach ($permissionKeys as $key) ins($pdo, 'permissions', ['permission_key' => $key, 'label' => hayata_access_permission_label($key)]);

$permissionRows = $pdo->query('SELECT id, permission_key FROM permissions')->fetchAll(PDO::FETCH_KEY_PAIR);
$permissionIds = array_flip($permissionRows);
function grant(PDO $pdo, array $permissionIds, string $role, array $keys): void {
    foreach ($keys as $key) {
        if (isset($permissionIds[$key])) ins($pdo, 'role_permissions', ['role_id' => strtolower($role), 'permission_id' => $permissionIds[$key]]);
    }
}
foreach (hayata_access_grants() as $role => $keys) grant($pdo, $permissionIds, $role, $keys);

$users = hayata_access_users();
foreach ($users as [$id, $name, $email, $role, $department]) {
    ins($pdo, 'users', [
        'id' => $id, 'name' => $name, 'email' => $email,
        'password_hash' => password_hash('demo123', PASSWORD_DEFAULT),
        'role_id' => strtolower($role), 'department' => $department,
        'status' => 'Active', 'last_active' => 'Just now',
    ]);
}

$roomTypes = [
    ['rt-001','Deluxe King','DLX-K',185,2,14,'["King bed","Rain shower","Fast Wi-Fi"]'],
    ['rt-002','Deluxe Twin','DLX-T',165,2,10,'["Two single beds","Rain shower","Fast Wi-Fi"]'],
    ['rt-003','Executive Suite','EXE-S',320,3,8,'["Lounge","King bed","Bathtub"]'],
    ['rt-004','Hayata Suite','HYT-S',475,4,5,'["Living room","Dining room","Butler service"]'],
    ['rt-005','Accessible King','ACC-K',175,2,3,'["Step-free","Roll-in shower","Safety rails"]'],
];
foreach ($roomTypes as $row) ins($pdo, 'room_types', array_combine(['id','name','code','base_rate','capacity','total_rooms','amenities'], $row));

$statuses = ['Occupied','Available','Dirty','Occupied','Clean','Reserved','Occupied','Available','Out of Order','Occupied'];
for ($index = 0; $index < 40; $index++) {
    $floor = intdiv($index, 10) + 1;
    $number = $floor . str_pad((string) (($index % 10) + 1), 2, '0', STR_PAD_LEFT);
    $type = $roomTypes[$index % 5];
    $status = $statuses[$index % 10];
    ins($pdo, 'rooms', [
        'id' => 'room-' . $number, 'number' => $number, 'floor' => $floor, 'type' => $type[1],
        'status' => $status, 'guest_name' => $status === 'Occupied' ? $users[$index % 10][1] : null,
        'housekeeping_status' => $status === 'Dirty' ? 'Dirty' : ($status === 'Clean' ? 'Clean' : 'Inspected'),
        'rate' => $type[3], 'updated_at' => date('Y-m-d H:i:s', time() - $index * 3600),
    ]);
}

$firstNames = ['Olivia','Noah','Emma','Liam','Ava','Ethan','Sophia','Mason','Isabella','Lucas','Mia','Amir','Yuki','Zara','Mateo','Layla','James','Fatima','Henrik','Priya','Chloe','Rafael','Nora','Samuel','Aisha'];
$lastNames = ['Bennett','Rivera','Chen','Patel','Morgan','Kim','Silva','Wilson','Tanaka','Hassan','Martin','Nguyen','Andersson','Santos','Khan','Rossi','Dubois','Williams','Yilmaz','Brown','Laurent','Okafor','Novak','Fischer','Santana'];
$guestIds = [];
foreach ($firstNames as $index => $firstName) {
    $id = 'guest-' . str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT);
    $guestIds[] = $id;
    ins($pdo, 'guests', [
        'id' => $id, 'first_name' => $firstName, 'last_name' => $lastNames[$index],
        'email' => strtolower($firstName) . '.' . strtolower($lastNames[$index]) . '@example.com',
        'phone' => '+1 (555) ' . (120 + $index) . '-' . (1000 + $index * 37),
        'nationality' => ['United States','United Kingdom','Canada','Japan','UAE'][$index % 5],
        'segment' => ['VIP','Regular','Repeat','Corporate'][$index % 4],
        'lifecycle' => 'Active guest', 'tier' => ['Bronze','Silver','Gold','Platinum'][$index % 4],
        'points' => ($index + 2) * 470, 'spend_total' => 1800 + $index * 615,
        'open_balance' => $index % 6 === 0 ? 280 + $index * 22 : 0, 'stays' => ($index % 8) + 1,
        'last_stay' => date('Y-m-d', time() - ($index % 45 + 2) * 86400), 'next_stay' => null,
        'preferences' => '["Quiet room","Extra pillows"]', 'notes' => 'Profile imported from booking platform.',
        'created_at' => date('Y-m-d H:i:s', time() - ($index * 23 + 40) * 86400),
    ]);
}

$reservationStatuses = ['Checked in','Checked in','Checked in','Checked in','Checked out','Checked out','Checked out'];
for ($index = 0; $index < 30; $index++) {
    $guestIndex = $index % 25;
    $type = $roomTypes[$index % 5];
    $status = $reservationStatuses[$index] ?? ($index === 11 ? 'Pending' : ($index === 21 ? 'No-show' : ($index === 26 ? 'Cancelled' : 'Confirmed')));
    ins($pdo, 'reservations', [
        'id' => 'res-' . str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT),
        'guest_id' => $guestIds[$guestIndex],
        'guest_name' => $firstNames[$guestIndex] . ' ' . $lastNames[$guestIndex],
        'room_type' => $type[1], 'room_number' => $index < 7 ? ($floorNumber = (intdiv(($index + 2) % 40, 10) + 1) . str_pad((string) ((($index + 2) % 10) + 1), 2, '0', STR_PAD_LEFT)) : null,
        'check_in' => date('Y-m-d', time() + ($index - 7) * 86400),
        'check_out' => date('Y-m-d', time() + ($index - 4) * 86400),
        'adults' => $index % 5 === 0 ? 2 : 1, 'children' => $index % 9 === 0 ? 2 : 0,
        'status' => $status, 'source' => ['Direct','Booking.com','Expedia','Corporate','Walk-in'][$index % 5],
        'channel' => null, 'rate_plan' => $index % 3 === 0 ? 'Flexible' : 'Non-refundable',
        'rate' => $type[3], 'deposit' => $index % 2 === 0 ? round($type[3] * 0.25) : 0,
        'add_ons' => '[]', 'total' => $type[3] * 3,
    ]);
}

$image = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
$menu = [
    ['menu-001','Truffle Burrata','Starters','RESTAURANT',18,6.2,'Cold',$image,'Heirloom tomato, basil oil, aged balsamic',8],
    ['menu-002','Grilled Octopus','Starters','RESTAURANT',24,9.1,'Hot',$image,'Saffron potatoes, smoked paprika',14],
    ['menu-003','Caesar Salad','Starters','RESTAURANT',15,5.3,'Cold',$image,'Romaine, parmesan, sourdough crumb',7],
    ['menu-004','Atlantic Salmon','Mains','RESTAURANT',32,14.8,'Hot',$image,'Risotto, charred asparagus',18],
    ['menu-005','Hayata Wagyu Burger','Mains','RESTAURANT',28,12.4,'Hot',$image,'Aged cheddar, truffle fries',15],
    ['menu-006','Herb Chicken','Mains','RESTAURANT',26,9.6,'Hot',$image,'Salsa verde, crispy potato',20],
    ['menu-007','Wild Mushroom Risotto','Mains','RESTAURANT',23,8.3,'Hot',$image,'Porcini, parmesan, truffle oil',22],
    ['menu-008','Tiramisu','Desserts','RESTAURANT',12,3.7,'Pastry',$image,'Espresso, mascarpone, cocoa',6],
    ['menu-009','Chocolate Fondue','Desserts','RESTAURANT',14,5.1,'Pastry',$image,'Seasonal fruit, hazelnut praline',10],
    ['menu-010','Sourdough Toast','Breakfast','RESTAURANT',9,2.6,'Cold',$image,'Whipped butter, preserves',5],
    ['menu-011','Espresso Martini','Cocktails','BAR',16,4.2,'Bar',$image,'Vodka, espresso, vanilla syrup',5],
    ['menu-012','Mojito','Cocktails','BAR',14,3.5,'Bar',$image,'White rum, lime, mint, soda',4],
    ['menu-013','Old Fashioned','Cocktails','BAR',18,5.4,'Bar',$image,'Bourbon, orange bitters, smoke',6],
    ['menu-014','Aperol Spritz','Cocktails','BAR',15,4.1,'Bar',$image,'Aperol, prosecco, soda',4],
    ['menu-015','Belgian IPA','Beer','BAR',9,3.2,'Bar',$image,'Draft 330ml · 5.8% ABV',2],
    ['menu-016','Sauvignon Blanc','Wine','BAR',13,5.2,'Bar',$image,'Glass · Marlborough 2023',2],
    ['menu-017','Cabernet Sauvignon','Wine','BAR',15,6.1,'Bar',$image,'Glass · Napa Valley 2022',2],
    ['menu-018','Single Malt','Spirits','BAR',22,8.6,'Bar',$image,'12-year Highland single malt',3],
    ['menu-019','Gin & Tonic','Spirits','BAR',12,4.3,'Bar',$image,'London dry gin, tonic, rosemary',3],
    ['menu-020','Fresh Orange Juice','Soft drinks','BAR',8,2.4,'Bar',$image,'Freshly squeezed Valencia orange',3],
];
foreach ($menu as $index => $row) {
    ins($pdo, 'menu_items', [
        'id' => $row[0], 'name' => $row[1], 'category' => $row[2], 'outlet' => $row[3],
        'price' => $row[4], 'cost' => $row[5], 'available' => 1, 'image' => $row[7],
        'description' => $row[8], 'station' => $row[6], 'age_restricted' => in_array($row[0], ['menu-015','menu-016','menu-017','menu-018','menu-019']) ? 1 : 0,
        'prep_minutes' => $row[9], 'recipe' => '[]',
    ]);
}

for ($index = 1; $index <= 14; $index++) {
    ins($pdo, 'restaurant_tables', [
        'id' => 'table-' . str_pad((string) $index, 2, '0', STR_PAD_LEFT),
        'name' => 'T' . $index, 'seats' => $index < 9 ? 2 : ($index < 13 ? 4 : 6),
        'status' => ['Free','Seated','Ordered','Bill requested'][$index % 4],
        'area' => $index < 10 ? 'Main dining' : ($index < 13 ? 'Terrace' : 'Private'),
        'server' => ['Leo Martins','Mia Torres','Noah Brooks'][$index % 3],
    ]);
}

for ($index = 1; $index <= 12; $index++) {
    $isBar = $index >= 9;
    $orderId = 'order-' . $index;
    $subtotal = 18 + $index * 3;
    ins($pdo, 'orders', [
        'id' => $orderId, 'order_number' => ($isBar ? 'B-' : 'R-') . (1041 + $index),
        'outlet' => $isBar ? 'BAR' : 'RESTAURANT', 'type' => $index % 6 === 0 ? 'Takeaway' : ($index % 9 === 0 ? 'Room service' : 'Dine-in'),
        'status' => ['New','Preparing','Ready','Served','Paid'][$index % 5],
        'guest_name' => $index % 4 === 0 ? $firstNames[$index % 25] . ' ' . $lastNames[$index % 25] : null,
        'room_number' => $index % 9 === 0 ? '101' : null,
        'server' => $isBar ? 'Maya Thompson' : 'Leo Martins',
        'created_at' => date('Y-m-d H:i:s', time() - intdiv($index, 3) * 3600),
        'subtotal' => $subtotal, 'discount' => 0, 'tax' => round($subtotal * 0.08, 2),
        'tip' => 0, 'total' => round($subtotal * 1.08, 2),
        'payment_status' => $index % 5 === 4 ? 'Paid' : 'Unpaid',
        'source' => 'POS', 'instructions' => null,
    ]);
    ins($pdo, 'order_items', [
        'id' => 'oi-' . $index . '-1', 'order_id' => $orderId,
        'menu_item_id' => 'menu-' . str_pad((string) (($index % 20) + 1), 3, '0', STR_PAD_LEFT),
        'name' => $menu[$index % 20][1], 'quantity' => 2, 'price' => $menu[$index % 20][4],
        'modifiers' => '[]', 'station' => $menu[$index % 20][6],
    ]);
}

$inventoryNames = ['Coca-Cola 330ml','Fresh Tomatoes','Arabica Coffee Beans','Bottled Water 500ml','Chicken Breast','Olive Oil 1L','Basmati Rice 5kg','Atlantic Salmon','Premium Beef Tenderloin','Linen Sheet Set','Shampoo 250ml','Bath Towel Set','Cleaning Solution 5L','Latex Gloves','Sea Salt','Espresso Cups','Dry Red Wine','Belgian Beer 330ml','Gin 750ml','Orange Juice 1L'];
$outlets = ['STORE','RESTAURANT','BAR','HOUSEKEEPING'];
for ($index = 0; $index < 60; $index++) {
    $baseName = $inventoryNames[$index % 20];
    $name = $index >= 20 ? $baseName . ' ' . ['Large','Premium','Organic','Bulk'][intdiv($index, 20) - 1] : $baseName;
    $id = 'inv-' . str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT);
    $outlet = $outlets[$index % 4];
    $cost = 2 + ($index % 18) * 1.5;
    $stock = 8 + ($index % 30);
    ins($pdo, 'inventory_items', [
        'id' => $id, 'name' => $name, 'sku' => substr($outlet, 0, 2) . '-' . (1000 + $index),
        'outlet' => $outlet, 'category' => ['Beverages','Produce','Dry goods','Meat & seafood','Housekeeping'][$index % 5],
        'unit' => ['Bottle','Kg','Pack','Litre','Each'][$index % 5], 'cost' => $cost,
        'price' => round($cost * 1.3, 2), 'supplier_id' => 'sup-' . str_pad((string) (($index % 10) + 1), 3, '0', STR_PAD_LEFT),
        'reorder_point' => 10 + ($index % 8), 'reorder_qty' => 20, 'batch' => 'B' . (2400 + $index),
        'expiry' => $index % 7 === 0 ? date('Y-m-d', time() + 20 * 86400) : null,
        'location' => 'Store A-' . ($index % 12 + 1), 'bin' => chr(65 + ($index % 4)) . '-' . str_pad((string) ($index % 18 + 1), 2, '0', STR_PAD_LEFT),
        'stock' => $stock, 'maximum_stock' => 100, 'barcode' => '890' . (900000000 + $index * 761),
        'last_updated' => date('Y-m-d H:i:s', time() - $index * 600),
    ]);
    if ($index < 15) {
        ins($pdo, 'stock_alerts', [
            'id' => 'alert-' . str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT),
            'item_id' => $id, 'item_name' => $name, 'sku' => substr($outlet, 0, 2) . '-' . (1000 + $index),
            'outlet' => $outlet, 'type' => $stock < 12 ? 'critical' : 'warning',
            'current_stock' => $stock, 'threshold' => 10 + ($index % 8), 'expiry' => null,
            'created_at' => date('Y-m-d H:i:s', time() - $index * 1800), 'acknowledged' => $index % 7 === 0 ? 1 : 0,
        ]);
    }
}

$supplierNames = ['Metro Foods','Pacific Provision','Northline Supply','Green Harvest','Aurelia Beverages','Continental Linen','Hygiene Works','Prime Meats','Summit Dry Goods','Atlas Hospitality'];
foreach ($supplierNames as $index => $name) {
    ins($pdo, 'suppliers', [
        'id' => 'sup-' . str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT), 'name' => $name,
        'contact' => 'Accounts Team', 'email' => 'orders@supplier' . ($index + 1) . '.com',
        'phone' => '+1 (555) 40' . str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT) . '-' . (1100 + $index),
        'category' => ['Food','Beverage','Housekeeping','Equipment'][$index % 4],
        'address' => (120 + $index) . ' Commerce Avenue, Metro City',
    ]);
}

for ($index = 1; $index <= 10; $index++) {
    ins($pdo, 'purchase_orders', ['id' => 'po-'.str_pad((string)$index,3,'0',STR_PAD_LEFT), 'po_number' => 'PO-2026-'.(1839+$index), 'supplier_id' => 'sup-'.str_pad((string)$index,3,'0',STR_PAD_LEFT), 'item_name' => $inventoryNames[$index], 'quantity' => 20 + $index, 'total' => 320 + $index * 45, 'status' => ['Draft','Pending approval','Approved','Partially received','Received'][$index % 5], 'created_at' => date('Y-m-d H:i:s', time() - $index * 7200)]);
    ins($pdo, 'transfers', ['id' => 'trf-'.str_pad((string)$index,3,'0',STR_PAD_LEFT), 'transfer_number' => 'TRF-'.(3101+$index), 'from_outlet' => 'STORE', 'to_outlet' => $outlets[$index % 4], 'item_name' => $inventoryNames[$index], 'quantity' => 5 + $index, 'status' => ['Requested','Approved','In transit','Fulfilled'][$index % 4], 'created_at' => date('Y-m-d H:i:s', time() - $index * 5400)]);
    ins($pdo, 'requisitions', ['id' => 'req-'.str_pad((string)$index,3,'0',STR_PAD_LEFT), 'req_number' => 'REQ-'.(2040+$index), 'outlet' => $outlets[$index % 4], 'item_name' => $inventoryNames[$index], 'quantity' => 3 + $index, 'status' => ['Requested','Approved','Fulfilled'][$index % 3], 'created_at' => date('Y-m-d H:i:s', time() - $index * 3600)]);
    ins($pdo, 'stock_takes', ['id' => 'st-'.str_pad((string)$index,3,'0',STR_PAD_LEFT), 'item_name' => $inventoryNames[$index], 'counted' => 20 + $index, 'variance' => ($index % 3) - 1, 'user' => $users[$index % 10][1], 'counted_at' => date('Y-m-d H:i:s', time() - $index * 86400)]);
    ins($pdo, 'folios', ['id' => 'folio-'.str_pad((string)$index,3,'0',STR_PAD_LEFT), 'guest_name' => $firstNames[$index].' '.$lastNames[$index], 'room_number' => str_pad((string)$index,3,'0',STR_PAD_LEFT), 'balance' => 400 + $index * 110, 'status' => $index % 4 === 0 ? 'Overdue' : 'Open', 'updated_at' => date('Y-m-d H:i:s', time() - $index * 1800)]);
    ins($pdo, 'invoices', ['id' => 'inv-doc-'.str_pad((string)$index,3,'0',STR_PAD_LEFT), 'invoice_number' => 'INV-2026-'.(700+$index), 'guest_name' => $firstNames[$index].' '.$lastNames[$index], 'outlet' => ['Rooms','Restaurant','Bar'][$index % 3], 'amount' => 180 + $index * 32, 'status' => ['Paid','Pending','Partial','Overdue'][$index % 4], 'issued_at' => date('Y-m-d', time() - $index * 86400)]);
    ins($pdo, 'payments', ['id' => 'pay-'.str_pad((string)$index,3,'0',STR_PAD_LEFT), 'payment_number' => 'PAY-'.(5000+$index), 'guest_name' => $firstNames[$index].' '.$lastNames[$index], 'amount' => 180 + $index * 32, 'method' => ['Cash','Card','Bank transfer','Room charge'][$index % 4], 'status' => ['Paid','Pending','Refunded'][$index % 3], 'reference' => 'REF-'.(9000+$index), 'created_at' => date('Y-m-d H:i:s', time() - $index * 7200)]);
    ins($pdo, 'campaigns', ['id' => 'cmp-'.$index, 'name' => ['Spring Reopening','VIP Weekend','Birthday Note','Corporate Offer'][$index % 4].' '.$index, 'segment' => ['VIP','Repeat','Corporate'][$index % 3], 'channel' => ['Email','SMS','In-app'][$index % 3], 'audience' => 200 + $index * 37, 'sent' => 150 + $index * 29, 'status' => ['Draft','Scheduled','Sent'][$index % 3]]);
    ins($pdo, 'feedback', ['id' => 'fb-'.$index, 'guest_name' => $firstNames[$index].' '.$lastNames[$index], 'rating' => 3 + ($index % 3), 'comment' => 'Lovely stay, thoughtful service.', 'resolved' => $index % 4 === 0 ? 0 : 1, 'created_at' => date('Y-m-d H:i:s', time() - $index * 86400)]);
    ins($pdo, 'shifts', ['id' => 'shift-'.$index, 'staff_name' => $users[$index % 10][1], 'department' => $users[$index % 10][4], 'shift' => ['Morning','Evening','Night'][$index % 3], 'date' => date('Y-m-d', time() + ($index % 7) * 86400), 'status' => ['Scheduled','Clocked in','Completed'][$index % 3]]);
    ins($pdo, 'events', ['id' => 'evt-'.$index, 'event_name' => ['Wedding Reception','Corporate Retreat','Birthday Dinner','Product Launch'][$index % 4].' '.$index, 'client_name' => $firstNames[$index].' '.$lastNames[$index], 'hall' => ['Grand Ballroom','Terrace','Atlas Room'][$index % 3], 'date' => date('Y-m-d', time() + $index * 86400), 'pax' => 40 + $index * 15, 'deposit' => 500 + $index * 90, 'total' => 2500 + $index * 400, 'status' => ['Enquiry','Confirmed','Completed'][$index % 3]]);
    ins($pdo, 'audit_logs', ['id' => 'audit-'.$index, 'timestamp' => date('Y-m-d H:i:s', time() - $index * 3600), 'actor' => $users[$index % 10][1], 'module' => ['Reservation','Inventory','Billing','Guest'][$index % 4], 'action' => 'Record updated', 'ip_address' => '10.24.'.($index % 8).'.'.(20+$index)]);
}

for ($index = 1; $index <= 12; $index++) {
    ins($pdo, 'housekeeping_tasks', ['id' => 'task-'.$index, 'room_number' => str_pad((string)$index,3,'0',STR_PAD_LEFT), 'floor' => 1, 'room_type' => $roomTypes[$index % 5][1], 'status' => ['Dirty','In Progress','Inspected','Clean'][$index % 4], 'priority' => ['Low','Normal','High','Urgent'][$index % 4], 'assignee' => $users[3][1], 'due_at' => date('Y-m-d H:i:s', time() + $index * 3600), 'notes' => null]);
    ins($pdo, 'maintenance_tickets', ['id' => 'mnt-'.str_pad((string)$index,3,'0',STR_PAD_LEFT), 'title' => ['HVAC not cooling','Leaking tap','Light flickering','Door lock issue'][$index % 4], 'room_number' => str_pad((string)$index,3,'0',STR_PAD_LEFT), 'category' => ['HVAC','Plumbing','Electrical','General'][$index % 4], 'priority' => ['Low','Medium','High','Critical'][$index % 4], 'status' => ['Open','Assigned','In progress','Resolved'][$index % 4], 'assignee' => 'Unassigned', 'reported_by' => $users[$index % 10][1], 'created_at' => date('Y-m-d H:i:s', time() - $index * 7200), 'description' => 'Reported by guest or housekeeping.']);
}

ins($pdo, 'printer_settings', [
    'setting_key' => 'default',
    'setting_value' => json_encode(['enabled' => true, 'bridgeHost' => '127.0.0.1', 'bridgePort' => '8787', 'printerIp' => '127.0.0.1', 'printerPort' => '9100', 'authToken' => '', 'paperWidth' => '80mm', 'copies' => 1]),
]);

$pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
echo "hayata_data created and seeded successfully.\n";
echo 'Roles: ' . $pdo->query('SELECT COUNT(*) FROM roles')->fetchColumn() . "\n";
echo 'Users: ' . $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() . "\n";
echo 'Rooms: ' . $pdo->query('SELECT COUNT(*) FROM rooms')->fetchColumn() . "\n";
echo 'Reservations: ' . $pdo->query('SELECT COUNT(*) FROM reservations')->fetchColumn() . "\n";
echo 'Inventory items: ' . $pdo->query('SELECT COUNT(*) FROM inventory_items')->fetchColumn() . "\n";
