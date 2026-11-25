import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PromiseIcon = 'Sparkles' | 'Coffee' | 'MapPin' | 'ShieldCheck'

export interface HomepageContent {
  hero: {
    eyebrow: string
    title: string
    description: string
    image: string
    primaryLabel: string
    primaryHref: string
    secondaryLabel: string
    secondaryHref: string
    scrollLabel: string
  }
  promises: Array<{ id: string; icon: PromiseIcon; label: string }>
  rooms: { eyebrow: string; titleLead: string; titleAccent: string; description: string; linkLabel: string }
  story: {
    eyebrow: string
    title: string
    description: string
    stats: Array<{ id: string; value: number; suffix: string; label: string }>
    image1: string
    image2: string
  }
  apartments: { eyebrow: string; titleLead: string; titleAccent: string; description: string }
  cta: { title: string; description: string; buttonLabel: string; buttonHref: string }
  recognition: string
  visibility: {
    promises: boolean
    rooms: boolean
    story: boolean
    apartments: boolean
    cta: boolean
    recognition: boolean
  }
}

export const defaultHomepageContent: HomepageContent = {
  hero: {
    eyebrow: 'Metro City · A private address',
    title: 'Stay beautifully.',
    description: 'Rooms, apartments and considered dining in a quiet corner of the city. Come for the sleep, stay for the feeling.',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2200&q=90',
    primaryLabel: 'Reserve your stay',
    primaryHref: '/booking/dates',
    secondaryLabel: 'Explore rooms',
    secondaryHref: '/rooms',
    scrollLabel: 'Scroll to discover',
  },
  promises: [
    { id: 'promise-1', icon: 'Sparkles', label: 'Considered design' },
    { id: 'promise-2', icon: 'Coffee', label: 'All-day dining' },
    { id: 'promise-3', icon: 'MapPin', label: 'Harbourside address' },
    { id: 'promise-4', icon: 'ShieldCheck', label: 'Flexible stays' },
  ],
  rooms: {
    eyebrow: 'Your space',
    titleLead: 'Rooms made for ',
    titleAccent: 'slowing down',
    description: 'Every room and apartment is designed around light, quiet and a genuinely good night’s sleep.',
    linkLabel: 'View all stays',
  },
  story: {
    eyebrow: 'The Hayata way',
    title: 'Small details, deeply felt.',
    description: 'From the first greeting to the last quiet morning, we look after the things that make a stay feel effortless.',
    stats: [
      { id: 'stat-1', value: 40, suffix: '', label: 'Rooms & apartments' },
      { id: 'stat-2', value: 24, suffix: '/7', label: 'Reception & dining' },
      { id: 'stat-3', value: 2019, suffix: '', label: 'Welcoming since' },
    ],
    image1: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=700&q=85',
    image2: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=700&q=85',
  },
  apartments: {
    eyebrow: 'Apartments',
    titleLead: 'Stay a little ',
    titleAccent: 'longer',
    description: 'When a night turns into a week, our apartments give you room to live well.',
  },
  cta: {
    title: 'Your next stay starts here.',
    description: 'Check live availability and book in a few calm steps.',
    buttonLabel: 'Check dates',
    buttonHref: '/booking/dates',
  },
  recognition: 'Recognised for quiet luxury and considered service',
  visibility: { promises: true, rooms: true, story: true, apartments: true, cta: true, recognition: true },
}

interface PageBuilderState {
  homepage: HomepageContent
  update: (homepage: HomepageContent) => void
  reset: () => void
}

export const usePageBuilderStore = create<PageBuilderState>()(
  persist(
    (set) => ({
      homepage: defaultHomepageContent,
      update: (homepage) => set({ homepage }),
      reset: () => set({ homepage: defaultHomepageContent }),
    }),
    { name: 'hayata-hms-page-builder', partialize: (state) => ({ homepage: state.homepage }) },
  ),
)
