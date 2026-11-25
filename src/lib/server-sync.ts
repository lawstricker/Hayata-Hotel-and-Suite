import { serverWrite } from '@/lib/api-client'
import type { Order, Reservation } from '@/types/domain'

export function syncReservationCreate(reservation: Reservation) {
  serverWrite('/resource/reservations', reservation)
}

export function syncReservationStatus(reservationId: string, status: Reservation['status'], roomNumber?: string) {
  serverWrite(`/reservations/${reservationId}/status`, { status, roomNumber })
}

export function syncOrderCreate(order: Order) {
  serverWrite('/resource/orders', {
    ...order,
    items: undefined,
  })
  order.items.forEach((item) => {
    serverWrite('/resource/order-items', { ...item, orderId: order.id })
  })
}

export function syncOrderStatus(orderId: string, status: Order['status']) {
  serverWrite(`/orders/${orderId}/status`, { status })
}

export function syncStockAdjust(itemId: string, delta: number, reference: string, note?: string) {
  serverWrite(`/inventory/${itemId}/adjust`, { delta, reference, note })
}
