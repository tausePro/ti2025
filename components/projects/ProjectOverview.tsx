'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  Users,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  Pencil,
  Check,
  X,
  Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

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

const PROGRESS_EDIT_ROLES = ['admin', 'super_admin', 'gerente', 'supervisor', 'residente']

export function ProjectOverview({ project }: ProjectOverviewProps) {
  const { profile } = useAuth()
  const supabase = createClient()
  const [progress, setProgress] = useState<number>(project.progress_percentage ?? 0)
  const [editingProgress, setEditingProgress] = useState(false)
  const [progressInput, setProgressInput] = useState<string>(String(project.progress_percentage ?? 0))
  const [savingProgress, setSavingProgress] = useState(false)

  const canEditProgress = !!profile?.role && PROGRESS_EDIT_ROLES.includes(profile.role)

  const handleSaveProgress = async () => {
    const value = Number(progressInput)
    if (Number.isNaN(value) || value < 0 || value > 100) {
      toast.error('El avance debe ser un número entre 0 y 100')
      return
    }

    setSavingProgress(true)
    try {
      const { error } = await supabase.rpc('update_project_progress', {
        p_project_id: project.id,
        p_percentage: Math.round(value)
      })

      if (error) throw error

      setProgress(Math.round(value))
      setEditingProgress(false)
      toast.success('Avance de obra actualizado')
    } catch (error: unknown) {
      console.error('Error updating progress:', error)
      const message = error instanceof Error ? error.message : 'Error al actualizar el avance'
      toast.error(message)
    } finally {
      setSavingProgress(false)
    }
  }

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
              {editingProgress ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={progressInput}
                    onChange={(e) => setProgressInput(e.target.value)}
                    className="h-8 w-20 text-right"
                    disabled={savingProgress}
                    autoFocus
                  />
                  <span className="text-sm text-gray-500">%</span>
                  <Button
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleSaveProgress}
                    disabled={savingProgress}
                  >
                    {savingProgress ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditingProgress(false)
                      setProgressInput(String(progress))
                    }}
                    disabled={savingProgress}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-talento-green">{progress}%</span>
                  {canEditProgress && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setProgressInput(String(progress))
                        setEditingProgress(true)
                      }}
                      title="Actualizar avance de obra"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            <Progress value={progress} className="h-3" />
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
