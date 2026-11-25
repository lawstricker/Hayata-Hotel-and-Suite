import type { PublicBooking } from '@/types/public'

function icsDate(value: string) {
  return value.replaceAll('-', '').replaceAll(':', '')
}

function escapeText(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;')
}

export function buildIcsDataUrl(booking: PublicBooking) {
  const stamp = icsDate(new Date().toISOString())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hayata Hotel & Suite//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${booking.reference}@hayatahotel.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(booking.checkIn)}`,
    `DTEND;VALUE=DATE:${icsDate(booking.checkOut)}`,
    `SUMMARY:${escapeText(`Stay at Hayata — ${booking.roomName}`)}`,
    `DESCRIPTION:${escapeText(`Booking reference ${booking.reference}. Room ${booking.assignedRoomNumber}.`)}`,
    'LOCATION:Hayata Hotel & Suite, 88 Harbor Avenue, Metro City',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const ics = lines.join('\r\n')
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`
}
