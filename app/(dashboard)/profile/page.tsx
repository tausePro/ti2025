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
  Loader2,
  Camera
} from 'lucide-react'

interface ProfileFormData {
  full_name: string
  email: string
  phone: string
  professional_license: string
  signature_url: string | null
  avatar_url: string | null
}

export default function ProfilePage() {
  const { profile } = useAuth()
  const supabase = createClient()
  
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    email: '',
    phone: '',
    professional_license: '',
    signature_url: null,
    avatar_url: null
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingSignature, setUploadingSignature] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        professional_license: profile.professional_license || '',
        signature_url: profile.signature_url || null,
        avatar_url: (profile as any).avatar_url || null
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen no debe superar 2MB')
      return
    }

    try {
      setUploadingAvatar(true)
      setError(null)

      const fileExt = file.name.split('.').pop()
      const fileName = `${profile?.id}-${Date.now()}.${fileExt}`
      const filePath = `${profile?.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setFormData(prev => ({
        ...prev,
        avatar_url: publicUrl
      }))

      setSuccess('Foto de perfil subida exitosamente')
    } catch (err: any) {
      console.error('Error uploading avatar:', err)
      setError(err.message || 'Error al subir la foto')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen no debe superar 2MB')
      return
    }

    try {
      setUploadingSignature(true)
      setError(null)

      const fileExt = file.name.split('.').pop()
      const fileName = `${profile?.id}-${Date.now()}.${fileExt}`
      const filePath = `${profile?.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(filePath)

      setFormData(prev => ({
        ...prev,
        signature_url: publicUrl
      }))

      setSuccess('Firma subida exitosamente')
    } catch (err: any) {
      console.error('Error uploading signature:', err)
      setError(err.message || 'Error al subir la firma')
    } finally {
      setUploadingSignature(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!profile?.id) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          professional_license: formData.professional_license,
          signature_url: formData.signature_url,
          avatar_url: formData.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (updateError) {
        throw updateError
      }

      setSuccess('Perfil actualizado exitosamente')
      
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
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header con logo y branding */}
      <Card className="border-talento-green/20 shadow-lg">
        <CardContent className="pt-8">
          <div className="flex flex-col items-center text-center mb-6">
            <img 
              src="/logo.png" 
              alt="Talento Inmobiliario" 
              className="h-24 w-24 mb-4"
            />
            <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
            <p className="text-talento-green font-medium mt-1">Talento Inmobiliario</p>
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-talento-green/20">
                {formData.avatar_url ? (
                  <img
                    src={formData.avatar_url}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-16 w-16 text-gray-400" />
                )}
              </div>
              <Label htmlFor="avatar_upload" className="absolute bottom-0 right-0 cursor-pointer">
                <div className="h-10 w-10 rounded-full bg-talento-green hover:bg-talento-green/90 flex items-center justify-center shadow-lg transition-colors">
                  {uploadingAvatar ? (
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </div>
                <Input
                  id="avatar_upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </Label>
            </div>
            <p className="text-sm text-gray-500 mt-3">Click en la cámara para cambiar foto</p>
          </div>
        </CardContent>
      </Card>

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
          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-talento-green/5 to-transparent">
              <CardTitle className="flex items-center text-talento-green">
                <User className="h-5 w-5 mr-2" />
                Información Personal
              </CardTitle>
              <CardDescription>
                Datos básicos de tu perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre Completo *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className="pl-10 border-gray-300 focus:border-talento-green focus:ring-talento-green"
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
                    className="pl-10 bg-gray-50 border-gray-300"
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
                    className="pl-10 border-gray-300 focus:border-talento-green focus:ring-talento-green"
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
                    className="pl-10 border-gray-300 focus:border-talento-green focus:ring-talento-green"
                    placeholder="12345678"
                  />
                </div>
              </div>

              <div className="p-4 bg-talento-green/10 rounded-lg border border-talento-green/20">
                <p className="text-sm text-gray-800">
                  <strong className="text-talento-green">Rol:</strong> {profile?.role}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Firma Digital */}
          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-talento-green/5 to-transparent">
              <CardTitle className="flex items-center text-talento-green">
                <PenTool className="h-5 w-5 mr-2" />
                Firma Digital
              </CardTitle>
              <CardDescription>
                Sube tu firma para los informes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {formData.signature_url ? (
                <div className="space-y-4">
                  <div className="border-2 border-talento-green/20 rounded-lg p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-2 font-medium">Firma actual:</p>
                    <div className="relative w-full h-32 bg-white rounded border border-gray-200 flex items-center justify-center">
                      <img
                        src={formData.signature_url}
                        alt="Firma"
                        className="max-h-28 object-contain"
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
                      disabled={uploadingSignature}
                      className="border-gray-300 focus:border-talento-green focus:ring-talento-green"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-talento-green/30 rounded-lg p-8 text-center bg-talento-green/5">
                    <PenTool className="h-12 w-12 mx-auto text-talento-green/60 mb-3" />
                    <p className="text-sm text-gray-600 mb-4">
                      No has subido una firma aún
                    </p>
                    <Label htmlFor="signature_upload" className="cursor-pointer">
                      <div className="inline-flex items-center px-4 py-2 bg-talento-green text-white rounded-md hover:bg-talento-green/90 transition-colors shadow-md">
                        <Upload className="h-4 w-4 mr-2" />
                        Subir Firma
                      </div>
                      <Input
                        id="signature_upload"
                        type="file"
                        accept="image/*"
                        onChange={handleSignatureUpload}
                        disabled={uploadingSignature}
                        className="hidden"
                      />
                    </Label>
                  </div>
                </div>
              )}

              {uploadingSignature && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-talento-green mr-2" />
                  <span className="text-sm text-gray-600">Subiendo firma...</span>
                </div>
              )}

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-900 mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Recomendaciones
                </h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Formato: PNG, JPG o JPEG</li>
                  <li>• Tamaño máximo: 2MB</li>
                  <li>• Fondo transparente preferible</li>
                  <li>• Dimensiones: 400x200px</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botón de guardar */}
        <div className="flex justify-end pt-6">
          <Button 
            type="submit" 
            disabled={saving}
            className="bg-talento-green hover:bg-talento-green/90 text-white px-8 py-6 text-base font-semibold shadow-lg"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
