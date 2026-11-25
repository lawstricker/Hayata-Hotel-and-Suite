import { apiPost } from '@/lib/api-client'
import type { Order, OrderItem } from '@/types/domain'

/** A basket line as sent to the server, before the server re-prices it. */
export interface RoomOrderLineInput {
  menuItemId: string
  quantity: number
  modifiers?: string[]
}

/** The authoritative price for a basket, calculated on the server. */
export interface RoomOrderQuote {
  roomNumber: string
  guestName: string
  email: string
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
}

export interface RoomOrderPayment {
  reference: string
  amount: number
  method: string
  provider?: string
}

export interface PlaceRoomOrderInput {
  roomNumber: string
  items: RoomOrderLineInput[]
  instructions?: string
  email?: string
  payment: RoomOrderPayment
}

export interface PlaceRoomOrderResult {
  order: Order
  paymentReference: string
}

/**
 * Asks the server to price a basket.
 *
 * The browser never decides what a guest pays: prices come from the `menu_items`
 * table so a modified basket cannot change the amount charged.
 */
export async function fetchRoomOrderQuote(roomNumber: string, items: RoomOrderLineInput[]): Promise<RoomOrderQuote> {
  return apiPost<RoomOrderQuote>('/public/room-orders/quote', { roomNumber, items })
}

/**
 * Places a paid in-room dining order.
 *
 * The server rejects the request unless a payment reference and a matching amount
 * are supplied, so an unpaid order can never reach the kitchen.
 */
export async function placePaidRoomOrder(input: PlaceRoomOrderInput): Promise<PlaceRoomOrderResult> {
  return apiPost<PlaceRoomOrderResult>('/public/room-orders', input)
}

/** Turns the local basket into the payload the server expects. */
export function toRoomOrderLines(items: OrderItem[]): RoomOrderLineInput[] {
  return items.map((item) => ({
    menuItemId: item.menuItemId,
    quantity: item.quantity,
    modifiers: item.modifiers ?? [],
  }))
}
