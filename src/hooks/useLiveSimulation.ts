import { useEffect } from 'react'
import { toast } from 'sonner'
import { eventBus } from '@/mock/eventBus'
import { useHotelStore } from '@/store/hotelStore'

export function useLiveSimulation(enabled = true) {
  const adjustStock = useHotelStore((state) => state.adjustStock)

  useEffect(() => {
    if (!enabled) return

    const unsubscribe = eventBus.subscribe((event) => {
      if (event.type === 'stock.level.changed') {
        toast.success(`Stock updated: ${event.payload.itemName} ${event.payload.from} → ${event.payload.to}`, {
          description: `${event.payload.outlet} · Live inventory update`,
        })
      }
      if (event.type === 'low_stock.triggered') {
        toast.warning(`Low stock: ${event.payload.itemName}`, {
          description: `${event.payload.stock} remaining · Reorder point ${event.payload.threshold}`,
          action: { label: 'View alerts', onClick: () => { window.location.href = '/inventory/alerts' } },
        })
      }
    })

    const timer = window.setInterval(() => {
      const candidates = useHotelStore.getState().inventory.filter((item) => item.stock > 4)
      if (!candidates.length) return
      const item = candidates[Math.floor(Math.random() * candidates.length)]
      const quantity = Math.min(item.stock - 1, 1 + Math.floor(Math.random() * 3))
      adjustStock(item.id, -quantity, 'Sale', `POS-${Math.floor(1000 + Math.random() * 8999)}`, 'Background service consumption')
    }, 12000)

    return () => {
      window.clearInterval(timer)
      unsubscribe()
    }
  }, [adjustStock, enabled])
}
