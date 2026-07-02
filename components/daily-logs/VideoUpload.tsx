'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Video, X, AlertCircle, WifiOff, Film } from 'lucide-react'

interface VideoUploadProps {
  videos: File[]
  onVideosChange: (videos: File[]) => void
  existingVideos?: string[]
  onExistingVideosChange?: (videos: string[]) => void
  maxVideos?: number
  maxSizeMB?: number
  disabled?: boolean
  isOnline?: boolean
}

export function VideoUpload({
  videos,
  onVideosChange,
  existingVideos = [],
  onExistingVideosChange,
  maxVideos = 5,
  maxSizeMB = 50,
  disabled = false,
  isOnline = true,
}: VideoUploadProps) {
  const [error, setError] = useState<string>('')
  const [previews, setPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const totalVideos = existingVideos.length + videos.length

  // Generar/limpiar object URLs para previews de videos nuevos
  useEffect(() => {
    if (videos.length === 0) {
      setPreviews([])
      return
    }

    const nextPreviews = videos.map((video) => URL.createObjectURL(video))
    setPreviews(nextPreviews)

    return () => {
      nextPreviews.forEach((preview) => URL.revokeObjectURL(preview))
    }
  }, [videos])

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setError('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    if (files.length === 0) return

    if (totalVideos + files.length > maxVideos) {
      setError(`Máximo ${maxVideos} videos permitidos`)
      return
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024
    const validFiles: File[] = []

    for (const file of files) {
      if (!file.type.startsWith('video/')) {
        setError(`${file.name} no es un video válido`)
        continue
      }
      if (file.size > maxSizeBytes) {
        setError(`${file.name} excede el tamaño máximo de ${maxSizeMB}MB`)
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      onVideosChange([...videos, ...validFiles])
    }
  }

  const removeVideo = (index: number) => {
    onVideosChange(videos.filter((_, i) => i !== index))
  }

  const removeExistingVideo = (index: number) => {
    if (!onExistingVideosChange) return
    onExistingVideosChange(existingVideos.filter((_, i) => i !== index))
  }

  // Sin conexión: la subida de video requiere internet (v1).
  if (!isOnline) {
    return (
      <Alert className="border-amber-300 bg-amber-50 text-amber-800">
        <WifiOff className="h-4 w-4" />
        <AlertDescription>
          La carga de videos requiere conexión a internet. Las fotos sí se guardan sin conexión.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* Botón de subida */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || totalVideos >= maxVideos}
        />

        <Button
          type="button"
          variant="outline"
          onClick={handleButtonClick}
          disabled={disabled || totalVideos >= maxVideos}
          className="flex items-center gap-2"
        >
          <Video className="h-4 w-4" />
          Agregar Video
        </Button>

        {totalVideos > 0 && (
          <span className="text-sm text-gray-500">
            {totalVideos} de {maxVideos} videos
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

      {/* Galería de videos */}
      {totalVideos > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {existingVideos.map((url, index) => (
            <Card key={`existing-video-${index}`} className="relative group overflow-hidden">
              <CardContent className="p-2">
                <div className="relative aspect-video">
                  <video
                    src={url}
                    controls
                    preload="metadata"
                    className="w-full h-full object-cover rounded bg-black"
                  />
                  {onExistingVideosChange && (
                    <button
                      type="button"
                      onClick={() => removeExistingVideo(index)}
                      disabled={disabled}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1
                               opacity-0 group-hover:opacity-100 transition-opacity
                               hover:bg-red-600 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {videos.map((video, index) => (
            <Card key={`new-video-${index}`} className="relative group overflow-hidden">
              <CardContent className="p-2">
                <div className="relative aspect-video">
                  <video
                    src={previews[index]}
                    controls
                    preload="metadata"
                    className="w-full h-full object-cover rounded bg-black"
                  />
                  <button
                    type="button"
                    onClick={() => removeVideo(index)}
                    disabled={disabled}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1
                             opacity-0 group-hover:opacity-100 transition-opacity
                             hover:bg-red-600 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1
                                opacity-0 group-hover:opacity-100 transition-opacity">
                    {(video.size / (1024 * 1024)).toFixed(1)} MB
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Estado vacío */}
      {totalVideos === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Film className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-2">No hay videos agregados</p>
            <p className="text-xs text-gray-400">
              Haz clic en &quot;Agregar Video&quot; para subir un clip de obra
            </p>
          </CardContent>
        </Card>
      )}

      {/* Ayuda */}
      <p className="text-xs text-gray-500">
        Formatos: MP4, MOV, WEBM • Tamaño máximo: {maxSizeMB}MB por video • Se adjuntan como enlace en el PDF
      </p>
    </div>
  )
}
