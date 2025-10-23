'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Trash2, Check } from 'lucide-react'

interface Signature {
  name: string
  role: string
  signature: string // base64
  timestamp: string
}

interface SignatureCaptureProps {
  signatures: Signature[]
  onChange: (signatures: Signature[]) => void
  maxSignatures?: number
}

export function SignatureCapture({ 
  signatures, 
  onChange, 
  maxSignatures = 5 
}: SignatureCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [currentName, setCurrentName] = useState('')
  const [currentRole, setCurrentRole] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  useEffect(() => {
    if (isCapturing && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }
  }, [isCapturing])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let x, y
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let x, y
    if ('touches' in e) {
      e.preventDefault()
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const saveSignature = () => {
    if (!currentName.trim()) {
      alert('Por favor ingresa el nombre del firmante')
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    // Verificar que hay algo dibujado
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const hasDrawing = imageData.data.some(channel => channel !== 0)
    
    if (!hasDrawing) {
      alert('Por favor firma en el recuadro')
      return
    }

    const signatureData = canvas.toDataURL('image/png')
    
    const newSignature: Signature = {
      name: currentName,
      role: currentRole || 'Sin especificar',
      signature: signatureData,
      timestamp: new Date().toISOString()
    }

    onChange([...signatures, newSignature])
    
    // Reset
    setIsCapturing(false)
    setCurrentName('')
    setCurrentRole('')
    clearCanvas()
  }

  const removeSignature = (index: number) => {
    onChange(signatures.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {/* Lista de firmas existentes */}
      {signatures.length > 0 && (
        <div className="space-y-2">
          <Label>Firmas Capturadas ({signatures.length})</Label>
          <div className="grid gap-2">
            {signatures.map((sig, index) => (
              <Card key={index}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src={sig.signature} 
                      alt={`Firma de ${sig.name}`}
                      className="h-16 w-32 object-contain border rounded bg-white"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{sig.name}</p>
                      <p className="text-xs text-gray-500">{sig.role}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(sig.timestamp).toLocaleString('es-CO')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSignature(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Botón para agregar firma */}
      {!isCapturing && signatures.length < maxSignatures && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsCapturing(true)}
          className="w-full"
        >
          + Agregar Firma
        </Button>
      )}

      {/* Modal de captura */}
      {isCapturing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Capturar Firma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Datos del firmante */}
            <div className="grid gap-3">
              <div>
                <Label htmlFor="signer-name">Nombre del Firmante *</Label>
                <Input
                  id="signer-name"
                  value={currentName}
                  onChange={(e) => setCurrentName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div>
                <Label htmlFor="signer-role">Cargo/Rol</Label>
                <Input
                  id="signer-role"
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value)}
                  placeholder="Ej: Supervisor de Obra"
                />
              </div>
            </div>

            {/* Canvas de firma */}
            <div>
              <Label>Firma Aquí</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={200}
                  className="w-full touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Dibuja tu firma con el mouse o con el dedo
              </p>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={clearCanvas}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCapturing(false)
                  setCurrentName('')
                  setCurrentRole('')
                  clearCanvas()
                }}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={saveSignature}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
