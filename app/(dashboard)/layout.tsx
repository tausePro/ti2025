'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
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
  X
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const { user, profile, hasPermission, signOut, loading } = useAuth()

  // DEBUG: Ver qué rol tiene el profile
  console.log('🔍 LAYOUT - Profile:', profile)
  console.log('🔍 LAYOUT - Role:', profile?.role)

  const handleSignOut = async () => {
    try {
      console.log('🚪 Layout - Iniciando logout...')
      await signOut()
      // El signOut ya maneja la redirección, no necesitamos hacerlo aquí
    } catch (error) {
      console.error('❌ Layout - Error en logout:', error)
      // Forzar redirección en caso de error
      window.location.href = '/login'
    }
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
    {
      name: 'Financiero',
      href: '/financial',
      icon: Calculator
    },
    ...(profile?.role && ['admin', 'super_admin'].includes(profile.role) ? [
      {
        name: 'Empresas',
        href: '/admin/companies',
        icon: Building
      }
    ] : []),
    ...(profile?.role && ['admin', 'super_admin', 'gerente', 'supervisor'].includes(profile.role) ? [
      {
        name: 'Usuarios',
        href: '/admin/users',
        icon: Users
      }
    ] : []),
    ...(profile?.role && ['admin', 'super_admin'].includes(profile.role) ? [
      {
        name: 'Configuración',
        href: '/admin/config',
        icon: Settings
      }
    ] : [])
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <GlobalLogo showText text="Talento Inmobiliario" context="dashboard" />
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-2">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="px-4 py-3 border-t">
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <Wifi className="h-4 w-4" />
              <span>Conectado</span>
            </div>
          </div>

          <div className="px-4 py-3 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{profile?.full_name || 'Usuario'}</p>
                <p className="text-xs text-gray-500">{profile?.role || 'admin'}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b">
            <GlobalLogo showText text="Talento Inmobiliario" context="dashboard" />
          </div>

          <nav className="flex-1 px-4 py-4 space-y-2">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="px-4 py-3 border-t">
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <Wifi className="h-4 w-4" />
              <span>Conectado</span>
            </div>
          </div>

          <div className="px-4 py-3 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{profile?.full_name || 'Usuario'}</p>
                <p className="text-xs text-gray-500">{profile?.role || 'admin'}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
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
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">{profile?.full_name || 'Usuario'}</span>
                <span className="text-xs text-gray-500">({profile?.role || 'admin'})</span>
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
  )
}
