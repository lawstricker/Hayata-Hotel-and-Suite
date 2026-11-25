import { format, addDays } from 'date-fns'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AddOnSelection, PublicGuestDetails } from '@/types/public'

export type BookingStep = 'dates' | 'room' | 'details' | 'addons' | 'payment'

export interface BookingDraft {
  checkIn: string
  checkOut: string
  adults: number
  children: number
  category: 'all' | 'Room' | 'Apartment'
  slug?: string
  guest?: PublicGuestDetails
  addOns: AddOnSelection
  promoCode?: string
  reference?: string
}

interface PublicBookingState {
  draft: BookingDraft
  patch: (patch: Partial<BookingDraft>) => void
  setGuest: (guest: PublicGuestDetails) => void
  toggleAddOn: (key: keyof AddOnSelection) => void
  reset: () => void
}

function initialDraft(): BookingDraft {
  const today = new Date()
  return {
    checkIn: format(addDays(today, 2), 'yyyy-MM-dd'),
    checkOut: format(addDays(today, 4), 'yyyy-MM-dd'),
    adults: 2,
    children: 0,
    category: 'all',
    addOns: { breakfast: false, airportPickup: false, lateCheckout: false },
  }
}

export const usePublicBookingStore = create<PublicBookingState>()(
  persist(
    (set) => ({
      draft: initialDraft(),
      patch: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
      setGuest: (guest) => set((state) => ({ draft: { ...state.draft, guest } })),
      toggleAddOn: (key) => set((state) => ({
        draft: { ...state.draft, addOns: { ...state.draft.addOns, [key]: !state.draft.addOns[key] } },
      })),
      reset: () => set({ draft: initialDraft() }),
    }),
    {
      name: 'hayata-public-booking',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ draft: state.draft }),
    },
  ),
)
