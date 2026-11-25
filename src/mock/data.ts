import { addDays, formatISO, subDays } from 'date-fns'
import type {
  Activity,
  AuditLog,
  Campaign,
  EventBooking,
  Feedback,
  Guest,
  HousekeepingTask,
  InventoryItem,
  Invoice,
  MaintenanceTicket,
  MenuItem,
  Order,
  Payment,
  PurchaseOrder,
  Requisition,
  Reservation,
  RestaurantTable,
  Room,
  RoomType,
  Shift,
  StockAlert,
  StockMovement,
  Supplier,
  Transfer,
  User,
} from '@/types/domain'

const now = new Date()
const day = (offset: number) => formatISO(addDays(now, offset), { representation: 'date' })
const timestamp = (offset: number) => formatISO(addDays(now, offset), { representation: 'date' })

export const demoUsers: User[] = [
  { id: 'usr-001', name: 'Elena Vasquez', email: 'elena@hayatahotel.com', role: 'SUPER_ADMIN', department: 'Executive', status: 'Active', lastActive: 'Just now' },
  { id: 'usr-002', name: 'Marcus Chen', email: 'marcus@hayatahotel.com', role: 'HOTEL_MANAGER', department: 'Operations', status: 'Active', lastActive: '2 min ago' },
  { id: 'usr-003', name: 'Amara Okafor', email: 'amara@hayatahotel.com', role: 'FRONT_DESK', department: 'Front Office', status: 'Active', lastActive: '5 min ago' },
  { id: 'usr-004', name: 'Sofia Marin', email: 'sofia@hayatahotel.com', role: 'HOUSEKEEPING', department: 'Housekeeping', status: 'Active', lastActive: '11 min ago' },
  { id: 'usr-005', name: 'Daniel Kim', email: 'daniel@hayatahotel.com', role: 'RESTAURANT_MANAGER', department: 'Restaurant', status: 'Active', lastActive: '3 min ago' },
  { id: 'usr-006', name: 'Nina Patel', email: 'nina@hayatahotel.com', role: 'BAR_MANAGER', department: 'Bar', status: 'Active', lastActive: '8 min ago' },
  { id: 'usr-007', name: 'Omar Haddad', email: 'omar@hayatahotel.com', role: 'STORE_MANAGER', department: 'Procurement', status: 'Active', lastActive: '1 min ago' },
  { id: 'usr-008', name: 'Grace Liu', email: 'grace@hayatahotel.com', role: 'ACCOUNTANT', department: 'Finance', status: 'Active', lastActive: '20 min ago' },
  { id: 'usr-009', name: 'Leo Martins', email: 'leo@hayatahotel.com', role: 'WAITER', department: 'Restaurant', status: 'Active', lastActive: '4 min ago' },
  { id: 'usr-010', name: 'Maya Thompson', email: 'maya@hayatahotel.com', role: 'BARTENDER', department: 'Bar', status: 'Active', lastActive: '7 min ago' },
  { id: 'usr-011', name: 'Ada Nwosu', email: 'ada@hayatahotel.com', role: 'FOOD_BEVERAGE_STAFF', department: 'Food & Beverage', status: 'Active', lastActive: '3 min ago' },
  { id: 'usr-012', name: 'Tobias Reed', email: 'admin@hayatahotel.com', role: 'ADMIN', department: 'Finance', status: 'Active', lastActive: 'Just now' },
  { id: 'usr-013', name: 'Priya Shah', email: 'approver@hayatahotel.com', role: 'APPROVER', department: 'Finance', status: 'Active', lastActive: '2 min ago' },
  { id: 'usr-014', name: 'Victor Cole', email: 'auditor@hayatahotel.com', role: 'AUDITOR', department: 'Finance', status: 'Active', lastActive: '6 min ago' },
  { id: 'usr-015', name: 'Noah Bell', email: 'viewer@hayatahotel.com', role: 'VIEWER', department: 'Finance', status: 'Active', lastActive: '9 min ago' },
]

export const roomTypes: RoomType[] = [
  { id: 'rt-001', name: 'Deluxe King', code: 'DLX-K', baseRate: 185, capacity: 2, totalRooms: 14, amenities: ['King bed', 'City view', 'Rain shower'] },
  { id: 'rt-002', name: 'Deluxe Twin', code: 'DLX-T', baseRate: 165, capacity: 2, totalRooms: 10, amenities: ['Twin beds', 'City view', 'Work desk'] },
  { id: 'rt-003', name: 'Executive Suite', code: 'EXE-S', baseRate: 320, capacity: 3, totalRooms: 8, amenities: ['Lounge', 'King bed', 'Bathtub'] },
  { id: 'rt-004', name: 'Hayata Suite', code: 'HYT-S', baseRate: 475, capacity: 4, totalRooms: 5, amenities: ['Living room', 'Dining', 'Butler service'] },
  { id: 'rt-005', name: 'Accessible King', code: 'ACC-K', baseRate: 175, capacity: 2, totalRooms: 3, amenities: ['Wheelchair access', 'Roll-in shower', 'Safety rails'] },
]

