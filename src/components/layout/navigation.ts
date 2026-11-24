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
      { label: 'Dashboard', path: '/', icon: LayoutDashboard, permissions: ['dashboard.view'] },
      { label: 'Reports & analytics', path: '/reports', icon: FileBarChart, permissions: ['report.view'] },
    ],
  },
  {
    label: 'Hotel operations',
    items: [
      { label: 'Reservations', path: '/reservations', icon: CalendarDays, permissions: ['reservation.view'] },
      { label: 'Front desk', path: '/front-desk', icon: ConciergeBell, permissions: ['reservation.checkin', 'room.view'] },
      { label: 'Rooms & room types', path: '/rooms', icon: BedDouble, permissions: ['room.view'] },
      { label: 'Housekeeping', path: '/housekeeping', icon: Sparkles, permissions: ['housekeeping.view'] },
      { label: 'Maintenance', path: '/maintenance', icon: Wrench, permissions: ['maintenance.view'] },
    ],
  },
  {
    label: 'Guests & CRM',
    items: [
      { label: 'Guest directory', path: '/guests', icon: Users, permissions: ['guest.view'] },
      { label: 'Campaigns', path: '/crm/campaigns', icon: Sparkles, permissions: ['guest.crm'] },
      { label: 'Feedback & NPS', path: '/crm/feedback', icon: BookOpenCheck, permissions: ['guest.crm'] },
    ],
  },
  {
    label: 'Food & beverage',
    items: [
      { label: 'Restaurant POS', path: '/restaurant/pos', icon: UtensilsCrossed, permissions: ['restaurant.pos'] },
      { label: 'Tables', path: '/restaurant/tables', icon: Coffee, permissions: ['restaurant.orders'] },
      { label: 'Restaurant menu', path: '/restaurant/menu', icon: ClipboardList, permissions: ['restaurant.menu'] },
      { label: 'Kitchen display', path: '/restaurant/kds', icon: Boxes, permissions: ['restaurant.kds'] },
      { label: 'Bar POS', path: '/bar/pos', icon: GlassWater, permissions: ['bar.pos'] },
      { label: 'Bar tabs', path: '/bar/tabs', icon: ReceiptText, permissions: ['bar.tabs'] },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Inventory overview', path: '/inventory', icon: Gauge, permissions: ['inventory.view'] },
      { label: 'Item master', path: '/inventory/items', icon: Warehouse, permissions: ['inventory.view'] },
      { label: 'Stock alerts', path: '/inventory/alerts', icon: BedDouble, permissions: ['inventory.alerts'] },
      { label: 'Stock ledger', path: '/inventory/ledger', icon: ClipboardList, permissions: ['inventory.view'] },
      { label: 'Transfers', path: '/inventory/transfers', icon: Truck, permissions: ['inventory.transfer'] },
      { label: 'Requisitions', path: '/inventory/requisitions', icon: ShoppingCart, permissions: ['inventory.requisition'] },
      { label: 'Purchase orders', path: '/inventory/purchase-orders', icon: Store, permissions: ['inventory.po'] },
      { label: 'Suppliers', path: '/inventory/suppliers', icon: Building2, permissions: ['inventory.view'] },
      { label: 'Stock take', path: '/inventory/stock-take', icon: ClipboardList, permissions: ['inventory.stocktake'] },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Guest folios', path: '/billing/folios', icon: CreditCard, permissions: ['billing.view'] },
      { label: 'Invoices', path: '/billing/invoices', icon: ReceiptText, permissions: ['billing.view'] },
      { label: 'Payments', path: '/billing/payments', icon: CreditCard, permissions: ['billing.view'] },
    ],
  },
  {
    label: 'People & events',
    items: [
      { label: 'Staff & HR', path: '/staff', icon: Users, permissions: ['staff.view'] },
      { label: 'Events & banquet', path: '/events', icon: CalendarDays, permissions: ['event.view'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Settings', path: '/settings', icon: Settings, permissions: ['settings.view'] },
    ],
  },
]

export const mobileNavigation: NavItem[] = [
  { label: 'Home', path: '/', icon: LayoutDashboard, permissions: ['dashboard.view'] },
  { label: 'Reservations', path: '/reservations', icon: CalendarDays, permissions: ['reservation.view'] },
  { label: 'Inventory', path: '/inventory', icon: Gauge, permissions: ['inventory.view'] },
  { label: 'Guests', path: '/guests', icon: Users, permissions: ['guest.view'] },
]

export const moduleIcons = {
  bar: BarChart3,
}
