import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { useHotelStore } from '@/store/hotelStore'
import { useRoomTypesStore } from '@/store/roomTypesStore'
import type { Room } from '@/types/domain'

const roomSchema = z.object({
  number: z.string().min(1, 'Enter the room number').max(20, 'That room number is too long'),
  floor: z.number().int().min(0, 'Enter the floor').max(200, 'That floor is not possible'),
  type: z.string().min(1, 'Select a room type'),
  status: z.enum(['Available', 'Occupied', 'Dirty', 'Clean', 'Out of Order', 'Reserved']),
  housekeepingStatus: z.enum(['Dirty', 'In Progress', 'Inspected', 'Clean']),
  rate: z.number().min(0, 'Enter the nightly rate'),
})
type RoomValues = z.infer<typeof roomSchema>

const roomStatuses: Room['status'][] = ['Available', 'Occupied', 'Dirty', 'Clean', 'Reserved', 'Out of Order']
const housekeepingStatuses: Room['housekeepingStatus'][] = ['Dirty', 'In Progress', 'Inspected', 'Clean']

const emptyValues: RoomValues = {
  number: '',
  floor: 1,
  type: '',
  status: 'Available',
  housekeepingStatus: 'Clean',
  rate: 0,
}

/** The moment the room was last changed. */
function now() {
  return new Date().toISOString()
}

/** Adds a room to the rack or edits an existing one, and stores it on the server. */
export function RoomDialog({
  open,
  onOpenChange,
  room,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  room?: Room | null
}) {
  const addRoom = useHotelStore((state) => state.addRoom)
  const editRoom = useHotelStore((state) => state.editRoom)
  const rooms = useHotelStore((state) => state.rooms)
  const roomTypes = useRoomTypesStore((state) => state.items)
  const [saving, setSaving] = useState(false)
  const form = useForm<RoomValues>({ resolver: zodResolver(roomSchema), defaultValues: emptyValues })

  // The dialog is reused for a new room and for an existing one, so the form
  // is filled whenever the selected room changes.
  useEffect(() => {
    if (!open) return
    form.reset(room
      ? {
        number: room.number,
        floor: room.floor,
        type: room.type,
        status: room.status,
        housekeepingStatus: room.housekeepingStatus,
        rate: room.rate,
      }
      : { ...emptyValues, type: roomTypes[0]?.name ?? '' })
  }, [open, room, roomTypes, form])

  async function submit(values: RoomValues) {
    const number = values.number.trim()
    // The room number is the permanent identity of the room, so two rooms can
    // never share one.
    const duplicate = rooms.find((candidate) => candidate.number.toUpperCase() === number.toUpperCase() && candidate.id !== room?.id)
    if (duplicate) {
      form.setError('number', { message: `Room ${number} already exists` })
      return
    }

    const payload: Room = {
      id: room?.id ?? `room-${number}`,
      number,
      floor: values.floor,
      type: values.type,
      status: values.status,
      guestName: room?.guestName,
      housekeepingStatus: values.housekeepingStatus,
      rate: values.rate,
      updatedAt: now(),
    }
    setSaving(true)
    try {
      const result = room ? await editRoom(payload) : await addRoom(payload)
      toast.success(room ? 'Room updated' : 'Room added', {
        description: result.persisted
          ? `Room ${result.room.number} · ${result.room.type}`
          : 'Saved on this device — the server could not be reached.',
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{room ? `Edit room ${room.number}` : 'Add room'}</DialogTitle>
          <DialogDescription>
            The room number is the permanent identity of the room: it is the code in the in-room dining QR and the address the kitchen delivers to.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((values) => void submit(values))} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="room-number">Room number</Label>
              <Input id="room-number" placeholder="101" {...form.register('number')} />
              {form.formState.errors.number && <p className="text-xs text-destructive">{form.formState.errors.number.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room-floor">Floor</Label>
              <Input id="room-floor" type="number" min={0} max={200} {...form.register('floor', { valueAsNumber: true })} />
              {form.formState.errors.floor && <p className="text-xs text-destructive">{form.formState.errors.floor.message}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="room-type">Room type</Label>
              <select
                id="room-type"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                {...form.register('type', {
                  onChange: (event) => {
                    const chosen = roomTypes.find((candidate) => candidate.name === event.target.value)
                    form.setValue('type', event.target.value)
                    if (chosen) form.setValue('rate', chosen.baseRate)
                  },
                })}
              >
                <option value="">Select a room type</option>
                {roomTypes.map((type) => <option key={type.id} value={type.name}>{type.name}</option>)}
              </select>
              {form.formState.errors.type && <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room-status">Status</Label>
              <select id="room-status" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" {...form.register('status')}>
                {roomStatuses.map((status) => <option key={status}>{status}</option>)}
              </select>
              {form.formState.errors.status && <p className="text-xs text-destructive">{form.formState.errors.status.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room-housekeeping">Housekeeping</Label>
              <select id="room-housekeeping" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" {...form.register('housekeepingStatus')}>
                {housekeepingStatuses.map((status) => <option key={status}>{status}</option>)}
              </select>
              {form.formState.errors.housekeepingStatus && <p className="text-xs text-destructive">{form.formState.errors.housekeepingStatus.message}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="room-rate">Nightly rate</Label>
              <Input id="room-rate" type="number" min={0} step={1} {...form.register('rate', { valueAsNumber: true })} />
              {form.formState.errors.rate && <p className="text-xs text-destructive">{form.formState.errors.rate.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : room ? 'Save changes' : 'Add room'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
