import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultNotificationSettings, type NotificationSettings } from '@/lib/notification-settings'

export interface HotelProfile {
  name: string
  email: string
  phone: string
  address: string
  timezone: string
  currency: string
}

export interface OutletSetting {
  name: string
  type: string
  skus: number
  enabled: boolean
}

interface SettingsState {
  hotel: HotelProfile
  taxRates: Record<string, string>
  serviceCharges: { restaurant: boolean; taxInclusive: boolean; rounding: string }
  notifications: Record<string, boolean>
  outlets: Record<string, OutletSetting>
  /** SMTP configuration for the automatic guest emails. */
  notificationSettings: NotificationSettings
  savedAt: string | null
  updateHotel: (values: HotelProfile) => void
  setTaxRate: (key: string, rate: string) => void
  setServiceCharge: (key: 'restaurant' | 'taxInclusive' | 'rounding', value: boolean | string) => void
  setNotification: (key: string, value: boolean) => void
  updateOutlet: (key: string, values: OutletSetting) => void
  setNotificationSettings: (values: NotificationSettings) => void
  markSaved: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hotel: { name: 'Hayata Hotel & Suite', email: 'hello@hayatahotel.com', phone: '+1 (555) 010-8899', address: '88 Harbor Avenue, Metro City', timezone: 'America/New_York', currency: 'NGN' },
      taxRates: { 'Room accommodation': '8.25%', 'Restaurant dining': '8.00%', 'Bar sales': '10.00%', 'Events & banquet': '8.25%' },
      serviceCharges: { restaurant: true, taxInclusive: false, rounding: 'Nearest cent' },
      notifications: {
        'Low-stock threshold crossed': true,
        'New restaurant or bar order': true,
        'Reservation check-in': true,
        'Critical maintenance ticket': false,
        'Guest feedback score below 3': true,
        'Purchase order ready to receive': true,
      },
      outlets: {
        'Hotel Store': { name: 'Hotel Store', type: 'Warehouse & procurement', skus: 15, enabled: true },
        'Lumen Restaurant': { name: 'Lumen Restaurant', type: 'Dining & kitchen', skus: 15, enabled: true },
        'Atlas Bar': { name: 'Atlas Bar', type: 'Bar & cellar', skus: 15, enabled: true },
        Housekeeping: { name: 'Housekeeping', type: 'Guest supplies', skus: 15, enabled: true },
      },
      notificationSettings: { ...defaultNotificationSettings },
      savedAt: null,
      updateHotel: (hotel) => set({ hotel }),
      setTaxRate: (key, rate) => set((state) => ({ taxRates: { ...state.taxRates, [key]: rate } })),
      setServiceCharge: (key, value) => set((state) => ({ serviceCharges: { ...state.serviceCharges, [key]: value } })),
      setNotification: (key, value) => set((state) => ({ notifications: { ...state.notifications, [key]: value } })),
      updateOutlet: (key, values) => set((state) => ({ outlets: { ...state.outlets, [key]: values } })),
      setNotificationSettings: (notificationSettings) => set({ notificationSettings }),
      markSaved: () => set({ savedAt: new Date().toISOString() }),
    }),
    {
      name: 'hayata-hms-settings',
      partialize: (state) => ({
        hotel: state.hotel, taxRates: state.taxRates, serviceCharges: state.serviceCharges,
        notifications: state.notifications, outlets: state.outlets,
        notificationSettings: state.notificationSettings, savedAt: state.savedAt,
      }),
    },
  ),
)

export const notificationRows = [
  { label: 'Low-stock threshold crossed', detail: 'Email, in-app and live toast' },
  { label: 'New restaurant or bar order', detail: 'Kitchen display and sound alert' },
  { label: 'Reservation check-in', detail: 'Front desk and room service' },
  { label: 'Critical maintenance ticket', detail: 'Email, SMS and in-app' },
  { label: 'Guest feedback score below 3', detail: 'CRM manager and operations lead' },
  { label: 'Purchase order ready to receive', detail: 'Store manager and receiving team' },
]
