'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Camera, Pencil, X, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { PhotoEditorDialog } from './PhotoEditorDialog'

interface PhotoUploadProps {
  photos: File[]
  onPhotosChange: (photos: File[]) => void
  existingPhotos?: string[]
  onExistingPhotosChange?: (photos: string[]) => void
  captions?: string[]
  onCaptionsChange?: (captions: string[]) => void
  maxPhotos?: number
  maxSizeMB?: number
  disabled?: boolean
}

export function PhotoUpload({ 
  photos, 
  onPhotosChange,
  existingPhotos = [],
  onExistingPhotosChange,
  captions = [],
  onCaptionsChange,
  maxPhotos = 10,
  maxSizeMB = 10,
  disabled = false 
}: PhotoUploadProps) {
  const [error, setError] = useState<string>('')
  const [previews, setPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const totalPhotos = existingPhotos.length + photos.length
  const combinedPhotos = [
    ...existingPhotos.map((preview, index) => ({
      kind: 'existing' as const,
      preview,
      captionIndex: index,
      existingIndex: index,
    })),
    ...previews.map((preview, index) => ({
      kind: 'new' as const,
      preview,
      captionIndex: existingPhotos.length + index,
      photoIndex: index,
    })),
  ]

  useEffect(() => {
    if (photos.length === 0) {
      setPreviews([])
      return
    }

    const nextPreviews = photos.map((photo) => URL.createObjectURL(photo))
    setPreviews(nextPreviews)

    return () => {
      nextPreviews.forEach((preview) => URL.revokeObjectURL(preview))
    }
  }, [photos])

  useEffect(() => {
    if (editingIndex !== null && editingIndex >= photos.length) {
      setEditingIndex(null)
    }
  }, [editingIndex, photos.length])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setError('')

    // Validar número de fotos
    if (totalPhotos + files.length > maxPhotos) {
      setError(`Máximo ${maxPhotos} fotos permitidas`)
      return
    }

    // Validar tamaño y tipo
    const validFiles: File[] = []
    const maxSizeBytes = maxSizeMB * 1024 * 1024

    for (const file of files) {
      // Validar tipo
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} no es una imagen válida`)
        continue
      }

      // Validar tamaño
      if (file.size > maxSizeBytes) {
        setError(`${file.name} excede el tamaño máximo de ${maxSizeMB}MB`)
        continue
      }

      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      onPhotosChange([...photos, ...validFiles])

      // Agregar captions vacíos para las nuevas fotos
      if (onCaptionsChange) {
        const newCaptions = [...captions, ...validFiles.map(() => '')]
        onCaptionsChange(newCaptions)
      }
    }

    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    onPhotosChange(newPhotos)

    if (editingIndex !== null) {
      if (editingIndex === index) {
        setEditingIndex(null)
      } else if (editingIndex > index) {
        setEditingIndex(editingIndex - 1)
      }
    }

    if (onCaptionsChange) {
      const captionIndex = existingPhotos.length + index
      const newCaptions = captions.filter((_, i) => i !== captionIndex)
      onCaptionsChange(newCaptions)
    }
  }

  const removeExistingPhoto = (index: number) => {
    if (!onExistingPhotosChange) return

    const newExistingPhotos = existingPhotos.filter((_, i) => i !== index)
    onExistingPhotosChange(newExistingPhotos)

    if (onCaptionsChange) {
      const newCaptions = captions.filter((_, i) => i !== index)
      onCaptionsChange(newCaptions)
    }
  }

  const updateCaption = (index: number, value: string) => {
    if (!onCaptionsChange) return
    const newCaptions = [...captions]
    newCaptions[index] = value
    onCaptionsChange(newCaptions)
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleApplyEdits = (editedFile: File) => {
    if (editingIndex === null) return

    const updatedPhotos = photos.map((photo, index) =>
      index === editingIndex ? editedFile : photo
    )

    onPhotosChange(updatedPhotos)
    setEditingIndex(null)
  }

  const handleEditorOpenChange = (open: boolean) => {
    if (!open) {
      setEditingIndex(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Botón de subida */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || totalPhotos >= maxPhotos}
        />
        
        <Button
          type="button"
          variant="outline"
          onClick={handleButtonClick}
          disabled={disabled || totalPhotos >= maxPhotos}
          className="flex items-center gap-2"
        >
          <Camera className="h-4 w-4" />
          Agregar Fotos
        </Button>

        {totalPhotos > 0 && (
          <span className="text-sm text-gray-500">
            {totalPhotos} de {maxPhotos} fotos
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Galería de previews con leyendas */}
      {combinedPhotos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {combinedPhotos.map((photo, index) => (
            <Card key={`${photo.kind}-${photo.kind === 'existing' ? photo.existingIndex : photo.photoIndex}`} className="relative group overflow-hidden">
              <CardContent className="p-2 space-y-2">
                <div className="relative aspect-video">
                  <img
                    src={photo.preview}
                    alt={captions[photo.captionIndex] || `Foto ${index + 1}`}
                    className="w-full h-full object-cover rounded"
                  />

                  {photo.kind === 'new' && (
                    <button
                      type="button"
                      onClick={() => setEditingIndex(photo.photoIndex)}
                      disabled={disabled}
                      className="absolute top-1 left-1 bg-white/90 text-gray-700 rounded-full p-1.5 
                               opacity-0 group-hover:opacity-100 transition-opacity
                               hover:bg-white disabled:opacity-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  
                  {/* Botón eliminar */}
                  <button
                    type="button"
                    onClick={() => photo.kind === 'existing' ? removeExistingPhoto(photo.existingIndex) : removePhoto(photo.photoIndex)}
                    disabled={disabled}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 
                             opacity-0 group-hover:opacity-100 transition-opacity
                             hover:bg-red-600 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {photo.kind === 'new' && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 
                                  opacity-0 group-hover:opacity-100 transition-opacity">
                      {(photos[photo.photoIndex]?.size / 1024).toFixed(0)} KB
                    </div>
                  )}
                </div>

                {/* Leyenda de la foto */}
                <input
                  type="text"
                  value={captions[photo.captionIndex] || ''}
                  onChange={(e) => updateCaption(photo.captionIndex, e.target.value)}
                  placeholder="Ej: Foto panorámica proyecto, Revisión columnas..."
                  disabled={disabled}
                  className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-gray-400"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Estado vacío */}
      {combinedPhotos.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-2">
              No hay fotos agregadas
            </p>
            <p className="text-xs text-gray-400">
              Haz clic en "Agregar Fotos" para subir imágenes
            </p>
          </CardContent>
        </Card>
      )}

      {/* Ayuda */}
      <p className="text-xs text-gray-500">
        📸 Formatos: JPG, PNG, WEBP, HEIC • Tamaño máximo: {maxSizeMB}MB por foto
      </p>

      <PhotoEditorDialog
        file={editingIndex !== null ? (photos[editingIndex] ?? null) : null}
        open={editingIndex !== null}
        onOpenChange={handleEditorOpenChange}
        onApply={handleApplyEdits}
      />
    </div>
  )
}
