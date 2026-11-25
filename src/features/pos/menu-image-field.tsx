import { ImageOff, Loader2, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

const MAX_DIMENSION = 640
const MAX_INLINE_BYTES = 400_000
const MAX_DATA_URL_BYTES = 400_000

/** Draws the image onto a canvas and encodes it as JPEG. */
function encodeJpeg(image: HTMLImageElement, maxDimension: number, quality: number): string {
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('The image could not be processed.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

/**
 * Reads an image file and returns a data URL that is small enough to store in the
 * `menu_items.image` column. Large photos are downscaled before they are encoded.
 */
async function fileToDataUrl(file: File): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('The file could not be read.'))
    reader.readAsDataURL(file)
  })

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image()
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('That file is not a readable image.'))
    element.src = raw
  })

  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height))
  if (scale === 1 && raw.length <= MAX_INLINE_BYTES) return raw

  let dimension = MAX_DIMENSION
  let quality = 0.82
  let encoded = encodeJpeg(image, dimension, quality)
  // Keep shrinking until the stored image stays comfortably inside the column.
  while (encoded.length > MAX_DATA_URL_BYTES && dimension > 160) {
    dimension = Math.round(dimension * 0.7)
    quality = Math.max(0.5, quality - 0.08)
    encoded = encodeJpeg(image, dimension, quality)
  }
  return encoded
}

interface MenuImageFieldProps {
  value: string
  onChange: (value: string) => void
  id?: string
  label?: string
}

/**
 * Captures the picture for a menu item.
 *
 * The manager can paste an image URL or upload a file; both are previewed live so
 * it is obvious which image will be shown on the menu.
 */
export function MenuImageField({ value, onChange, id = 'menu-image', label = 'Image' }: MenuImageFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [broken, setBroken] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file', { description: `${file.name} is not an image.` })
      return
    }
    setBusy(true)
    try {
      onChange(await fileToDataUrl(file))
      setBroken(false)
      toast.success('Image added', { description: file.name })
    } catch (error) {
      toast.error('Could not add that image', { description: (error as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const trimmed = value.trim()
  const showPreview = trimmed.length > 0 && !broken

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-3">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
          {showPreview ? (
            <img src={trimmed} alt="" className="size-full object-cover" onError={() => setBroken(true)} />
          ) : (
            <ImageOff className="size-6 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            id={id}
            value={value}
            onChange={(event) => { onChange(event.target.value); setBroken(false) }}
            placeholder="https://images.example.com/dish.jpg"
            inputMode="url"
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = '' }}
            />
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? <Loader2 className="animate-spin" /> : <Upload />} Upload image
            </Button>
            {trimmed.length > 0 && (
              <Button type="button" size="sm" variant="ghost" onClick={() => { onChange(''); setBroken(false) }}>
                <X /> Clear
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Paste a link or upload a photo. Uploaded photos are resized automatically.</p>
        </div>
      </div>
    </div>
  )
}
