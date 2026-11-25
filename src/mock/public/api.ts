import { differenceInCalendarDays, eachDayOfInterval, format, isWeekend, parseISO, subDays } from 'date-fns'
import { useHotelStore } from '@/store/hotelStore'
import { apiGet, apiPost, SERVER_ENABLED, withFallback } from '@/lib/api-client'
import { upsertLiveReservation, updateLiveReservationStatus } from '@/lib/reservation-sync'
import { publicRoomTypes, getPublicRoomType } from '@/mock/public/room-types'
import type {
  AddOnSelection,
  ApiError,
  Availability,
  BookingStatus,
  PublicBooking,
  PublicEnquiry,
  PublicGuestDetails,
  PublicRoomType,
  Quote,
  RateNight,
} from '@/types/public'
import type { Reservation } from '@/types/domain'

const BOOKINGS_KEY = 'hayata-public-bookings'
const ENQUIRIES_KEY = 'hayata-public-enquiries'
const NEWSLETTER_KEY = 'hayata-public-newsletter'
const BLOCKING_STATUSES = new Set<Reservation['status']>(['Confirmed', 'Pending', 'Checked in'])

export class PublicApiError extends Error implements ApiError {
  error: string
  code: ApiError['code']
  availableRooms?: Availability[]

  constructor(error: string, code: ApiError['code'], availableRooms?: Availability[]) {
    super(error)
    this.name = 'PublicApiError'
    this.error = error
    this.code = code
    this.availableRooms = availableRooms
  }
}

function delay(ms = 260) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readBookings(): PublicBooking[] {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as PublicBooking[] : []
  } catch {
    return []
  }
}

function writeBookings(bookings: PublicBooking[]) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings))
}

function appendToStorage(key: string, value: unknown) {
  const current = localStorage.getItem(key)
  const parsed = current ? JSON.parse(current) : []
  localStorage.setItem(key, JSON.stringify([...(Array.isArray(parsed) ? parsed : []), value]))
}

function generateReference(existing: PublicBooking[]) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const used = new Set(existing.map((booking) => booking.reference))
  let reference = ''
  do {
    reference = `HYT-${Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')}`
  } while (used.has(reference))
  return reference
}

function isOverlapping(checkIn: string, checkOut: string, reservation: Reservation) {
  if (!reservation.roomNumber || !reservation.checkIn || !reservation.checkOut) return false
  return parseISO(checkIn) < parseISO(reservation.checkOut) && parseISO(checkOut) > parseISO(reservation.checkIn)
}

export function findAvailableRoomNumbers(staffType: string, checkIn: string, checkOut: string) {
  const { rooms, reservations } = useHotelStore.getState()
  const blocked = new Set(
    reservations
      .filter((reservation) => BLOCKING_STATUSES.has(reservation.status) && isOverlapping(checkIn, checkOut, reservation))
      .map((reservation) => reservation.roomNumber),
  )
  return rooms.filter((room) => room.type === staffType && room.status !== 'Out of Order' && !blocked.has(room.number)).map((room) => room.number)
}

function rateForDate(roomType: PublicRoomType, date: Date) {
  const iso = format(date, 'yyyy-MM-dd')
  const seasonal = roomType.seasonalOverrides.find((override) => iso >= override.from && iso <= override.to)
  let rate = roomType.baseRate
  if (isWeekend(date)) rate *= roomType.weekendUplift
  if (seasonal) rate *= seasonal.multiplier
  return Math.round(rate * 100) / 100
}

function nightlyRates(roomType: PublicRoomType, checkIn: string, checkOut: string): RateNight[] {
  const start = parseISO(checkIn)
  const end = parseISO(checkOut)
  const days = eachDayOfInterval({ start, end: subDays(end, 1) })
  return days.map((date) => {
    const iso = format(date, 'yyyy-MM-dd')
    const seasonal = roomType.seasonalOverrides.find((override) => iso >= override.from && iso <= override.to)
    return { date: iso, rate: rateForDate(roomType, date), label: seasonal?.label ?? (isWeekend(date) ? 'Weekend' : undefined) }
  })
}

