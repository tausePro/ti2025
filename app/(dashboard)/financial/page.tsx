'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Building2,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Wallet,
  XCircle,
  Banknote,
  Filter
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface FiduciaryAccount {
  id: string
  project_id: string
  sifi_code: string
  account_name: string
  bank_name: string
  account_number: string
  current_balance: number
  is_active: boolean
  project: {
    name: string
    code: string
  }
}

interface PaymentOrder {
  id: string
  order_number: string
  description: string
  amount: number
  beneficiary_name: string
  status: 'pendiente' | 'aprobado' | 'rechazado' | 'pagado'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  requested_at: string
  rejection_reason?: string | null
  project: {
    name: string
    code: string
  }
}

interface FinancialSummary {
  totalBalance: number
  totalAccounts: number
  activeAccounts: number
  pendingOrders: number
  approvedOrders: number
  totalPendingAmount: number
}

export default function FinancialPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<FiduciaryAccount[]>([])
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([])
  const [summary, setSummary] = useState<FinancialSummary>({
    totalBalance: 0,
    totalAccounts: 0,
    activeAccounts: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    totalPendingAmount: 0
  })
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrder | null>(null)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showPaidDialog, setShowPaidDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const isGerente = profile?.role === 'gerente'

  useEffect(() => {
    if (profile && !isAdmin && !isGerente) {
      router.push('/dashboard')
      return
    }
    if (profile) loadFinancialData()
  }, [profile, router, statusFilter])

  async function loadFinancialData() {
    try {
      const { data: accountsData, error: accountsError } = await supabase
        .from('fiduciary_accounts')
        .select(`*, project:projects(name, code)`)
        .order('created_at', { ascending: false })

      if (accountsError) throw accountsError

      let ordersQuery = supabase
        .from('payment_orders')
        .select(`*, project:projects(name, code)`)
        .order('requested_at', { ascending: false })
        .limit(20)

      if (statusFilter === 'active') {
        ordersQuery = ordersQuery.in('status', ['pendiente', 'aprobado'])
      } else if (statusFilter !== 'all') {
        ordersQuery = ordersQuery.eq('status', statusFilter)
      }

      const { data: ordersData, error: ordersError } = await ordersQuery
      if (ordersError) throw ordersError

      const normalizedAccounts = (accountsData || []).map((a: any) => ({
        ...a,
        project: Array.isArray(a.project) ? a.project[0] : a.project
      }))
      const normalizedOrders = (ordersData || []).map((o: any) => ({
        ...o,
        project: Array.isArray(o.project) ? o.project[0] : o.project
      }))

      setAccounts(normalizedAccounts)
      setPaymentOrders(normalizedOrders)

      const totalBalance = normalizedAccounts.reduce((sum: number, acc: any) => sum + Number(acc.current_balance), 0)
      const activeAccounts = normalizedAccounts.filter((acc: any) => acc.is_active).length
      const pendingOrders = normalizedOrders.filter((o: any) => o.status === 'pendiente').length
      const approvedOrders = normalizedOrders.filter((o: any) => o.status === 'aprobado').length
      const totalPendingAmount = normalizedOrders
        .filter((o: any) => o.status === 'pendiente')
        .reduce((sum: number, o: any) => sum + Number(o.amount), 0)

      setSummary({
        totalBalance,
        totalAccounts: normalizedAccounts.length,
        activeAccounts,
        pendingOrders,
        approvedOrders,
        totalPendingAmount
      })
    } catch (error) {
      console.error('Error loading financial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedOrder) return
    try {
      setActionLoading(true)
      setError('')
      const { error } = await supabase
        .from('payment_orders')
        .update({
          status: 'aprobado',
          approved_by: profile!.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id)
        .eq('status', 'pendiente')

      if (error) throw error
      setSuccess(`Orden ${selectedOrder.order_number} aprobada`)
      setShowApproveDialog(false)
      setSelectedOrder(null)
      loadFinancialData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedOrder || !rejectionReason.trim()) {
      setError('Debes indicar un motivo de rechazo')
      return
    }
    try {
      setActionLoading(true)
      setError('')
      const { error } = await supabase
        .from('payment_orders')
        .update({
          status: 'rechazado',
          rejection_reason: rejectionReason.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id)
        .eq('status', 'pendiente')

      if (error) throw error
      setSuccess(`Orden ${selectedOrder.order_number} rechazada`)
      setShowRejectDialog(false)
      setRejectionReason('')
      setSelectedOrder(null)
      loadFinancialData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkPaid = async () => {
    if (!selectedOrder) return
    try {
      setActionLoading(true)
      setError('')
      const { error } = await supabase
        .from('payment_orders')
        .update({
          status: 'pagado',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id)
        .eq('status', 'aprobado')

      if (error) throw error
      setSuccess(`Orden ${selectedOrder.order_number} marcada como pagada`)
      setShowPaidDialog(false)
      setSelectedOrder(null)
      loadFinancialData()
    } catch (err: any) {
      setError(err.message)
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
      pendiente: { label: 'Pendiente', variant: 'secondary' as const, icon: Clock },
      aprobado: { label: 'Aprobada', variant: 'default' as const, icon: CheckCircle },
      rechazado: { label: 'Rechazada', variant: 'destructive' as const, icon: XCircle },
      pagado: { label: 'Pagada', variant: 'default' as const, icon: Banknote }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendiente
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

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal

    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-talento-green"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestión Financiera</h1>
        <p className="text-gray-600">Resumen de cuentas fiduciarias y órdenes de pago</p>
      </div>

      {/* Alerts */}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Resumen financiero */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <Wallet className="h-4 w-4 text-talento-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-talento-green">
              {formatCurrency(summary.totalBalance)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {summary.activeAccounts} de {summary.totalAccounts} cuentas activas
            </p>
          </CardContent>
        </Card>

        <Card className={summary.pendingOrders > 0 ? 'border-orange-200 bg-orange-50/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pendingOrders}</div>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(summary.totalPendingAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Aprobadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.approvedOrders}</div>
            <p className="text-xs text-gray-500 mt-1">
              Listas para pago
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuentas Fiduciarias</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalAccounts}</div>
            <p className="text-xs text-gray-500 mt-1">
              Cuentas registradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cuentas Fiduciarias */}
      <Card>
        <CardHeader>
          <CardTitle>Cuentas Fiduciarias por Proyecto</CardTitle>
          <CardDescription>
            Estado actual de las cuentas SIFI
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No hay cuentas fiduciarias registradas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{account.project?.name || 'Sin proyecto'}</h3>
                      <Badge variant="outline" className="text-xs">
                        SIFI {account.sifi_code}
                      </Badge>
                      {account.is_active ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                          Activa
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Inactiva
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{account.account_name}</p>
                    <p className="text-xs text-gray-500">
                      {account.bank_name} &bull; {account.account_number}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-talento-green">
                      {formatCurrency(account.current_balance)}
                    </p>
                    <p className="text-xs text-gray-500">Saldo actual</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Órdenes de Pago */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Órdenes de Pago</CardTitle>
              <CardDescription>
                Gestiona las solicitudes de pago
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Pendientes y Aprobadas</option>
                <option value="pendiente">Solo Pendientes</option>
                <option value="aprobado">Solo Aprobadas</option>
                <option value="rechazado">Rechazadas</option>
                <option value="pagado">Pagadas</option>
                <option value="all">Todas</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paymentOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No hay órdenes de pago con el filtro seleccionado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold">{order.order_number}</h3>
                      {getStatusBadge(order.status)}
                      {getPriorityBadge(order.priority)}
                    </div>
                    <p className="text-sm text-gray-600 mb-1 truncate">{order.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                      <span>{order.project?.name || 'Sin proyecto'}</span>
                      <span>&bull;</span>
                      <span>{order.beneficiary_name}</span>
                      <span>&bull;</span>
                      <span>{new Date(order.requested_at).toLocaleDateString('es-CO')}</span>
                    </div>
                    {order.status === 'rechazado' && order.rejection_reason && (
                      <p className="text-xs text-red-600 mt-1">
                        Motivo: {order.rejection_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-xl font-bold whitespace-nowrap">
                      {formatCurrency(order.amount)}
                    </p>
                    <div className="flex gap-1">
                      {order.status === 'pendiente' && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => { setSelectedOrder(order); setShowApproveDialog(true) }}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => { setSelectedOrder(order); setShowRejectDialog(true) }}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {order.status === 'aprobado' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-300 text-green-700 hover:bg-green-50"
                          onClick={() => { setSelectedOrder(order); setShowPaidDialog(true) }}
                        >
                          <Banknote className="h-3.5 w-3.5 mr-1" />
                          Pagada
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Aprobar Orden */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar Orden de Pago</DialogTitle>
            <DialogDescription>
              Se aprobará la orden <strong>{selectedOrder?.order_number}</strong> por <strong>{selectedOrder ? formatCurrency(selectedOrder.amount) : ''}</strong> a favor de <strong>{selectedOrder?.beneficiary_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowApproveDialog(false); setSelectedOrder(null) }} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={actionLoading}>
              {actionLoading ? 'Aprobando...' : 'Aprobar Orden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Rechazar Orden */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Orden de Pago</DialogTitle>
            <DialogDescription>
              Se rechazará la orden <strong>{selectedOrder?.order_number}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo del rechazo *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explica por qué se rechaza esta orden..."
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectionReason(''); setSelectedOrder(null) }} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading || !rejectionReason.trim()}>
              {actionLoading ? 'Rechazando...' : 'Rechazar Orden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Marcar como Pagada */}
      <Dialog open={showPaidDialog} onOpenChange={setShowPaidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pago</DialogTitle>
            <DialogDescription>
              Se marcará como pagada la orden <strong>{selectedOrder?.order_number}</strong> por <strong>{selectedOrder ? formatCurrency(selectedOrder.amount) : ''}</strong> a favor de <strong>{selectedOrder?.beneficiary_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPaidDialog(false); setSelectedOrder(null) }} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button onClick={handleMarkPaid} disabled={actionLoading}>
              {actionLoading ? 'Procesando...' : 'Confirmar Pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
