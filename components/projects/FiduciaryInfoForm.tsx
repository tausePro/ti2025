'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Trash2, Building2, DollarSign, AlertTriangle } from 'lucide-react'
import { FiduciaryAccount, ProjectFinancialConfig } from '@/types'

// Esquema de validación para cuenta fiduciaria
const fiduciaryAccountSchema = z.object({
  sifi_code: z.enum(['1', '2'], { required_error: 'Seleccione código SIFI' }),
  account_name: z.string().min(1, 'Nombre de cuenta requerido'),
  bank_name: z.string().min(1, 'Nombre del banco requerido'),
  account_number: z.string().min(1, 'Número de cuenta requerido'),
  initial_balance: z.number().min(0, 'El saldo inicial debe ser mayor o igual a 0')
})

// Esquema de validación para configuración financiera
const financialConfigSchema = z.object({
  control_type: z.enum(['construction_acts', 'legalizations'], {
    required_error: 'Seleccione el tipo de control'
  }),
  approval_flow: z.array(z.string()).min(1, 'Debe seleccionar al menos un rol'),
  budget_alerts: z.array(z.number().min(0).max(100)).min(1, 'Debe configurar al menos una alerta'),
  max_approval_amount: z.number().min(0).optional(),
  requires_client_approval: z.boolean().default(false),
  auto_approve_under: z.number().min(0).default(0)
})

// Esquema principal
const fiduciaryFormSchema = z.object({
  accounts: z.array(fiduciaryAccountSchema).min(1, 'Debe agregar al menos una cuenta fiduciaria'),
  financial_config: financialConfigSchema
})

type FiduciaryFormData = z.infer<typeof fiduciaryFormSchema>

interface FiduciaryInfoFormProps {
  onSubmit: (data: FiduciaryFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
  initialData?: {
    accounts?: FiduciaryAccount[]
    financial_config?: ProjectFinancialConfig
  }
}

export function FiduciaryInfoForm({ 
  onSubmit, 
  onCancel, 
  loading = false, 
  initialData 
}: FiduciaryInfoFormProps) {
  const [alertValues, setAlertValues] = useState<string>('70,85,95')

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FiduciaryFormData>({
    resolver: zodResolver(fiduciaryFormSchema),
    defaultValues: {
      accounts: initialData?.accounts?.map(acc => ({
        sifi_code: acc.sifi_code,
        account_name: acc.account_name,
        bank_name: acc.bank_name,
        account_number: acc.account_number,
        initial_balance: acc.initial_balance
      })) || [{
        sifi_code: '1' as const,
        account_name: '',
        bank_name: '',
        account_number: '',
        initial_balance: 0
      }],
      financial_config: {
        control_type: initialData?.financial_config?.requires_construction_acts ? 'construction_acts' : 'legalizations',
        approval_flow: initialData?.financial_config?.approval_flow || ['supervisor'],
        budget_alerts: initialData?.financial_config?.budget_alerts || [70, 85, 95],
        max_approval_amount: initialData?.financial_config?.max_approval_amount,
        requires_client_approval: initialData?.financial_config?.requires_client_approval || false,
        auto_approve_under: initialData?.financial_config?.auto_approve_under || 0
      }
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'accounts'
  })

  const watchedControlType = watch('financial_config.control_type')
  const watchedApprovalFlow = watch('financial_config.approval_flow')

  const handleAlertChange = (value: string) => {
    setAlertValues(value)
    const alerts = value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v))
    setValue('financial_config.budget_alerts', alerts)
  }

  const handleApprovalFlowChange = (role: string, checked: boolean) => {
    const currentFlow = watchedApprovalFlow || []
    if (checked) {
      setValue('financial_config.approval_flow', [...currentFlow, role])
    } else {
      setValue('financial_config.approval_flow', currentFlow.filter(r => r !== role))
    }
  }