export function computeQuote(
  roomType: PublicRoomType,
  checkIn: string,
  checkOut: string,
  addOns: AddOnSelection,
  promoCode?: string,
  guests = 1,
): Quote {
  const rates = nightlyRates(roomType, checkIn, checkOut)
  const roomSubtotal = Math.round(rates.reduce((sum, night) => sum + night.rate, 0) * 100) / 100
  const nights = rates.length
  const addOnLines = []
  if (addOns.breakfast) addOnLines.push({ key: 'breakfast' as const, label: 'Daily breakfast', amount: 12000 * guests * nights })
  if (addOns.airportPickup) addOnLines.push({ key: 'airportPickup' as const, label: 'Airport pickup', amount: 18000 })
  if (addOns.lateCheckout) addOnLines.push({ key: 'lateCheckout' as const, label: 'Late checkout', amount: 15000 })
  const addOnSubtotal = addOnLines.reduce((sum, line) => sum + line.amount, 0)
  const normalizedPromo = promoCode?.trim().toUpperCase()
  const promoRate = normalizedPromo === 'HAYATA10' ? 0.1 : normalizedPromo === 'STAY5' ? 0.05 : normalizedPromo === 'LONGSTAY7' && nights >= 3 ? 0.07 : 0
  const discount = Math.round((roomSubtotal + addOnSubtotal) * promoRate * 100) / 100
  const taxableAmount = Math.round((roomSubtotal + addOnSubtotal - discount) * 100) / 100
  const taxes = Math.round(taxableAmount * 0.08 * 100) / 100
  return {
    nights,
    nightlyRates: rates,
    roomSubtotal,
    addOnLines,
    addOnSubtotal,
    promoCode: promoRate ? normalizedPromo : undefined,
    discount,
    taxableAmount,
    taxes,
    total: Math.round((taxableAmount + taxes) * 100) / 100,
  }
}

function validateDates(checkIn: string, checkOut: string) {
  const nights = differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn))
  if (!checkIn || !checkOut || nights < 1 || nights > 30) throw new PublicApiError('Choose a valid stay of 1 to 30 nights.', 'VALIDATION')
  return nights
}

function toPublicStatus(reservationStatus: Reservation['status'] | undefined, fallback: BookingStatus): BookingStatus {
  if (reservationStatus === 'Checked in') return 'CHECKED_IN'
  if (reservationStatus === 'Checked out') return 'CHECKED_OUT'
  if (reservationStatus === 'Cancelled') return 'CANCELLED'
  if (reservationStatus === 'Confirmed') return 'CONFIRMED'
  return fallback
}

function withLiveStatus(booking: PublicBooking): PublicBooking {
  const reservation = useHotelStore.getState().reservations.find((candidate) => candidate.id === booking.staffReservationId)
  return { ...booking, status: toPublicStatus(reservation?.status, booking.status) }
}

function availabilityFor(roomType: PublicRoomType, checkIn: string, checkOut: string, addOns?: AddOnSelection, promoCode?: string, guests = 1): Availability {
  const rates = nightlyRates(roomType, checkIn, checkOut)
  const roomSubtotal = Math.round(rates.reduce((sum, night) => sum + night.rate, 0) * 100) / 100
  const quote = addOns ? computeQuote(roomType, checkIn, checkOut, addOns, promoCode, guests) : null
  return {
    roomTypeId: roomType.slug,
    slug: roomType.slug,
    name: roomType.name,
    category: roomType.category,
    images: roomType.images,
    amenities: roomType.amenities,
    highlights: roomType.highlights,
    sleeps: roomType.sleeps,
    sizeSqm: roomType.sizeSqm,
    bed: roomType.bed,
    checkIn,
    checkOut,
    nights: rates.length,
    availableCount: findAvailableRoomNumbers(roomType.staffType, checkIn, checkOut).length,
    nightlyRates: rates,
    roomSubtotal,
    taxes: quote?.taxes ?? Math.round(roomSubtotal * 0.08 * 100) / 100,
    total: quote?.total ?? Math.round(roomSubtotal * 1.08 * 100) / 100,
    cancellationHours: roomType.cancellationHours,
    policies: roomType.policies,
  }
}

