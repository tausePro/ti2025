'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Download, 
  DollarSign,
  TrendingUp,
  FileText,
  AlertCircle,
  Filter,
  Search,
  Check,
  X,
  Trash2,
  MoreVertical
} from 'lucide-react'
import Link from 'next/link'

interface PaymentOrder {
  id: string
  op_number: string
  id_number: string
  order_number: string
  order_date: string
  amount: number
  concept: string
  beneficiary: string
  construction_act?: string
  status: string
}

interface Project {
  id: string
  name: string
  project_code: string
  budget: number
}

export default function SimpleFinancialPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<Project | null>(null)
  const [orders, setOrders] = useState<PaymentOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<PaymentOrder[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (profile && !['admin', 'super_admin', 'gerente', 'supervisor'].includes(profile.role)) {
      router.push('/projects')
      return
    }

    if (params.id) {
      loadData()
    }
  }, [params.id, profile, router])

  async function loadData() {
    try {
      // Cargar proyecto
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, project_code, budget')
        .eq('id', params.id)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Cargar órdenes de pago
      const { data: ordersData, error: ordersError } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('project_id', params.id)
        .order('order_date', { ascending: false })

      if (ordersError) throw ordersError
      setOrders(ordersData || [])
      setFilteredOrders(ordersData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...orders]

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter)
    }

    // Filtro por búsqueda (beneficiario, concepto, número de orden)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(o => 
        o.beneficiary?.toLowerCase().includes(term) ||
        o.concept?.toLowerCase().includes(term) ||
        o.op_number?.toLowerCase().includes(term) ||
        o.id_number?.toLowerCase().includes(term)
      )
    }

    setFilteredOrders(filtered)
  }, [orders, statusFilter, searchTerm])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO')
  }

  // Acciones de órdenes
  const handleApprove = async (orderId: string) => {
    if (!confirm('¿Aprobar esta orden de pago?')) return
    
    setActionLoading(orderId)
    try {
      const { error } = await supabase
        .from('payment_orders')
        .update({ status: 'aprobado' })
        .eq('id', orderId)

      if (error) throw error
      
      await loadData()
      alert('✅ Orden aprobada exitosamente')
    } catch (error: any) {
      console.error('Error approving order:', error)
      alert('❌ Error al aprobar la orden: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkAsPaid = async (orderId: string) => {
    if (!confirm('¿Marcar esta orden como pagada (legalizada)?')) return
    
    setActionLoading(orderId)
    try {
      const { error } = await supabase
        .from('payment_orders')
        .update({ 
          status: 'pagado',
          paid_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error
      
      await loadData()
      alert('✅ Orden marcada como pagada')
    } catch (error: any) {
      console.error('Error marking as paid:', error)
      alert('❌ Error al marcar como pagada: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (orderId: string) => {
    const reason = prompt('¿Por qué rechazas esta orden?')
    if (!reason) return
    
    setActionLoading(orderId)
    try {
      const { error } = await supabase
        .from('payment_orders')
        .update({ 
          status: 'rechazado',
          rejection_reason: reason
        })
        .eq('id', orderId)

      if (error) throw error
      
      await loadData()
      alert('✅ Orden rechazada')
    } catch (error: any) {
      console.error('Error rejecting order:', error)
      alert('❌ Error al rechazar: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (orderId: string) => {
    if (!confirm('⚠️ ¿Eliminar esta orden? Esta acción no se puede deshacer.')) return
    
    setActionLoading(orderId)
    try {
      const { error } = await supabase
        .from('payment_orders')
        .delete()
        .eq('id', orderId)

      if (error) throw error
      
      await loadData()
      alert('✅ Orden eliminada')
    } catch (error: any) {
      console.error('Error deleting order:', error)
      alert('❌ Error al eliminar: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pendiente: { label: 'Pendiente', className: 'bg-yellow-500 text-white' },
      aprobado: { label: 'Aprobado', className: 'bg-green-500 text-white' },
      rechazado: { label: 'Rechazado', className: 'bg-red-500 text-white' },
      pagado: { label: 'Pagado', className: 'bg-blue-500 text-white' },
      cancelado: { label: 'Cancelado', className: 'bg-gray-500 text-white' }
    }

    const config = statusMap[status] || { label: status, className: 'bg-gray-400 text-white' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  // Calcular estadísticas según Excel
  const stats = {
    // Total Autorizado: suma de órdenes aprobadas o pagadas (no rechazadas ni pendientes)
    authorized: orders.filter(o => ['aprobado', 'pagado'].includes(o.status)).reduce((sum, o) => sum + o.amount, 0),
    // Legalizado: suma de órdenes pagadas (pagos ejecutados por el cliente)
    legalized: orders.filter(o => o.status === 'pagado').reduce((sum, o) => sum + o.amount, 0),
    count: orders.length
  }

  const budget = project?.budget || 0
  const remaining = budget - stats.authorized
  const authorizedPercentage = budget > 0 ? (stats.authorized / budget) * 100 : 0
  const legalizedPercentage = 0 // Siempre 0% por ahora

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estado de Cuentas</h1>
          <p className="text-gray-600">{project?.name} - {project?.project_code}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          <Link href={`/projects/${params.id}/financial/orders/new-simple`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Orden
            </Button>
          </Link>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Autorizado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.authorized)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {authorizedPercentage.toFixed(1)}% del presupuesto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Legalizado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.legalized)}</div>
            <p className="text-xs text-gray-500 mt-1">Pagos ejecutados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Presupuesto Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budget)}</div>
            <p className="text-xs text-gray-500 mt-1">100%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Restante
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(remaining)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {budget > 0 ? ((remaining / budget) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por beneficiario, concepto o número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro por estado */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="aprobado">Aprobado</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Contador de resultados */}
          <div className="mt-4 text-sm text-gray-600">
            Mostrando {filteredOrders.length} de {orders.length} órdenes
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Órdenes */}
      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Pago</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                No hay órdenes de pago registradas. Haz clic en "Registrar Orden" para agregar una.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Orden N°</th>
                    <th className="text-left p-3">Fecha</th>
                    <th className="text-left p-3">Concepto</th>
                    <th className="text-left p-3">Beneficiario</th>
                    <th className="text-right p-3">Valor</th>
                    <th className="text-center p-3">Acta</th>
                    <th className="text-center p-3">Estado</th>
                    <th className="text-center p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-sm font-semibold">{order.op_number}</span>
                          <span className="font-mono text-xs text-gray-500">{order.id_number}</span>
                        </div>
                      </td>
                      <td className="p-3">{formatDate(order.order_date)}</td>
                      <td className="p-3">{order.concept}</td>
                      <td className="p-3">{order.beneficiary}</td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(order.amount)}</td>
                      <td className="p-3 text-center text-sm text-gray-600">
                        {order.construction_act || '-'}
                      </td>
                      <td className="p-3 text-center">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          {order.status === 'pendiente' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleApprove(order.id)}
                                disabled={actionLoading === order.id}
                                title="Aprobar"
                                className="h-8 w-8 p-0"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleReject(order.id)}
                                disabled={actionLoading === order.id}
                                title="Rechazar"
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(order.id)}
                                disabled={actionLoading === order.id}
                                title="Eliminar"
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4 text-gray-600" />
                              </Button>
                            </>
                          )}
                          {order.status === 'aprobado' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMarkAsPaid(order.id)}
                              disabled={actionLoading === order.id}
                              title="Marcar como Pagado"
                              className="h-8 px-3"
                            >
                              <Check className="h-4 w-4 mr-1 text-blue-600" />
                              <span className="text-xs">Pagado</span>
                            </Button>
                          )}
                          {(order.status === 'pagado' || order.status === 'rechazado') && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
