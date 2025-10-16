'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  Users,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react'

interface ProjectOverviewProps {
  project: {
    id: string
    name: string
    project_code: string
    description?: string
    status: string
    progress_percentage: number
    start_date?: string
    end_date?: string
    estimated_budget?: number
    address?: string
    intervention_types?: string[]
    service_type?: string
    client_company?: {
      name: string
      logo_url?: string
    }
    contractor_company?: {
      name: string
      logo_url?: string
    }
  }
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      activo: 'bg-green-100 text-green-800',
      pausado: 'bg-yellow-100 text-yellow-800',
      finalizado: 'bg-blue-100 text-blue-800',
      planificacion: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      activo: 'Activo',
      pausado: 'Pausado',
      finalizado: 'Finalizado',
      planificacion: 'En Planificación'
    }
    return labels[status] || status
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'No especificado'
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (date?: string) => {
    if (!date) return 'No especificada'
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const calculateDaysRemaining = () => {
    if (!project.end_date) return null
    const today = new Date()
    const endDate = new Date(project.end_date)
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysRemaining = calculateDaysRemaining()

  return (
    <div className="space-y-6">
      {/* Header con información principal */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{project.name}</CardTitle>
              <CardDescription className="text-base">
                Código: {project.project_code}
              </CardDescription>
            </div>
            <Badge className={getStatusColor(project.status)}>
              {getStatusLabel(project.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.description && (
            <p className="text-gray-700">{project.description}</p>
          )}

          {/* Progreso */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progreso del Proyecto</span>
              <span className="text-sm font-bold text-talento-green">{project.progress_percentage}%</span>
            </div>
            <Progress value={project.progress_percentage} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Grid de información */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Fechas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fechas del Proyecto</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500">Inicio</p>
                <p className="text-sm font-medium">{formatDate(project.start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Fin Estimado</p>
                <p className="text-sm font-medium">{formatDate(project.end_date)}</p>
              </div>
              {daysRemaining !== null && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500">Días Restantes</p>
                  <p className={`text-sm font-bold ${daysRemaining < 30 ? 'text-red-600' : 'text-green-600'}`}>
                    {daysRemaining > 0 ? `${daysRemaining} días` : 'Vencido'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ubicación */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ubicación</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm">{project.address || 'No especificada'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Empresas involucradas */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Cliente */}
        {project.client_company && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {project.client_company.logo_url && (
                  <img
                    src={project.client_company.logo_url}
                    alt={project.client_company.name}
                    className="h-12 w-12 object-contain rounded"
                  />
                )}
                <div>
                  <p className="font-medium">{project.client_company.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contratista */}
        {project.contractor_company && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Contratista
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {project.contractor_company.logo_url && (
                  <img
                    src={project.contractor_company.logo_url}
                    alt={project.contractor_company.name}
                    className="h-12 w-12 object-contain rounded"
                  />
                )}
                <div>
                  <p className="font-medium">{project.contractor_company.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tipo de Interventoría */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tipo de Interventoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {project.intervention_types && project.intervention_types.length > 0 ? (
              project.intervention_types.map((type) => (
                <Badge key={type} variant="secondary">
                  {type === 'tecnica' ? 'Técnica' : 
                   type === 'administrativa' ? 'Administrativa' :
                   type === 'tecnica_administrativa' ? 'Técnica y Administrativa' : type}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-gray-500">No especificado</span>
            )}
          </div>
          {project.service_type && (
            <p className="text-sm text-gray-600 mt-2">
              Servicio: <span className="font-medium">{project.service_type}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
