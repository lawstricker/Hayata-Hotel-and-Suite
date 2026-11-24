export type Role =
  | 'SUPER_ADMIN'
  | 'HOTEL_MANAGER'
  | 'FRONT_DESK'
  | 'HOUSEKEEPING'
  | 'RESTAURANT_MANAGER'
  | 'BAR_MANAGER'
  | 'STORE_MANAGER'
  | 'ACCOUNTANT'
  | 'WAITER'
  | 'BARTENDER'

export type Permission =
  | 'dashboard.view'
  | 'reservation.view' | 'reservation.create' | 'reservation.edit' | 'reservation.checkin' | 'reservation.checkout' | 'reservation.cancel'
  | 'room.view' | 'room.manage'
  | 'housekeeping.view' | 'housekeeping.manage'
  | 'maintenance.view' | 'maintenance.manage'
  | 'guest.view' | 'guest.manage' | 'guest.crm'
  | 'restaurant.pos' | 'restaurant.menu' | 'restaurant.kds' | 'restaurant.orders' | 'restaurant.inventory'
  | 'bar.pos' | 'bar.tabs' | 'bar.kds' | 'bar.inventory'
  | 'inventory.view' | 'inventory.manage' | 'inventory.alerts' | 'inventory.po' | 'inventory.transfer' | 'inventory.requisition' | 'inventory.stocktake' | 'supplier.manage'
  | 'billing.view' | 'billing.manage'
  | 'report.view'
  | 'staff.view' | 'staff.manage'
  | 'event.view' | 'event.manage'
  | 'settings.view' | 'settings.manage' | 'settings.rbac'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  avatar?: string
  department: string
  status: 'Active' | 'On leave' | 'Inactive'
  lastActive: string
}

export interface Guest {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  nationality: string
  segment: 'VIP' | 'Repeat' | 'Corporate' | 'Blacklisted' | 'Regular'
  lifecycle: 'Lead' | 'First stay' | 'Active guest' | 'At risk' | 'Lapsed'
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  points: number
  spendTotal: number
  openBalance: number
  stays: number
  lastStay: string
  nextStay?: string
  birthday?: string
  anniversary?: string
  company?: string
  preferences: string[]
  notes: string
  createdAt: string
}

export type ReservationStatus = 'Confirmed' | 'Pending' | 'Checked in' | 'Checked out' | 'Cancelled' | 'No-show'

export interface Reservation {
  id: string
  guestId: string
  guestName: string
  roomType: string
  roomNumber?: string
  checkIn: string
  checkOut: string
  adults: number
  children: number
  status: ReservationStatus
  source: 'Direct' | 'Booking.com' | 'Expedia' | 'Corporate' | 'Walk-in'
  ratePlan: string
  rate: number
  deposit: number
  addOns: string[]
  total: number
}

export type RoomStatus = 'Available' | 'Occupied' | 'Dirty' | 'Clean' | 'Out of Order' | 'Reserved'

export interface RoomType {
  id: string
  name: string
  code: string
  baseRate: number
  capacity: number
  totalRooms: number
  amenities: string[]
}

export interface Room {
  id: string
  number: string
  floor: number
  type: string
  status: RoomStatus
  guestName?: string
  housekeepingStatus: 'Dirty' | 'In Progress' | 'Inspected' | 'Clean'
  rate: number
  updatedAt: string
}

export type TaskStatus = 'Dirty' | 'In Progress' | 'Inspected' | 'Clean'

export interface HousekeepingTask {
  id: string
  roomNumber: string
  floor: number
  roomType: string
  status: TaskStatus
  priority: 'Low' | 'Normal' | 'High' | 'Urgent'
  assignee: string
  dueAt: string
  notes?: string
}

export interface MaintenanceTicket {
  id: string
  title: string
  roomNumber?: string
  category: 'HVAC' | 'Plumbing' | 'Electrical' | 'Furniture' | 'General'
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  status: 'Open' | 'Assigned' | 'In progress' | 'Resolved'
  assignee: string
  reportedBy: string
  createdAt: string
  description: string
}

export interface RecipeIngredient {
  inventoryItemId: string
  quantity: number
  unit: string
}

export interface MenuItem {
  id: string
  name: string
  category: string
  outlet: 'RESTAURANT' | 'BAR'
  price: number
  cost: number
  available: boolean
  image: string
  description: string
  station: string
  ageRestricted?: boolean
  recipe?: RecipeIngredient[]
  prepMinutes: number
}

export interface RestaurantTable {
  id: string
  name: string
  seats: number
  status: 'Free' | 'Seated' | 'Ordered' | 'Bill requested'
  area: 'Main dining' | 'Terrace' | 'Private'
  server: string
  orderId?: string
}

export type OrderStatus = 'New' | 'Preparing' | 'Ready' | 'Served' | 'Cancelled' | 'Paid'
export type OrderType = 'Dine-in' | 'Takeaway' | 'Room service'

