import { create } from 'zustand'
import { eventBus } from '@/mock/eventBus'
import { readLiveOrders, subscribeToLiveOrders, updateLiveOrderStatus, upsertLiveOrder } from '@/lib/order-sync'
import { readLiveReservations, subscribeToLiveReservations, updateLiveReservationStatus, upsertLiveReservation } from '@/lib/reservation-sync'
import { syncOrderCreate, syncOrderStatus, syncReservationCreate, syncReservationStatus, syncStockAdjust } from '@/lib/server-sync'
import { logActivity } from '@/lib/activity-log'
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
  syncLiveOrders: () => void
  syncLiveReservations: () => void
  hydrateFromServer: (data: Partial<Pick<HotelState, 'reservations' | 'rooms' | 'orders' | 'inventory'>>) => void
  addPurchaseOrder: (purchaseOrder: PurchaseOrder) => void
  updatePurchaseOrderStatus: (purchaseOrderId: string, status: PurchaseOrder['status']) => void
  addInventoryItem: (item: InventoryItem) => void
}

export const useHotelStore = create<HotelState>((set, get) => ({
  inventory: seedInventory,
  movements: seedMovements,
  alerts: seedAlerts,
  orders: [...readLiveOrders(), ...seedOrders],
  reservations: [...readLiveReservations(), ...seedReservations],
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
    syncStockAdjust(itemId, delta, reference, note)
    logActivity({ action: 'Stock adjusted', module: 'Inventory', detail: `${item.name} · ${delta > 0 ? '+' : ''}${delta} · ${reference}` })
    eventBus.emit({ type: 'stock.level.changed', payload: { itemId, itemName: item.name, from, to, outlet: item.outlet } })
    if (crossedThreshold) eventBus.emit({ type: 'low_stock.triggered', payload: { itemId, itemName: item.name, stock: to, threshold: item.reorderPoint } })
  },
  acknowledgeAlert: (alertId) => set((state) => ({ alerts: state.alerts.map((alert) => alert.id === alertId ? { ...alert, acknowledged: true } : alert) })),
  snoozeAlert: (alertId) => set((state) => ({ alerts: state.alerts.map((alert) => alert.id === alertId ? { ...alert, snoozedUntil: new Date(Date.now() + 86400000).toISOString() } : alert) })),
  addReservation: (reservation) => {
    syncReservationCreate(reservation)
    logActivity({ action: 'Reservation created', module: 'Reservations', detail: `${reservation.guestName} · ${reservation.source} · ${reservation.checkIn}` })
    upsertLiveReservation(reservation)
    set((state) => ({ reservations: [reservation, ...state.reservations.filter((candidate) => candidate.id !== reservation.id)] }))
    eventBus.emit({ type: 'reservation.updated', payload: { reservationId: reservation.id, status: reservation.status } })
  },
  updateReservationStatus: (reservationId, status, roomNumber) => {
    syncReservationStatus(reservationId, status, roomNumber)
    logActivity({ action: `Reservation ${status}`, module: 'Reservations', detail: `${reservationId}${roomNumber ? ` · Room ${roomNumber}` : ''}` })
    updateLiveReservationStatus(reservationId, status, roomNumber)
    set((state) => {
      const reservation = state.reservations.find((candidate) => candidate.id === reservationId)
      let rooms = state.rooms
      if (status === 'Checked in' && roomNumber) {
        rooms = state.rooms.map((room) => room.number === roomNumber ? { ...room, status: 'Occupied', guestName: reservation?.guestName } : room)
      } else if (status === 'Cancelled' || status === 'Checked out') {
        const freedRoom = roomNumber ?? reservation?.roomNumber
        rooms = state.rooms.map((room) => room.number === freedRoom ? { ...room, status: 'Clean', guestName: undefined } : room)
      }
      return {
        reservations: state.reservations.map((candidate) => candidate.id === reservationId ? { ...candidate, status, roomNumber: roomNumber ?? candidate.roomNumber } : candidate),
        rooms,
      }
    })
    eventBus.emit({ type: 'reservation.updated', payload: { reservationId, status } })
    if (status === 'Checked in' && roomNumber) eventBus.emit({ type: 'checkin.created', payload: { reservationId, guestName: get().reservations.find((reservation) => reservation.id === reservationId)?.guestName ?? 'Guest', roomNumber } })
  },
  addOrder: (order) => {
    void syncOrderCreate(order)
    logActivity({ action: 'Order created', module: order.outlet === 'BAR' ? 'Bar' : 'Restaurant', detail: `${order.orderNumber} · ${order.type} · ${order.total}` })
    upsertLiveOrder(order)
    set((state) => ({ orders: [order, ...state.orders.filter((candidate) => candidate.id !== order.id)] }))
    eventBus.emit({ type: 'order.created', payload: { orderId: order.id, orderNumber: order.orderNumber, outlet: order.outlet } })
  },
  updateOrderStatus: (orderId, status) => {
    syncOrderStatus(orderId, status)
    logActivity({ action: `Order ${status}`, module: 'Kitchen', detail: orderId })
    updateLiveOrderStatus(orderId, status)
    set((state) => ({ orders: state.orders.map((order) => order.id === orderId ? { ...order, status } : order) }))
    eventBus.emit({ type: 'order.status.changed', payload: { orderId, status } })
  },
  syncLiveOrders: () => set((state) => {
    const stored = readLiveOrders()
    const storedIds = new Set(stored.map((order) => order.id))
    return { orders: [...stored, ...state.orders.filter((order) => !storedIds.has(order.id))] }
  }),
  syncLiveReservations: () => set((state) => {
    const stored = readLiveReservations()
    const storedIds = new Set(stored.map((reservation) => reservation.id))
    return { reservations: [...stored, ...state.reservations.filter((reservation) => !storedIds.has(reservation.id))] }
  }),
  hydrateFromServer: (data) => set((state) => {
    const serverOrders = data.orders ?? state.orders
    // Keep locally-created room-service orders that the server has not echoed back yet,
    // and never let a hydrated order lose its line items.
    const byId = new Map(serverOrders.map((order) => [order.id, { ...order, items: order.items ?? [] }]))
    for (const live of readLiveOrders()) {
      const existing = byId.get(live.id)
      byId.set(live.id, existing ? { ...existing, items: existing.items?.length ? existing.items : live.items } : { ...live, items: live.items ?? [] })
    }
    return {
      reservations: data.reservations ?? state.reservations,
      rooms: data.rooms ?? state.rooms,
      orders: [...byId.values()],
      inventory: data.inventory ?? state.inventory,
    }
  }),
  addPurchaseOrder: (purchaseOrder) => {
    logActivity({ action: 'Purchase order created', module: 'Inventory', detail: `${purchaseOrder.poNumber} · ${purchaseOrder.supplierName} · ${purchaseOrder.total}` })
    set((state) => ({ purchaseOrders: [purchaseOrder, ...state.purchaseOrders] }))
  },
  updatePurchaseOrderStatus: (purchaseOrderId, status) => {
    logActivity({ action: `Purchase order ${status}`, module: 'Inventory', detail: purchaseOrderId })
    set((state) => ({ purchaseOrders: state.purchaseOrders.map((purchaseOrder) => purchaseOrder.id === purchaseOrderId ? { ...purchaseOrder, status } : purchaseOrder) }))
  },
  addInventoryItem: (item) => {
    logActivity({ action: 'Inventory item created', module: 'Inventory', detail: `${item.name} · ${item.sku}` })
    set((state) => ({ inventory: [item, ...state.inventory] }))
  },
}))

subscribeToLiveOrders(() => useHotelStore.getState().syncLiveOrders())
subscribeToLiveReservations(() => useHotelStore.getState().syncLiveReservations())
