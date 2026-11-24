import {
  auditLogs,
  campaigns,
  eventBookings,
  feedback,
  guests,
  housekeepingTasks,
  inventoryItems,
  invoices,
  maintenanceTickets,
  menuItems,
  orders,
  payments,
  purchaseOrders,
  reservations,
  requisitions,
  rooms,
  roomTypes,
  shifts,
  stockAlerts,
  stockMovements,
  suppliers,
  tables,
  transfers,
} from './data'
import { delay } from './eventBus'

export const mockApi = {
  async getDashboard() {
    await delay(280)
    return {
      reservations,
      inventoryItems,
      stockAlerts,
      orders,
      rooms,
      guests,
      revenue: 12842 + Math.round(Math.random() * 900),
      occupancy: 78.4,
      adr: 226.8,
      revpar: 177.6,
    }
  },
  async getInventory() {
    await delay(220)
    return { items: inventoryItems, movements: stockMovements, alerts: stockAlerts }
  },
  async getGuests() {
    await delay(180)
    return guests
  },
  async getReservations() {
    await delay(220)
    return reservations
  },
  async getRooms() {
    await delay(180)
    return { rooms, roomTypes }
  },
  async getOrders() {
    await delay(180)
    return { orders, menuItems, tables }
  },
  async getBilling() {
    await delay(200)
    return { invoices, payments }
  },
  async getReports() {
    await delay(240)
    return { invoices, payments, occupancyTrend: [] }
  },
  async getCrm() {
    await delay(200)
    return { guests, campaigns, feedback }
  },
  async getAdmin() {
    await delay(220)
    return { shifts, auditLogs, eventBookings, suppliers, requisitions, transfers, purchaseOrders, housekeepingTasks, maintenanceTickets, roomTypes }
  },
}
