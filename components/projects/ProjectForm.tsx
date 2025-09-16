'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Building2, MapPin, Calendar, DollarSign } from 'lucide-react'
import { Project, Company, InterventionType } from '@/types'
import { FiduciaryInfoForm } from './FiduciaryInfoForm'

// Esquema de validación
const projectSchema = z.object({
  name: z.string().min(1, 'El nombre del proyecto es requerido'),
  client_company_id: z.string().min(1, 'Debe seleccionar una empresa'),
  address: z.string().min(1, 'La dirección es requerida'),
  city: z.string().min(1, 'La ciudad es requerida'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  intervention_types: z.array(z.enum(['supervision_tecnica', 'interventoria_administrativa']))
    .min(1, 'Debe seleccionar al menos un tipo de intervención'),
  budget: z.number().optional(),
  description: z.string().optional()
}).refine((data) => {
  // Si tiene interventoría administrativa, el presupuesto es requerido
  if (data.intervention_types.includes('interventoria_administrativa') && !data.budget) {
    return false
  }
  return true
}, {
  message: 'El presupuesto es requerido para proyectos con interventoría administrativa',
  path: ['budget']
}).refine((data) => {
  // Fecha fin debe ser posterior a fecha inicio
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) > new Date(data.start_date)
  }
  return true
}, {
  message: 'La fecha de finalización debe ser posterior a la fecha de inicio',
  path: ['end_date']
})

type ProjectFormData = z.infer<typeof projectSchema>

