export type HotelEvent =
  | { type: 'stock.level.changed'; payload: { itemId: string; itemName: string; from: number; to: number; outlet: string } }
  | { type: 'low_stock.triggered'; payload: { itemId: string; itemName: string; stock: number; threshold: number } }
  | { type: 'order.created'; payload: { orderId: string; orderNumber: string; outlet: string } }
  | { type: 'order.status.changed'; payload: { orderId: string; status: string } }
  | { type: 'checkin.created'; payload: { reservationId: string; guestName: string; roomNumber: string } }
  | { type: 'reservation.updated'; payload: { reservationId: string; status: string } }
  | { type: 'alert.updated'; payload: { alertId: string } }

type Listener = (event: HotelEvent) => void

class MockEventBus {
  private listeners = new Set<Listener>()
  private history: HotelEvent[] = []

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(event: HotelEvent) {
    this.history.unshift(event)
    this.history = this.history.slice(0, 100)
    this.listeners.forEach((listener) => listener(event))
  }

  getHistory() {
    return [...this.history]
  }
}

export const eventBus = new MockEventBus()

export function delay(ms = 350) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}
