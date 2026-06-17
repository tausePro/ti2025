import { loadImageFromFile } from './imageEditor'

export interface CompressImageOptions {
  maxDimension?: number
  quality?: number
  skipBelowBytes?: number
}

const DEFAULT_MAX_DIMENSION = 1600
const DEFAULT_QUALITY = 0.8
// Por debajo de este tamaño no vale la pena recomprimir (salvo HEIC, que igual se convierte).
const DEFAULT_SKIP_BELOW_BYTES = 500 * 1024

function isHeic(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
}

function replaceExtensionWithJpg(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  const base = lastDot === -1 ? fileName : fileName.slice(0, lastDot)
  return `${base}.jpg`
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
  })
}

/**
 * Comprime y redimensiona una imagen en el navegador antes de subirla.
 * - Redibuja a un máximo de `maxDimension` px en el lado más largo.
 * - Exporta JPEG con la calidad indicada (también convierte HEIC/HEIF a JPEG).
 * - Si algo falla o el resultado no es más liviano, devuelve el archivo original
 *   para nunca bloquear el guardado de la bitácora.
 */
export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION
  const quality = options.quality ?? DEFAULT_QUALITY
  const skipBelowBytes = options.skipBelowBytes ?? DEFAULT_SKIP_BELOW_BYTES

  if (!file.type.startsWith('image/')) {
    return file
  }

  // Imágenes ya pequeñas (y que no son HEIC) se dejan tal cual.
  if (file.size <= skipBelowBytes && !isHeic(file)) {
    return file
  }

  try {
    const image = await loadImageFromFile(file)
    const largestSide = Math.max(image.width, image.height)
    const scale = largestSide > maxDimension ? maxDimension / largestSide : 1

    const targetWidth = Math.max(1, Math.round(image.width * scale))
    const targetHeight = Math.max(1, Math.round(image.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return file
    }

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    // Fondo blanco por si la fuente tiene transparencia (JPEG no la soporta).
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, targetWidth, targetHeight)
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight)

    const blob = await canvasToBlob(canvas, quality)
    if (!blob) {
      return file
    }

    // Si no logramos reducir el peso (y no era HEIC que sí queremos convertir), conservamos el original.
    if (blob.size >= file.size && !isHeic(file)) {
      return file
    }

    return new File([blob], replaceExtensionWithJpg(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch {
    return file
  }
}

/**
 * Comprime una lista de imágenes en paralelo, conservando el orden.
 */
export async function compressImageFiles(
  files: File[],
  options: CompressImageOptions = {}
): Promise<File[]> {
  return Promise.all(files.map((file) => compressImageFile(file, options)))
}
