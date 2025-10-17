'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, ZoomIn, Download, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'

interface PhotoGalleryProps {
  photos: string[]
  className?: string
}

export function PhotoGallery({ photos, className = '' }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (!photos || photos.length === 0) {
    return (
      <Card className={`border-dashed ${className}`}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <ImageIcon className="h-12 w-12 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">Sin fotos</p>
        </CardContent>
      </Card>
    )
  }

  const openLightbox = (index: number) => {
    setSelectedIndex(index)
  }

  const closeLightbox = () => {
    setSelectedIndex(null)
  }

  const goToPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
    }
  }

  const goToNext = () => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1)
    }
  }

  const downloadPhoto = (url: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = `foto-${Date.now()}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      {/* Grid de miniaturas */}
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 ${className}`}>
        {photos.map((photo, index) => (
          <Card 
            key={index} 
            className="relative group overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => openLightbox(index)}
          >
            <CardContent className="p-0">
              <div className="relative aspect-square">
                <Image
                  src={photo}
                  alt={`Foto ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />
                
                {/* Overlay al hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Número de foto */}
                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  {index + 1}/{photos.length}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={selectedIndex !== null} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-4xl h-[90vh] p-0">
          {selectedIndex !== null && (
            <>
              <DialogHeader className="p-4 pb-0">
                <DialogTitle className="flex items-center justify-between">
                  <span>Foto {selectedIndex + 1} de {photos.length}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadPhoto(photos[selectedIndex])}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={closeLightbox}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </DialogTitle>
              </DialogHeader>

              {/* Imagen principal */}
              <div className="relative flex-1 bg-black">
                <Image
                  src={photos[selectedIndex]}
                  alt={`Foto ${selectedIndex + 1}`}
                  fill
                  className="object-contain"
                  sizes="90vw"
                  priority
                />

                {/* Botones de navegación */}
                {selectedIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={goToPrevious}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                )}

                {selectedIndex < photos.length - 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={goToNext}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                )}
              </div>

              {/* Miniaturas */}
              <div className="p-4 bg-gray-100">
                <div className="flex gap-2 overflow-x-auto">
                  {photos.map((photo, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedIndex(index)}
                      className={`relative flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                        index === selectedIndex 
                          ? 'border-blue-500 scale-110' 
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <Image
                        src={photo}
                        alt={`Miniatura ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