const localPublicApi = {
  async getRoomTypes() {
    await delay(180)
    return publicRoomTypes.map((roomType) => ({
      ...roomType,
      roomsAvailable: useHotelStore.getState().rooms.filter((room) => room.type === roomType.staffType && room.status !== 'Out of Order').length,
    }))
  },

  async getAvailability(params: { checkIn: string; checkOut: string; adults: number; children: number; category?: string }) {
    await delay(320)
    validateDates(params.checkIn, params.checkOut)
    const types = publicRoomTypes.filter((roomType) => !params.category || params.category === 'all' || roomType.category === params.category)
    const results = types.map((roomType) => availabilityFor(roomType, params.checkIn, params.checkOut, undefined, undefined, params.adults + params.children))
    return results.filter((room) => room.sleeps >= params.adults + params.children)
  },

  async quote(input: { slug: string; checkIn: string; checkOut: string; adults: number; children: number; addOns: AddOnSelection; promoCode?: string }) {
    await delay(200)
    validateDates(input.checkIn, input.checkOut)
    const roomType = getPublicRoomType(input.slug)
    if (!roomType) throw new PublicApiError('That room is no longer available.', 'NOT_FOUND')
    return computeQuote(roomType, input.checkIn, input.checkOut, input.addOns, input.promoCode, input.adults + input.children)
  },

  async createBooking(input: {
    slug: string
    checkIn: string
    checkOut: string
    adults: number
    children: number
    guest: PublicGuestDetails
    addOns: AddOnSelection
    promoCode?: string
  }) {
    await delay(420)
    validateDates(input.checkIn, input.checkOut)
    const roomType = getPublicRoomType(input.slug)
    if (!roomType) throw new PublicApiError('That room is no longer available.', 'NOT_FOUND')
    const availableRooms = findAvailableRoomNumbers(roomType.staffType, input.checkIn, input.checkOut)
    if (!availableRooms.length) {
      const alternatives = publicRoomTypes
        .filter((candidate) => candidate.slug !== input.slug && findAvailableRoomNumbers(candidate.staffType, input.checkIn, input.checkOut).length > 0)
        .map((candidate) => availabilityFor(candidate, input.checkIn, input.checkOut))
      throw new PublicApiError('Sorry, that room was just taken. Please choose another room.', 'CONFLICT', alternatives)
    }
    if (!input.guest.acceptTerms) throw new PublicApiError('Please accept the booking terms to continue.', 'VALIDATION')

    const existing = readBookings()
    const reference = generateReference(existing)
    const quote = computeQuote(roomType, input.checkIn, input.checkOut, input.addOns, input.promoCode, input.adults + input.children)
    const booking: PublicBooking = {
      reference,
      status: 'PENDING_PAYMENT',
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      adults: input.adults,
      children: input.children,
      roomTypeId: roomType.slug,
      slug: roomType.slug,
      roomName: roomType.name,
      assignedRoomNumber: availableRooms[0],
      guest: input.guest,
      addOns: input.addOns,
      promoCode: quote.promoCode,
      quote,
      createdAt: new Date().toISOString(),
      staffReservationId: `res-online-${reference}`,
      paymentStatus: 'PENDING',
    }

    const reservation: Reservation = {
      id: booking.staffReservationId,
      guestId: `guest-online-${reference}`,
      guestName: `${input.guest.firstName} ${input.guest.lastName}`,
      roomType: roomType.staffType,
      roomNumber: booking.assignedRoomNumber,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      adults: input.adults,
      children: input.children,
      status: 'Pending',
      source: 'ONLINE',
      channel: 'WEBSITE',
      ratePlan: 'Website flexible',
      rate: quote.roomSubtotal / Math.max(1, quote.nights),
      deposit: 0,
      addOns: quote.addOnLines.map((line) => line.label),
      total: quote.total,
    }
    useHotelStore.getState().addReservation(reservation)
    writeBookings([booking, ...existing])
    return booking
  },

  async payBooking(reference: string) {
    await delay(520)
    const bookings = readBookings()
    const booking = bookings.find((candidate) => candidate.reference === reference)
    if (!booking) throw new PublicApiError('Booking not found.', 'NOT_FOUND')
    const paid: PublicBooking = { ...booking, status: 'CONFIRMED', paymentStatus: 'PAID' }
    useHotelStore.getState().updateReservationStatus(booking.staffReservationId, 'Confirmed', booking.assignedRoomNumber)
    writeBookings(bookings.map((candidate) => candidate.reference === reference ? paid : candidate))
    return withLiveStatus(paid)
  },

  async lookupBooking(reference: string, email: string) {
    await delay(280)
    const booking = readBookings().find((candidate) => candidate.reference === reference.trim().toUpperCase())
    if (!booking) throw new PublicApiError('No booking found with that reference.', 'NOT_FOUND')
    if (booking.guest.email.toLowerCase() !== email.trim().toLowerCase()) throw new PublicApiError('The email does not match this booking.', 'EMAIL_MISMATCH')
    return withLiveStatus(booking)
  },

  async getBookingByReference(reference: string) {
    await delay(160)
    const booking = readBookings().find((candidate) => candidate.reference === reference)
    if (!booking) throw new PublicApiError('Booking not found.', 'NOT_FOUND')
    return withLiveStatus(booking)
  },

  async cancelBooking(reference: string, email: string) {
    await delay(380)
    const bookings = readBookings()
    const booking = bookings.find((candidate) => candidate.reference === reference)
    if (!booking) throw new PublicApiError('Booking not found.', 'NOT_FOUND')
    if (booking.guest.email.toLowerCase() !== email.trim().toLowerCase()) throw new PublicApiError('The email does not match this booking.', 'EMAIL_MISMATCH')
    const roomType = getPublicRoomType(booking.slug)
    const hoursAhead = (parseISO(booking.checkIn).getTime() - Date.now()) / 3_600_000
    if (booking.status === 'CONFIRMED' && roomType && hoursAhead < roomType.cancellationHours) {
      throw new PublicApiError(`This booking can only be cancelled more than ${roomType.cancellationHours} hours before arrival.`, 'POLICY')
    }
    if (booking.status !== 'CANCELLED') {
      useHotelStore.getState().updateReservationStatus(booking.staffReservationId, 'Cancelled')
    }
    const cancelled: PublicBooking = { ...booking, status: 'CANCELLED' }
    writeBookings(bookings.map((candidate) => candidate.reference === reference ? cancelled : candidate))
    return cancelled
  },

  async submitEnquiry(enquiry: PublicEnquiry) {
    await delay(340)
    if (!enquiry.name || !enquiry.email || !enquiry.message) throw new PublicApiError('Please complete all required fields.', 'VALIDATION')
    appendToStorage(ENQUIRIES_KEY, { ...enquiry, receivedAt: new Date().toISOString() })
    return { ok: true }
  },

  async subscribeNewsletter(email: string) {
    await delay(240)
    if (!email.includes('@')) throw new PublicApiError('Enter a valid email address.', 'VALIDATION')
    appendToStorage(NEWSLETTER_KEY, { email, subscribedAt: new Date().toISOString() })
    return { ok: true }
  },
}

