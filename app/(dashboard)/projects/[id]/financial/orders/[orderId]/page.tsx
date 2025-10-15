'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  User,
  Building2,
  Calendar,
  FileText,
  MessageSquare
} from 'lucide-react'
import Link from 'next/link'

interface PaymentOrder {
  id: string
  order_number: string
  project_id: string
  fiduciary_account_id: string
  beneficiary: string
  beneficiary_document: string
  beneficiary_bank?: string
  beneficiary_account_number?: string
  amount: number
  description?: string
  concept: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled'
  payment_date?: string
  notes?: string
  requested_by?: string
  requested_at?: string
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  paid_at?: string
  fiduciary_account: {
    sifi_code: '1' | '2'
    account_name: string
    current_balance: number
  }
  requested_by_profile?: {
    full_name: string
    email: string
  }
  approved_by_profile?: {
    full_name: string
    email: string
  }
}

interface Project {
  id: string
  name: string
  project_code: string
}

export default function PaymentOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, profile } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<PaymentOrder | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  useEffect(() => {
    if (params.id && params.orderId) {
      loadOrderData()
    }
  }, [params.id, params.orderId])

  async function loadOrderData() {
    try {
      setLoading(true)

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

      // Cargar orden de pago
      const { data: orderData, error: orderError } = await supabase
        .from('payment_orders')
        .select(`
          *,
          fiduciary_account:fiduciary_accounts!fiduciary_account_id(
            sifi_code,
            account_name,
            current_balance
          ),
          requested_by_profile:profiles!requested_by(
            full_name,
            email
          ),
          approved_by_profile:profiles!approved_by(
            full_name,
            email
          )
        `)
        .eq('id', params.orderId)
        .single()

      if (orderError) throw orderError
      setOrder(orderData as any)

    } catch (error: any) {
      console.error('Error loading order:', error)
      setError(error.message || 'Error al cargar la orden')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    if (!user || !order) return

    setActionLoading(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('payment_orders')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', order.id)

      if (updateError) throw updateError

      // Recargar datos
      await loadOrderData()
      
    } catch (error: any) {
      console.error('Error approving order:', error)
      setError(error.message || 'Error al aprobar la orden')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject() {
    if (!user || !order || !rejectionReason.trim()) {
      setError('Debe proporcionar un motivo de rechazo')
      return
    }

    setActionLoading(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('payment_orders')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq('id', order.id)

      if (updateError) throw updateError

      // Recargar datos
      await loadOrderData()
      setShowRejectForm(false)
      setRejectionReason('')
      
    } catch (error: any) {
      console.error('Error rejecting order:', error)
      setError(error.message || 'Error al rechazar la orden')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleMarkAsPaid() {
    if (!user || !order) return

    setActionLoading(true)
    setError('')

    try {
      // Actualizar orden
      const { error: updateError } = await supabase
        .from('payment_orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', order.id)

      if (updateError) throw updateError

      // Actualizar saldo de la cuenta SIFI
      const { error: balanceError } = await supabase
        .from('fiduciary_accounts')
        .update({
          current_balance: order.fiduciary_account.current_balance - order.amount
        })
        .eq('id', order.fiduciary_account_id)

      if (balanceError) throw balanceError

      // Recargar datos
      await loadOrderData()
      
    } catch (error: any) {
      console.error('Error marking as paid:', error)
      setError(error.message || 'Error al marcar como pagada')
    } finally {
      setActionLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const, icon: Clock, color: 'text-orange-600' },
      approved: { label: 'Aprobada', variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      rejected: { label: 'Rechazada', variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      paid: { label: 'Pagada', variant: 'default' as const, icon: CheckCircle, color: 'text-blue-600' },
      cancelled: { label: 'Cancelada', variant: 'secondary' as const, icon: AlertCircle, color: 'text-gray-600' }
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: 'Baja', className: 'bg-gray-100 text-gray-800' },
      normal: { label: 'Normal', className: 'bg-blue-100 text-blue-800' },
      high: { label: 'Alta', className: 'bg-orange-100 text-orange-800' },
      urgent: { label: 'Urgente', className: 'bg-red-100 text-red-800' }
    }

    const config = priorityConfig[priority as keyof typeof priorityConfig]

    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const canApprove = profile && ['admin', 'super_admin', 'gerente', 'supervisor'].includes(profile.role)
  const canMarkAsPaid = profile && ['admin', 'super_admin'].includes(profile.role)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-talento-green"></div>
      </div>
    )
  }

  if (!order || !project) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600">Orden de pago no encontrada</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${params.id}/financial`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
              {getStatusBadge(order.status)}
              {order.priority && getPriorityBadge(order.priority)}
            </div>
            <p className="text-gray-600">{project.name}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {order.status === 'pending' && canApprove && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(!showRejectForm)}
                disabled={actionLoading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprobar
              </Button>
            </>
          )}
          {order.status === 'approved' && canMarkAsPaid && (
            <Button
              onClick={handleMarkAsPaid}
              disabled={actionLoading}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Marcar como Pagada
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Reject Form */}
      {showRejectForm && order.status === 'pending' && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Rechazar Orden de Pago</CardTitle>
            <CardDescription>
              Proporcione un motivo claro para el rechazo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="rejection_reason">Motivo del Rechazo *</Label>
              <Textarea
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explique por qué se rechaza esta orden..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectForm(false)
                  setRejectionReason('')
                }}
                disabled={actionLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
              >
                Confirmar Rechazo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Monto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Monto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-talento-green">
                {formatCurrency(order.amount)}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Cuenta: SIFI {order.fiduciary_account.sifi_code} - {order.fiduciary_account.account_name}
              </p>
            </CardContent>
          </Card>

          {/* Beneficiario */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Beneficiario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Nombre / Razón Social</p>
                <p className="font-semibold">{order.beneficiary}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Identificación</p>
                <p className="font-semibold">{order.beneficiary_document}</p>
              </div>
              {order.beneficiary_bank && (
                <div>
                  <p className="text-sm text-gray-600">Banco</p>
                  <p className="font-semibold">{order.beneficiary_bank}</p>
                </div>
              )}
              {order.beneficiary_account_number && (
                <div>
                  <p className="text-sm text-gray-600">Cuenta</p>
                  <p className="font-semibold font-mono">{order.beneficiary_account_number}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalles del Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Concepto</p>
                <p className="font-semibold">{order.concept}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Descripción</p>
                <p className="text-gray-900">{order.description}</p>
              </div>
              {order.notes && (
                <div>
                  <p className="text-sm text-gray-600">Notas Adicionales</p>
                  <p className="text-gray-900">{order.notes}</p>
                </div>
              )}
              {order.payment_date && (
                <div>
                  <p className="text-sm text-gray-600">Fecha de Pago Deseada</p>
                  <p className="font-semibold">
                    {new Date(order.payment_date).toLocaleDateString('es-CO')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rechazo */}
          {order.status === 'rejected' && order.rejection_reason && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Motivo de Rechazo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-900">{order.rejection_reason}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Historial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  <div className="w-0.5 h-full bg-gray-200"></div>
                </div>
                <div className="flex-1 pb-4">
                  <p className="font-semibold text-sm">Solicitada</p>
                  {order.requested_by_profile && (
                    <p className="text-xs text-gray-600">
                      {order.requested_by_profile.full_name}
                    </p>
                  )}
                  {order.requested_at && (
                    <p className="text-xs text-gray-500">
                      {new Date(order.requested_at).toLocaleString('es-CO')}
                    </p>
                  )}
                </div>
              </div>

              {order.approved_at && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full ${
                      order.status === 'rejected' ? 'bg-red-600' : 'bg-green-600'
                    }`}></div>
                    {order.paid_at && <div className="w-0.5 h-full bg-gray-200"></div>}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-semibold text-sm">
                      {order.status === 'rejected' ? 'Rechazada' : 'Aprobada'}
                    </p>
                    {order.approved_by_profile && (
                      <p className="text-xs text-gray-600">
                        {order.approved_by_profile.full_name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {new Date(order.approved_at).toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>
              )}

              {order.paid_at && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-green-600"></div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Pagada</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.paid_at).toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
