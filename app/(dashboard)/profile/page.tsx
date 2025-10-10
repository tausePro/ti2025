'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  User, 
  Mail, 
  Phone, 
  Save, 
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  PenTool,
  Loader2
} from 'lucide-react'
import Image from 'next/image'

interface ProfileFormData {
  full_name: string
  email: string
  phone: string
  professional_license: string
  signature_url: string | null
}

export default function ProfilePage() {
  const { profile } = useAuth()
  const supabase = createClient()
  
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    email: '',
    phone: '',
    professional_license: '',
    signature_url: null
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        professional_license: profile.professional_license || '',
        signature_url: profile.signature_url || null
      })
      setLoading(false)
    }
  }, [profile])

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida')
      return
    }

    // Validar tamaño (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen no debe superar 2MB')
      return
    }

    try {
      setUploading(true)
      setError(null)

      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile?.id}-${Date.now()}.${fileExt}`
      const filePath = `signatures/${fileName}`

      // Subir archivo a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(filePath)

      // Actualizar estado local
      setFormData(prev => ({
        ...prev,
        signature_url: publicUrl
      }))

      setSuccess('Firma subida exitosamente')
    } catch (err: any) {
      console.error('Error uploading signature:', err)
      setError(err.message || 'Error al subir la firma')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!profile?.id) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      // Actualizar perfil en la base de datos
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          professional_license: formData.professional_license,
          signature_url: formData.signature_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (updateError) {
        throw updateError
      }

      setSuccess('Perfil actualizado exitosamente')
      
      // Recargar página después de 2 segundos
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (err: any) {
      console.error('Error updating profile:', err)
      setError(err.message || 'Error al actualizar el perfil')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-talento-green" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <User className="h-8 w-8 mr-3" />
          Mi Perfil
        </h1>
        <p className="text-gray-600 mt-2">
          Gestiona tu información personal y firma digital
        </p>
      </div>

      {/* Alertas */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información Personal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Información Personal
              </CardTitle>
              <CardDescription>
                Datos básicos de tu perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre Completo *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    value={formData.email}
                    className="pl-10 bg-gray-50"
                    disabled
                  />
                </div>
                <p className="text-xs text-gray-500">
                  El email no se puede cambiar
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="pl-10"
                    placeholder="+57 300 123 4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="professional_license">Licencia Profesional</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="professional_license"
                    value={formData.professional_license}
                    onChange={(e) => handleInputChange('professional_license', e.target.value)}
                    className="pl-10"
                    placeholder="12345678"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Rol:</strong> {profile?.role}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Firma Digital */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PenTool className="h-5 w-5 mr-2" />
                Firma Digital
              </CardTitle>
              <CardDescription>
                Sube tu firma para los informes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.signature_url ? (
                <div className="space-y-4">
                  <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-2">Firma actual:</p>
                    <div className="relative w-full h-32 bg-white rounded border flex items-center justify-center">
                      <Image
                        src={formData.signature_url}
                        alt="Firma"
                        width={200}
                        height={100}
                        className="object-contain"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signature_upload">Cambiar firma</Label>
                    <Input
                      id="signature_upload"
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      disabled={uploading}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <PenTool className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 mb-4">
                      No has subido una firma aún
                    </p>
                    <Label htmlFor="signature_upload" className="cursor-pointer">
                      <div className="inline-flex items-center px-4 py-2 bg-talento-green text-white rounded-md hover:bg-talento-green/90 transition-colors">
                        <Upload className="h-4 w-4 mr-2" />
                        Subir Firma
                      </div>
                      <Input
                        id="signature_upload"
                        type="file"
                        accept="image/*"
                        onChange={handleSignatureUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                    </Label>
                  </div>
                </div>
              )}

              {uploading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-talento-green mr-2" />
                  <span className="text-sm text-gray-600">Subiendo firma...</span>
                </div>
              )}

              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">Recomendaciones</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Formato: PNG, JPG o JPEG</li>
                  <li>• Tamaño máximo: 2MB</li>
                  <li>• Fondo transparente preferible</li>
                  <li>• Dimensiones recomendadas: 400x200px</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end space-x-3 pt-6">
          <Button 
            type="submit" 
            disabled={saving}
            className="bg-talento-green hover:bg-talento-green/90"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
