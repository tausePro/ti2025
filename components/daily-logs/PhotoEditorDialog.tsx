'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Move, RefreshCw, RotateCcw, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  applyImageEdits,
  clampOffsets,
  drawImageToCanvas,
  getAspectRatio,
  getPreviewCanvasSize,
  loadImageFromFile,
  type PhotoAspectPreset,
} from '@/lib/imageEditor'

interface PhotoEditorDialogProps {
  file: File | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (file: File) => void
}

const aspectOptions: Array<{ label: string; value: PhotoAspectPreset }> = [
  { label: 'Original', value: 'original' },
  { label: '16:9', value: '16:9' },
  { label: '4:3', value: '4:3' },
  { label: '1:1', value: '1:1' },
]

export function PhotoEditorDialog({ file, open, onOpenChange, onApply }: PhotoEditorDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    offsetX: number
    offsetY: number
  } | null>(null)

  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [aspectPreset, setAspectPreset] = useState<PhotoAspectPreset>('original')
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [sharpness, setSharpness] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !file) {
      setImage(null)
      setError('')
      return
    }

    let cancelled = false

    setAspectPreset('original')
    setRotation(0)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    setBrightness(100)
    setContrast(100)
    setSharpness(0)
    setError('')
    setLoading(true)

    loadImageFromFile(file)
      .then((loadedImage) => {
        if (!cancelled) {
          setImage(loadedImage)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('No se pudo abrir esta imagen para edición en el navegador.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [file, open])

  const aspectRatio = useMemo(() => {
    if (!image) {
      return 4 / 3
    }

    return getAspectRatio(aspectPreset, image.width, image.height, rotation)
  }, [aspectPreset, image, rotation])

  const previewCanvasSize = useMemo(() => getPreviewCanvasSize(aspectRatio), [aspectRatio])

  useEffect(() => {
    if (!image) {
      return
    }

    const clamped = clampOffsets(
      image,
      previewCanvasSize,
      zoom,
      rotation,
      offset.x,
      offset.y
    )

    if (clamped.offsetX !== offset.x || clamped.offsetY !== offset.y) {
      setOffset({ x: clamped.offsetX, y: clamped.offsetY })
    }
  }, [image, offset.x, offset.y, previewCanvasSize, rotation, zoom])

  useEffect(() => {
    if (!image || !canvasRef.current) {
      return
    }

    const nextOffset = drawImageToCanvas(
      canvasRef.current,
      image,
      previewCanvasSize,
      {
        rotation,
        zoom,
        offsetX: offset.x,
        offsetY: offset.y,
        brightness,
        contrast,
        sharpness,
      },
      '#000000'
    )

    if (nextOffset.offsetX !== offset.x || nextOffset.offsetY !== offset.y) {
      setOffset({ x: nextOffset.offsetX, y: nextOffset.offsetY })
    }
  }, [image, offset.x, offset.y, previewCanvasSize, rotation, zoom, brightness, contrast, sharpness])

  const handleRotate = (direction: 'left' | 'right') => {
    setRotation((currentRotation) => currentRotation + (direction === 'left' ? -90 : 90))
  }

  const handleReset = () => {
    setAspectPreset('original')
    setRotation(0)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    setBrightness(100)
    setContrast(100)
    setSharpness(0)
    setError('')
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!image) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!image || !dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - dragStateRef.current.startX
    const deltaY = event.clientY - dragStateRef.current.startY
    const nextOffset = clampOffsets(
      image,
      previewCanvasSize,
      zoom,
      rotation,
      dragStateRef.current.offsetX + deltaX,
      dragStateRef.current.offsetY + deltaY
    )

    setOffset({ x: nextOffset.offsetX, y: nextOffset.offsetY })
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    dragStateRef.current = null
  }

  const handleApply = async () => {
    if (!file || !image) {
      return
    }

    try {
      setSaving(true)
      setError('')

      const editedFile = await applyImageEdits(file, {
        aspectRatio,
        rotation,
        zoom,
        offsetX: offset.x,
        offsetY: offset.y,
        brightness,
        contrast,
        sharpness,
      })

      onApply(editedFile)
      onOpenChange(false)
    } catch (applyError) {
      setError(
        applyError instanceof Error
          ? applyError.message
          : 'No se pudo guardar la edición de la imagen.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar foto</DialogTitle>
          <DialogDescription>
            Recorta, rota y acomoda la imagen antes de guardarla en la bitácora.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {aspectOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={aspectPreset === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAspectPreset(option.value)}
                disabled={loading || saving || !image}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRotate('left')}
              disabled={loading || saving || !image}
            >
              <RotateCcw className="h-4 w-4" />
              Girar izquierda
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRotate('right')}
              disabled={loading || saving || !image}
            >
              <RotateCw className="h-4 w-4" />
              Girar derecha
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={loading || saving || !image}
            >
              <RefreshCw className="h-4 w-4" />
              Restablecer
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Zoom</span>
              <span>{zoom.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              disabled={loading || saving || !image}
              className="w-full"
            />
          </div>

          <div className="rounded-lg border bg-black/95 p-2">
            <div className="mx-auto flex max-h-[50vh] min-h-[200px] items-center justify-center overflow-hidden">
              {loading ? (
                <div className="flex min-h-[240px] items-center justify-center text-white">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : image ? (
                <canvas
                  ref={canvasRef}
                  width={previewCanvasSize.width}
                  height={previewCanvasSize.height}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="max-w-full rounded border border-white/10 touch-none"
                  style={{
                    aspectRatio: `${previewCanvasSize.width} / ${previewCanvasSize.height}`,
                    cursor: 'grab',
                  }}
                />
              ) : (
                <div className="flex min-h-[240px] items-center justify-center text-sm text-white/80">
                  No se pudo cargar la imagen.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Brillo</span>
                <span>{brightness}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                step="1"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                disabled={loading || saving || !image}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Contraste</span>
                <span>{contrast}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                step="1"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                disabled={loading || saving || !image}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Nitidez</span>
                <span>{sharpness}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={sharpness}
                onChange={(e) => setSharpness(Number(e.target.value))}
                disabled={loading || saving || !image}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Move className="h-4 w-4" />
            Arrastra la imagen para ajustar el encuadre.
          </div>

          {file && (
            <div className="text-xs text-muted-foreground">
              {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={!image || loading || saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Aplicar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
