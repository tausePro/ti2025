'use client'

import { useGlobalLogo } from '@/hooks/useGlobalLogo'
import { Building2 } from 'lucide-react'

interface GlobalLogoProps {
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  showText?: boolean
  text?: string
  customSize?: string // Para tamaños personalizados como "h-10 w-10"
  context?: 'dashboard' | 'login' // Contexto específico para usar el tamaño configurado
}

export function GlobalLogo({ 
  className = '', 
  size = 'md', 
  showText = false, 
  text = 'Mi Empresa',
  customSize,
  context
}: GlobalLogoProps) {
  const { logoUrl, logoSizeDashboard, logoSizeLogin, loading } = useGlobalLogo()

  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
    '2xl': 'h-20 w-20'
  }

  // Determinar el tamaño a usar
  let finalSize = size
  if (context === 'dashboard') {
    finalSize = logoSizeDashboard as any
  } else if (context === 'login') {
    finalSize = logoSizeLogin as any
  }
  
  const logoSize = customSize || sizeClasses[finalSize]

  if (loading) {
    return (
      <div className={`${logoSize} ${className} animate-pulse bg-gray-200 rounded`} />
    )
  }

  if (logoUrl) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <img
          src={logoUrl}
          alt="Logo"
          className={`${logoSize} object-contain`}
        />
        {showText && (
          <span className="font-semibold text-gray-900">{text}</span>
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`${logoSize} bg-gray-200 rounded flex items-center justify-center`}>
        <Building2 className="h-4 w-4 text-gray-500" />
      </div>
      {showText && (
        <span className="font-semibold text-gray-900">{text}</span>
      )}
    </div>
  )
}