export const rooms: Room[] = Array.from({ length: 40 }, (_, index) => {
  const floor = Math.floor(index / 10) + 1
  const number = `${floor}${String((index % 10) + 1).padStart(2, '0')}`
  const type = roomTypes[index % roomTypes.length]
  const statuses: Room['status'][] = ['Occupied', 'Available', 'Dirty', 'Occupied', 'Clean', 'Reserved', 'Occupied', 'Available', 'Out of Order', 'Occupied']
  const status = statuses[index % statuses.length]
  return {
    id: `room-${number}`,
    number,
    floor,
    type: type.name,
    status,
    guestName: status === 'Occupied' ? demoUsers[index % demoUsers.length].name : undefined,
    housekeepingStatus: status === 'Dirty' ? 'Dirty' : status === 'Clean' ? 'Clean' : index % 3 === 0 ? 'In Progress' : 'Clean',
    rate: type.baseRate,
    updatedAt: timestamp(-Math.floor(index / 8)),
  }
})

const firstNames = ['Olivia', 'Noah', 'Emma', 'Liam', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'Lucas', 'Mia', 'Amir', 'Yuki', 'Zara', 'Mateo', 'Layla', 'James', 'Fatima', 'Henrik', 'Priya', 'Chloe', 'Rafael', 'Nora', 'Samuel', 'Aisha']
const lastNames = ['Bennett', 'Rivera', 'Chen', 'Patel', 'Morgan', 'Kim', 'Silva', 'Wilson', 'Tanaka', 'Hassan', 'Martin', 'Nguyen', 'Andersson', 'Santos', 'Khan', 'Rossi', 'Dubois', 'Williams', 'Yilmaz', 'Brown', 'Laurent', 'Okafor', 'Novak', 'Fischer', 'Santana']
const nationalities = ['United States', 'United Kingdom', 'Canada', 'Germany', 'Japan', 'UAE', 'Australia', 'France', 'Spain', 'Singapore']
const companies = ['Meridian Labs', 'Northstar Creative', 'Aperture Systems', 'Vertex Partners', 'Cobalt Consulting', 'Lumon Industries']

export const guests: Guest[] = firstNames.map((firstName, index) => {
  const tier = index % 11 === 0 ? 'Platinum' : index % 5 === 0 ? 'Gold' : index % 3 === 0 ? 'Silver' : 'Bronze'
  const segment: Guest['segment'] = index % 13 === 0 ? 'VIP' : index % 8 === 0 ? 'Corporate' : index % 7 === 0 ? 'Repeat' : index === 20 ? 'Blacklisted' : 'Regular'
  return {
    id: `guest-${String(index + 1).padStart(3, '0')}`,
    firstName,
    lastName: lastNames[index],
    email: `${firstName.toLowerCase()}.${lastNames[index].toLowerCase()}@example.com`,
    phone: `+1 (555) ${String(120 + index).padStart(3, '0')}-${String(1000 + index * 37).slice(-4)}`,
    nationality: nationalities[index % nationalities.length],
    segment,
    lifecycle: index % 9 === 0 ? 'At risk' : index % 6 === 0 ? 'First stay' : index % 3 === 0 ? 'Lead' : 'Active guest',
    tier,
    points: (index + 2) * 470,
    spendTotal: 1800 + index * 615,
    openBalance: index % 6 === 0 ? 280 + index * 22 : 0,
    stays: (index % 8) + 1,
    lastStay: day(-(index % 45) - 2),
    nextStay: index % 4 === 0 ? day(index % 12 + 2) : undefined,
    birthday: `${index % 12 + 1}/${index % 27 + 1}`,
    anniversary: index % 3 === 0 ? `${index % 12 + 1}/${index % 25 + 1}` : undefined,
    company: segment === 'Corporate' ? companies[index % companies.length] : undefined,
    preferences: [index % 2 ? 'High floor' : 'Quiet room', index % 3 ? 'Feather-free' : 'Extra pillows', index % 4 ? 'Late checkout' : 'Airport transfer'].slice(0, 2),
    notes: index % 7 === 0 ? 'Prefers quiet rooms away from elevators. VIP welcome amenity on arrival.' : index === 20 ? 'Charge disputes noted. Requires manager approval for cash refunds.' : 'Profile imported from booking platform.',
    createdAt: timestamp(-(index * 23 + 40)),
  }
})

