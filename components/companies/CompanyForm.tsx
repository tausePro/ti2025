'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

// Ciudades principales de Colombia
const COLOMBIAN_CITIES = [
  'Bogotá D.C.',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Cúcuta',
  'Bucaramanga',
  'Ibagué',
  'Soledad',
  'Pereira',
  'Santa Marta',
  'Villavicencio',
  'Bello',
  'Valledupar',
  'Montería',
  'Manizales',
  'Pasto',
  'Neiva',
  'Palmira',
  'Armenia'
]

// Esquema de validación mejorado
const companySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  nit: z.string()
    .min(1, 'El NIT es requerido')
    .regex(/^\d{8,9}-\d$/, 'Formato de NIT inválido (ej: 900123456-7)'),
  company_type: z.enum(['cliente', 'constructora', 'interventora', 'supervisora'], {
    required_error: 'El tipo de empresa es requerido'
  }),
  logo_url: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().min(1, 'La dirección es requerida'),
  city: z.string().min(1, 'La ciudad es requerida'),
  legal_representative: z.string().min(1, 'El representante legal es requerido'),
  contact_person: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email('Email inválido').optional().or(z.literal('')),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  is_active: z.boolean().default(true)
})

export type CompanyFormData = z.infer<typeof companySchema>

interface Company {
  id: string
  name: string
  nit: string
  company_type: string | null
  logo_url: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  legal_representative: string | null
  contact_person: string | null
  contact_phone: string | null
  contact_email: string | null
  website: string | null
  is_active: boolean | null
}

interface CompanyFormProps {
  company?: Company
  onSuccess: () => void
  onCancel: () => void
}

