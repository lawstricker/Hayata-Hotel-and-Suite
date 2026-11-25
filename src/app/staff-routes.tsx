import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PermissionRoute, RequireAuth } from '@/components/auth-route'
import { AppShell } from '@/components/layout/app-shell'
import type { Permission } from '@/types/domain'

const LoginPage = lazy(() => import('@/features/auth/login-page').then((module) => ({ default: module.LoginPage })))
const ForgotPasswordPage = lazy(() => import('@/features/auth/forgot-password-page').then((module) => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/features/auth/reset-password-page').then((module) => ({ default: module.ResetPasswordPage })))
const DashboardPage = lazy(() => import('@/features/dashboard/dashboard-page').then((module) => ({ default: module.DashboardPage })))
const InventoryOverviewPage = lazy(() => import('@/features/inventory/inventory-overview-page').then((module) => ({ default: module.InventoryOverviewPage })))
const InventoryItemsPage = lazy(() => import('@/features/inventory/inventory-items-page').then((module) => ({ default: module.InventoryItemsPage })))
const InventoryAlertsPage = lazy(() => import('@/features/inventory/inventory-alerts-page').then((module) => ({ default: module.InventoryAlertsPage })))
const InventoryLedgerPage = lazy(() => import('@/features/inventory/inventory-operations-pages').then((module) => ({ default: module.InventoryLedgerPage })))
const InventoryTransfersPage = lazy(() => import('@/features/inventory/inventory-operations-pages').then((module) => ({ default: module.InventoryTransfersPage })))
const InventoryRequisitionsPage = lazy(() => import('@/features/inventory/inventory-operations-pages').then((module) => ({ default: module.InventoryRequisitionsPage })))
const InventoryPurchaseOrdersPage = lazy(() => import('@/features/inventory/inventory-operations-pages').then((module) => ({ default: module.InventoryPurchaseOrdersPage })))
const InventorySuppliersPage = lazy(() => import('@/features/inventory/inventory-operations-pages').then((module) => ({ default: module.InventorySuppliersPage })))
const InventoryStockTakePage = lazy(() => import('@/features/inventory/inventory-operations-pages').then((module) => ({ default: module.InventoryStockTakePage })))
const ReservationsPage = lazy(() => import('@/features/reservations/reservations-page').then((module) => ({ default: module.ReservationsPage })))
const FrontDeskPage = lazy(() => import('@/features/operations/hotel-operations-pages').then((module) => ({ default: module.FrontDeskPage })))
const RoomsPage = lazy(() => import('@/features/operations/hotel-operations-pages').then((module) => ({ default: module.RoomsPage })))
const RoomMenuQrPage = lazy(() => import('@/features/operations/room-menu-qr-page').then((module) => ({ default: module.RoomMenuQrPage })))
const HousekeepingPage = lazy(() => import('@/features/operations/hotel-operations-pages').then((module) => ({ default: module.HousekeepingPage })))
const MaintenancePage = lazy(() => import('@/features/operations/hotel-operations-pages').then((module) => ({ default: module.MaintenancePage })))
const GuestsPage = lazy(() => import('@/features/guests/guests-page').then((module) => ({ default: module.GuestsPage })))
const GuestProfilePage = lazy(() => import('@/features/guests/guest-profile-page').then((module) => ({ default: module.GuestProfilePage })))
const CampaignsPage = lazy(() => import('@/features/guests/crm-pages').then((module) => ({ default: module.CampaignsPage })))
const FeedbackPage = lazy(() => import('@/features/guests/crm-pages').then((module) => ({ default: module.FeedbackPage })))
const PosPage = lazy(() => import('@/features/pos/pos-page').then((module) => ({ default: module.PosPage })))
const RestaurantTablesPage = lazy(() => import('@/features/pos/food-beverage-pages').then((module) => ({ default: module.RestaurantTablesPage })))
const RestaurantMenuPage = lazy(() => import('@/features/pos/food-beverage-pages').then((module) => ({ default: module.RestaurantMenuPage })))
const RestaurantOrdersPage = lazy(() => import('@/features/pos/food-beverage-pages').then((module) => ({ default: module.RestaurantOrdersPage })))
const KitchenDisplayPage = lazy(() => import('@/features/pos/food-beverage-pages').then((module) => ({ default: module.KitchenDisplayPage })))
const BarTabsPage = lazy(() => import('@/features/pos/food-beverage-pages').then((module) => ({ default: module.BarTabsPage })))
const FoliosPage = lazy(() => import('@/features/billing/billing-pages').then((module) => ({ default: module.FoliosPage })))
const InvoicesPage = lazy(() => import('@/features/billing/billing-pages').then((module) => ({ default: module.InvoicesPage })))
const PaymentsPage = lazy(() => import('@/features/billing/billing-pages').then((module) => ({ default: module.PaymentsPage })))
const ReportsPage = lazy(() => import('@/features/reports/reports-page').then((module) => ({ default: module.ReportsPage })))
const StaffPage = lazy(() => import('@/features/admin/admin-pages').then((module) => ({ default: module.StaffPage })))
const EventsPage = lazy(() => import('@/features/admin/admin-pages').then((module) => ({ default: module.EventsPage })))
const SettingsPage = lazy(() => import('@/features/admin/admin-pages').then((module) => ({ default: module.SettingsPage })))
const FinanceDashboardPage = lazy(() => import('@/features/finance/pages/finance-dashboard-page').then((module) => ({ default: module.FinanceDashboardPage })))
const AccountsListPage = lazy(() => import('@/features/finance/pages/accounts-list-page').then((module) => ({ default: module.AccountsListPage })))
const AccountFormPage = lazy(() => import('@/features/finance/pages/account-form-page').then((module) => ({ default: module.AccountFormPage })))
const AccountDetailPage = lazy(() => import('@/features/finance/pages/account-detail-page').then((module) => ({ default: module.AccountDetailPage })))
const InvoicesListPage = lazy(() => import('@/features/finance/pages/invoices-list-page').then((module) => ({ default: module.InvoicesListPage })))
const InvoiceFormPage = lazy(() => import('@/features/finance/pages/invoice-form-page').then((module) => ({ default: module.InvoiceFormPage })))
const InvoiceDetailPage = lazy(() => import('@/features/finance/pages/invoice-detail-page').then((module) => ({ default: module.InvoiceDetailPage })))
const NotFoundPage = lazy(() => import('@/features/error/not-found-page').then((module) => ({ default: module.NotFoundPage })))

function Guarded({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  return <PermissionRoute permission={permission}>{children}</PermissionRoute>
}

export function StaffRoutes() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Guarded permission="dashboard.view"><DashboardPage /></Guarded>} />
          <Route path="reservations" element={<Guarded permission="reservation.view"><ReservationsPage /></Guarded>} />
          <Route path="front-desk" element={<Guarded permission="reservation.checkin"><FrontDeskPage /></Guarded>} />
          <Route path="rooms" element={<Guarded permission="room.view"><RoomsPage /></Guarded>} />
          <Route path="rooms/qr-menu" element={<Guarded permission="room.view"><RoomMenuQrPage /></Guarded>} />
          <Route path="housekeeping" element={<Guarded permission="housekeeping.view"><HousekeepingPage /></Guarded>} />
          <Route path="maintenance" element={<Guarded permission="maintenance.view"><MaintenancePage /></Guarded>} />
          <Route path="guests" element={<Guarded permission="guest.view"><GuestsPage /></Guarded>} />
          <Route path="guests/:guestId" element={<Guarded permission="guest.view"><GuestProfilePage /></Guarded>} />
          <Route path="crm/campaigns" element={<Guarded permission="guest.crm"><CampaignsPage /></Guarded>} />
          <Route path="crm/feedback" element={<Guarded permission="guest.crm"><FeedbackPage /></Guarded>} />
          <Route path="restaurant/pos" element={<Guarded permission="restaurant.pos"><PosPage outlet="RESTAURANT" /></Guarded>} />
          <Route path="restaurant/tables" element={<Guarded permission="restaurant.orders"><RestaurantTablesPage /></Guarded>} />
          <Route path="restaurant/menu" element={<Guarded permission="restaurant.menu"><RestaurantMenuPage /></Guarded>} />
          <Route path="restaurant/orders" element={<Guarded permission="restaurant.orders"><RestaurantOrdersPage /></Guarded>} />
          <Route path="restaurant/kds" element={<Guarded permission="restaurant.kds"><KitchenDisplayPage outlet="RESTAURANT" /></Guarded>} />
          <Route path="bar/pos" element={<Guarded permission="bar.pos"><PosPage outlet="BAR" /></Guarded>} />
          <Route path="bar/tabs" element={<Guarded permission="bar.tabs"><BarTabsPage /></Guarded>} />
          <Route path="bar/kds" element={<Guarded permission="bar.kds"><KitchenDisplayPage outlet="BAR" /></Guarded>} />
          <Route path="inventory" element={<Guarded permission="inventory.view"><InventoryOverviewPage /></Guarded>} />
          <Route path="inventory/items" element={<Guarded permission="inventory.view"><InventoryItemsPage /></Guarded>} />
          <Route path="inventory/alerts" element={<Guarded permission="inventory.alerts"><InventoryAlertsPage /></Guarded>} />
          <Route path="inventory/ledger" element={<Guarded permission="inventory.view"><InventoryLedgerPage /></Guarded>} />
          <Route path="inventory/transfers" element={<Guarded permission="inventory.transfer"><InventoryTransfersPage /></Guarded>} />
          <Route path="inventory/requisitions" element={<Guarded permission="inventory.requisition"><InventoryRequisitionsPage /></Guarded>} />
          <Route path="inventory/purchase-orders" element={<Guarded permission="inventory.po"><InventoryPurchaseOrdersPage /></Guarded>} />
          <Route path="inventory/suppliers" element={<Guarded permission="inventory.view"><InventorySuppliersPage /></Guarded>} />
          <Route path="inventory/stock-take" element={<Guarded permission="inventory.stocktake"><InventoryStockTakePage /></Guarded>} />
          <Route path="billing/folios" element={<Guarded permission="billing.view"><FoliosPage /></Guarded>} />
          <Route path="billing/invoices" element={<Guarded permission="billing.view"><InvoicesPage /></Guarded>} />
          <Route path="billing/payments" element={<Guarded permission="billing.view"><PaymentsPage /></Guarded>} />
          <Route path="reports" element={<Guarded permission="report.view"><ReportsPage /></Guarded>} />
          <Route path="finance" element={<Guarded permission="finance:view"><FinanceDashboardPage /></Guarded>} />
          <Route path="finance/accounts" element={<Guarded permission="accounts:view"><AccountsListPage /></Guarded>} />
          <Route path="finance/accounts/new" element={<Guarded permission="accounts:create"><AccountFormPage /></Guarded>} />
          <Route path="finance/accounts/:accountId" element={<Guarded permission="accounts:view"><AccountDetailPage /></Guarded>} />
          <Route path="finance/accounts/:accountId/edit" element={<Guarded permission="accounts:edit"><AccountFormPage /></Guarded>} />
          <Route path="finance/invoices" element={<Guarded permission="invoice:view"><InvoicesListPage /></Guarded>} />
          <Route path="finance/invoices/new" element={<Guarded permission="invoice:create"><InvoiceFormPage /></Guarded>} />
          <Route path="finance/invoices/:invoiceId" element={<Guarded permission="invoice:view"><InvoiceDetailPage /></Guarded>} />
          <Route path="people" element={<Guarded permission="staff.view"><StaffPage /></Guarded>} />
          <Route path="events" element={<Guarded permission="event.view"><EventsPage /></Guarded>} />
          <Route path="settings" element={<Guarded permission="settings.view"><SettingsPage /></Guarded>} />
          <Route path="settings/rbac-editor" element={<Guarded permission="settings.rbac"><SettingsPage /></Guarded>} />
          <Route path="settings/printer-settings" element={<Guarded permission="settings.manage"><SettingsPage /></Guarded>} />
          <Route path="audit" element={<Guarded permission="settings.view"><SettingsPage /></Guarded>} />
          <Route path="*" element={<NotFoundPage homePath="/staff" />} />
        </Route>
      </Route>
    </Routes>
  )
}
