import { Images, Loader2, Plus, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { fileToDataUrl, isImageFile } from '@/lib/image-upload'
import { cn } from '@/lib/utils'

interface GalleryFieldProps {
  value: string[]
  onChange: (value: string[]) => void
  id?: string
  label?: string
  hint?: string
  /** The most pictures that are kept for one room type. */
  max?: number
}

/**
 * Captures the gallery pictures of a room type.
 *
 * Each picture can be uploaded from the computer or added as a link. The first
 * picture of the gallery is the one shown on the room type card.
 */
export function GalleryField({
  value,
  onChange,
  id = 'room-gallery',
  label = 'Gallery pictures',
  hint = 'Upload the extra pictures of this room type. The first one is shown on the card.',
  max = 8,
}: GalleryFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState('')

  function addPicture(picture: string) {
    const trimmed = picture.trim()
    if (!trimmed) return
    if (value.includes(trimmed)) {
      toast.info('That picture is already in the gallery')
      return
    }
    onChange([...value, trimmed].slice(0, max))
  }

  async function handleFiles(files: FileList | null) {
    const images = Array.from(files ?? []).filter(isImageFile)
    if (!images.length) {
      toast.error('Choose image files', { description: 'Only image files can be added to the gallery.' })
      return
    }
    setBusy(true)
    try {
      const encoded = await Promise.all(images.map((file) => fileToDataUrl(file)))
      onChange([...value, ...encoded].slice(0, max))
      toast.success('Pictures added', { description: `${encoded.length} picture${encoded.length === 1 ? '' : 's'} added` })
    } catch (error) {
      toast.error('Could not add those pictures', { description: (error as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((picture, index) => (
            <div key={`${picture.slice(0, 48)}-${index}`} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted/40">
              <img src={picture} alt="" className="size-full object-cover" />
              {index === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-primary/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground">Cover</span>
              )}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, position) => position !== index))}
                className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1 text-destructive opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                aria-label="Remove picture"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={link}
          onChange={(event) => setLink(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            addPicture(link)
            setLink('')
          }}
          placeholder="https://images.example.com/gallery.jpg"
          inputMode="url"
        />
        <Button type="button" variant="outline" disabled={!link.trim() || value.length >= max} onClick={() => { addPicture(link); setLink('') }}>
          <Plus /> Add link
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => { void handleFiles(event.target.files); event.target.value = '' }}
        />
        <Button type="button" size="sm" variant="outline" disabled={busy || value.length >= max} onClick={() => fileRef.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <Upload />} Upload pictures
        </Button>
        <span className={cn('text-[11px] text-muted-foreground', value.length >= max && 'font-semibold text-amber-700 dark:text-amber-300')}>
          {value.length} of {max} pictures
        </span>
      </div>
      {value.length === 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Images className="size-3" /> {hint}</p>
      )}
    </div>
  )
}
