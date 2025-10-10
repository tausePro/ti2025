'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
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
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  requested_at: string
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

  useEffect(() => {
    // Verificar permisos: solo admin y gerente
    if (profile && profile.role !== 'admin' && profile.role !== 'gerente') {
      router.push('/dashboard')
      return
    }

    if (profile) {
      loadFinancialData()
    }
  }, [profile, router])

  async function loadFinancialData() {
    try {
      // Cargar cuentas fiduciarias con información del proyecto
      const { data: accountsData, error: accountsError } = await supabase
        .from('fiduciary_accounts')
        .select(`
          *,
          project:projects(name, code)
        `)
        .order('created_at', { ascending: false })

      if (accountsError) throw accountsError

      // Cargar órdenes de pago pendientes y aprobadas
      const { data: ordersData, error: ordersError } = await supabase
        .from('payment_orders')
        .select(`
          *,
          project:projects(name, code)
        `)
        .in('status', ['pending', 'approved'])
        .order('requested_at', { ascending: false })
        .limit(10)

      if (ordersError) throw ordersError

      setAccounts(accountsData || [])
      setPaymentOrders(ordersData || [])

      // Calcular resumen
      const totalBalance = (accountsData || []).reduce((sum, acc) => sum + Number(acc.current_balance), 0)
      const activeAccounts = (accountsData || []).filter(acc => acc.is_active).length
      const pendingOrders = (ordersData || []).filter(order => order.status === 'pending').length
      const approvedOrders = (ordersData || []).filter(order => order.status === 'approved').length
      const totalPendingAmount = (ordersData || [])
        .filter(order => order.status === 'pending')
        .reduce((sum, order) => sum + Number(order.amount), 0)

      setSummary({
        totalBalance,
        totalAccounts: (accountsData || []).length,
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const, icon: Clock },
      approved: { label: 'Aprobada', variant: 'default' as const, icon: CheckCircle },
      rejected: { label: 'Rechazada', variant: 'destructive' as const, icon: AlertCircle },
      paid: { label: 'Pagada', variant: 'default' as const, icon: CheckCircle },
      cancelled: { label: 'Cancelada', variant: 'secondary' as const, icon: AlertCircle }
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

        <Card>
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
                      <h3 className="font-semibold">{account.project.name}</h3>
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
                      {account.bank_name} • {account.account_number}
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

      {/* Órdenes de Pago Recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Pago Recientes</CardTitle>
          <CardDescription>
            Últimas solicitudes de pago pendientes y aprobadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No hay órdenes de pago pendientes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{order.order_number}</h3>
                      {getStatusBadge(order.status)}
                      {getPriorityBadge(order.priority)}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{order.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Proyecto: {order.project.name}</span>
                      <span>•</span>
                      <span>Beneficiario: {order.beneficiary_name}</span>
                      <span>•</span>
                      <span>{new Date(order.requested_at).toLocaleDateString('es-CO')}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">
                      {formatCurrency(order.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
