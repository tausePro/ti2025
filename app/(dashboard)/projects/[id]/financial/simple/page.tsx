'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  Download, 
  DollarSign,
  TrendingUp,
  FileText,
  AlertCircle 
} from 'lucide-react'
import Link from 'next/link'

interface PaymentOrder {
  id: string
  order_number: string
  order_date: string
  amount: number
  concept: string
  beneficiary: string
  construction_act_reference?: string
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
    } catch (error) {
      console.error('Error loading data:', error)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO')
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      authorized: { label: 'Autorizado', className: 'bg-green-500' },
      legalized: { label: 'Legalizado', className: 'bg-blue-500' },
      pending: { label: 'Pendiente', className: 'bg-yellow-500' },
      approved: { label: 'Aprobado', className: 'bg-green-600' },
      rejected: { label: 'Rechazado', className: 'bg-red-500' },
      paid: { label: 'Pagado', className: 'bg-blue-600' },
      cancelled: { label: 'Cancelado', className: 'bg-gray-500' }
    }

    const config = statusMap[status] || { label: status, className: 'bg-gray-400' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  // Calcular estadísticas
  const stats = {
    total: orders.reduce((sum, o) => sum + o.amount, 0),
    authorized: orders.filter(o => o.status === 'authorized').reduce((sum, o) => sum + o.amount, 0),
    legalized: orders.filter(o => o.status === 'legalized').reduce((sum, o) => sum + o.amount, 0),
    count: orders.length
  }

  const budget = project?.budget || 0
  const remaining = budget - stats.total
  const authorizedPercentage = budget > 0 ? (stats.authorized / budget) * 100 : 0

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

      {/* Tabla de Órdenes */}
      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Pago</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
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
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono text-sm">{order.order_number}</td>
                      <td className="p-3">{formatDate(order.order_date)}</td>
                      <td className="p-3">{order.concept}</td>
                      <td className="p-3">{order.beneficiary}</td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(order.amount)}</td>
                      <td className="p-3 text-center text-sm text-gray-600">
                        {order.construction_act_reference || '-'}
                      </td>
                      <td className="p-3 text-center">
                        {getStatusBadge(order.status)}
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
