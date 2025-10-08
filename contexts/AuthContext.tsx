'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { User } from '@/types'

interface AuthContextType {
  user: SupabaseUser | null
  profile: User | null
  loading: boolean
  signOut: () => Promise<void>
  hasPermission: (module: string, action: string) => boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [permissions, setPermissions] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Obtener sesión inicial
    const getInitialSession = async () => {
      console.log('🚀 Inicializando contexto de autenticación...')
      
      const { data: { session } } = await supabase.auth.getSession()
      console.log('📱 Sesión inicial:', session ? 'Encontrada' : 'No encontrada')
      
      setUser(session?.user ?? null)
      
      if (session?.user) {
        console.log('👤 Usuario encontrado:', session.user.email)
        await loadUserProfile(session.user.id)
      } else {
        console.log('❌ No hay usuario en la sesión')
      }
      
      setLoading(false)
    }

    getInitialSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        console.log('🔄 Cambio de autenticación:', event, session ? 'Con sesión' : 'Sin sesión')
        
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('👤 Usuario en cambio de estado:', session.user.email)
          await loadUserProfile(session.user.id)
        } else {
          console.log('❌ Limpiando perfil (sin sesión)')
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('🔄 Cargando perfil para usuario:', userId)
      console.log('🔍 DEBUG - Timestamp de carga:', new Date().toISOString())

      // Verificar si el usuario existe en auth.users primero
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
      console.log('🔍 DEBUG - Usuario en auth.users:', authUser ? 'Encontrado' : 'No encontrado')
      if (authError) {
        console.log('🔍 DEBUG - Error auth.users:', authError.message)
      }

      // Cargar perfil (SIN modificarlo)
      console.log('🔍 DEBUG - Cargando perfil desde BD...')
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('❌ Error loading user profile:', error)
        console.error('❌ Detalles del error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        setProfile(null)
        return
      }

      console.log('✅ Perfil cargado:', {
        id: userProfile.id,
        email: userProfile.email,
        role: userProfile.role,
        full_name: userProfile.full_name,
        created_at: userProfile.created_at,
        updated_at: userProfile.updated_at
      })

      // DEBUG: Verificar si el rol cambió
      console.log('🔍 DEBUG - Rol actual:', userProfile.role)
      console.log('🔍 DEBUG - ¿Es super_admin?', userProfile.role === 'super_admin')

      setProfile(userProfile)

      // Cargar permisos del usuario
      if (userProfile?.role) {
        console.log('🔐 Cargando permisos para rol:', userProfile.role)

        const { data: rolePermissions, error: permError } = await supabase
          .from('role_permissions')
          .select('*')
          .eq('role', userProfile.role)
          .eq('allowed', true)

        if (permError) {
          console.error('❌ Error cargando permisos:', permError)
          console.log('🔍 DEBUG - Error en permisos, aplicando permisos por defecto para rol:', userProfile.role)

          // Si hay error cargando permisos, dar permisos básicos según el rol
          if (userProfile.role === 'super_admin') {
            console.log('🔍 DEBUG - Aplicando permisos por defecto de super_admin')
            const defaultPermissions = [
              { role: 'super_admin', module: 'projects', action: 'create', allowed: true },
              { role: 'super_admin', module: 'projects', action: 'read', allowed: true },
              { role: 'super_admin', module: 'projects', action: 'update', allowed: true },
              { role: 'super_admin', module: 'projects', action: 'delete', allowed: true },
              { role: 'super_admin', module: 'reports', action: 'create', allowed: true },
              { role: 'super_admin', module: 'reports', action: 'read', allowed: true },
              { role: 'super_admin', module: 'companies', action: 'create', allowed: true },
              { role: 'super_admin', module: 'companies', action: 'read', allowed: true },
              { role: 'super_admin', module: 'users', action: 'create', allowed: true },
              { role: 'super_admin', module: 'users', action: 'read', allowed: true },
              { role: 'super_admin', module: 'bitacora', action: 'create', allowed: true },
              { role: 'super_admin', module: 'bitacora', action: 'read', allowed: true },
              { role: 'super_admin', module: 'financial', action: 'create', allowed: true },
              { role: 'super_admin', module: 'financial', action: 'read', allowed: true }
            ]
            console.log('🔍 DEBUG - Permisos por defecto aplicados:', defaultPermissions.length)
            setPermissions(defaultPermissions)
          } else {
            console.log('🔍 DEBUG - Aplicando permisos vacíos para rol:', userProfile.role)
            setPermissions([])
          }
        } else {
          console.log('📋 Permisos cargados desde BD:', rolePermissions?.length || 0)
          console.log('🔍 DEBUG - Permisos obtenidos:', rolePermissions)
          setPermissions(rolePermissions || [])
        }
      } else {
        console.log('🔍 DEBUG - No hay rol definido, no se cargan permisos')
      }
    } catch (error) {
      console.error('❌ Error in loadUserProfile:', error)
      setProfile(null)
    }
  }

  const signOut = async () => {
    try {
      console.log('🚪 Iniciando logout...')
      console.log('🔍 DEBUG - Estado actual antes del logout:', {
        user: user?.email,
        profile: profile?.email,
        profileRole: profile?.role,
        permissionsCount: permissions.length
      })

      // Limpiar estado local primero
      console.log('🧹 Limpiando estado local...')
      setUser(null)
      setProfile(null)
      setPermissions([])

      // Verificar estado después de limpiar
      console.log('🔍 DEBUG - Estado después de limpiar local:', {
        user: null,
        profile: null,
        permissions: []
      })

      // Hacer logout en Supabase con todas las opciones
      console.log('🔐 Iniciando logout de Supabase...')
      const { error: logoutError } = await supabase.auth.signOut({
        scope: 'global'
      })

      if (logoutError) {
        console.error('❌ Error en logout de Supabase:', logoutError)
        console.error('❌ Detalles del error:', {
          message: logoutError.message,
          status: logoutError.status
        })
      } else {
        console.log('✅ Logout de Supabase exitoso')
      }

      // Limpiar todas las cookies relacionadas con Supabase
      if (typeof window !== 'undefined') {
        console.log('🧹 Limpiando storage y cookies...')

        // Limpiar localStorage y sessionStorage
        const localStorageKeys = Object.keys(localStorage)
        const sessionStorageKeys = Object.keys(sessionStorage)
        console.log('🔍 DEBUG - Keys en localStorage:', localStorageKeys)
        console.log('🔍 DEBUG - Keys en sessionStorage:', sessionStorageKeys)

        localStorage.clear()
        sessionStorage.clear()

        // Limpiar cookies específicas de Supabase
        const cookies = document.cookie.split(";")
        console.log('🔍 DEBUG - Cookies antes de limpiar:', cookies)
        document.cookie.split(";").forEach(function(c) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        })

        console.log('🧹 Storage y cookies limpiados')
      }

      // Esperar un momento antes de redirigir
      setTimeout(() => {
        console.log('🔄 Redirigiendo a login...')
        console.log('🔍 DEBUG - URL actual:', window.location.href)
        // Forzar recarga completa
        window.location.replace('/login')
      }, 500)

    } catch (error) {
      console.error('❌ Error during signOut:', error)
      console.log('🔍 DEBUG - Error en signOut, forzando logout manual...')

      // Forzar logout incluso si hay error
      setUser(null)
      setProfile(null)
      setPermissions([])

      if (typeof window !== 'undefined') {
        console.log('🧹 Forzando limpieza de storage...')
        localStorage.clear()
        sessionStorage.clear()
        // Limpiar cookies
        document.cookie.split(";").forEach(function(c) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        })
      }

      // Forzar redirección
      console.log('🔄 Forzando redirección a login...')
      window.location.replace('/login')
    }
  }

  const hasPermission = (module: string, action: string): boolean => {
    return permissions.some(p => 
      p.module === module && 
      p.action === action && 
      p.allowed
    )
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
