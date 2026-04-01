export type PhotoAspectPreset = 'original' | '16:9' | '4:3' | '1:1'

export interface ImageEditorTransform {
  rotation: number
  zoom: number
  offsetX: number
  offsetY: number
}

export interface CanvasSize {
  width: number
  height: number
}

interface TransformMetrics {
  baseScale: number
  maxOffsetX: number
  maxOffsetY: number
  clampedOffsetX: number
  clampedOffsetY: number
}

const ASPECT_RATIO_MAP: Record<Exclude<PhotoAspectPreset, 'original'>, number> = {
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function normalizeRotation(rotation: number): number {
  const normalizedRotation = rotation % 360
  return normalizedRotation < 0 ? normalizedRotation + 360 : normalizedRotation
}

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('No se pudo cargar la imagen para edición.'))
    }

    image.src = objectUrl
  })
}

export function getAspectRatio(
  preset: PhotoAspectPreset,
  imageWidth: number,
  imageHeight: number,
  rotation: number
): number {
  if (preset !== 'original') {
    return ASPECT_RATIO_MAP[preset]
  }

  const normalizedRotation = normalizeRotation(rotation)
  const isVerticalRotation = normalizedRotation === 90 || normalizedRotation === 270
  const width = isVerticalRotation ? imageHeight : imageWidth
  const height = isVerticalRotation ? imageWidth : imageHeight

  return width / height
}

export function getPreviewCanvasSize(aspectRatio: number, maxDimension = 720): CanvasSize {
  if (aspectRatio >= 1) {
    return {
      width: maxDimension,
      height: Math.max(1, Math.round(maxDimension / aspectRatio)),
    }
  }

  return {
    width: Math.max(1, Math.round(maxDimension * aspectRatio)),
    height: maxDimension,
  }
}

function getRotatedBounds(width: number, height: number, rotation: number): CanvasSize {
  const radians = (normalizeRotation(rotation) * Math.PI) / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))

  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  }
}

function getTransformMetrics(
  imageWidth: number,
  imageHeight: number,
  canvasSize: CanvasSize,
  zoom: number,
  rotation: number,
  offsetX: number,
  offsetY: number
): TransformMetrics {
  const rotatedBounds = getRotatedBounds(imageWidth, imageHeight, rotation)
  const baseScale = Math.max(
    canvasSize.width / rotatedBounds.width,
    canvasSize.height / rotatedBounds.height
  )

  const scaledWidth = rotatedBounds.width * baseScale * zoom
  const scaledHeight = rotatedBounds.height * baseScale * zoom
  const maxOffsetX = Math.max(0, (scaledWidth - canvasSize.width) / 2)
  const maxOffsetY = Math.max(0, (scaledHeight - canvasSize.height) / 2)

  return {
    baseScale,
    maxOffsetX,
    maxOffsetY,
    clampedOffsetX: clamp(offsetX, -maxOffsetX, maxOffsetX),
    clampedOffsetY: clamp(offsetY, -maxOffsetY, maxOffsetY),
  }
}

export function clampOffsets(
  image: HTMLImageElement,
  canvasSize: CanvasSize,
  zoom: number,
  rotation: number,
  offsetX: number,
  offsetY: number
): Pick<ImageEditorTransform, 'offsetX' | 'offsetY'> {
  const metrics = getTransformMetrics(
    image.width,
    image.height,
    canvasSize,
    zoom,
    rotation,
    offsetX,
    offsetY
  )

  return {
    offsetX: metrics.clampedOffsetX,
    offsetY: metrics.clampedOffsetY,
  }
}

