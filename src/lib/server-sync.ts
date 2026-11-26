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
 * The order and its lines go in a single request. The server writes them in
 * one transaction, so a ticket can never reach the kitchen without the items
 * that have to be prepared.
 */
export async function syncOrderCreate(order: Order) {
  try {
    await apiPost('/resource/orders', order)
  } catch {
    // The in-browser state remains the source of truth if the server is unavailable.
  }
}

export function syncOrderStatus(orderId: string, status: Order['status']) {
  serverWrite(`/orders/${orderId}/status`, { status })
}

export function syncStockAdjust(itemId: string, delta: number, reference: string, note?: string) {
  serverWrite(`/inventory/${itemId}/adjust`, { delta, reference, note })
}
