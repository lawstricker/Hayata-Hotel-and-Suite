import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { GalleryField } from '@/components/common/gallery-field'
import { ImageField } from '@/components/common/image-field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { useRoomTypesStore } from '@/store/roomTypesStore'
import type { RoomType } from '@/types/domain'

const roomTypeSchema = z.object({
  name: z.string().min(2, 'Enter the room type name'),
  code: z.string().min(2, 'Enter a short code').max(12, 'Keep the code short'),
  baseRate: z.number().min(0, 'Enter the nightly rate'),
  capacity: z.number().int().min(1, 'At least one guest').max(20, 'Twenty guests at most'),
  totalRooms: z.number().int().min(0, 'Zero rooms at least'),
  amenities: z.string().min(1, 'Add at least one amenity'),
})
type RoomTypeValues = z.infer<typeof roomTypeSchema>

const emptyValues: RoomTypeValues = {
  name: '',
  code: '',
  baseRate: 0,
  capacity: 2,
  totalRooms: 0,
  amenities: '',
}

/** Builds the identifier of a room type that was just created. */
function newRoomTypeId() {
  return `rt-${Date.now().toString(36)}`
}

/** Adds a room type or edits an existing one, and stores it on the server. */
export function RoomTypeDialog({ open, onOpenChange, roomType }: { open: boolean; onOpenChange: (open: boolean) => void; roomType?: RoomType | null }) {
  const create = useRoomTypesStore((state) => state.create)
  const update = useRoomTypesStore((state) => state.update)
  const [saving, setSaving] = useState(false)
  // The pictures start from the room type that is being edited. The screen
  // gives this dialog a fresh key every time it is opened, so a new room type
  // never inherits the pictures of the previous one.
  const [image, setImage] = useState(roomType?.image ?? '')
  const [gallery, setGallery] = useState<string[]>(roomType?.gallery ?? [])
  const form = useForm<RoomTypeValues>({ resolver: zodResolver(roomTypeSchema), defaultValues: emptyValues })

  // The dialog is reused for a new room type and for an existing one, so the
  // form is filled whenever the selected type changes.
  useEffect(() => {
    if (!open) return
    form.reset(roomType
      ? {
        name: roomType.name,
        code: roomType.code,
        baseRate: roomType.baseRate,
        capacity: roomType.capacity,
        totalRooms: roomType.totalRooms,
        amenities: roomType.amenities.join(', '),
      }
      : emptyValues)
  }, [open, roomType, form])

  async function submit(values: RoomTypeValues) {
    const payload: RoomType = {
      id: roomType?.id ?? newRoomTypeId(),
      name: values.name.trim(),
      code: values.code.trim().toUpperCase(),
      baseRate: values.baseRate,
      capacity: values.capacity,
      totalRooms: values.totalRooms,
      amenities: values.amenities.split(',').map((amenity) => amenity.trim()).filter(Boolean),
      image: image.trim(),
      gallery,
    }
    setSaving(true)
    try {
      const result = roomType ? await update(payload) : await create(payload)
      toast.success(roomType ? 'Room type updated' : 'Room type added', {
        description: result.persisted
          ? `${result.roomType.name} · ${result.roomType.code}`
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
          <DialogTitle>{roomType ? `Edit ${roomType.name}` : 'Add room type'}</DialogTitle>
          <DialogDescription>Set the category, nightly rate, occupancy and amenities of the rooms in this type.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((values) => void submit(values))} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="room-type-name">Name</Label>
              <Input id="room-type-name" placeholder="Deluxe King" {...form.register('name')} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room-type-code">Code</Label>
              <Input id="room-type-code" placeholder="DLX-K" {...form.register('code')} />
              {form.formState.errors.code && <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room-type-rate">Nightly rate</Label>
              <Input id="room-type-rate" type="number" min={0} step={1} {...form.register('baseRate', { valueAsNumber: true })} />
              {form.formState.errors.baseRate && <p className="text-xs text-destructive">{form.formState.errors.baseRate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room-type-capacity">Guests</Label>
              <Input id="room-type-capacity" type="number" min={1} max={20} {...form.register('capacity', { valueAsNumber: true })} />
              {form.formState.errors.capacity && <p className="text-xs text-destructive">{form.formState.errors.capacity.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room-type-total">Rooms in this type</Label>
              <Input id="room-type-total" type="number" min={0} step={1} {...form.register('totalRooms', { valueAsNumber: true })} />
              {form.formState.errors.totalRooms && <p className="text-xs text-destructive">{form.formState.errors.totalRooms.message}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="room-type-amenities">Amenities</Label>
              <Input id="room-type-amenities" placeholder="King bed, City view, Rain shower" {...form.register('amenities')} />
              <p className="text-[11px] text-muted-foreground">Separate each amenity with a comma.</p>
              {form.formState.errors.amenities && <p className="text-xs text-destructive">{form.formState.errors.amenities.message}</p>}
            </div>
          </div>
          <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-3">
            <ImageField
              value={image}
              onChange={setImage}
              id="room-type-image"
              label="Profile picture"
              hint="The picture shown on the room type card. Paste a link or upload a photo."
              placeholder="https://images.example.com/deluxe-king.jpg"
            />
            <GalleryField value={gallery} onChange={setGallery} id="room-type-gallery" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : roomType ? 'Save changes' : 'Add room type'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