export function drawImageToCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  canvasSize: CanvasSize,
  transform: ImageEditorTransform,
  backgroundColor?: string
): Pick<ImageEditorTransform, 'offsetX' | 'offsetY'> {
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('No se pudo inicializar el canvas de edición.')
  }

  canvas.width = canvasSize.width
  canvas.height = canvasSize.height

  const metrics = getTransformMetrics(
    image.width,
    image.height,
    canvasSize,
    transform.zoom,
    transform.rotation,
    transform.offsetX,
    transform.offsetY
  )

  context.clearRect(0, 0, canvasSize.width, canvasSize.height)

  if (backgroundColor) {
    context.fillStyle = backgroundColor
    context.fillRect(0, 0, canvasSize.width, canvasSize.height)
  }

  context.save()
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.translate(
    canvasSize.width / 2 + metrics.clampedOffsetX,
    canvasSize.height / 2 + metrics.clampedOffsetY
  )
  context.rotate((normalizeRotation(transform.rotation) * Math.PI) / 180)
  context.scale(metrics.baseScale * transform.zoom, metrics.baseScale * transform.zoom)
  context.drawImage(image, -image.width / 2, -image.height / 2)
  context.restore()

  return {
    offsetX: metrics.clampedOffsetX,
    offsetY: metrics.clampedOffsetY,
  }
}

function getOutputType(fileType: string): 'image/jpeg' | 'image/png' | 'image/webp' {
  if (fileType === 'image/png') {
    return 'image/png'
  }

  if (fileType === 'image/webp') {
    return 'image/webp'
  }

  return 'image/jpeg'
}

function getExtensionFromType(fileType: string): string {
  if (fileType === 'image/png') {
    return 'png'
  }

  if (fileType === 'image/webp') {
    return 'webp'
  }

  return 'jpg'
}

function replaceFileExtension(fileName: string, extension: string): string {
  const lastDotIndex = fileName.lastIndexOf('.')

  if (lastDotIndex === -1) {
    return `${fileName}.${extension}`
  }

  return `${fileName.slice(0, lastDotIndex)}.${extension}`
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  fileType: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No se pudo generar la imagen editada.'))
        return
      }

      resolve(blob)
    }, fileType, quality)
  })
}

export async function applyImageEdits(
  file: File,
  options: ImageEditorTransform & {
    aspectRatio: number
    maxOutputDimension?: number
  }
): Promise<File> {
  const image = await loadImageFromFile(file)
  const previewCanvasSize = getPreviewCanvasSize(options.aspectRatio)
  const previewMetrics = getTransformMetrics(
    image.width,
    image.height,
    previewCanvasSize,
    options.zoom,
    options.rotation,
    options.offsetX,
    options.offsetY
  )

  const naturalCropWidth = previewCanvasSize.width / (previewMetrics.baseScale * options.zoom)
  const naturalCropHeight = previewCanvasSize.height / (previewMetrics.baseScale * options.zoom)
  const maxOutputDimension = options.maxOutputDimension ?? 2400
  const outputScale = Math.min(1, maxOutputDimension / Math.max(naturalCropWidth, naturalCropHeight))
  const outputCanvasSize = {
    width: Math.max(1, Math.round(naturalCropWidth * outputScale)),
    height: Math.max(1, Math.round(naturalCropHeight * outputScale)),
  }

  const outputCanvas = document.createElement('canvas')
  const scaledOffsets = {
    offsetX: previewMetrics.clampedOffsetX * (outputCanvasSize.width / previewCanvasSize.width),
    offsetY: previewMetrics.clampedOffsetY * (outputCanvasSize.height / previewCanvasSize.height),
  }
  const outputType = getOutputType(file.type)

  drawImageToCanvas(
    outputCanvas,
    image,
    outputCanvasSize,
    {
      rotation: options.rotation,
      zoom: options.zoom,
      offsetX: scaledOffsets.offsetX,
      offsetY: scaledOffsets.offsetY,
    },
    outputType === 'image/png' ? undefined : '#000000'
  )

  const blob = await canvasToBlob(
    outputCanvas,
    outputType,
    outputType === 'image/png' ? undefined : 0.92
  )

  return new File([blob], replaceFileExtension(file.name, getExtensionFromType(outputType)), {
    type: outputType,
    lastModified: Date.now(),
  })
}
