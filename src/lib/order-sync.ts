import type { Order } from '@/types/domain'

const LIVE_ORDERS_KEY = 'hayata-hms-live-orders'

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readLiveOrders(): Order[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(LIVE_ORDERS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as Order[] : []
  } catch {
    return []
  }
}

export function writeLiveOrders(orders: Order[]) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(LIVE_ORDERS_KEY, JSON.stringify(orders))
  } catch {
    // Storage can be unavailable in private browsing; the in-memory store still works.
  }
}

export function upsertLiveOrder(order: Order) {
  writeLiveOrders([order, ...readLiveOrders().filter((candidate) => candidate.id !== order.id)])
}

export function updateLiveOrderStatus(orderId: string, status: Order['status']) {
  const orders = readLiveOrders().map((order) => order.id === orderId ? { ...order, status } : order)
  writeLiveOrders(orders)
}

export function subscribeToLiveOrders(listener: () => void) {
  if (!isBrowser()) return () => {}
  const handler = (event: StorageEvent) => {
    if (event.key === LIVE_ORDERS_KEY) listener()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
