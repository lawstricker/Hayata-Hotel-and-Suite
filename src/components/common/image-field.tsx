import { ImageOff, Loader2, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { fileToDataUrl, isImageFile } from '@/lib/image-upload'

interface ImageFieldProps {
  value: string
  onChange: (value: string) => void
  id?: string
  label?: string
  hint?: string
  placeholder?: string
}

/**
 * Captures one picture.
 *
 * The manager can paste an image URL or upload a file; both are previewed live
 * so it is obvious which image will be shown.
 */
export function ImageField({
  value,
  onChange,
  id = 'image',
  label = 'Image',
  hint = 'Paste a link or upload a photo. Uploaded photos are resized automatically.',
  placeholder = 'https://images.example.com/photo.jpg',
}: ImageFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [broken, setBroken] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!isImageFile(file)) {
      toast.error('Choose an image file', { description: `${file.name} is not an image.` })
      return
    }
    setBusy(true)
    try {
      onChange(await fileToDataUrl(file))
      setBroken(false)
      toast.success('Picture added', { description: file.name })
    } catch (error) {
      toast.error('Could not add that picture', { description: (error as Error).message })
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
            placeholder={placeholder}
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
              {busy ? <Loader2 className="animate-spin" /> : <Upload />} Upload picture
            </Button>
            {trimmed.length > 0 && (
              <Button type="button" size="sm" variant="ghost" onClick={() => { onChange(''); setBroken(false) }}>
                <X /> Clear
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </div>
    </div>
  )
}