export const reservations: Reservation[] = Array.from({ length: 30 }, (_, index) => {
  const guest = guests[index % guests.length]
  const status: Reservation['status'] = index < 4 ? 'Checked in' : index < 7 ? 'Checked out' : index === 11 ? 'Pending' : index === 21 ? 'No-show' : index === 26 ? 'Cancelled' : 'Confirmed'
  const checkIn = day(index - 7)
  const checkOut = day(index - 4)
  const rate = roomTypes[index % roomTypes.length].baseRate
  return {
    id: `res-${String(index + 1).padStart(3, '0')}`,
    guestId: guest.id,
    guestName: `${guest.firstName} ${guest.lastName}`,
    roomType: roomTypes[index % roomTypes.length].name,
    roomNumber: index < 7 ? rooms[(index + 2) % rooms.length].number : undefined,
    checkIn,
    checkOut,
    adults: index % 5 === 0 ? 2 : 1,
    children: index % 9 === 0 ? 2 : 0,
    status,
    source: (['Direct', 'Booking.com', 'Expedia', 'Corporate', 'Walk-in'] as const)[index % 5],
    ratePlan: index % 3 === 0 ? 'Flexible' : 'Non-refundable',
    rate,
    deposit: index % 2 === 0 ? Math.round(rate * 0.25) : 0,
    addOns: index % 4 === 0 ? ['Airport transfer', 'Late checkout'] : index % 3 === 0 ? ['Breakfast'] : [],
    total: rate * 3 + (index % 4 === 0 ? 85 : 0),
  }
})

const itemNames = [
  'Coca-Cola 330ml', 'Fresh Tomatoes', 'Arabica Coffee Beans', 'Bottled Water 500ml', 'Chicken Breast',
  'Olive Oil 1L', 'Basmati Rice 5kg', 'Atlantic Salmon', 'Premium Beef Tenderloin', 'Linen Sheet Set',
  'Shampoo 250ml', 'Bath Towel Set', 'Cleaning Solution 5L', 'Latex Gloves', 'Sea Salt',
  'Espresso Cups', 'Dry Red Wine', 'Belgian Beer 330ml', 'Gin 750ml', 'Orange Juice 1L',
]
const categories = ['Beverages', 'Produce', 'Dry goods', 'Meat & seafood', 'Housekeeping', 'Beverages', 'Dry goods', 'Meat & seafood', 'Meat & seafood', 'Housekeeping', 'Housekeeping', 'Housekeeping', 'Housekeeping', 'Housekeeping', 'Dry goods', 'Housekeeping', 'Beverages', 'Beverages', 'Beverages', 'Beverages']
const outlets: InventoryItem['outlet'][] = ['STORE', 'RESTAURANT', 'BAR', 'HOUSEKEEPING']

export const suppliers: Supplier[] = Array.from({ length: 10 }, (_, index) => ({
  id: `sup-${String(index + 1).padStart(3, '0')}`,
  name: ['Metro Foods Co.', 'Pacific Provisions', 'Northline Supply', 'Green Harvest', 'Aurelia Beverage', 'Continental Linen', 'HygieneWorks', 'Prime Meats & Seafood', 'Summit Dry Goods', 'Atlas Hospitality'][index],
  contactName: ['Mia Torres', 'James Liu', 'Noah Wilson', 'Sara Stein', 'David Kim', 'Amelia Jones', 'Ravi Shah', 'Elena Rossi', 'Luke Bennett', 'Zoe Carter'][index],
  email: `orders@${['metrofoods', 'pacificprov', 'northline', 'greenharvest', 'aureliabev', 'continentiallinen', 'hygieneworks', 'primemeats', 'summitdry', 'atlashosp'][index]}.com`,
  phone: `+1 (555) 40${String(index + 1).padStart(2, '0')}-${1100 + index}`,
  leadTime: 2 + (index % 6),
  paymentTerms: index % 3 === 0 ? 'Net 30' : index % 3 === 1 ? 'Net 15' : 'Due on receipt',
  itemsSupplied: 4 + index * 2,
  status: index < 3 ? 'Preferred' : index === 8 ? 'Under review' : 'Approved',
  address: `${120 + index} Commerce Avenue, Metro City`,
}))

