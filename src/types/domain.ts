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
  | 'FOOD_BEVERAGE_STAFF'
  | 'ADMIN'
  | 'APPROVER'
  | 'AUDITOR'
  | 'VIEWER'

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
  // Finance module (colon namespace – see lib/permissions.ts)
  | 'finance:view'
  | 'accounts:view' | 'accounts:create' | 'accounts:edit' | 'accounts:delete'
  | 'journal:view' | 'journal:create' | 'journal:post' | 'journal:reverse'
  | 'invoice:view' | 'invoice:create' | 'invoice:approve'
  | 'bill:view' | 'bill:create' | 'bill:approve'
  | 'expense:view' | 'expense:approve'
  | 'payment:view' | 'payment:create' | 'payment:reconcile'
  | 'bank:view' | 'bank:reconcile'
  | 'budget:view' | 'budget:manage'
  | 'tax:view' | 'tax:manage'
  | 'report:finance' | 'audit:view' | 'settings:finance'

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
  source: 'Direct' | 'Booking.com' | 'Expedia' | 'Corporate' | 'Walk-in' | 'ONLINE'
  channel?: 'WEBSITE' | 'DIRECT' | 'OTA'
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

/* ─────────────────────────── Finance module ───────────────────────────
 * All money is a string (never a float). All dates are UTC ISO strings.
 * See lib/money.ts for the decimal.js-backed helper API.
 */

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'
export type NormalBalance = 'debit' | 'credit'
export type AccountStatus = 'active' | 'archived'

export interface Account {
  id: string
  code: string
  name: string
  type: AccountType
  normalBalance: NormalBalance
  parentId?: string
  status: AccountStatus
  description?: string
  currency: string
  /** Read-only hint from the API; used by the delete guard. */
  postedEntryCount: number
  createdAt: string
  updatedAt: string
}

export interface JournalLine {
  id: string
  accountId: string
  description: string
  debit: string
  credit: string
  costCenter?: string
  taxCode?: string
}

export type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'REVERSED'

export interface Attachment {
  id: string
  name: string
  url: string
  uploadedAt: string
}

export interface JournalEntry {
  id: string
  number: string
  date: string
  reference?: string
  memo: string
  lines: JournalLine[]
  status: JournalEntryStatus
  fiscalPeriodId: string
  attachments: Attachment[]
  createdBy: string
  postedBy?: string
  postedAt?: string
  reversedEntryId?: string
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  currency: string
  paymentTermsDays: number
  status: 'active' | 'inactive'
  createdAt: string
}

export interface InvoiceLine {
  id: string
  description: string
  quantity: string
  unitPrice: string
  taxRateId?: string
}

/** Finance invoice. The legacy billing Invoice type remains `Invoice` in this file. */
export interface FinanceInvoice {
  id: string
  number: string
  customerId: string
  customerName: string
  lines: InvoiceLine[]
  subtotal: string
  discount: string
  tax: string
  total: string
  amountPaid: string
  currency: string
  issueDate: string
  dueDate: string
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface BillLine {
  id: string
  description: string
  quantity: string
  unitPrice: string
  taxRateId?: string
}

export interface Bill {
  id: string
  number: string
  vendorId: string
  vendorName: string
  lines: BillLine[]
  subtotal: string
  tax: string
  total: string
  amountPaid: string
  currency: string
  issueDate: string
  dueDate: string
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PARTIALLY_PAID' | 'PAID' | 'VOID'
  approvedBy?: string
  createdAt: string
  updatedAt: string
}

/** Finance payment. The legacy billing Payment type remains `Payment` in this file. */
export interface FinancePayment {
  id: string
  number: string
  direction: 'incoming' | 'outgoing'
  amount: string
  currency: string
  date: string
  method: string
  reference: string
  idempotencyKey: string
  allocations: Array<{ documentId: string; documentType: 'invoice' | 'bill'; amount: string }>
  createdAt: string
}

export interface Expense {
  id: string
  number: string
  claimant: string
  category: string
  accountId: string
  amount: string
  currency: string
  description: string
  receipt?: Attachment
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REIMBURSED' | 'REJECTED'
  approvedBy?: string
  createdAt: string
  updatedAt: string
}

export interface TaxRate {
  id: string
  code: string
  name: string
  rate: string
  accountId: string
  status: 'active' | 'archived'
  createdAt: string
}

export interface FiscalPeriod {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'OPEN' | 'LOCKED' | 'CLOSED'
}

export interface AuditEvent {
  id: string
  action: 'create' | 'update' | 'delete' | 'post' | 'reverse' | 'approve' | 'reconcile'
  entity: string
  entityId: string
  actor: string
  timestamp: string
  ip: string
  reason?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}
