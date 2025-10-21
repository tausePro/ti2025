'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  Search, 
  Building2,
  TrendingUp,
  ArrowRight
} from 'lucide-react'

interface Project {
  id: string
  name: string
  project_code: string
  budget: number
  status: string
  client_company?: {
    name: string
  }
}

interface ProjectStats {
  authorized: number
  legalized: number
  remaining: number
  ordersCount: number
}

export default function DesembolsosPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectStats, setProjectStats] = useState<Record<string, ProjectStats>>({})
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (profile && !['admin', 'super_admin', 'gerente', 'supervisor'].includes(profile.role)) {
      router.push('/projects')
      return
    }

    loadProjects()
  }, [profile, router])

  async function loadProjects() {
    try {
      // Cargar proyectos activos con interventoría de desembolsos
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          project_code,
          budget,
          status,
          service_type,
          client_company:companies(name)
        `)
        .in('status', ['active', 'in_progress'])
        .eq('service_type', 'interventoria_desembolsos')
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError

      // Transformar datos para que client_company sea un objeto en lugar de array
      const transformedProjects = (projectsData || []).map(p => ({
        ...p,
        client_company: Array.isArray(p.client_company) ? p.client_company[0] : p.client_company
      }))

      setProjects(transformedProjects)

      // Cargar estadísticas de cada proyecto
      const stats: Record<string, ProjectStats> = {}
      
      for (const project of projectsData || []) {
        const { data: orders } = await supabase
          .from('payment_orders')
          .select('amount, status')
          .eq('project_id', project.id)

        const authorized = orders?.filter(o => ['aprobado', 'pagado'].includes(o.status))
          .reduce((sum, o) => sum + o.amount, 0) || 0
        
        const legalized = orders?.filter(o => o.status === 'pagado')
          .reduce((sum, o) => sum + o.amount, 0) || 0

        stats[project.id] = {
          authorized,
          legalized,
          remaining: project.budget - authorized,
          ordersCount: orders?.length || 0
        }
      }

      setProjectStats(stats)
    } catch (error) {
      console.error('Error loading projects:', error)
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

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.project_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client_company?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <h1 className="text-2xl font-bold">Desembolsos</h1>
          <p className="text-gray-600">Gestión de órdenes de pago por proyecto</p>
        </div>
      </div>

      {/* Búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, código o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Mostrando {filteredProjects.length} de {projects.length} proyectos
          </div>
        </CardContent>
      </Card>

      {/* Lista de Proyectos */}
      <div className="grid grid-cols-1 gap-4">
        {filteredProjects.map((project) => {
          const stats = projectStats[project.id] || { authorized: 0, legalized: 0, remaining: 0, ordersCount: 0 }
          const percentage = project.budget > 0 ? (stats.authorized / project.budget) * 100 : 0

          return (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="h-5 w-5 text-talento-green" />
                      <h3 className="text-lg font-semibold">{project.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {project.project_code || 'Sin código'}
                      </Badge>
                    </div>
                    
                    {project.client_company?.name && (
                      <p className="text-sm text-gray-600 mb-4">
                        {project.client_company.name}
                      </p>
                    )}

                    {/* Estadísticas */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Presupuesto</p>
                        <p className="text-sm font-semibold">{formatCurrency(project.budget)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Autorizado</p>
                        <p className="text-sm font-semibold text-green-600">
                          {formatCurrency(stats.authorized)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Legalizado</p>
                        <p className="text-sm font-semibold text-blue-600">
                          {formatCurrency(stats.legalized)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Órdenes</p>
                        <p className="text-sm font-semibold">{stats.ordersCount}</p>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Ejecución presupuestal</span>
                        <span>{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-talento-green rounded-full h-2 transition-all"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Botón de acción */}
                  <Button
                    onClick={() => router.push(`/projects/${project.id}/financial/simple`)}
                    className="ml-4"
                  >
                    Ver Estado
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredProjects.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No se encontraron proyectos</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
