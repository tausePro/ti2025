'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  AlertCircle,
  DollarSign,
  User,
  FileText,
  Upload
} from 'lucide-react'
import Link from 'next/link'

// Schema de validación
const paymentOrderSchema = z.object({
  fiduciary_account_id: z.string().min(1, 'Debe seleccionar una cuenta SIFI'),
  beneficiary: z.string().min(1, 'Nombre del beneficiario es requerido'),
  beneficiary_document: z.string().min(1, 'Identificación del beneficiario es requerida'),
  beneficiary_bank: z.string().optional(),
  beneficiary_account_number: z.string().optional(),
  amount: z.number().min(1, 'El monto debe ser mayor a 0'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  concept: z.string().min(1, 'El concepto es requerido'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  payment_date: z.string().optional(),
  notes: z.string().optional()
})

type PaymentOrderFormData = z.infer<typeof paymentOrderSchema>

interface FiduciaryAccount {
  id: string
  sifi_code: '1' | '2'
  account_name: string
  current_balance: number
}

interface Project {
  id: string
  name: string
  project_code: string
}

export default function NewPaymentOrderPage() {
  const params = useParams()
  const router = useRouter()
  const { user, profile } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [project, setProject] = useState<Project | null>(null)
  const [accounts, setAccounts] = useState<FiduciaryAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<FiduciaryAccount | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<PaymentOrderFormData>({
    resolver: zodResolver(paymentOrderSchema),
    defaultValues: {
      priority: 'normal'
    }
  })

  const amount = watch('amount')
  const accountId = watch('fiduciary_account_id')

  useEffect(() => {
    // Verificar permisos
    if (profile && !['admin', 'super_admin', 'gerente', 'supervisor'].includes(profile.role)) {
      router.push('/projects')
      return
    }

    if (params.id) {
      loadData()
    }
  }, [params.id, profile, router])

  useEffect(() => {
    // Actualizar cuenta seleccionada cuando cambia el ID
    if (accountId) {
      const account = accounts.find(a => a.id === accountId)
      setSelectedAccount(account || null)
    }
  }, [accountId, accounts])

  async function loadData() {
    try {
      // Cargar proyecto
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, project_code')
        .eq('id', params.id)
        .single()

      if (projectError) throw projectError
      setProject({
        id: projectData.id,
        name: projectData.name,
        project_code: projectData.project_code || 'N/A'
      })

      // Cargar cuentas fiduciarias activas
      const { data: accountsData, error: accountsError } = await supabase
        .from('fiduciary_accounts')
        .select('id, sifi_code, account_name, current_balance')
        .eq('project_id', params.id)
        .eq('is_active', true)
        .order('sifi_code')

      if (accountsError) throw accountsError
      
      if (!accountsData || accountsData.length === 0) {
        setError('Este proyecto no tiene cuentas SIFI configuradas. Configure las cuentas antes de crear órdenes de pago.')
        return
      }

      setAccounts(accountsData)
    } catch (error: any) {
      console.error('Error loading data:', error)
      setError(error.message || 'Error al cargar datos')
    }
  }

  async function onSubmit(data: PaymentOrderFormData) {
    if (!user) {
      setError('Usuario no autenticado')
      return
    }

    if (!selectedAccount) {
      setError('Debe seleccionar una cuenta SIFI')
      return
    }

    // Validar saldo suficiente
    if (data.amount > selectedAccount.current_balance) {
      setError(`Saldo insuficiente en la cuenta SIFI ${selectedAccount.sifi_code}. Saldo disponible: ${formatCurrency(selectedAccount.current_balance)}`)
      return
    }

    setLoading(true)
    setError('')

    try {
      // Generar número de orden
      const orderNumber = await generateOrderNumber()

      // Crear orden de pago
      const { data: order, error: orderError } = await supabase
        .from('payment_orders')
        .insert({
          project_id: params.id,
          fiduciary_account_id: data.fiduciary_account_id,
          order_number: orderNumber,
          beneficiary: data.beneficiary,
          beneficiary_document: data.beneficiary_document,
          beneficiary_bank: data.beneficiary_bank,
          beneficiary_account_number: data.beneficiary_account_number,
          amount: data.amount,
          description: data.description,
          concept: data.concept,
          priority: data.priority,
          payment_date: data.payment_date || null,
          notes: data.notes,
          status: 'pendiente',
          requested_date: new Date().toISOString().split('T')[0], // Fecha actual en formato YYYY-MM-DD
          requested_by: user.id,
          requested_at: new Date().toISOString(),
          created_by: user.id
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Redirigir a la página de la orden creada
      router.push(`/projects/${params.id}/financial/orders/${order.id}`)
    } catch (error: any) {
      console.error('Error creating payment order:', error)
      setError(error.message || 'Error al crear la orden de pago')
    } finally {
      setLoading(false)
    }
  }

  async function generateOrderNumber(): Promise<string> {
    // Obtener el último número de orden del proyecto
    const { data, error } = await supabase
      .from('payment_orders')
      .select('order_number')
      .eq('project_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error getting last order number:', error)
    }

    const lastNumber = data && data.length > 0 
      ? parseInt(data[0].order_number.split('-').pop() || '0')
      : 0

    const nextNumber = lastNumber + 1
    const projectCode = project?.project_code || 'PROJ'
    
    return `OP-${projectCode}-${String(nextNumber).padStart(4, '0')}`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-talento-green"></div>
      </div>
    )
  }

  if (accounts.length === 0 && !error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${params.id}/financial`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nueva Orden de Pago</h1>
            <p className="text-gray-600">{project.name}</p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Este proyecto no tiene cuentas SIFI configuradas. Configure las cuentas antes de crear órdenes de pago.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Link href={`/projects/${params.id}/financial/setup`}>
            <Button>Configurar SIFI</Button>
          </Link>
          <Link href={`/projects/${params.id}/financial`}>
            <Button variant="outline">Volver</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/projects/${params.id}/financial`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Orden de Pago</h1>
          <p className="text-gray-600">{project.name} - {project.project_code}</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Cuenta SIFI */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cuenta SIFI
            </CardTitle>
            <CardDescription>
              Seleccione la cuenta fiduciaria desde la cual se realizará el pago
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fiduciary_account_id">Cuenta SIFI *</Label>
              <Select
                onValueChange={(value) => setValue('fiduciary_account_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      SIFI {account.sifi_code} - {account.account_name} ({formatCurrency(account.current_balance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.fiduciary_account_id && (
                <p className="text-sm text-red-600 mt-1">{errors.fiduciary_account_id.message}</p>
              )}
            </div>

            {selectedAccount && (
              <Alert>
                <AlertDescription>
                  <strong>Saldo disponible:</strong> {formatCurrency(selectedAccount.current_balance)}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Beneficiario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Datos del Beneficiario
            </CardTitle>
            <CardDescription>
              Información de la persona o empresa que recibirá el pago
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="beneficiary_name">Nombre Completo / Razón Social *</Label>
                <Input
                  id="beneficiary"
                  {...register('beneficiary')}
                  placeholder="Ej: Juan Pérez o Constructora ABC S.A.S"
                />
                {errors.beneficiary && (
                  <p className="text-sm text-red-600 mt-1">{errors.beneficiary.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="beneficiary_id">Cédula / NIT *</Label>
                <Input
                  id="beneficiary_document"
                  {...register('beneficiary_document')}
                  placeholder="Ej: 1234567890 o 900123456-1"
                />
                {errors.beneficiary_document && (
                  <p className="text-sm text-red-600 mt-1">{errors.beneficiary_document.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="beneficiary_bank">Banco</Label>
                <Input
                  id="beneficiary_bank"
                  {...register('beneficiary_bank')}
                  placeholder="Ej: Bancolombia"
                />
              </div>

              <div>
                <Label htmlFor="beneficiary_account">Número de Cuenta</Label>
                <Input
                  id="beneficiary_account_number"
                  {...register('beneficiary_account_number')}
                  placeholder="Ej: 12345678901"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalles del Pago */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalles del Pago
            </CardTitle>
            <CardDescription>
              Información sobre el monto y concepto del pago
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Monto *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  {...register('amount', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="text-sm text-red-600 mt-1">{errors.amount.message}</p>
                )}
                {amount > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {formatCurrency(amount)}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="priority">Prioridad *</Label>
                <Select
                  defaultValue="normal"
                  onValueChange={(value: any) => setValue('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="concept">Concepto *</Label>
                <Input
                  id="concept"
                  {...register('concept')}
                  placeholder="Ej: Pago de materiales, Honorarios, etc."
                />
                {errors.concept && (
                  <p className="text-sm text-red-600 mt-1">{errors.concept.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="payment_date">Fecha de Pago Deseada</Label>
                <Input
                  id="payment_date"
                  type="date"
                  {...register('payment_date')}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describa detalladamente el motivo del pago..."
                rows={4}
              />
              {errors.description && (
                <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Información adicional o instrucciones especiales..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Link href={`/projects/${params.id}/financial`}>
            <Button type="button" variant="outline" disabled={loading}>
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creando...' : 'Crear Orden de Pago'}
          </Button>
        </div>
      </form>
    </div>
  )
}
