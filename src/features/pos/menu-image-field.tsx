import { ImageField } from '@/components/common/image-field'

/**
 * Captures the picture for a menu item.
 *
 * The field itself is shared with the room type screens, so a manager sees the
 * same upload experience everywhere a picture can be added.
 */
export function MenuImageField({ value, onChange, id = 'menu-image', label = 'Image' }: { value: string; onChange: (value: string) => void; id?: string; label?: string }) {
  return <ImageField value={value} onChange={onChange} id={id} label={label} placeholder="https://images.example.com/dish.jpg" />
}
