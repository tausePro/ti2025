'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Building2, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Plus,
  ArrowLeft,
  Wallet,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Settings
} from 'lucide-react'
import Link from 'next/link'

interface FiduciaryAccount {
  id: string
  sifi_code: '1' | '2'
  account_name: string
  bank_name: string
  account_number: string
  current_balance: number
  initial_balance: number
  is_active: boolean
  created_at: string
}

interface PaymentOrder {
  id: string
  order_number: string
  description: string
  amount: number
  beneficiary_name: string
  beneficiary_id: string
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  requested_at: string
  requested_by: {
    full_name: string
    email: string
  }
}

interface FinancialConfig {
  id: string
  requires_construction_acts: boolean
  requires_legalizations: boolean
  approval_flow: string[]
  budget_alerts: number[]
  max_approval_amount?: number
  requires_client_approval: boolean
  auto_approve_under: number
}

interface Project {
  id: string
  name: string
  code: string
  budget?: number
}

export default function ProjectFinancialPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<Project | null>(null)
  const [accounts, setAccounts] = useState<FiduciaryAccount[]>([])
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([])
  const [financialConfig, setFinancialConfig] = useState<FinancialConfig | null>(null)

  useEffect(() => {
    // Verificar permisos: solo admin, gerente y supervisor
    if (profile && !['admin', 'super_admin', 'gerente', 'supervisor'].includes(profile.role)) {
      router.push('/projects')
      return
    }

    if (params.id) {
      loadFinancialData()
    }
  }, [params.id, profile, router])

  async function loadFinancialData() {
    try {
      setLoading(true)

      // Cargar proyecto
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, project_code, budget')
        .eq('id', params.id)
        .single()

      if (projectError) throw projectError
      
      setProject({
        id: projectData.id,
        name: projectData.name,
        code: projectData.project_code || 'N/A',
        budget: projectData.budget
      })

      // Cargar cuentas fiduciarias
      const { data: accountsData, error: accountsError } = await supabase
        .from('fiduciary_accounts')
        .select('*')
        .eq('project_id', params.id)
        .order('sifi_code')

      if (accountsError) throw accountsError
      setAccounts(accountsData || [])

      // Cargar configuración financiera
      const { data: configData, error: configError } = await supabase
        .from('project_financial_config')
        .select('*')
        .eq('project_id', params.id)
        .single()

      if (configError && configError.code !== 'PGRST116') {
        console.error('Error loading config:', configError)
      }
      setFinancialConfig(configData)

      // Cargar órdenes de pago
      const { data: ordersData, error: ordersError } = await supabase
        .from('payment_orders')
        .select(`
          *,
          requested_by:profiles!requested_by(full_name, email)
        `)
        .eq('project_id', params.id)
        .order('requested_at', { ascending: false })
        .limit(20)

      if (ordersError) throw ordersError
      setPaymentOrders(ordersData || [])

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

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.current_balance), 0)
  const pendingOrdersCount = paymentOrders.filter(o => o.status === 'pending').length
  const pendingAmount = paymentOrders
    .filter(o => o.status === 'pending')
    .reduce((sum, o) => sum + Number(o.amount), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-talento-green"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600">Proyecto no encontrado</p>
      </div>
    )
  }

  const hasFinancialSetup = accounts.length > 0 || financialConfig

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${params.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión Financiera</h1>
            <p className="text-gray-600">{project.name} - {project.code}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasFinancialSetup ? (
            <>
              <Button variant="outline" onClick={() => router.push(`/projects/${params.id}/financial/config`)}>
                <Settings className="h-4 w-4 mr-2" />
                Configuración
              </Button>
              <Button onClick={() => router.push(`/projects/${params.id}/financial/orders/new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Orden de Pago
              </Button>
            </>
          ) : (
            <Button onClick={() => router.push(`/projects/${params.id}/financial/setup`)}>
              <Plus className="h-4 w-4 mr-2" />
              Configurar Interventoría Financiera
            </Button>
          )}
        </div>
      </div>

      {!hasFinancialSetup ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Wallet className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Interventoría Financiera no configurada</h3>
              <p className="text-gray-600 mb-6">
                Este proyecto no tiene configurada la interventoría financiera (SIFI).
                <br />
                Configure las cuentas fiduciarias y el flujo de aprobación para comenzar.
              </p>
              <Button onClick={() => router.push(`/projects/${params.id}/financial/setup`)}>
                <Plus className="h-4 w-4 mr-2" />
                Configurar Ahora
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Total SIFI</CardTitle>
                <Wallet className="h-4 w-4 text-talento-green" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-talento-green">
                  {formatCurrency(totalBalance)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {accounts.filter(a => a.is_active).length} cuenta(s) activa(s)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Órdenes Pendientes</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingOrdersCount}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(pendingAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Presupuesto Proyecto</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {project.budget ? formatCurrency(project.budget) : 'N/A'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {project.budget && totalBalance > 0 
                    ? `${((totalBalance / project.budget) * 100).toFixed(1)}% en SIFI`
                    : 'Sin presupuesto definido'
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="accounts" className="space-y-4">
            <TabsList>
              <TabsTrigger value="accounts">Cuentas SIFI</TabsTrigger>
              <TabsTrigger value="orders">Órdenes de Pago</TabsTrigger>
              <TabsTrigger value="movements">Movimientos</TabsTrigger>
            </TabsList>

            {/* Tab: Cuentas SIFI */}
            <TabsContent value="accounts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cuentas Fiduciarias</CardTitle>
                  <CardDescription>
                    Cuentas SIFI configuradas para este proyecto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {accounts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>No hay cuentas fiduciarias configuradas</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {accounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline" className="font-mono">
                                SIFI {account.sifi_code}
                              </Badge>
                              <h3 className="font-semibold">{account.account_name}</h3>
                              {account.is_active ? (
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  Activa
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Inactiva</Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p><strong>Banco:</strong> {account.bank_name}</p>
                              <p><strong>Cuenta:</strong> {account.account_number}</p>
                              <p><strong>Saldo Inicial:</strong> {formatCurrency(account.initial_balance)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600 mb-1">Saldo Actual</p>
                            <p className="text-2xl font-bold text-talento-green">
                              {formatCurrency(account.current_balance)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Órdenes de Pago */}
            <TabsContent value="orders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Órdenes de Pago</CardTitle>
                  <CardDescription>
                    Historial de órdenes de pago del proyecto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {paymentOrders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>No hay órdenes de pago registradas</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paymentOrders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/projects/${params.id}/financial/orders/${order.id}`)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-mono text-sm font-semibold">
                                {order.order_number}
                              </span>
                              {getStatusBadge(order.status)}
                              {getPriorityBadge(order.priority)}
                            </div>
                            <p className="text-sm font-medium mb-1">{order.description}</p>
                            <p className="text-xs text-gray-600">
                              Beneficiario: {order.beneficiary_name} • {order.beneficiary_id}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Solicitado por {order.requested_by.full_name} • {new Date(order.requested_at).toLocaleDateString('es-CO')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">
                              {formatCurrency(order.amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Movimientos */}
            <TabsContent value="movements" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Movimientos Fiduciarios</CardTitle>
                  <CardDescription>
                    Historial de movimientos en las cuentas SIFI
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Funcionalidad en desarrollo</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
