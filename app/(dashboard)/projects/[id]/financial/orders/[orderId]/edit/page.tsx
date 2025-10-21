'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { SimplePaymentOrderForm } from '@/components/financial/SimplePaymentOrderForm'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface PaymentOrder {
  id: string
  op_number: string
  id_number: string
  order_date: string
  amount: number
  concept: string
  beneficiary: string
  construction_act?: string
  status: string
}

export default function EditPaymentOrderPage() {
  const params = useParams()
  const router = useRouter()
  const { user, profile } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<PaymentOrder | null>(null)
  const [loadingOrder, setLoadingOrder] = useState(true)

  useEffect(() => {
    // Verificar permisos
    if (profile && !['admin', 'super_admin', 'gerente', 'supervisor'].includes(profile.role)) {
      router.push('/projects')
      return
    }

    if (params.orderId) {
      loadOrder()
    }
  }, [params.orderId, profile, router])

  async function loadOrder() {
    try {
      const { data, error } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('id', params.orderId)
        .single()

      if (error) throw error

      // Solo permitir editar si está en estado pendiente
      if (data.status !== 'pendiente') {
        setError('Solo se pueden editar órdenes en estado pendiente')
        setTimeout(() => {
          router.push(`/projects/${params.id}/financial/simple`)
        }, 2000)
        return
      }
      
      setOrder(data)
    } catch (error: any) {
      console.error('Error loading order:', error)
      setError(error.message || 'Error al cargar orden')
    } finally {
      setLoadingOrder(false)
    }
  }

  async function handleSubmit(data: any) {
    if (!user) {
      setError('Usuario no autenticado')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('payment_orders')
        .update({
          op_number: data.op_number,
          id_number: data.id_number,
          order_number: `${data.op_number}-${data.id_number}`,
          order_date: data.order_date,
          amount: data.amount,
          concept: data.concept,
          beneficiary: data.beneficiary,
          construction_act: data.construction_act_reference,
          status: data.status,
          requested_at: data.order_date,
          requested_date: data.order_date,
          description: data.concept,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.orderId)

      if (updateError) throw updateError

      alert('✅ Orden actualizada exitosamente')
      router.push(`/projects/${params.id}/financial/simple`)
    } catch (error: any) {
      console.error('Error updating payment order:', error)
      setError(error.message || 'Error al actualizar la orden de pago')
      throw error
    } finally {
      setLoading(false)
    }
  }

  if (loadingOrder) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-talento-green"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Orden no encontrada</AlertDescription>
        </Alert>
        <Link href={`/projects/${params.id}/financial/simple`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/projects/${params.id}/financial/simple`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Orden de Pago</h1>
          <p className="text-gray-600">
            {order.op_number} - {order.id_number}
          </p>
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
      <SimplePaymentOrderForm
        projectId={params.id as string}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/projects/${params.id}/financial/simple`)}
        loading={loading}
        defaultValues={{
          op_number: order.op_number,
          id_number: order.id_number,
          order_date: order.order_date,
          amount: order.amount,
          concept: order.concept,
          beneficiary: order.beneficiary,
          construction_act_reference: order.construction_act || '',
          status: order.status as 'pendiente' | 'aprobado' | 'rechazado' | 'pagado'
        }}
      />
    </div>
  )
}
