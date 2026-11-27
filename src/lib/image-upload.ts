/**
 * Turns a picture the manager picked into a small data URL.
 *
 * The pictures of a room type are stored in the database next to the room type
 * itself, so they are sent as data URLs. A photo straight from a phone is far
 * too large for that, so the picture is downscaled and re-encoded as JPEG
 * until it comfortably fits the column.
 */

const MAX_DIMENSION = 640
const MAX_INLINE_BYTES = 400_000
const MAX_DATA_URL_BYTES = 400_000
const MAX_SOURCE_BYTES = 12 * 1024 * 1024
const MAX_PIXELS = 20_000_000
// SVG, HTML and animated formats are not accepted: they can carry scripts or
// huge payloads. The server repeats this allowlist on every write.
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

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
 * Reads an image file and returns a data URL that is small enough to store.
 * Large photos are downscaled before they are encoded.
 */
export async function fileToDataUrl(file: File): Promise<string> {
  if (!isImageFile(file)) throw new Error('Only JPEG, PNG and WebP pictures are accepted.')
  if (file.size > MAX_SOURCE_BYTES) throw new Error('That picture is too large.')
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('The file could not be read.'))
    reader.readAsDataURL(file)
  })

  const declared = raw.slice(0, raw.indexOf(';base64,'))
  if (!ALLOWED_MIME.has(declared.replace('data:', ''))) throw new Error('That file is not a supported image.')

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image()
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('That file is not a readable image.'))
    element.src = raw
  })

  if (image.width * image.height > MAX_PIXELS) throw new Error('That picture has too many pixels.')

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

/** Reports whether a file looks like an image the browser can read. */
export function isImageFile(file: File): boolean {
  return ALLOWED_MIME.has(file.type.toLowerCase())
}
