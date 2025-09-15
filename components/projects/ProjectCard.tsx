'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Building2, 
  MapPin, 
  Calendar, 
  DollarSign, 
  MoreVertical,
  Eye,
  Edit,
  Users,
  FileText,
  AlertCircle
} from 'lucide-react'
import { Project, ProjectMember } from '@/types'
import { ProjectStatusBadge } from './ProjectStatusBadge'
import { ProjectTeamAvatars } from './ProjectTeamAvatars'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ProjectCardProps {
  project: Project & {
    project_members?: ProjectMember[]
    project_documents?: { count: number }[]
    project_activities?: { count: number }[]
  }
  onEdit?: (project: Project) => void
  onAssignTeam?: (project: Project) => void
  onGenerateReport?: (project: Project) => void
  onViewFinancial?: (project: Project) => void
  onArchive?: (project: Project) => void
  onDuplicate?: (project: Project) => void
  showActions?: boolean
}

export function ProjectCard({ 
  project, 
  onEdit,
  onAssignTeam,
  onGenerateReport,
  onViewFinancial,
  onArchive,
  onDuplicate,
  showActions = true
}: ProjectCardProps) {
  const [imageError, setImageError] = useState(false)

  const getInterventionTypeText = (types: string[]) => {
    return types.map(type => {
      switch (type) {
        case 'supervision_tecnica':
          return 'Supervisión Técnica'
        case 'interventoria_administrativa':
          return 'Interventoría Administrativa'
        default:
          return type
      }
    }).join(', ')
  }

  const getInterventionIcons = (types: string[]) => {
    return types.map(type => {
      switch (type) {
        case 'supervision_tecnica':
          return <Building2 key={type} className="h-4 w-4 text-blue-600" />
        case 'interventoria_administrativa':
          return <DollarSign key={type} className="h-4 w-4 text-green-600" />
        default:
          return null
      }
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getDaysUntilDeadline = () => {
    if (!project.end_date) return null
    const today = new Date()
    const endDate = new Date(project.end_date)
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysUntilDeadline = getDaysUntilDeadline()
  const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0
  const isNearDeadline = daysUntilDeadline !== null && daysUntilDeadline <= 30 && daysUntilDeadline >= 0

  const members = project.project_members || []
  const documentsCount = project.project_documents?.[0]?.count || 0
  const activitiesCount = project.project_activities?.[0]?.count || 0

  return (
    <Card className="hover:shadow-lg transition-all duration-200 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {/* Logo del cliente */}
              {project.company?.logo_url && !imageError ? (
                <img
                  src={project.company.logo_url}
                  alt={project.company.name}
                  className="w-8 h-8 rounded object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-gray-500" />
                </div>
              )}
              
              {/* Estado */}
              <ProjectStatusBadge status={project.status} />
              
              {/* Alertas */}
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Vencido
                </Badge>
              )}
              {isNearDeadline && !isOverdue && (
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {daysUntilDeadline} días
                </Badge>
              )}
            </div>

            {/* Título y código */}
            <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
              {project.name}
            </h3>
            {project.project_code && (
              <p className="text-sm text-gray-500 font-mono">
                {project.project_code}
              </p>
            )}
          </div>

          {/* Menú de acciones */}
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/projects/${project.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver detalles
                  </Link>
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(project)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onAssignTeam && (
                  <DropdownMenuItem onClick={() => onAssignTeam(project)}>
                    <Users className="h-4 w-4 mr-2" />
                    Gestionar equipo
                  </DropdownMenuItem>
                )}
                {onGenerateReport && (
                  <DropdownMenuItem onClick={() => onGenerateReport(project)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Generar informe
                  </DropdownMenuItem>
                )}
                {onViewFinancial && project.intervention_type.includes('interventoria_administrativa') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onViewFinancial(project)}>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Ver financiero
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                {onDuplicate && (
                  <DropdownMenuItem onClick={() => onDuplicate(project)}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Duplicar proyecto
                  </DropdownMenuItem>
                )}
                {onArchive && (
                  <DropdownMenuItem 
                    onClick={() => onArchive(project)}
                    className="text-red-600"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Archivar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Cliente */}
        <div className="flex items-center text-sm text-gray-600">
          <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="line-clamp-1">{project.company?.name || 'Sin cliente'}</span>
        </div>

        {/* Dirección */}
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="line-clamp-1">{project.address}</span>
          {project.city && (
            <span className="text-gray-400 ml-1">• {project.city}</span>
          )}
        </div>

        {/* Tipos de intervención */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            {getInterventionIcons(project.intervention_type)}
          </div>
          <span className="line-clamp-1">
            {getInterventionTypeText(project.intervention_type)}
          </span>
        </div>

        {/* Fechas */}
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
          <div className="flex items-center gap-2">
            {project.start_date && (
              <span>Inicio: {formatDate(project.start_date)}</span>
            )}
            {project.end_date && (
              <>
                <span className="text-gray-400">•</span>
                <span>Fin: {formatDate(project.end_date)}</span>
              </>
            )}
          </div>
        </div>

        {/* Presupuesto */}
        {project.budget && (
          <div className="flex items-center text-sm text-gray-600">
            <DollarSign className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>
              Presupuesto: ${project.budget.toLocaleString('es-CO')}
            </span>
          </div>
        )}

        {/* Progreso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progreso</span>
            <span className="font-medium">{project.progress_percentage}%</span>
          </div>
          <Progress value={project.progress_percentage} className="h-2" />
        </div>

        {/* Equipo y estadísticas */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{members.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{documentsCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{activitiesCount}</span>
            </div>
          </div>
          
          <ProjectTeamAvatars
            members={members}
            maxVisible={3}
            size="sm"
            showAddButton={false}
          />
        </div>

        {/* Última actividad */}
        {project.last_activity_at && (
          <div className="text-xs text-gray-400 pt-2 border-t">
            Última actividad: {new Date(project.last_activity_at).toLocaleDateString('es-CO')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
