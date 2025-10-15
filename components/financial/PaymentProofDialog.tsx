'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Upload, FileText, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PaymentProofDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  orderNumber: string
  onSuccess: () => void
}

export function PaymentProofDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  onSuccess
}: PaymentProofDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validar tamaño (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('El archivo no debe superar los 10MB')
        return
      }
      
      // Validar tipo
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Solo se permiten archivos PDF o imágenes (JPG, PNG)')
        return
      }

      setFile(selectedFile)
      setError('')
    }
  }

  const handleSubmit = async () => {
    if (!file) {
      setError('Debe seleccionar un archivo')
      return
    }

    setUploading(true)
    setError('')

    try {
      // 1. Subir archivo a Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${orderId}-${Date.now()}.${fileExt}`
      const filePath = `payment-proofs/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('project-documents')
        .getPublicUrl(filePath)

      // 3. Actualizar orden de pago
      const { error: updateError } = await supabase
        .from('payment_orders')
        .update({
          status: 'pagado',
          paid_date: new Date().toISOString().split('T')[0],
          paid_at: new Date().toISOString(),
          payment_proof_url: publicUrl,
          payment_proof_filename: file.name,
          payment_notes: notes || null
        })
        .eq('id', orderId)

      if (updateError) throw updateError

      // 4. Llamar callback de éxito
      onSuccess()
      onOpenChange(false)
      
      // Limpiar formulario
      setFile(null)
      setNotes('')
    } catch (error: any) {
      console.error('Error uploading payment proof:', error)
      setError(error.message || 'Error al subir el comprobante de pago')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setFile(null)
      setNotes('')
      setError('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Marcar como Pagada</DialogTitle>
          <DialogDescription>
            Orden de Pago: {orderNumber}
            <br />
            Sube el comprobante de pago para confirmar la transacción
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="payment-proof">
              Comprobante de Pago *
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="payment-proof"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                disabled={uploading}
                className="cursor-pointer"
              />
            </div>
            {file && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                <FileText className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-700 flex-1">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-gray-500">
              Formatos permitidos: PDF, JPG, PNG (máx. 10MB)
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="payment-notes">
              Notas del Pago (opcional)
            </Label>
            <Textarea
              id="payment-notes"
              placeholder="Ej: Transferencia realizada el 15/10/2025, número de referencia 123456"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={uploading}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!file || uploading}
          >
            {uploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Confirmar Pago
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
