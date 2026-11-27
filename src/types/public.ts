export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED'

export type PublicRoomCategory = 'Room' | 'Apartment'

export interface SeasonalOverride {
  from: string
  to: string
  multiplier: number
  label: string
}

export interface PublicRoomType {
  slug: string
  staffType: string
  name: string
  category: PublicRoomCategory
  tagline: string
  description: string
  longDescription: string
  images: string[]
  amenities: string[]
  highlights: string[]
  sleeps: number
  bedrooms: number
  bathrooms: number
  sizeSqm: number
  bed: string
  baseRate: number
  weekendUplift: number
  seasonalOverrides: SeasonalOverride[]
  cancellationHours: number
  policies: string[]
}

export interface RateNight {
  date: string
  rate: number
  label?: string
}

export interface Availability {
  roomTypeId: string
  slug: string
  name: string
  category: PublicRoomCategory
  images: string[]
  amenities: string[]
  highlights: string[]
  sleeps: number
  sizeSqm: number
  bed: string
  checkIn: string
  checkOut: string
  nights: number
  availableCount: number
  nightlyRates: RateNight[]
  roomSubtotal: number
  taxes: number
  total: number
  cancellationHours: number
  policies: string[]
}

export interface PublicGuestDetails {
  firstName: string
  lastName: string
  email: string
  phone: string
  requests?: string
  acceptTerms: boolean
}

export interface AddOnSelection {
  breakfast: boolean
  airportPickup: boolean
  lateCheckout: boolean
}

export interface AddOnLine {
  key: keyof AddOnSelection
  label: string
  amount: number
}

export interface Quote {
  nights: number
  nightlyRates: RateNight[]
  roomSubtotal: number
  addOnLines: AddOnLine[]
  addOnSubtotal: number
  promoCode?: string
  discount: number
  taxableAmount: number
  taxes: number
  total: number
}

export interface PublicBooking {
  reference: string
  status: BookingStatus
  checkIn: string
  checkOut: string
  adults: number
  children: number
  roomTypeId: string
  slug: string
  roomName: string
  assignedRoomNumber: string
  guest: PublicGuestDetails
  addOns: AddOnSelection
  promoCode?: string
  quote: Quote
  createdAt: string
  staffReservationId: string
  paymentStatus: 'PENDING' | 'PAID'
  /** Short-lived HMAC proof issued with the booking; required to confirm payment. */
  paymentToken?: string
  cancellationReason?: string
}

export interface PublicEnquiry {
  name: string
  email: string
  subject: string
  message: string
}

/**
 * The stay behind a room's permanent in-room QR code.
 *
 * The code identifies the room only, so the stay is whichever guest is checked
 * in to that room right now, or the last guest who stayed in it.
 */
export interface PublicRoomStay {
  roomNumber: string
  guestName: string
  email?: string
  checkIn?: string
  checkOut?: string
  /** `Checked in` while the guest is in the room, `Checked out` after the stay ended. */
  status?: string
}

export interface ApiError {
  error: string
  code: 'CONFLICT' | 'NOT_FOUND' | 'VALIDATION' | 'EMAIL_MISMATCH' | 'POLICY'
  availableRooms?: Availability[]
}
