import { apiPost, serverWrite } from '@/lib/api-client'
import type { Order, Reservation } from '@/types/domain'

export function syncReservationCreate(reservation: Reservation) {
  serverWrite('/resource/reservations', reservation)
}

export function syncReservationStatus(reservationId: string, status: Reservation['status'], roomNumber?: string) {
  serverWrite(`/reservations/${reservationId}/status`, { status, roomNumber })
}

/**
 * Persists an order and its line items.
 *
 * The order row must exist before its items are inserted: `order_items.order_id` is a
 * foreign key to `orders.id`, so writing them concurrently fails with an FK violation
 * and silently drops the order lines.
 */
export async function syncOrderCreate(order: Order) {
  try {
    await apiPost('/resource/orders', { ...order, items: undefined })
  } catch {
    // The in-browser state remains the source of truth if the server is unavailable.
    return
  }
  for (const item of order.items ?? []) {
    try {
      await apiPost('/resource/order-items', { ...item, orderId: order.id })
    } catch {
      // A single failed line should not block the remaining items.
    }
  }
}

export function syncOrderStatus(orderId: string, status: Order['status']) {
  serverWrite(`/orders/${orderId}/status`, { status })
}

export function syncStockAdjust(itemId: string, delta: number, reference: string, note?: string) {
  serverWrite(`/inventory/${itemId}/adjust`, { delta, reference, note })
}
