import {
  BarChart3,
  BedDouble,
  BookOpenCheck,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardList,
  Coffee,
  ConciergeBell,
  CreditCard,
  FileBarChart,
  Gauge,
  GlassWater,
  Sparkles,
  LayoutDashboard,
  QrCode,
  ReceiptText,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  Users,
  UtensilsCrossed,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { Permission } from '@/types/domain'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  permissions: Permission[]
  badge?: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navigation: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/staff', icon: LayoutDashboard, permissions: ['dashboard.view'] },
      { label: 'Reports & analytics', path: '/staff/reports', icon: FileBarChart, permissions: ['report.view'] },
    ],
  },
  {
    label: 'Hotel operations',
    items: [
      { label: 'Reservations', path: '/staff/reservations', icon: CalendarDays, permissions: ['reservation.view'] },
      { label: 'Front desk', path: '/staff/front-desk', icon: ConciergeBell, permissions: ['reservation.checkin', 'room.view'] },
      { label: 'Rooms & room types', path: '/staff/rooms', icon: BedDouble, permissions: ['room.view'] },
      { label: 'In-room QR menus', path: '/staff/rooms/qr-menu', icon: QrCode, permissions: ['room.view'] },
      { label: 'Housekeeping', path: '/staff/housekeeping', icon: Sparkles, permissions: ['housekeeping.view'] },
      { label: 'Maintenance', path: '/staff/maintenance', icon: Wrench, permissions: ['maintenance.view'] },
    ],
  },
  {
    label: 'Guests & CRM',
    items: [
      { label: 'Guest directory', path: '/staff/guests', icon: Users, permissions: ['guest.view'] },
      { label: 'Campaigns', path: '/staff/crm/campaigns', icon: Sparkles, permissions: ['guest.crm'] },
      { label: 'Feedback & NPS', path: '/staff/crm/feedback', icon: BookOpenCheck, permissions: ['guest.crm'] },
    ],
  },
  {
    label: 'Food & beverage',
    items: [
      { label: 'Restaurant POS', path: '/staff/restaurant/pos', icon: UtensilsCrossed, permissions: ['restaurant.pos'] },
      { label: 'Tables', path: '/staff/restaurant/tables', icon: Coffee, permissions: ['restaurant.orders'] },
      { label: 'Restaurant menu', path: '/staff/restaurant/menu', icon: ClipboardList, permissions: ['restaurant.menu'] },
      { label: 'Kitchen display', path: '/staff/restaurant/kds', icon: Boxes, permissions: ['restaurant.kds'] },
      { label: 'Bar POS', path: '/staff/bar/pos', icon: GlassWater, permissions: ['bar.pos'] },
      { label: 'Bar tabs', path: '/staff/bar/tabs', icon: ReceiptText, permissions: ['bar.tabs'] },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Inventory overview', path: '/staff/inventory', icon: Gauge, permissions: ['inventory.view'] },
      { label: 'Item master', path: '/staff/inventory/items', icon: Warehouse, permissions: ['inventory.view'] },
      { label: 'Stock alerts', path: '/staff/inventory/alerts', icon: BedDouble, permissions: ['inventory.alerts'] },
      { label: 'Stock ledger', path: '/staff/inventory/ledger', icon: ClipboardList, permissions: ['inventory.view'] },
      { label: 'Transfers', path: '/staff/inventory/transfers', icon: Truck, permissions: ['inventory.transfer'] },
      { label: 'Requisitions', path: '/staff/inventory/requisitions', icon: ShoppingCart, permissions: ['inventory.requisition'] },
      { label: 'Purchase orders', path: '/staff/inventory/purchase-orders', icon: Store, permissions: ['inventory.po'] },
      { label: 'Suppliers', path: '/staff/inventory/suppliers', icon: Building2, permissions: ['inventory.view'] },
      { label: 'Stock take', path: '/staff/inventory/stock-take', icon: ClipboardList, permissions: ['inventory.stocktake'] },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Guest folios', path: '/staff/billing/folios', icon: CreditCard, permissions: ['billing.view'] },
      { label: 'Invoices', path: '/staff/billing/invoices', icon: ReceiptText, permissions: ['billing.view'] },
      { label: 'Payments', path: '/staff/billing/payments', icon: CreditCard, permissions: ['billing.view'] },
    ],
  },
  {
    label: 'People & events',
    items: [
      { label: 'Staff & HR', path: '/staff/people', icon: Users, permissions: ['staff.view'] },
      { label: 'Events & banquet', path: '/staff/events', icon: CalendarDays, permissions: ['event.view'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Settings', path: '/staff/settings', icon: Settings, permissions: ['settings.view'] },
    ],
  },
]

export const mobileNavigation: NavItem[] = [
  { label: 'Home', path: '/staff', icon: LayoutDashboard, permissions: ['dashboard.view'] },
  { label: 'Reservations', path: '/staff/reservations', icon: CalendarDays, permissions: ['reservation.view'] },
  { label: 'Inventory', path: '/staff/inventory', icon: Gauge, permissions: ['inventory.view'] },
  { label: 'Guests', path: '/staff/guests', icon: Users, permissions: ['guest.view'] },
]

export const moduleIcons = {
  bar: BarChart3,
}