export interface OrderItem {
  id: string
  menuItemId: string
  name: string
  quantity: number
  price: number
  modifiers: string[]
  station: string
}

export interface Order {
  id: string
  orderNumber: string
  outlet: 'RESTAURANT' | 'BAR'
  tableId?: string
  tableName?: string
  type: OrderType
  status: OrderStatus
  items: OrderItem[]
  guestName?: string
  roomNumber?: string
  server: string
  createdAt: string
  subtotal: number
  discount: number
  tax: number
  tip: number
  total: number
  paymentStatus: 'Unpaid' | 'Paid' | 'Refunded' | 'Partially paid'
  source?: 'POS' | 'ROOM_SERVICE'
  instructions?: string
}

export type Outlet = 'STORE' | 'RESTAURANT' | 'BAR' | 'HOUSEKEEPING'
export type MovementType = 'Sale' | 'Purchase Receipt' | 'Transfer' | 'Wastage' | 'Adjustment' | 'Return' | 'Requisition'

export interface InventoryItem {
  id: string
  name: string
  sku: string
  outlet: Outlet
  category: string
  unit: string
  cost: number
  price: number
  supplierId: string
  reorderPoint: number
  reorderQty: number
  batch: string
  expiry?: string
  location: string
  bin?: string
  stock: number
  maximumStock: number
  barcode: string
  lastUpdated: string
}

export interface StockMovement {
  id: string
  itemId: string
  itemName: string
  sku: string
  outlet: Outlet
  type: MovementType
  quantityIn: number
  quantityOut: number
  runningBalance: number
  user: string
  timestamp: string
  reference: string
  note?: string
}

export interface StockAlert {
  id: string
  itemId: string
  itemName: string
  sku: string
  outlet: Outlet
  type: 'critical' | 'warning' | 'expiring'
  currentStock: number
  threshold: number
  expiry?: string
  createdAt: string
  acknowledged: boolean
  snoozedUntil?: string
}

export interface Supplier {
  id: string
  name: string
  contactName: string
  email: string
  phone: string
  leadTime: number
  paymentTerms: string
  itemsSupplied: number
  status: 'Preferred' | 'Approved' | 'Under review'
  address: string
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  supplierId: string
  supplierName: string
  status: 'Draft' | 'Pending approval' | 'Approved' | 'Sent' | 'Partially received' | 'Received'
  createdAt: string
  expectedDate: string
  total: number
  itemCount: number
  createdBy: string
}

export interface Requisition {
  id: string
  reqNumber: string
  outlet: Outlet
  itemId: string
  itemName: string
  quantity: number
  requestedBy: string
  status: 'Pending' | 'Approved' | 'Fulfilled' | 'Rejected'
  createdAt: string
  note?: string
}

export interface Transfer {
  id: string
  transferNumber: string
  fromOutlet: Outlet
  toOutlet: Outlet
  itemId: string
  itemName: string
  quantity: number
  status: 'Requested' | 'Approved' | 'In transit' | 'Received' | 'Rejected'
  requestedBy: string
  createdAt: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  guestId?: string
  guestName: string
  issuedAt: string
  dueAt: string
  status: 'Pending' | 'Paid' | 'Partial' | 'Overdue' | 'Void'
  subtotal: number
  tax: number
  total: number
  balance: number
  outlet: 'Rooms' | 'Restaurant' | 'Bar' | 'Events'
}

export interface Payment {
  id: string
  paymentNumber: string
  invoiceId: string
  guestName: string
  method: 'Cash' | 'Card' | 'Bank transfer' | 'Room charge' | 'Loyalty redemption'
  amount: number
  status: 'Completed' | 'Pending' | 'Refunded' | 'Failed'
  createdAt: string
  reference: string
}

export interface Campaign {
  id: string
  name: string
  segment: string
  channel: 'Email' | 'SMS' | 'Email & SMS'
  status: 'Draft' | 'Scheduled' | 'Active' | 'Completed'
  audience: number
  sent: number
  conversion: number
  scheduledAt?: string
}

export interface Feedback {
  id: string
  guestId: string
  guestName: string
  rating: number
  nps: number
  comment: string
  source: 'Post-stay' | 'In hotel' | 'Email survey'
  createdAt: string
  resolved: boolean
}

export interface Shift {
  id: string
  staffName: string
  department: string
  date: string
  start: string
  end: string
  station: string
  status: 'Scheduled' | 'Clocked in' | 'Completed' | 'Absent'
}

export interface EventBooking {
  id: string
  eventName: string
  hall: string
  clientName: string
  contact: string
  date: string
  pax: number
  packageName: string
  deposit: number
  total: number
  status: 'Enquiry' | 'Confirmed' | 'Completed' | 'Cancelled'
}

export interface AuditLog {
  id: string
  action: string
  module: string
  actor: string
  timestamp: string
  detail: string
  ipAddress: string
}

export interface Activity {
  id: string
  title: string
  description: string
  actor: string
  timestamp: string
  type: 'booking' | 'payment' | 'inventory' | 'maintenance' | 'guest'
}
