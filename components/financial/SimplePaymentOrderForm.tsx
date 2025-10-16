'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, DollarSign, Calendar, CheckCircle, AlertCircle } from 'lucide-react'

// Esquema de validación
const paymentOrderSchema = z.object({
  order_number: z.string().min(1, 'El número de orden es requerido'),
  order_date: z.string().min(1, 'La fecha es requerida'),
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  concept: z.string().min(1, 'El concepto es requerido'),
  beneficiary: z.string().min(1, 'El beneficiario es requerido'),
  construction_act_reference: z.string().optional(),
  status: z.enum(['pendiente', 'aprobado', 'rechazado', 'pagado']).default('pendiente')
})

type PaymentOrderFormData = z.infer<typeof paymentOrderSchema>

interface SimplePaymentOrderFormProps {
  projectId: string
  onSubmit: (data: PaymentOrderFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function SimplePaymentOrderForm({
  projectId,
  onSubmit,
  onCancel,
  loading = false
}: SimplePaymentOrderFormProps) {
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<PaymentOrderFormData>({
    resolver: zodResolver(paymentOrderSchema),
    defaultValues: {
      status: 'pendiente'
    }
  })

  const watchedStatus = watch('status')

  const onFormSubmit = async (data: PaymentOrderFormData) => {
    try {
      await onSubmit(data)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (error) {
      console.error('Error submitting payment order:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Orden de pago registrada exitosamente</AlertDescription>
        </Alert>
      )}

      {/* Información de la Orden */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Información de la Orden
          </CardTitle>
          <CardDescription>
            Datos de la orden de giro proporcionada por el cliente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Número de Orden */}
            <div className="space-y-2">
              <Label htmlFor="order_number">Número de Orden de Giro *</Label>
              <Input
                id="order_number"
                {...register('order_number')}
                placeholder="OP438472-ID487601"
                disabled={loading}
                className={errors.order_number ? 'border-red-500' : ''}
              />
              {errors.order_number && (
                <p className="text-sm text-red-500">{errors.order_number.message}</p>
              )}
            </div>

            {/* Fecha */}
            <div className="space-y-2">
              <Label htmlFor="order_date">Fecha de la Orden *</Label>
              <Input
                id="order_date"
                type="date"
                {...register('order_date')}
                disabled={loading}
                className={errors.order_date ? 'border-red-500' : ''}
              />
              {errors.order_date && (
                <p className="text-sm text-red-500">{errors.order_date.message}</p>
              )}
            </div>
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor de la Orden *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                placeholder="0.00"
                disabled={loading}
                className={`pl-10 ${errors.amount ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
          </div>

          {/* Concepto */}
          <div className="space-y-2">
            <Label htmlFor="concept">Concepto *</Label>
            <Textarea
              id="concept"
              {...register('concept')}
              placeholder="Anticipo de obra"
              rows={2}
              disabled={loading}
              className={errors.concept ? 'border-red-500' : ''}
            />
            {errors.concept && (
              <p className="text-sm text-red-500">{errors.concept.message}</p>
            )}
          </div>

          {/* Beneficiario */}
          <div className="space-y-2">
            <Label htmlFor="beneficiary">Beneficiario *</Label>
            <Input
              id="beneficiary"
              {...register('beneficiary')}
              placeholder="Mensula SAS"
              disabled={loading}
              className={errors.beneficiary ? 'border-red-500' : ''}
            />
            {errors.beneficiary && (
              <p className="text-sm text-red-500">{errors.beneficiary.message}</p>
            )}
          </div>

          {/* Acta de Construcción */}
          <div className="space-y-2">
            <Label htmlFor="construction_act_reference">Acta de Construcción (Opcional)</Label>
            <Input
              id="construction_act_reference"
              {...register('construction_act_reference')}
              placeholder="7, 1Pq, 30, etc."
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              Referencia al acta de construcción asociada
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Estado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Estado de la Orden
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Estado *</Label>
            <Select
              value={watchedStatus}
              onValueChange={(value) => setValue('status', value as 'pendiente' | 'aprobado' | 'rechazado' | 'pagado')}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="aprobado">Aprobado</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              <strong>Autorizado:</strong> Aprobado por Talento Inmobiliario<br />
              <strong>Legalizado:</strong> Pago ejecutado por el cliente
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Registrar Orden'}
        </Button>
      </div>
    </form>
  )
}
