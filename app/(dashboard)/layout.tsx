'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import { SessionWarningModal } from '@/components/auth/SessionWarningModal'
import { Button } from '@/components/ui/button'
import { GlobalLogo } from '@/components/shared/GlobalLogo'
import { 
  Home, 
  Building2, 
  FileText, 
  Building,
  Users,
  Settings,
  Menu,
  LogOut,
  Wifi,
  Calculator,
  X,
  User,
  FileType,
  ClipboardCheck
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isLoggingOut = useRef(false)
  const router = useRouter()
  const { user, profile, hasPermission, signOut, loading } = useAuth()

  // Sistema de logout por inactividad
  const { showWarning, timeRemaining, resetTimer } = useIdleTimeout({
    onIdle: async () => {
      console.log('⏰ Sesión expirada por inactividad')
      await signOut()
    },
    idleTime: 30 * 60 * 1000, // 30 minutos
    warningTime: 2 * 60 * 1000, // Advertencia 2 minutos antes
    onWarning: () => {
      console.log('⚠️ Advertencia: sesión por expirar')
    }
  })

  // Logout simplificado y directo
  const handleLogoutClick = () => {
    // Prevenir múltiples clicks
    if (isLoggingOut.current) {
      console.log('⚠️ Logout ya en progreso, ignorando click')
      return
    }
    
    console.log('🚪 Click en botón de logout')
    isLoggingOut.current = true
    
    // Logout inmediato y forzado - sin esperar a nada
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      })
    }
    
    // Llamar a signOut de Supabase pero NO esperar
    signOut().catch(() => {})
    
    // Redirigir inmediatamente
    window.location.href = '/login'
  }

  const visibleMenuItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home
    },
    {
      name: 'Proyectos',
      href: '/projects',
      icon: Building2
    },
    {
      name: 'Reportes',
      href: '/reports',
      icon: FileText
    },
    ...(hasPermission('control_calidad', 'read') ? [
      {
        name: 'Control de Calidad',
        href: '/quality-control',
        icon: ClipboardCheck
      }
    ] : []),
    ...(profile?.role && ['admin', 'super_admin', 'gerente'].includes(profile.role) ? [
      {
        name: 'Desembolsos',
        href: '/desembolsos',
        icon: Calculator
      }
    ] : []),
    ...(hasPermission('companies', 'read') ? [
      {
        name: 'Empresas',
        href: '/admin/companies',
        icon: Building
      }
    ] : []),
    ...(hasPermission('plantillas_pdf', 'read') ? [
      {
        name: 'Plantillas PDF',
        href: '/admin/report-templates',
        icon: FileType
      }
    ] : []),
    ...(profile?.role && ['admin', 'super_admin', 'gerente', 'supervisor'].includes(profile.role) ? [
      {
        name: 'Usuarios',
        href: '/admin/users',
        icon: Users
      }
    ] : []),
    {
      name: 'Mi Perfil',
      href: '/profile',
      icon: Settings
    }
  ]

  return (
    <>
      {/* Modal de advertencia de sesión */}
      <SessionWarningModal
        open={showWarning}
        timeRemaining={timeRemaining}
        onContinue={resetTimer}
      />

      <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white">
          <div className="relative flex h-24 items-center justify-center px-8 py-4 border-b">
            <img 
              src="/logo-ti.png" 
              alt="Talento Inmobiliario" 
              className="w-full h-auto object-contain"
            />
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)} className="absolute right-2 top-2">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 px-6 py-6 space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center px-4 py-3 text-base font-medium text-gray-700 rounded-lg hover:bg-talento-green/10 hover:text-talento-green transition-colors"
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="px-6 py-3 border-t">
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <Wifi className="h-4 w-4" />
              <span>Conectado</span>
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-talento-green/20 flex-shrink-0">
                {(profile as any)?.avatar_url ? (
                  <img
                    src={(profile as any).avatar_url}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name || 'Usuario'}</p>
                <p className="text-xs text-gray-500">{profile?.role || 'admin'}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogoutClick}
                disabled={isLoggingOut.current}
                className="flex-shrink-0"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4 text-gray-500 hover:text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-24 items-center justify-center px-8 py-4 border-b">
            <img 
              src="/logo-ti.png" 
              alt="Talento Inmobiliario" 
              className="w-full h-auto object-contain"
            />
          </div>

          <nav className="flex-1 px-6 py-6 space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center px-4 py-3 text-base font-medium text-gray-700 rounded-lg hover:bg-talento-green/10 hover:text-talento-green transition-colors"
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="px-6 py-3 border-t">
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <Wifi className="h-4 w-4" />
              <span>Conectado</span>
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-talento-green/20 flex-shrink-0">
                {(profile as any)?.avatar_url ? (
                  <img
                    src={(profile as any).avatar_url}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name || 'Usuario'}</p>
                <p className="text-xs text-gray-500">{profile?.role || 'admin'}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogoutClick}
                disabled={isLoggingOut.current}
                className="flex-shrink-0"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4 text-gray-500 hover:text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{profile?.full_name || 'Usuario'}</p>
                  <p className="text-xs text-gray-500">{profile?.role || 'admin'}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-talento-green/20">
                  {(profile as any)?.avatar_url ? (
                    <img
                      src={(profile as any).avatar_url}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
    </>
  )
}
