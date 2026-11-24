import { create } from 'zustand'
import { eventBus } from '@/mock/eventBus'
import {
  inventoryItems as seedInventory,
  orders as seedOrders,
  purchaseOrders as seedPurchaseOrders,
  reservations as seedReservations,
  rooms as seedRooms,
  stockAlerts as seedAlerts,
  stockMovements as seedMovements,
} from '@/mock/data'
import type {
  InventoryItem,
  MovementType,
  Order,
  PurchaseOrder,
  Reservation,
  Room,
  StockAlert,
  StockMovement,
} from '@/types/domain'

interface HotelState {
  inventory: InventoryItem[]
  movements: StockMovement[]
  alerts: StockAlert[]
  orders: Order[]
  reservations: Reservation[]
  rooms: Room[]
  purchaseOrders: PurchaseOrder[]
  adjustStock: (itemId: string, delta: number, type?: MovementType, reference?: string, note?: string) => void
  acknowledgeAlert: (alertId: string) => void
  snoozeAlert: (alertId: string) => void
  addReservation: (reservation: Reservation) => void
  updateReservationStatus: (reservationId: string, status: Reservation['status'], roomNumber?: string) => void
  addOrder: (order: Order) => void
  updateOrderStatus: (orderId: string, status: Order['status']) => void
  addPurchaseOrder: (purchaseOrder: PurchaseOrder) => void
  updatePurchaseOrderStatus: (purchaseOrderId: string, status: PurchaseOrder['status']) => void
  addInventoryItem: (item: InventoryItem) => void
}

export const useHotelStore = create<HotelState>((set, get) => ({
  inventory: seedInventory,
  movements: seedMovements,
  alerts: seedAlerts,
  orders: seedOrders,
  reservations: seedReservations,
  rooms: seedRooms,
  purchaseOrders: seedPurchaseOrders,
  adjustStock: (itemId, delta, type = 'Adjustment', reference = 'ADJ-MANUAL', note) => {
    const item = get().inventory.find((candidate) => candidate.id === itemId)
    if (!item) return
    const from = item.stock
    const to = Math.max(0, from + delta)
    if (to === from) return
    const crossedThreshold = from > item.reorderPoint && to <= item.reorderPoint
    const movement: StockMovement = {
      id: `mov-live-${Date.now()}`,
      itemId: item.id,
      itemName: item.name,
      sku: item.sku,
      outlet: item.outlet,
      type,
      quantityIn: delta > 0 ? delta : 0,
      quantityOut: delta < 0 ? Math.abs(delta) : 0,
      runningBalance: to,
      user: 'Elena Vasquez',
      timestamp: new Date().toISOString(),
      reference,
      note,
    }
    const alert: StockAlert = {
      id: `alert-live-${Date.now()}`,
      itemId: item.id,
      itemName: item.name,
      sku: item.sku,
      outlet: item.outlet,
      type: to < item.reorderPoint - 2 ? 'critical' : 'warning',
      currentStock: to,
      threshold: item.reorderPoint,
      createdAt: new Date().toISOString(),
      acknowledged: false,
    }
    set((state) => ({
      inventory: state.inventory.map((candidate) => candidate.id === itemId ? { ...candidate, stock: to, lastUpdated: new Date().toISOString() } : candidate),
      movements: [movement, ...state.movements],
      alerts: crossedThreshold ? [alert, ...state.alerts] : state.alerts,
    }))
    eventBus.emit({ type: 'stock.level.changed', payload: { itemId, itemName: item.name, from, to, outlet: item.outlet } })
    if (crossedThreshold) eventBus.emit({ type: 'low_stock.triggered', payload: { itemId, itemName: item.name, stock: to, threshold: item.reorderPoint } })
  },
  acknowledgeAlert: (alertId) => set((state) => ({ alerts: state.alerts.map((alert) => alert.id === alertId ? { ...alert, acknowledged: true } : alert) })),
  snoozeAlert: (alertId) => set((state) => ({ alerts: state.alerts.map((alert) => alert.id === alertId ? { ...alert, snoozedUntil: new Date(Date.now() + 86400000).toISOString() } : alert) })),
  addReservation: (reservation) => {
    set((state) => ({ reservations: [reservation, ...state.reservations] }))
    eventBus.emit({ type: 'reservation.updated', payload: { reservationId: reservation.id, status: reservation.status } })
  },
  updateReservationStatus: (reservationId, status, roomNumber) => {
    set((state) => ({
      reservations: state.reservations.map((reservation) => reservation.id === reservationId ? { ...reservation, status, roomNumber: roomNumber ?? reservation.roomNumber } : reservation),
      rooms: status === 'Checked in' && roomNumber
        ? state.rooms.map((room) => room.number === roomNumber ? { ...room, status: 'Occupied', guestName: state.reservations.find((reservation) => reservation.id === reservationId)?.guestName } : room)
        : state.rooms,
    }))
    eventBus.emit({ type: 'reservation.updated', payload: { reservationId, status } })
    if (status === 'Checked in' && roomNumber) eventBus.emit({ type: 'checkin.created', payload: { reservationId, guestName: get().reservations.find((reservation) => reservation.id === reservationId)?.guestName ?? 'Guest', roomNumber } })
  },
  addOrder: (order) => {
    set((state) => ({ orders: [order, ...state.orders] }))
    eventBus.emit({ type: 'order.created', payload: { orderId: order.id, orderNumber: order.orderNumber, outlet: order.outlet } })
  },
  updateOrderStatus: (orderId, status) => {
    set((state) => ({ orders: state.orders.map((order) => order.id === orderId ? { ...order, status } : order) }))
    eventBus.emit({ type: 'order.status.changed', payload: { orderId, status } })
  },
  addPurchaseOrder: (purchaseOrder) => set((state) => ({ purchaseOrders: [purchaseOrder, ...state.purchaseOrders] })),
  updatePurchaseOrderStatus: (purchaseOrderId, status) => set((state) => ({ purchaseOrders: state.purchaseOrders.map((purchaseOrder) => purchaseOrder.id === purchaseOrderId ? { ...purchaseOrder, status } : purchaseOrder) })),
  addInventoryItem: (item) => set((state) => ({ inventory: [item, ...state.inventory] })),
}))