function reservationFromBooking(booking: PublicBooking, status: Reservation['status']): Reservation {
  const roomType = getPublicRoomType(booking.slug)
  return {
    id: booking.staffReservationId,
    guestId: `guest-online-${booking.reference}`,
    guestName: `${booking.guest.firstName} ${booking.guest.lastName}`.trim(),
    roomType: roomType?.staffType ?? booking.roomName,
    roomNumber: booking.assignedRoomNumber,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    adults: booking.adults,
    children: booking.children,
    status,
    source: 'ONLINE',
    channel: 'WEBSITE',
    ratePlan: 'Website flexible',
    rate: booking.quote.roomSubtotal / Math.max(1, booking.quote.nights),
    deposit: 0,
    addOns: booking.quote.addOnLines.map((line) => line.label),
    total: booking.quote.total,
  }
}

function storeBooking(booking: PublicBooking, reservationStatus: Reservation['status']) {
  writeBookings([booking, ...readBookings().filter((candidate) => candidate.reference !== booking.reference)])
  const reservation = reservationFromBooking(booking, reservationStatus)
  upsertLiveReservation(reservation)
  useHotelStore.setState((state) => ({
    reservations: [reservation, ...state.reservations.filter((candidate) => candidate.id !== reservation.id)],
  }))
}

function updateStoredBooking(reference: string, status: BookingStatus, reservationStatus: Reservation['status']) {
  const booking = readBookings().find((candidate) => candidate.reference === reference)
  if (!booking) return
  writeBookings(readBookings().map((candidate) => candidate.reference === reference ? { ...candidate, status } : candidate))
  updateLiveReservationStatus(booking.staffReservationId, reservationStatus, booking.assignedRoomNumber)
  useHotelStore.setState((state) => ({
    reservations: state.reservations.map((candidate) => candidate.id === booking.staffReservationId ? { ...candidate, status: reservationStatus } : candidate),
    rooms: reservationStatus === 'Cancelled' || reservationStatus === 'Checked out'
      ? state.rooms.map((room) => room.number === booking.assignedRoomNumber ? { ...room, status: 'Clean', guestName: undefined } : room)
      : state.rooms,
  }))
}