export const inventoryItems: InventoryItem[] = Array.from({ length: 60 }, (_, index) => {
  const outlet = outlets[index % outlets.length]
  const baseName = itemNames[index % itemNames.length]
  const name = index >= itemNames.length ? `${baseName} ${['Large', 'Premium', 'Organic', 'Bulk'][Math.floor(index / itemNames.length) - 1]}` : baseName
  const reorderPoint = 12 + (index % 9)
  const low = index < 15 || index % 13 === 0
  const stock = low ? Math.max(1, reorderPoint - (index % 5) - 1) : reorderPoint + 8 + (index % 35)
  const supplier = suppliers[index % suppliers.length]
  const expiry = index % 4 === 0 ? day(9 + (index % 28)) : undefined
  return {
    id: `inv-${String(index + 1).padStart(3, '0')}`,
    name,
    sku: `${outlet.slice(0, 2)}-${String(1000 + index)}`,
    outlet,
    category: categories[index % categories.length],
    unit: index % 3 === 0 ? 'Case' : index % 3 === 1 ? 'Each' : 'Litre',
    cost: 2.4 + (index % 18) * 1.65,
    price: 4.5 + (index % 18) * 2.25,
    supplierId: supplier.id,
    reorderPoint,
    reorderQty: 18 + (index % 6) * 4,
    batch: `B${2400 + index}`,
    expiry,
    location: outlet === 'STORE' ? `Warehouse ${String.fromCharCode(65 + (index % 3))}` : outlet === 'RESTAURANT' ? 'Main kitchen' : outlet === 'BAR' ? 'Bar cellar' : 'Housekeeping store',
    bin: `${String.fromCharCode(65 + (index % 4))}-${String((index % 18) + 1).padStart(2, '0')}`,
    stock,
    maximumStock: reorderPoint * 4,
    barcode: `890${String(900000000 + index * 761)}`,
    lastUpdated: timestamp(-(index % 4)),
  }
})

