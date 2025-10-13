'use client'

import { useState, useEffect } from 'react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Calendar, DollarSign, Shield, AlertTriangle } from 'lucide-react'
import { Company } from '@/types'
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
  description: z.string().optional(),
  enable_financial_intervention: z.boolean().default(false)
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

interface ProjectFormWithFinancialProps {
  onSubmit: (data: ProjectFormData & { fiduciary_data?: any }) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function ProjectFormWithFinancial({ 
  onSubmit, 
  onCancel, 
  loading = false
}: ProjectFormWithFinancialProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [fiduciaryData, setFiduciaryData] = useState<any>(null)
  const [showFiduciaryForm, setShowFiduciaryForm] = useState(false)
  const supabase = createClient()
  const { profile } = useAuth()

  // Verificar si el usuario puede ver la opción financiera (supervisor en adelante)
  const canSeeFinancialOption = profile?.role && ['admin', 'gerente', 'supervisor'].includes(profile.role)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      intervention_types: [],
      enable_financial_intervention: false
    }
  })

  const watchedInterventionTypes = watch('intervention_types')
  const watchedEnableFinancial = watch('enable_financial_intervention')
  const hasInterventoriaAdministrativa = watchedInterventionTypes?.includes('interventoria_administrativa')

  useEffect(() => {
    loadCompanies()
  }, [])

  // Mostrar formulario fiduciario cuando se habilita interventoría financiera
  useEffect(() => {
    if (watchedEnableFinancial && hasInterventoriaAdministrativa) {
      setShowFiduciaryForm(true)
    } else {
      setShowFiduciaryForm(false)
      setFiduciaryData(null)
    }
  }, [watchedEnableFinancial, hasInterventoriaAdministrativa])

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

  const handleInterventionTypeChange = (type: 'supervision_tecnica' | 'interventoria_administrativa', checked: boolean) => {
    const currentTypes = watch('intervention_types') || []
    if (checked) {
      const newTypes = [...currentTypes, type]
      setValue('intervention_types', newTypes)
    } else {
      const newTypes = currentTypes.filter(t => t !== type)
      setValue('intervention_types', newTypes)
      
      // Si se deselecciona interventoría administrativa, limpiar presupuesto y deshabilitar financiero
      if (type === 'interventoria_administrativa') {
        setValue('budget', undefined)
        setValue('enable_financial_intervention', false)
      }
    }
  }

  const handleFiduciarySubmit = async (data: any) => {
    setFiduciaryData(data)
  }

  const onFormSubmit = async (data: ProjectFormData) => {
    try {
      const submitData = {
        ...data,
        fiduciary_data: data.enable_financial_intervention ? fiduciaryData : undefined
      }
      await onSubmit(submitData)
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

          {/* Dirección y Ciudad */}
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

          {/* Presupuesto */}
          {hasInterventoriaAdministrativa && (
            <div className="space-y-2">
              <Label htmlFor="budget">
                Presupuesto del Proyecto *
              </Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                {...register('budget', { valueAsNumber: true })}
                placeholder="0.00"
                disabled={loading}
                className={errors.budget ? 'border-red-500' : ''}
              />
              {errors.budget && (
                <p className="text-sm text-red-500">{errors.budget.message}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interventoría Financiera - Solo visible para supervisor en adelante */}
      {canSeeFinancialOption && hasInterventoriaAdministrativa && (
        <Card className="border-talento-green">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-talento-green" />
              Interventoría Financiera (Opcional)
            </CardTitle>
            <CardDescription>
              Habilita el control fiduciario y gestión de órdenes de pago para este proyecto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enable_financial_intervention"
                {...register('enable_financial_intervention')}
                disabled={loading}
              />
              <Label htmlFor="enable_financial_intervention" className="text-sm font-medium">
                Habilitar Interventoría Financiera (Sistema SIFI)
              </Label>
            </div>
            <p className="text-xs text-gray-500 ml-6">
              Al habilitar esta opción, podrás configurar cuentas fiduciarias, órdenes de pago y control presupuestal
            </p>

            {watchedEnableFinancial && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante:</strong> A continuación deberás configurar las cuentas SIFI y el flujo de aprobación financiera
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formulario Fiduciario - Solo si está habilitado */}
      {showFiduciaryForm && (
        <FiduciaryInfoForm
          onSubmit={handleFiduciarySubmit}
          onCancel={() => {
            setValue('enable_financial_intervention', false)
            setShowFiduciaryForm(false)
          }}
          loading={loading}
        />
      )}

      {/* Botones */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || (watchedEnableFinancial && !fiduciaryData)}>
          {loading ? 'Creando...' : 'Crear Proyecto'}
        </Button>
      </div>
    </form>
  )
}