function serverErrorToPublic(error: unknown): PublicApiError | null {
  const candidate = error as { code?: string; message?: string; availableRooms?: Availability[] }
  if (!candidate?.code) return null
  return new PublicApiError(candidate.message ?? 'Request failed.', candidate.code as ApiError['code'], candidate.availableRooms)
}

export const publicApi = {
  getRoomTypes: () => withFallback<{ slug: string; roomsAvailable: number }[]>(
    () => apiGet('/public/room-types'),
    () => localPublicApi.getRoomTypes(),
  ),

  getAvailability: (params: { checkIn: string; checkOut: string; adults: number; children: number; category?: string }) => {
    const search = new URLSearchParams()
    search.set('checkIn', params.checkIn)
    search.set('checkOut', params.checkOut)
    search.set('adults', String(params.adults))
    search.set('children', String(params.children))
    search.set('category', params.category ?? 'all')
    return withFallback<Availability[]>(
      () => apiGet(`/public/availability?${search.toString()}`),
      () => localPublicApi.getAvailability(params),
    )
  },

  quote: (input: { slug: string; checkIn: string; checkOut: string; adults: number; children: number; addOns: AddOnSelection; promoCode?: string }) => withFallback<Quote>(
    () => apiPost('/public/quote', input),
    () => localPublicApi.quote(input),
  ),

  async createBooking(input: { slug: string; checkIn: string; checkOut: string; adults: number; children: number; guest: PublicGuestDetails; addOns: AddOnSelection; promoCode?: string }) {
    if (!SERVER_ENABLED) return localPublicApi.createBooking(input)
    try {
      const booking = await apiPost<PublicBooking>('/public/bookings', input)
      storeBooking(booking, 'Pending')
      return booking
    } catch (error) {
      const apiError = serverErrorToPublic(error)
      if (apiError) throw apiError
      return localPublicApi.createBooking(input)
    }
  },

  async payBooking(reference: string) {
    if (!SERVER_ENABLED) return localPublicApi.payBooking(reference)
    try {
      const booking = await apiPost<PublicBooking>(`/public/bookings/${reference}/pay`, {})
      updateStoredBooking(reference, 'CONFIRMED', 'Confirmed')
      return booking
    } catch {
      return localPublicApi.payBooking(reference)
    }
  },

  async lookupBooking(reference: string, email: string) {
    if (!SERVER_ENABLED) return localPublicApi.lookupBooking(reference, email)
    try {
      return await apiGet<PublicBooking>(`/public/bookings/${reference}?email=${encodeURIComponent(email)}`)
    } catch {
      return localPublicApi.lookupBooking(reference, email)
    }
  },

  async getBookingByReference(reference: string) {
    if (!SERVER_ENABLED) return localPublicApi.getBookingByReference(reference)
    try {
      return await apiGet<PublicBooking>(`/public/bookings/${reference}`)
    } catch {
      return localPublicApi.getBookingByReference(reference)
    }
  },

  async cancelBooking(reference: string, email: string) {
    if (!SERVER_ENABLED) return localPublicApi.cancelBooking(reference, email)
    try {
      const booking = await apiPost<PublicBooking>(`/public/bookings/${reference}/cancel`, { email })
      updateStoredBooking(reference, 'CANCELLED', 'Cancelled')
      return booking
    } catch (error) {
      const apiError = serverErrorToPublic(error)
      if (apiError) throw apiError
      return localPublicApi.cancelBooking(reference, email)
    }
  },

  submitEnquiry: (enquiry: PublicEnquiry) => withFallback<{ ok: boolean }>(
    () => apiPost('/public/enquiries', enquiry),
    () => localPublicApi.submitEnquiry(enquiry),
  ),

  subscribeNewsletter: (email: string) => withFallback<{ ok: boolean }>(
    () => apiPost('/public/newsletter', { email }),
    () => localPublicApi.subscribeNewsletter(email),
  ),
}
