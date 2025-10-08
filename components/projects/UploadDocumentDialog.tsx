'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, Upload, File } from 'lucide-react'
import { logger } from '@/lib/logger'

interface UploadDocumentDialogProps {
  projectId: string
  onClose: () => void
  onDocumentUploaded: () => void
}

const FILE_TYPES = [
  { value: 'contract', label: 'Contrato' },
  { value: 'report', label: 'Reporte' },
  { value: 'photo', label: 'Foto' },
  { value: 'drawing', label: 'Plano' },
  { value: 'other', label: 'Otro' },
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function UploadDocumentDialog({ projectId, onClose, onDocumentUploaded }: UploadDocumentDialogProps) {
  const { profile } = useAuth()
  const supabase = createClient()

  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<string>('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validar tamaño
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`El archivo es demasiado grande. Máximo ${MAX_FILE_SIZE / 1024 / 1024}MB`)
      return
    }

    setFile(selectedFile)
    setError(null)
  }

  const handleUpload = async () => {
    if (!file || !fileType) {
      setError('Selecciona un archivo y un tipo')
      return
    }

    if (!profile) {
      setError('Usuario no autenticado')
      return
    }

    try {
      setUploading(true)
      setError(null)
      setUploadProgress(0)

      // 1. Subir archivo a Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `project-documents/${fileName}`

      logger.info('Uploading file to storage', { 
        projectId, 
        fileName: file.name,
        size: file.size 
      })

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        logger.error('Error uploading to storage', { projectId }, uploadError)
        throw new Error('Error al subir el archivo')
      }

      setUploadProgress(50)

      // 2. Obtener URL pública del archivo
      const { data: urlData } = supabase.storage
        .from('project-documents')
        .getPublicUrl(filePath)

      setUploadProgress(75)

      // 3. Crear registro en la base de datos
      const { error: dbError } = await supabase
        .from('project_documents')
        .insert({
          project_id: projectId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: fileType,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: profile.id,
          description: description || null,
          is_public: isPublic
        })

      if (dbError) {
        logger.error('Error saving document to database', { projectId }, dbError)
        
        // Intentar eliminar el archivo del storage si falla la BD
        await supabase.storage
          .from('project-documents')
          .remove([filePath])
        
        throw new Error('Error al guardar el documento')
      }

      setUploadProgress(100)

      logger.info('Document uploaded successfully', { 
        projectId, 
        fileName: file.name,
        fileType 
      })

      setSuccess(true)
      setTimeout(() => {
        onDocumentUploaded()
      }, 1000)
    } catch (error) {
      logger.error('Error uploading document', { projectId }, error as Error)
      setError(error instanceof Error ? error.message : 'Error al subir el documento')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Subir Documento
          </DialogTitle>
          <DialogDescription>
            Sube un documento al proyecto (máximo 10MB)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Alertas */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Documento subido exitosamente</AlertDescription>
            </Alert>
          )}

          {/* Selección de archivo */}
          <div className="space-y-2">
            <Label>Archivo *</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              {!file ? (
                <>
                  <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    Haz clic para seleccionar un archivo
                  </p>
                  <p className="text-xs text-gray-500">
                    Máximo 10MB
                  </p>
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    className="mt-4"
                    disabled={uploading}
                  />
                </>
              ) : (
                <div className="space-y-2">
                  <File className="h-8 w-8 text-blue-600 mx-auto" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {!uploading && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFile(null)}
                    >
                      Cambiar archivo
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tipo de documento */}
          <div className="space-y-2">
            <Label>Tipo de Documento *</Label>
            <Select value={fileType} onValueChange={setFileType} disabled={uploading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {FILE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label>Descripción (opcional)</Label>
            <Textarea
              placeholder="Describe el documento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={uploading}
            />
          </div>

          {/* Público */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Documento Público</Label>
              <p className="text-xs text-gray-500">
                Los documentos públicos pueden ser vistos por todos los miembros del proyecto
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={uploading}
            />
          </div>

          {/* Progreso */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subiendo...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!file || !fileType || uploading || success}
          >
            {uploading ? 'Subiendo...' : 'Subir Documento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