export function CompanyForm({
  company,
  onSuccess,
  onCancel
}: CompanyFormProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const { user } = useAuth()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name || '',
      nit: company?.nit || '',
      company_type: (company?.company_type as any) || 'cliente',
      logo_url: company?.logo_url || '',
      email: company?.email || '',
      phone: company?.phone || '',
      address: company?.address || '',
      city: company?.city || '',
      legal_representative: company?.legal_representative || '',
      contact_person: company?.contact_person || '',
      contact_phone: company?.contact_phone || '',
      contact_email: company?.contact_email || '',
      website: company?.website || '',
      is_active: company?.is_active ?? true
    }
  })

  const watchedLogoUrl = watch('logo_url')
  const watchedIsActive = watch('is_active')

  // Verificar NIT único
  const checkNit = async (nit: string) => {
    try {
      console.log('Iniciando verificación de NIT...')
      
      // Usar .maybeSingle() en lugar de .single() para evitar errores cuando no hay resultados
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .eq('nit', nit)
        .neq('id', company?.id || '')
        .maybeSingle()
      
      console.log('Resultado de checkNit:', { data, error })
      
      // Si hay error, mostrarlo pero continuar
      if (error) {
        console.error('Error verificando NIT:', error)
        // En caso de error, asumir que el NIT es único para no bloquear
        return true
      }
      
      // Si no hay data, el NIT es único
      if (!data) {
        console.log('NIT es único (no encontrado)')
        return true
      }
      
      // Si hay data, el NIT ya existe
      console.log('NIT ya existe')
      return false
    } catch (error) {
      console.error('Error en checkNit:', error)
      // En caso de error, asumir que el NIT es único para no bloquear
      return true
    }
  }

  // Upload de logo
  const handleLogoUpload = async (file: File) => {
    try {
      // Subir archivo usando la API route
      const formData = new FormData()
      formData.append('file', file)
      formData.append('configId', 'company-logo')
      formData.append('assetType', 'logo')

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        // Si falla el upload a Supabase, usar base64 como fallback
        console.warn('Supabase Storage not available, using base64')
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          setValue('logo_url', result)
          toast.success('Logo cargado correctamente (modo local)')
        }
        reader.readAsDataURL(file)
        return
      }

      const uploadResult = await response.json()
      setValue('logo_url', uploadResult.publicUrl)
      toast.success('Logo subido correctamente')
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast.error('Error al subir el logo')
    }
  }

  const onSubmit = async (data: CompanyFormData) => {
    setLoading(true)
    console.log('Iniciando envío de formulario...')
    
    try {
      // Verificar que hay un usuario autenticado usando el contexto
      console.log('Verificando autenticación...')
      console.log('Usuario del contexto:', user?.email)
      
      if (!user) {
        console.error('No hay usuario autenticado en el contexto')
        throw new Error('No se pudo autenticar el usuario. Por favor, inicia sesión.')
      }
      
      console.log('Usuario autenticado:', user.email)

      // Verificar NIT único solo si no es edición o si el NIT cambió
      if (!company || company.nit !== data.nit) {
        console.log('Verificando NIT único...')
        console.log('NIT a verificar:', data.nit)
        console.log('ID de empresa actual:', company?.id || 'nueva')
        
        const isNitUnique = await checkNit(data.nit)
        console.log('Resultado de checkNit:', isNitUnique)
        
        if (!isNitUnique) {
          console.log('NIT no es único, cancelando envío')
          toast.error('Ya existe una empresa con este NIT')
          setLoading(false)
          return
        }
        
        console.log('NIT único verificado, continuando...')
      } else {
        console.log('Saltando verificación de NIT (empresa existente)')
      }

      // Preparar datos completos
      const submitData = {
        name: data.name.trim(),
        nit: data.nit.trim(),
        company_type: data.company_type || 'cliente',
        logo_url: data.logo_url || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city || null,
        legal_representative: data.legal_representative?.trim() || null,
        contact_person: data.contact_person?.trim() || null,
        contact_phone: data.contact_phone?.trim() || null,
        contact_email: data.contact_email?.trim() || null,
        website: data.website?.trim() || null,
        is_active: data.is_active ?? true,
        created_by: user.id
      }

      console.log('Datos a enviar:', submitData)
      console.log('Conectando con Supabase...')
      console.log('Usuario ID para created_by:', user.id)

      if (company) {
        // Actualizar empresa existente
        console.log('Actualizando empresa existente...')
        const { data: result, error } = await supabase
          .from('companies')
          .update(submitData)
          .eq('id', company.id)
          .select()

        if (error) {
          console.error('Error al actualizar:', error)
          throw error
        }
        
        console.log('Empresa actualizada:', result)
        toast.success('Empresa actualizada correctamente')
      } else {
        // Crear nueva empresa
        console.log('Creando nueva empresa...')
        const { data: result, error } = await supabase
          .from('companies')
          .insert([submitData])
          .select()

        if (error) {
          console.error('Error al crear:', error)
          throw error
        }
        
        console.log('Empresa creada:', result)
        toast.success('Empresa creada correctamente')
      }

      console.log('Operación completada exitosamente')
      onSuccess()
    } catch (error: any) {
      console.error('Error saving company:', error)
      
      // Mostrar error más específico
      let errorMessage = 'Error al guardar la empresa'
      
      if (error?.message) {
        errorMessage = `Error: ${error.message}`
      } else if (error?.details) {
        errorMessage = `Error: ${error.details}`
      } else if (error?.hint) {
        errorMessage = `Error: ${error.hint}`
      }
      
      console.error('Error message:', errorMessage)
      toast.error(errorMessage)
    } finally {
      console.log('Finalizando proceso de guardado...')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 1. INFORMACIÓN BÁSICA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Información Básica
            </CardTitle>
            <CardDescription>
              Datos básicos de identificación de la empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo de Empresa */}
              <div className="space-y-2">
                <Label htmlFor="company_type">Tipo de Empresa *</Label>
                <Select
                  value={watch('company_type')}
                  onValueChange={(value) => setValue('company_type', value as any)}
                  disabled={loading}
                >
                  <SelectTrigger className={errors.company_type ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Seleccione el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cliente">Cliente (empresa que contrata)</SelectItem>
                    <SelectItem value="constructora">Constructora</SelectItem>
                    <SelectItem value="interventora">Interventora</SelectItem>
                    <SelectItem value="supervisora">Supervisora técnica</SelectItem>
                  </SelectContent>
                </Select>
                {errors.company_type && (
                  <p className="text-sm text-red-500">{errors.company_type.message}</p>
                )}
              </div>

              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Empresa *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Ej: Constructora ABC S.A.S"
                  disabled={loading}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              {/* NIT */}
              <div className="space-y-2">
                <Label htmlFor="nit">NIT *</Label>
                <Input
                  id="nit"
                  {...register('nit')}
                  placeholder="900123456-7"
                  disabled={loading}
                  className={errors.nit ? 'border-red-500' : ''}
                />
                {errors.nit && (
                  <p className="text-sm text-red-500">{errors.nit.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  Formato: 8-9 dígitos seguidos de guión y dígito verificador
                </p>
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>Logo de la Empresa</Label>
                <div className="flex items-center space-x-2">
                  {watchedLogoUrl && (
                    <div className="relative">
                      <img 
                        src={watchedLogoUrl} 
                        alt="Logo" 
                        className="w-16 h-16 object-contain border rounded"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 w-6 h-6 p-0"
                        onClick={() => setValue('logo_url', '')}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleLogoUpload(file)
                      }}
                      disabled={loading}
                      className="hidden"
                      id="logo-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      disabled={loading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {watchedLogoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. UBICACIÓN */}
        <Card>
          <CardHeader>
            <CardTitle>Ubicación</CardTitle>
            <CardDescription>
              Información de ubicación y contacto corporativo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dirección */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Dirección *</Label>
                <Textarea
                  id="address"
                  {...register('address')}
                  placeholder="Ej: Calle 123 #45-67"
                  rows={2}
                  disabled={loading}
                  className={errors.address ? 'border-red-500' : ''}
                />
                {errors.address && (
                  <p className="text-sm text-red-500">{errors.address.message}</p>
                )}
              </div>

              {/* Ciudad */}
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad *</Label>
                <Select
                  value={watch('city')}
                  onValueChange={(value) => setValue('city', value)}
                  disabled={loading}
                >
                  <SelectTrigger className={errors.city ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Seleccione la ciudad" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOMBIAN_CITIES.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.city && (
                  <p className="text-sm text-red-500">{errors.city.message}</p>
                )}
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="+57 301 234 5678"
                  disabled={loading}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>

              {/* Email corporativo */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="contacto@empresa.com"
                  disabled={loading}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Sitio web */}
              <div className="space-y-2">
                <Label htmlFor="website">Sitio Web</Label>
                <Input
                  id="website"
                  {...register('website')}
                  placeholder="https://www.empresa.com"
                  disabled={loading}
                  className={errors.website ? 'border-red-500' : ''}
                />
                {errors.website && (
                  <p className="text-sm text-red-500">{errors.website.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. INFORMACIÓN LEGAL */}
        <Card>
          <CardHeader>
            <CardTitle>Información Legal</CardTitle>
            <CardDescription>
              Datos del representante legal de la empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Representante Legal */}
              <div className="space-y-2">
                <Label htmlFor="legal_representative">Representante Legal *</Label>
                <Input
                  id="legal_representative"
                  {...register('legal_representative')}
                  placeholder="Juan Pérez Rodríguez"
                  disabled={loading}
                  className={errors.legal_representative ? 'border-red-500' : ''}
                />
                {errors.legal_representative && (
                  <p className="text-sm text-red-500">{errors.legal_representative.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. CONTACTO OPERATIVO */}
        <Card>
          <CardHeader>
            <CardTitle>Contacto Operativo</CardTitle>
            <CardDescription>
              Persona de contacto para operaciones diarias (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Persona de Contacto */}
              <div className="space-y-2">
                <Label htmlFor="contact_person">Persona de Contacto</Label>
                <Input
                  id="contact_person"
                  {...register('contact_person')}
                  placeholder="María García"
                  disabled={loading}
                />
              </div>

              {/* Teléfono de Contacto */}
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Teléfono de Contacto</Label>
                <Input
                  id="contact_phone"
                  {...register('contact_phone')}
                  placeholder="+57 300 123 4567"
                  disabled={loading}
                />
              </div>

              {/* Email de Contacto */}
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email de Contacto</Label>
                <Input
                  id="contact_email"
                  type="email"
                  {...register('contact_email')}
                  placeholder="maria@empresa.com"
                  disabled={loading}
                  className={errors.contact_email ? 'border-red-500' : ''}
                />
                {errors.contact_email && (
                  <p className="text-sm text-red-500">{errors.contact_email.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. ESTADO */}
        <Card>
          <CardHeader>
            <CardTitle>Estado de la Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={watchedIsActive}
                onCheckedChange={(checked) => setValue('is_active', !!checked)}
                disabled={loading}
              />
              <Label htmlFor="is_active">Empresa Activa</Label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Las empresas inactivas no aparecerán en los listados de selección
            </p>
          </CardContent>
        </Card>

        {/* Botones */}
        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              company ? 'Actualizar Empresa' : 'Crear Empresa'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
