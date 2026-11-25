import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SeoSettings {
  siteName: string
  defaultTitle: string
  description: string
  keywords: string
  canonicalBaseUrl: string
  ogImage: string
  twitterHandle: string
  locale: string
  themeColor: string
  googleVerification: string
  bingVerification: string
  indexEnabled: boolean
  hotel: {
    name: string
    telephone: string
    address: string
    priceRange: string
  }
}

export const defaultSeoSettings: SeoSettings = {
  siteName: 'Hayata Hotel & Suite',
  defaultTitle: 'Hayata Hotel & Suite — Stay beautifully',
  description: 'Rooms, apartments and considered dining in a quiet corner of the city. Check live availability and book your stay at Hayata Hotel & Suite.',
  keywords: 'Hayata Hotel, hotel, apartments, restaurant, bar, booking, accommodation, Lagos',
  canonicalBaseUrl: 'https://hayatahotel.com',
  ogImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  twitterHandle: '@hayatahotel',
  locale: 'en_NG',
  themeColor: '#0f766e',
  googleVerification: '',
  bingVerification: '',
  indexEnabled: true,
  hotel: {
    name: 'Hayata Hotel & Suite',
    telephone: '+234 801 234 5678',
    address: 'Metro City, Lagos, Nigeria',
    priceRange: '₦₦',
  },
}

interface SeoState {
  settings: SeoSettings
  update: (values: SeoSettings) => void
  reset: () => void
}

export const useSeoStore = create<SeoState>()(
  persist(
    (set) => ({
      settings: defaultSeoSettings,
      update: (settings) => set({ settings }),
      reset: () => set({ settings: defaultSeoSettings }),
    }),
    { name: 'hayata-hms-seo', partialize: (state) => ({ settings: state.settings }) },
  ),
)