export const menuItems: MenuItem[] = [
  { id: 'menu-001', name: 'Truffle Burrata', category: 'Starters', outlet: 'RESTAURANT', price: 18, cost: 7.4, available: true, image: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?auto=format&fit=crop&w=600&q=80', description: 'Heirloom tomato, basil oil, aged balsamic', station: 'Cold', prepMinutes: 8 },
  { id: 'menu-002', name: 'Grilled Octopus', category: 'Starters', outlet: 'RESTAURANT', price: 24, cost: 10.2, available: true, image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=600&q=80', description: 'Saffron potatoes, smoked paprika', station: 'Hot', prepMinutes: 14 },
  { id: 'menu-003', name: 'Caesar Salad', category: 'Starters', outlet: 'RESTAURANT', price: 15, cost: 5.3, available: true, image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=600&q=80', description: 'Romaine, parmesan, sourdough crumb', station: 'Cold', prepMinutes: 7 },
  { id: 'menu-004', name: 'Atlantic Salmon', category: 'Mains', outlet: 'RESTAURANT', price: 32, cost: 14.8, available: true, image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80', description: 'Risotto, charred asparagus, citrus beurre blanc', station: 'Hot', prepMinutes: 18 },
  { id: 'menu-005', name: 'Hayata Wagyu Burger', category: 'Mains', outlet: 'RESTAURANT', price: 28, cost: 12.4, available: true, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', description: 'Aged cheddar, truffle fries, house sauce', station: 'Hot', prepMinutes: 15 },
  { id: 'menu-006', name: 'Herb Chicken', category: 'Mains', outlet: 'RESTAURANT', price: 26, cost: 9.6, available: true, image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80', description: 'Salsa verde, crispy potato, jus', station: 'Hot', prepMinutes: 20 },
  { id: 'menu-007', name: 'Wild Mushroom Risotto', category: 'Mains', outlet: 'RESTAURANT', price: 23, cost: 8.3, available: true, image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&w=600&q=80', description: 'Porcini, parmesan, truffle oil', station: 'Hot', prepMinutes: 22 },
  { id: 'menu-008', name: 'Tiramisu', category: 'Desserts', outlet: 'RESTAURANT', price: 12, cost: 3.7, available: true, image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80', description: 'Espresso, mascarpone, cocoa', station: 'Pastry', prepMinutes: 6 },
  { id: 'menu-009', name: 'Chocolate Fondue', category: 'Desserts', outlet: 'RESTAURANT', price: 14, cost: 5.1, available: true, image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80', description: 'Seasonal fruit, hazelnut praline', station: 'Pastry', prepMinutes: 10 },
  { id: 'menu-010', name: 'Sourdough Toast', category: 'Breakfast', outlet: 'RESTAURANT', price: 9, cost: 2.6, available: true, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80', description: 'Whipped butter, preserves', station: 'Cold', prepMinutes: 5 },
  { id: 'menu-011', name: 'Espresso Martini', category: 'Cocktails', outlet: 'BAR', price: 16, cost: 4.2, available: true, image: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=600&q=80', description: 'Vodka, espresso, vanilla syrup', station: 'Bar', prepMinutes: 5 },
  { id: 'menu-012', name: 'Mojito', category: 'Cocktails', outlet: 'BAR', price: 14, cost: 3.5, available: true, image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', description: 'White rum, lime, mint, soda', station: 'Bar', prepMinutes: 4 },
  { id: 'menu-013', name: 'Old Fashioned', category: 'Cocktails', outlet: 'BAR', price: 18, cost: 5.4, available: true, image: 'https://images.unsplash.com/photo-1473973266408-ed4e27abdd47?auto=format&fit=crop&w=600&q=80', description: 'Bourbon, orange bitters, smoke', station: 'Bar', prepMinutes: 6 },
  { id: 'menu-014', name: 'Aperol Spritz', category: 'Cocktails', outlet: 'BAR', price: 15, cost: 4.1, available: true, image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80', description: 'Aperol, prosecco, soda', station: 'Bar', prepMinutes: 4 },
  { id: 'menu-015', name: 'Belgian IPA', category: 'Beer', outlet: 'BAR', price: 9, cost: 3.2, available: true, image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=600&q=80', description: 'Draft · 330ml · 5.8% ABV', station: 'Bar', prepMinutes: 2, ageRestricted: true },
  { id: 'menu-016', name: 'Sauvignon Blanc', category: 'Wine', outlet: 'BAR', price: 13, cost: 5.2, available: true, image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=600&q=80', description: 'Glass · Marlborough · 2023', station: 'Bar', prepMinutes: 2, ageRestricted: true },
  { id: 'menu-017', name: 'Cabernet Sauvignon', category: 'Wine', outlet: 'BAR', price: 15, cost: 6.1, available: true, image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80', description: 'Glass · Napa Valley · 2022', station: 'Bar', prepMinutes: 2, ageRestricted: true },
  { id: 'menu-018', name: 'Single Malt', category: 'Spirits', outlet: 'BAR', price: 22, cost: 8.6, available: true, image: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=600&q=80', description: '12-year Highland single malt', station: 'Bar', prepMinutes: 3, ageRestricted: true },
  { id: 'menu-019', name: 'Gin & Tonic', category: 'Spirits', outlet: 'BAR', price: 12, cost: 4.3, available: true, image: 'https://images.unsplash.com/photo-1608885898957-a5598a5b0c9c?auto=format&fit=crop&w=600&q=80', description: 'London dry gin, tonic, rosemary', station: 'Bar', prepMinutes: 3, ageRestricted: true },
  { id: 'menu-020', name: 'Fresh Orange Juice', category: 'Soft drinks', outlet: 'BAR', price: 8, cost: 2.4, available: true, image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=600&q=80', description: 'Freshly squeezed Valencia orange', station: 'Bar', prepMinutes: 3 },
]

export const tables: RestaurantTable[] = Array.from({ length: 14 }, (_, index) => ({
  id: `table-${String(index + 1).padStart(2, '0')}`,
  name: `T${index + 1}`,
  seats: index < 8 ? 2 : index < 12 ? 4 : 6,
  status: (['Free', 'Seated', 'Ordered', 'Bill requested'] as const)[index % 4],
  area: index < 9 ? 'Main dining' : index < 12 ? 'Terrace' : 'Private',
  server: index % 3 === 0 ? 'Leo Martins' : index % 3 === 1 ? 'Mia Torres' : 'Noah Brooks',
}))

export const orders: Order[] = Array.from({ length: 12 }, (_, index) => {
  const isBar = index >= 8
  const items = menuItems.filter((_, itemIndex) => (itemIndex + index) % 5 === 0).slice(0, isBar ? 3 : 4).map((menu, itemIndex) => ({
    id: `oi-${index}-${itemIndex}`,
    menuItemId: menu.id,
    name: menu.name,
    quantity: itemIndex === 0 ? 2 : 1,
    price: menu.price,
    modifiers: itemIndex === 1 ? ['No onions'] : [],
    station: menu.station,
  }))
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return {
    id: `order-${index + 1}`,
    orderNumber: `${isBar ? 'B' : 'R'}-${1042 + index}`,
    outlet: isBar ? 'BAR' : 'RESTAURANT',
    tableId: isBar ? undefined : tables[index % tables.length].id,
    tableName: isBar ? undefined : tables[index % tables.length].name,
    type: index % 6 === 0 ? 'Takeaway' : index % 9 === 0 ? 'Room service' : 'Dine-in',
    status: (['New', 'Preparing', 'Ready', 'Served', 'Paid'] as const)[index % 5],
    items,
    guestName: index % 4 === 0 ? guests[index % guests.length].firstName + ' ' + guests[index % guests.length].lastName : undefined,
    roomNumber: index % 9 === 0 ? rooms[index % rooms.length].number : undefined,
    server: isBar ? 'Maya Thompson' : index % 2 ? 'Mia Torres' : 'Leo Martins',
    createdAt: timestamp(-Math.floor(index / 3)),
    subtotal,
    discount: index % 5 === 0 ? Math.round(subtotal * 0.1) : 0,
    tax: Math.round(subtotal * 0.08 * 100) / 100,
    tip: index % 3 === 0 ? Math.round(subtotal * 0.15) : 0,
    total: Math.round((subtotal + subtotal * 0.08) * 100) / 100,
    paymentStatus: index % 5 === 4 ? 'Paid' : 'Unpaid',
  }
})

export const stockMovements: StockMovement[] = Array.from({ length: 50 }, (_, index) => {
  const item = inventoryItems[index % inventoryItems.length]
  const type: StockMovement['type'] = (['Sale', 'Purchase Receipt', 'Transfer', 'Wastage', 'Adjustment', 'Return', 'Requisition'] as const)[index % 7]
  const quantityOut = type === 'Purchase Receipt' || type === 'Return' ? 0 : 1 + (index % 5)
  const quantityIn = type === 'Purchase Receipt' || type === 'Return' ? 8 + (index % 12) : 0
  return {
    id: `mov-${String(index + 1).padStart(4, '0')}`,
    itemId: item.id,
    itemName: item.name,
    sku: item.sku,
    outlet: item.outlet,
    type,
    quantityIn,
    quantityOut,
    runningBalance: Math.max(0, item.stock + quantityIn - quantityOut),
    user: demoUsers[index % demoUsers.length].name,
    timestamp: `${timestamp(-Math.floor(index / 5))} ${String(8 + (index % 10)).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}`,
    reference: `${type === 'Sale' ? 'POS' : type === 'Purchase Receipt' ? 'GRN' : type === 'Transfer' ? 'TRF' : 'ADJ'}-${1000 + index}`,
    note: type === 'Wastage' ? 'Quality check removal' : undefined,
  }
})

export const stockAlerts: StockAlert[] = inventoryItems.slice(0, 15).map((item, index) => ({
  id: `alert-${String(index + 1).padStart(3, '0')}`,
  itemId: item.id,
  itemName: item.name,
  sku: item.sku,
  outlet: item.outlet,
  type: item.stock < item.reorderPoint - 2 ? 'critical' : 'warning',
  currentStock: item.stock,
  threshold: item.reorderPoint,
  expiry: item.expiry,
  createdAt: timestamp(-(index % 4)),
  acknowledged: index % 7 === 0,
}))

export const purchaseOrders: PurchaseOrder[] = Array.from({ length: 10 }, (_, index) => ({
  id: `po-${String(index + 1).padStart(3, '0')}`,
  poNumber: `PO-2026-${String(1840 + index)}`,
  supplierId: suppliers[index % suppliers.length].id,
  supplierName: suppliers[index % suppliers.length].name,
  status: (['Draft', 'Pending approval', 'Approved', 'Sent', 'Partially received', 'Received'] as const)[index % 6],
  createdAt: day(-index),
  expectedDate: day(index % 7 + 2),
  total: 680 + index * 342,
  itemCount: 3 + (index % 8),
  createdBy: demoUsers[6].name,
}))

export const requisitions: Requisition[] = Array.from({ length: 8 }, (_, index) => ({
  id: `req-${String(index + 1).padStart(3, '0')}`,
  reqNumber: `REQ-${2041 + index}`,
  outlet: outlets[index % 4],
  itemId: inventoryItems[index].id,
  itemName: inventoryItems[index].name,
  quantity: 2 + (index % 8),
  requestedBy: demoUsers[(index + 3) % demoUsers.length].name,
  status: (['Pending', 'Approved', 'Fulfilled', 'Rejected'] as const)[index % 4],
  createdAt: day(-index),
  note: index % 3 === 0 ? 'Needed for weekend service' : undefined,
}))

export const transfers: Transfer[] = Array.from({ length: 7 }, (_, index) => ({
  id: `trf-${String(index + 1).padStart(3, '0')}`,
  transferNumber: `TRF-${3102 + index}`,
  fromOutlet: index % 2 ? 'STORE' : 'RESTAURANT',
  toOutlet: index % 2 ? 'BAR' : 'STORE',
  itemId: inventoryItems[index + 3].id,
  itemName: inventoryItems[index + 3].name,
  quantity: 4 + index,
  status: (['Requested', 'Approved', 'In transit', 'Received', 'Rejected'] as const)[index % 5],
  requestedBy: demoUsers[(index + 5) % demoUsers.length].name,
  createdAt: day(-index),
}))

export const invoices: Invoice[] = Array.from({ length: 14 }, (_, index) => {
  const subtotal = 480 + index * 196
  const total = Math.round(subtotal * 1.08 * 100) / 100
  return {
    id: `inv-doc-${String(index + 1).padStart(3, '0')}`,
    invoiceNumber: `INV-${2026}-${String(701 + index)}`,
    guestId: guests[index % guests.length].id,
    guestName: `${guests[index % guests.length].firstName} ${guests[index % guests.length].lastName}`,
    issuedAt: day(-index),
    dueAt: day(7 - index),
    status: index % 6 === 0 ? 'Paid' : index % 6 === 1 ? 'Partial' : index % 8 === 0 ? 'Overdue' : 'Pending',
    subtotal,
    tax: Math.round(subtotal * 0.08 * 100) / 100,
    total,
    balance: index % 6 === 0 ? 0 : index % 6 === 1 ? Math.round(total * 0.5 * 100) / 100 : total,
    outlet: (['Rooms', 'Restaurant', 'Bar', 'Events'] as const)[index % 4],
  }
})

export const payments: Payment[] = Array.from({ length: 12 }, (_, index) => ({
  id: `pay-${String(index + 1).padStart(3, '0')}`,
  paymentNumber: `PAY-${5001 + index}`,
  invoiceId: invoices[index % invoices.length].id,
  guestName: invoices[index % invoices.length].guestName,
  method: (['Cash', 'Card', 'Bank transfer', 'Room charge', 'Loyalty redemption'] as const)[index % 5],
  amount: 240 + index * 118,
  status: index % 7 === 0 ? 'Refunded' : index % 6 === 0 ? 'Pending' : 'Completed',
  createdAt: timestamp(-Math.floor(index / 3)),
  reference: `REF-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
}))

export const campaigns: Campaign[] = Array.from({ length: 6 }, (_, index) => ({
  id: `cmp-${index + 1}`,
  name: ['Summer Staycation', 'Loyalty Week', 'Weekend Escape', 'Corporate Recovery', 'VIP Anniversary', 'Dining Discovery'][index],
  segment: ['VIP guests', 'Repeat guests', 'Weekend bookers', 'Corporate leads', 'Anniversary guests', 'Restaurant guests'][index],
  channel: index % 2 ? 'Email' : 'Email & SMS',
  status: (['Draft', 'Scheduled', 'Active', 'Completed'] as const)[index % 4],
  audience: 120 + index * 87,
  sent: index % 4 === 0 ? 0 : 70 + index * 72,
  conversion: 3.4 + index * 1.8,
  scheduledAt: day(index + 2),
}))

export const feedback: Feedback[] = Array.from({ length: 8 }, (_, index) => ({
  id: `fb-${index + 1}`,
  guestId: guests[index].id,
  guestName: `${guests[index].firstName} ${guests[index].lastName}`,
  rating: index % 4 === 0 ? 3 : 5,
  nps: index % 3 === 0 ? 7 : 9,
  comment: ['Lovely stay and attentive service.', 'Excellent location, breakfast could improve.', 'The suite was exceptional.', 'Quick check-in and beautiful room.', 'Great value for business travel.', 'Pool area was crowded at noon.', 'Wonderful staff and restaurant.', 'Quiet room as requested.'][index],
  source: (['Post-stay', 'In hotel', 'Email survey'] as const)[index % 3],
  createdAt: day(-index),
  resolved: index % 3 === 0,
}))

export const housekeepingTasks: HousekeepingTask[] = Array.from({ length: 14 }, (_, index) => ({
  id: `task-${index + 1}`,
  roomNumber: rooms[index].number,
  floor: rooms[index].floor,
  roomType: rooms[index].type,
  status: (['Dirty', 'In Progress', 'Inspected', 'Clean'] as const)[index % 4],
  priority: (['Low', 'Normal', 'High', 'Urgent'] as const)[index % 4],
  assignee: ['Sofia Marin', 'Carmen Ruiz', 'Aisha Bello', 'Maria Santos'][index % 4],
  dueAt: `${day(0)} ${String(10 + index).padStart(2, '0')}:00`,
  notes: index % 5 === 0 ? 'Extra towels requested' : undefined,
}))

export const maintenanceTickets: MaintenanceTicket[] = Array.from({ length: 9 }, (_, index) => ({
  id: `mnt-${String(index + 1).padStart(3, '0')}`,
  title: ['Air conditioning not cooling', 'Shower water pressure low', 'Reading light replacement', 'Wardrobe door hinge loose', 'Smart TV remote missing', 'Bathtub tap leaking', 'Wi-Fi access point offline', 'Room door seal worn', 'Coffee machine fault'][index],
  roomNumber: rooms[(index * 3) % rooms.length].number,
  category: (['HVAC', 'Plumbing', 'Electrical', 'Furniture', 'General'] as const)[index % 5],
  priority: (['Low', 'Medium', 'High', 'Critical'] as const)[index % 4],
  status: (['Open', 'Assigned', 'In progress', 'Resolved'] as const)[index % 4],
  assignee: ['Andre Silva', 'Luca Moretti', 'Peter Walsh'][index % 3],
  reportedBy: demoUsers[(index + 2) % demoUsers.length].name,
  createdAt: timestamp(-index),
  description: 'Issue reported by guest or staff during room service inspection.',
}))

export const shifts: Shift[] = Array.from({ length: 12 }, (_, index) => ({
  id: `shift-${index + 1}`,
  staffName: demoUsers[(index + 1) % demoUsers.length].name,
  department: demoUsers[(index + 1) % demoUsers.length].department,
  date: day(index - 3),
  start: index % 2 ? '14:00' : '06:00',
  end: index % 2 ? '22:00' : '14:00',
  station: ['Front desk', 'Restaurant', 'Bar', 'Housekeeping'][index % 4],
  status: (['Scheduled', 'Clocked in', 'Completed', 'Absent'] as const)[index % 4],
}))

export const eventBookings: EventBooking[] = Array.from({ length: 8 }, (_, index) => ({
  id: `evt-${index + 1}`,
  eventName: ['Aurelia Leadership Summit', 'Northstar Product Launch', 'Lumen Annual Gala', 'Vertex Partner Dinner', 'Solstice Wedding Reception', 'Cobalt Networking Night', 'Horizon Investor Luncheon', 'Meridian Awards Dinner'][index],
  hall: ['Grand Ballroom', 'Azure Hall', 'Garden Terrace', 'Executive Lounge'][index % 4],
  clientName: companies[index % companies.length],
  contact: `${firstNames[index + 3]} ${lastNames[index + 3]}`,
  date: day(index + 3),
  pax: 24 + index * 11,
  packageName: index % 2 ? 'Premium dining' : 'Conference package',
  deposit: 1800 + index * 650,
  total: 7800 + index * 2350,
  status: (['Enquiry', 'Confirmed', 'Completed', 'Cancelled'] as const)[index % 4],
}))

export const auditLogs: AuditLog[] = Array.from({ length: 14 }, (_, index) => ({
  id: `audit-${index + 1}`,
  action: ['Updated role permissions', 'Approved purchase order', 'Voided invoice', 'Adjusted stock level', 'Checked in guest', 'Exported inventory report', 'Refunded payment', 'Updated rate plan'][index % 8],
  module: (['Settings', 'Inventory', 'Billing', 'Inventory', 'Front Desk', 'Reports', 'Billing', 'Reservations'] as const)[index % 8],
  actor: demoUsers[index % demoUsers.length].name,
  timestamp: `${timestamp(-Math.floor(index / 3))} ${String(9 + (index % 9)).padStart(2, '0')}:24`,
  detail: 'Successful policy-compliant change recorded in the audit trail.',
  ipAddress: `10.24.${index % 8}.${20 + index}`,
}))

export const activities: Activity[] = [
  { id: 'act-1', title: 'Reservation confirmed', description: 'Olivia Bennett · Deluxe King', actor: 'Amara Okafor', timestamp: timestamp(0), type: 'booking' },
  { id: 'act-2', title: 'Payment received', description: '₦1,240.00 · Invoice INV-2026-701', actor: 'Grace Liu', timestamp: timestamp(0), type: 'payment' },
  { id: 'act-3', title: 'Stock adjustment', description: 'Atlantic Salmon · STORE-1007', actor: 'Omar Haddad', timestamp: timestamp(-1), type: 'inventory' },
  { id: 'act-4', title: 'Maintenance resolved', description: 'Room 204 · Lighting replacement', actor: 'Andre Silva', timestamp: timestamp(-1), type: 'maintenance' },
  { id: 'act-5', title: 'Guest checked in', description: 'Ethan Rivera · Executive Suite', actor: 'Amara Okafor', timestamp: timestamp(-1), type: 'guest' },
  { id: 'act-6', title: 'PO approved', description: 'PO-2026-1842 · ₦1,320.00', actor: 'Marcus Chen', timestamp: timestamp(-2), type: 'inventory' },
  { id: 'act-7', title: 'New order received', description: 'R-1049 · Table T6 · ₦186.40', actor: 'Leo Martins', timestamp: timestamp(-2), type: 'booking' },
  { id: 'act-8', title: 'Feedback received', description: '5-star review from Maya Chen', actor: 'System', timestamp: timestamp(-3), type: 'guest' },
]

export const revenueTrend = Array.from({ length: 30 }, (_, index) => ({
  date: formatISO(subDays(now, 29 - index), { representation: 'date' }),
  revenue: 4200 + ((index * 379) % 4800),
  rooms: 2800 + ((index * 221) % 3600),
  restaurant: 700 + ((index * 87) % 1300),
  bar: 380 + ((index * 53) % 800),
  occupancy: 62 + ((index * 7) % 31),
}))

export const occupancyTrend = Array.from({ length: 12 }, (_, index) => ({
  date: formatISO(subDays(now, 11 - index), { representation: 'date' }),
  occupancy: 68 + ((index * 5) % 25),
  available: 40 - ((index * 3) % 19),
}))
