'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Camera, X, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react'
import Image from 'next/image'

interface PhotoUploadProps {
  photos: File[]
  onPhotosChange: (photos: File[]) => void
  maxPhotos?: number
  maxSizeMB?: number
  disabled?: boolean
}

export function PhotoUpload({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 10,
  maxSizeMB = 10,
  disabled = false 
}: PhotoUploadProps) {
  const [error, setError] = useState<string>('')
  const [previews, setPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setError('')

    // Validar número de fotos
    if (photos.length + files.length > maxPhotos) {
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
      const newPhotos = [...photos, ...validFiles]
      onPhotosChange(newPhotos)

      // Crear previews
      validFiles.forEach(file => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result as string])
        }
        reader.readAsDataURL(file)
      })
    }

    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    onPhotosChange(newPhotos)
    setPreviews(newPreviews)
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
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
          disabled={disabled || photos.length >= maxPhotos}
        />
        
        <Button
          type="button"
          variant="outline"
          onClick={handleButtonClick}
          disabled={disabled || photos.length >= maxPhotos}
          className="flex items-center gap-2"
        >
          <Camera className="h-4 w-4" />
          Agregar Fotos
        </Button>

        {photos.length > 0 && (
          <span className="text-sm text-gray-500">
            {photos.length} de {maxPhotos} fotos
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

      {/* Galería de previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <Card key={index} className="relative group overflow-hidden">
              <CardContent className="p-2">
                <div className="relative aspect-square">
                  <Image
                    src={preview}
                    alt={`Foto ${index + 1}`}
                    fill
                    className="object-cover rounded"
                  />
                  
                  {/* Botón eliminar */}
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    disabled={disabled}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 
                             opacity-0 group-hover:opacity-100 transition-opacity
                             hover:bg-red-600 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Info del archivo */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 
                                opacity-0 group-hover:opacity-100 transition-opacity">
                    {(photos[index].size / 1024).toFixed(0)} KB
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Estado vacío */}
      {previews.length === 0 && (
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
    </div>
  )
}