interface ProjectFormProps {
  project?: Project
  initialData?: Partial<ProjectFormData>
  onSubmit: (data: ProjectFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
  submitButtonText?: string | React.ReactElement
  showFiduciaryForm?: boolean
  onFiduciarySubmit?: (data: any) => Promise<void>
}

export function ProjectForm({ 
  project, 
  initialData, 
  onSubmit, 
  onCancel, 
  loading = false, 
  submitButtonText = 'Guardar Proyecto',
  showFiduciaryForm = false,
  onFiduciarySubmit
}: ProjectFormProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: initialData || (project ? {
      name: project.name,
      client_company_id: project.client_company_id,
      address: project.address,
      city: project.city,
      intervention_types: project.intervention_types,
      description: project.description || '',
      budget: project.budget,
      start_date: project.start_date,
      end_date: project.end_date
    } : {
      intervention_types: []
    })
  })

  const watchedInterventionTypes = watch('intervention_types')
  const hasInterventoriaAdministrativa = watchedInterventionTypes?.includes('interventoria_administrativa')
  const [showFiduciarySection, setShowFiduciarySection] = useState(showFiduciaryForm)

  useEffect(() => {
    loadCompanies()
  }, [])

  // Mostrar sección fiduciaria cuando se selecciona interventoría administrativa
  useEffect(() => {
    if (hasInterventoriaAdministrativa && !showFiduciarySection) {
      setShowFiduciarySection(true)
    }
  }, [hasInterventoriaAdministrativa, showFiduciarySection])

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error('Error loading companies:', error)
    } finally {
      setLoadingCompanies(false)
    }
  }

  const handleInterventionTypeChange = (type: InterventionType, checked: boolean) => {
    const currentTypes = watch('intervention_types') || []
    if (checked) {
      const newTypes = [...currentTypes, type]
      setValue('intervention_types', newTypes)
    } else {
      const newTypes = currentTypes.filter(t => t !== type)
      setValue('intervention_types', newTypes)
      
      // Si se deselecciona interventoría administrativa, limpiar presupuesto
      if (type === 'interventoria_administrativa') {
        setValue('budget', undefined)
      }
    }
  }

  const onFormSubmit = async (data: ProjectFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Error submitting form:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Información básica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Información Básica
          </CardTitle>
          <CardDescription>
            Datos generales del proyecto de construcción
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nombre del proyecto */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Proyecto *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Ej: Torre Empresarial Centro"
              disabled={loading}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Empresa cliente */}
          <div className="space-y-2">
            <Label htmlFor="client_company_id">Empresa Cliente *</Label>
            <Select 
              onValueChange={(value) => setValue('client_company_id', value)}
              disabled={loading || loadingCompanies}
            >
              <SelectTrigger className={errors.client_company_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Seleccionar empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.client_company_id && (
              <p className="text-sm text-red-500">{errors.client_company_id.message}</p>
            )}
          </div>

          {/* Dirección */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">Dirección *</Label>
              <Input
                id="address"
                {...register('address')}
                placeholder="Ej: Calle 123 #45-67"
                disabled={loading}
                className={errors.address ? 'border-red-500' : ''}
              />
              {errors.address && (
                <p className="text-sm text-red-500">{errors.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ciudad *</Label>
              <Input
                id="city"
                {...register('city')}
                placeholder="Ej: Bogotá"
                disabled={loading}
                className={errors.city ? 'border-red-500' : ''}
              />
              {errors.city && (
                <p className="text-sm text-red-500">{errors.city.message}</p>
              )}
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descripción detallada del proyecto..."
              rows={3}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tipo de intervención */}
      <Card>
        <CardHeader>
          <CardTitle>Tipo de Intervención *</CardTitle>
          <CardDescription>
            Selecciona los servicios que Talento Inmobiliario prestará en este proyecto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="supervision_tecnica"
                checked={watchedInterventionTypes?.includes('supervision_tecnica') || false}
                onCheckedChange={(checked) => 
                  handleInterventionTypeChange('supervision_tecnica', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="supervision_tecnica" className="text-sm font-medium">
                Supervisión Técnica
              </Label>
            </div>
            <p className="text-xs text-gray-500 ml-6">
              Supervisión de obra, control de calidad, bitácoras diarias
            </p>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="interventoria_administrativa"
                checked={watchedInterventionTypes?.includes('interventoria_administrativa') || false}
                onCheckedChange={(checked) => 
                  handleInterventionTypeChange('interventoria_administrativa', checked as boolean)
                }
                disabled={loading}
              />
              <Label htmlFor="interventoria_administrativa" className="text-sm font-medium">
                Interventoría Administrativa
              </Label>
            </div>
            <p className="text-xs text-gray-500 ml-6">
              Control presupuestal, órdenes de pago, actas de construcción
            </p>
          </div>

          {errors.intervention_types && (
            <Alert variant="destructive">
              <AlertDescription>{errors.intervention_types.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Fechas y presupuesto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Cronograma y Presupuesto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Fecha de Inicio</Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Fecha de Finalización</Label>
              <Input
                id="end_date"
                type="date"
                {...register('end_date')}
                disabled={loading}
                className={errors.end_date ? 'border-red-500' : ''}
              />
              {errors.end_date && (
                <p className="text-sm text-red-500">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          {/* Presupuesto - solo si tiene interventoría administrativa */}
          {hasInterventoriaAdministrativa && (
            <div className="space-y-2">
              <Label htmlFor="budget" className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                Presupuesto del Proyecto *
              </Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                {...register('budget', { valueAsNumber: true })}
                placeholder="Ej: 500000000"
                disabled={loading}
                className={errors.budget ? 'border-red-500' : ''}
              />
              <p className="text-xs text-gray-500">
                Presupuesto total del proyecto en pesos colombianos
              </p>
              {errors.budget && (
                <p className="text-sm text-red-500">{errors.budget.message}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sección Fiduciaria - Solo para interventoría administrativa */}
      {hasInterventoriaAdministrativa && showFiduciarySection && onFiduciarySubmit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Configuración Fiduciaria
            </CardTitle>
            <CardDescription>
              Configure la información fiduciaria requerida para proyectos con interventoría administrativa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FiduciaryInfoForm
              onSubmit={onFiduciarySubmit}
              onCancel={() => setShowFiduciarySection(false)}
              loading={loading}
            />
          </CardContent>
        </Card>
      )}

      {/* Botones */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {project ? 'Actualizando...' : 'Creando...'}
            </>
          ) : (
            project ? 'Actualizar Proyecto' : 'Crear Proyecto'
          )}
        </Button>
      </div>
    </form>
  )
}