  const onFormSubmit = async (data: FiduciaryFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Error submitting fiduciary form:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Cuentas Fiduciarias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Cuentas Fiduciarias
          </CardTitle>
          <CardDescription>
            Configure las cuentas fiduciarias para el control financiero del proyecto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Cuenta Fiduciaria {index + 1}</h4>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`accounts.${index}.sifi_code`}>Código SIFI *</Label>
                  <Select
                    onValueChange={(value) => setValue(`accounts.${index}.sifi_code`, value as '1' | '2')}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar código" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.accounts?.[index]?.sifi_code && (
                    <p className="text-sm text-red-500">{errors.accounts[index]?.sifi_code?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`accounts.${index}.account_name`}>Nombre de la Cuenta *</Label>
                  <Input
                    {...register(`accounts.${index}.account_name`)}
                    placeholder="Ej: Fideicomiso Prado Campestre 102148"
                    disabled={loading}
                  />
                  {errors.accounts?.[index]?.account_name && (
                    <p className="text-sm text-red-500">{errors.accounts[index]?.account_name?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`accounts.${index}.bank_name`}>Banco/Fiduciaria *</Label>
                  <Input
                    {...register(`accounts.${index}.bank_name`)}
                    placeholder="Ej: Alianza Fiduciaria"
                    disabled={loading}
                  />
                  {errors.accounts?.[index]?.bank_name && (
                    <p className="text-sm text-red-500">{errors.accounts[index]?.bank_name?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`accounts.${index}.account_number`}>Número de Cuenta *</Label>
                  <Input
                    {...register(`accounts.${index}.account_number`)}
                    placeholder="Número de cuenta fiduciaria"
                    disabled={loading}
                  />
                  {errors.accounts?.[index]?.account_number && (
                    <p className="text-sm text-red-500">{errors.accounts[index]?.account_number?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`accounts.${index}.initial_balance`}>Saldo Inicial *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register(`accounts.${index}.initial_balance`, { valueAsNumber: true })}
                    placeholder="0.00"
                    disabled={loading}
                  />
                  {errors.accounts?.[index]?.initial_balance && (
                    <p className="text-sm text-red-500">{errors.accounts[index]?.initial_balance?.message}</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => append({
              sifi_code: '2',
              account_name: '',
              bank_name: '',
              account_number: '',
              initial_balance: 0
            })}
            disabled={loading || fields.length >= 2}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Segunda Cuenta Fiduciaria
          </Button>

          {errors.accounts && (
            <Alert variant="destructive">
              <AlertDescription>{errors.accounts.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Configuración de Control Financiero */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Configuración de Control Financiero
          </CardTitle>
          <CardDescription>
            Defina el tipo de control y flujo de aprobación para el proyecto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tipo de Control */}
          <div className="space-y-4">
            <Label>Tipo de Control *</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="construction_acts"
                  value="construction_acts"
                  {...register('financial_config.control_type')}
                  disabled={loading}
                />
                <Label htmlFor="construction_acts" className="text-sm font-medium">
                  Con Actas de Construcción (Tipo A)
                </Label>
              </div>
              <p className="text-xs text-gray-500 ml-6">
                Desembolsos parciales contra actas de construcción - Como Origen del Lago
              </p>

              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="legalizations"
                  value="legalizations"
                  {...register('financial_config.control_type')}
                  disabled={loading}
                />
                <Label htmlFor="legalizations" className="text-sm font-medium">
                  Con Legalizaciones (Tipo B)
                </Label>
              </div>
              <p className="text-xs text-gray-500 ml-6">
                Fondeos que se legalizan después - Como Prado Campestre
              </p>
            </div>
            {errors.financial_config?.control_type && (
              <p className="text-sm text-red-500">{errors.financial_config.control_type.message}</p>
            )}
          </div>

          {/* Flujo de Aprobación */}
          <div className="space-y-4">
            <Label>Flujo de Aprobación *</Label>
            <div className="space-y-3">
              {['supervisor', 'interventor', 'gerente', 'cliente'].map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={`approval_${role}`}
                    checked={watchedApprovalFlow?.includes(role) || false}
                    onCheckedChange={(checked) => 
                      handleApprovalFlowChange(role, checked as boolean)
                    }
                    disabled={loading}
                  />
                  <Label htmlFor={`approval_${role}`} className="text-sm font-medium capitalize">
                    {role}
                  </Label>
                </div>
              ))}
            </div>
            {errors.financial_config?.approval_flow && (
              <p className="text-sm text-red-500">{errors.financial_config.approval_flow.message}</p>
            )}
          </div>

          {/* Alertas Presupuestales */}
          <div className="space-y-2">
            <Label htmlFor="budget_alerts">Alertas Presupuestales (%)</Label>
            <Input
              id="budget_alerts"
              value={alertValues}
              onChange={(e) => handleAlertChange(e.target.value)}
              placeholder="70,85,95"
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              Ingrese los porcentajes separados por comas (ej: 70,85,95)
            </p>
            {errors.financial_config?.budget_alerts && (
              <p className="text-sm text-red-500">{errors.financial_config.budget_alerts.message}</p>
            )}
          </div>

          {/* Configuración Adicional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_approval_amount">Monto Máximo de Aprobación</Label>
              <Input
                type="number"
                step="0.01"
                {...register('financial_config.max_approval_amount', { valueAsNumber: true })}
                placeholder="Sin límite"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auto_approve_under">Auto-aprobación Bajo</Label>
              <Input
                type="number"
                step="0.01"
                {...register('financial_config.auto_approve_under', { valueAsNumber: true })}
                placeholder="0.00"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="requires_client_approval"
              {...register('financial_config.requires_client_approval')}
              disabled={loading}
            />
            <Label htmlFor="requires_client_approval" className="text-sm">
              Requiere aprobación del cliente
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Información Importante */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> Una vez configurado el sistema fiduciario, se habilitarán automáticamente 
          los módulos de gestión financiera, órdenes de pago y control de desembolsos para este proyecto.
        </AlertDescription>
      </Alert>

      {/* Botones */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Configuración Fiduciaria'}
        </Button>
      </div>
    </form>
  )
}
