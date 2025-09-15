'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Users, Plus } from 'lucide-react'
import { ProjectMember } from '@/types'

interface ProjectTeamAvatarsProps {
  members: ProjectMember[]
  maxVisible?: number
  onAddMember?: () => void
  onMemberClick?: (member: ProjectMember) => void
  size?: 'sm' | 'md' | 'lg'
  showAddButton?: boolean
}

export function ProjectTeamAvatars({ 
  members, 
  maxVisible = 3, 
  onAddMember,
  onMemberClick,
  size = 'md',
  showAddButton = true
}: ProjectTeamAvatarsProps) {
  const visibleMembers = members.slice(0, maxVisible)
  const remainingCount = members.length - maxVisible

  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return {
          avatar: 'h-6 w-6',
          text: 'text-xs',
          button: 'h-6 w-6'
        }
      case 'md':
        return {
          avatar: 'h-8 w-8',
          text: 'text-sm',
          button: 'h-8 w-8'
        }
      case 'lg':
        return {
          avatar: 'h-10 w-10',
          text: 'text-base',
          button: 'h-10 w-10'
        }
    }
  }

  const sizeClasses = getSizeClasses(size)

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'supervisor':
        return 'bg-blue-500'
      case 'residente':
        return 'bg-green-500'
      case 'ayudante':
        return 'bg-yellow-500'
      case 'especialista':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="flex items-center -space-x-2">
      {visibleMembers.map((member) => (
        <TooltipProvider key={member.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`${sizeClasses.avatar} rounded-full p-0 hover:z-10 relative`}
                onClick={() => onMemberClick?.(member)}
              >
                <Avatar className={sizeClasses.avatar}>
                  <AvatarImage 
                    src={member.user?.avatar_url} 
                    alt={member.user?.full_name || 'Usuario'} 
                  />
                  <AvatarFallback className={`${sizeClasses.text} ${getRoleColor(member.role_in_project)} text-white`}>
                    {getInitials(member.user?.full_name || 'U')}
                  </AvatarFallback>
                </Avatar>
                {/* Indicador de rol */}
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getRoleColor(member.role_in_project)}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <p className="font-medium">{member.user?.full_name || 'Usuario'}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {member.role_in_project.replace('_', ' ')}
                </p>
                {member.notes && (
                  <p className="text-xs text-gray-400 mt-1">{member.notes}</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}

      {/* Contador de miembros restantes */}
      {remainingCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`${sizeClasses.avatar} rounded-full bg-gray-100 border-2 border-white flex items-center justify-center ${sizeClasses.text} text-gray-600 font-medium`}>
                +{remainingCount}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div>
                <p className="font-medium">Miembros adicionales</p>
                <p className="text-xs text-gray-500">
                  {members.slice(maxVisible).map(m => m.user?.full_name).join(', ')}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Botón para agregar miembro */}
      {showAddButton && onAddMember && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`${sizeClasses.button} rounded-full p-0 hover:z-10 bg-gray-100 hover:bg-gray-200`}
                onClick={onAddMember}
              >
                <Plus className="h-4 w-4 text-gray-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Agregar miembro al equipo</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Estado vacío */}
      {members.length === 0 && (
        <div className={`${sizeClasses.avatar} rounded-full bg-gray-100 border-2 border-white flex items-center justify-center ${sizeClasses.text} text-gray-400`}>
          <Users className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}
