import { useMutation, useQuery } from '@tanstack/react-query'
import { publicApi } from '@/mock/public/api'
import type { AddOnSelection, PublicEnquiry, PublicGuestDetails } from '@/types/public'

export function usePublicRoomTypes() {
  return useQuery({ queryKey: ['public', 'room-types'], queryFn: () => publicApi.getRoomTypes() })
}

export function usePublicAvailability(params: { checkIn: string; checkOut: string; adults: number; children: number; category?: string }) {
  return useQuery({
    queryKey: ['public', 'availability', params],
    queryFn: () => publicApi.getAvailability(params),
    enabled: Boolean(params.checkIn && params.checkOut),
  })
}

export function usePublicQuote() {
  return useMutation({
    mutationFn: (input: { slug: string; checkIn: string; checkOut: string; adults: number; children: number; addOns: AddOnSelection; promoCode?: string }) => publicApi.quote(input),
  })
}

export function useCreatePublicBooking() {
  return useMutation({
    mutationFn: (input: {
      slug: string
      checkIn: string
      checkOut: string
      adults: number
      children: number
      guest: PublicGuestDetails
      addOns: AddOnSelection
      promoCode?: string
    }) => publicApi.createBooking(input),
  })
}

export function usePayPublicBooking() {
  return useMutation({ mutationFn: (reference: string) => publicApi.payBooking(reference) })
}

export function useBookingLookup(reference: string | null, email: string | null) {
  return useQuery({
    queryKey: ['public', 'booking', reference, email],
    queryFn: () => publicApi.lookupBooking(reference!, email!),
    enabled: Boolean(reference && email),
    retry: false,
  })
}

export function useBookingByReference(reference: string | undefined) {
  return useQuery({
    queryKey: ['public', 'booking-reference', reference],
    queryFn: () => publicApi.getBookingByReference(reference!),
    enabled: Boolean(reference),
    retry: false,
  })
}

export function useCancelPublicBooking() {
  return useMutation({ mutationFn: ({ reference, email }: { reference: string; email: string }) => publicApi.cancelBooking(reference, email) })
}

export function usePublicEnquiry() {
  return useMutation({ mutationFn: (enquiry: PublicEnquiry) => publicApi.submitEnquiry(enquiry) })
}

export function useNewsletter() {
  return useMutation({ mutationFn: (email: string) => publicApi.subscribeNewsletter(email) })
}
