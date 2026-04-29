function captionValue(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return isPhotoUrl(trimmed) ? '' : trimmed
  }

  if (!value || typeof value !== 'object') {
    return ''
  }

  const record = value as Record<string, unknown>
  const candidates = [
    record.caption,
    record.description,
    record.legend,
    record.leyenda,
    record.text,
    record.title,
  ]

  const match = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim())
  return typeof match === 'string' ? match.trim() : ''
}

function isPhotoUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) {
    return false
  }

  try {
    const url = new URL(value)
    return /\/storage\/v1\/object\//.test(url.pathname) || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(url.pathname)
  } catch {
    return false
  }
}

function parseCaptionSource(captions: unknown): unknown[] {
  if (Array.isArray(captions)) {
    return captions
  }

  if (typeof captions !== 'string') {
    return []
  }

  const trimmed = captions.trim()
  if (!trimmed) {
    return []
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed
      }
    } catch {
      return []
    }
  }

  return trimmed.split(',').map((caption) => caption.trim())
}

export function getPhotoCaptions(captions: unknown, totalPhotos: number, photos?: unknown): string[] {
  const source = parseCaptionSource(captions)
  const fallbackSource = source.length > 0
    ? source
    : Array.isArray(photos)
      ? photos.map((photo) => (photo && typeof photo === 'object' ? photo : null))
      : []

  return Array.from({ length: totalPhotos }, (_, index) => captionValue(fallbackSource[index]))
}
