'use client'

import { Badge } from '@/components/ui/badge'
import { ProjectStatus } from '@/types'

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  className?: string
}

export function ProjectStatusBadge({ status, className = '' }: ProjectStatusBadgeProps) {
  const getStatusConfig = (status: ProjectStatus) => {
    switch (status) {
      case 'planificacion':
        return {
          label: 'Planificación',
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          dotColor: 'bg-blue-500'
        }
      case 'activo':
        return {
          label: 'Activo',
          className: 'bg-green-100 text-green-800 border-green-200',
          dotColor: 'bg-green-500'
        }
      case 'pausado':
        return {
          label: 'Pausado',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          dotColor: 'bg-yellow-500'
        }
      case 'finalizado':
        return {
          label: 'Finalizado',
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          dotColor: 'bg-gray-500'
        }
      default:
        return {
          label: status,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          dotColor: 'bg-gray-500'
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <Badge 
      variant="outline" 
      className={`${config.className} ${className} flex items-center gap-1.5`}
    >
      <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
      {config.label}
    </Badge>
  )
}
