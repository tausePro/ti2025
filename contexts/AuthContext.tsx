'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
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
  const isLoggingOut = useRef(false)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        console.log('🚀 Inicializando contexto de autenticación...')
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error obteniendo sesión:', error)
          if (mounted) {
            setLoading(false)
          }
          return
        }

        console.log('📱 Sesión inicial:', session ? 'Encontrada' : 'No encontrada')
        
        if (!mounted) return

        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('👤 Usuario encontrado:', session.user.email)
          
          // Intentar cargar perfil desde localStorage primero
          if (typeof window !== 'undefined') {
            const cachedProfile = localStorage.getItem('user_profile')
            const cachedPermissions = localStorage.getItem('user_permissions')
            
            if (cachedProfile) {
              try {
                const parsedProfile = JSON.parse(cachedProfile)
                if (parsedProfile.id === session.user.id) {
                  console.log('📦 Perfil cargado desde localStorage')
                  setProfile(parsedProfile)
                  
                  // Cargar permisos desde cache también
                  if (cachedPermissions) {
                    const parsedPermissions = JSON.parse(cachedPermissions)
                    console.log('📦 Permisos cargados desde localStorage')
                    setPermissions(parsedPermissions)
                  }
                }
              } catch (e) {
                console.error('Error parsing cached data:', e)
              }
            }
          }
          
          // Cargar perfil desde BD (esto actualizará el cache)
          await loadUserProfile(session.user.id)
        } else {
          console.log('❌ No hay usuario en la sesión')
          setProfile(null)
          setPermissions([])
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user_profile')
            localStorage.removeItem('user_permissions')
          }
        }
        
        if (mounted) {
          setLoading(false)
        }
      } catch (error) {
        console.error('❌ Error en getInitialSession:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        if (!mounted) return

        console.log('🔄 Evento de auth:', event)
        
        // Ignorar TODOS los eventos durante logout
        if (isLoggingOut.current) {
          console.log('🚪 Ignorando evento durante logout:', event)
          return
        }
        
        // Manejar TOKEN_REFRESHED - sesión renovada
        if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token renovado exitosamente')
          if (session?.user) {
            setUser(session.user)
            // Recargar perfil si cambió
            await loadUserProfile(session.user.id)
          }
          return
        }
        
        // Manejar SIGNED_OUT explícitamente
        if (event === 'SIGNED_OUT') {
          console.log('👋 Usuario cerró sesión')
          setUser(null)
          setProfile(null)
          setPermissions([])
          // Limpiar localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user_profile')
            localStorage.removeItem('user_permissions')
          }
          // Solo redirigir si no estamos en login
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login'
          }
          return
        }
        
        // Solo procesar SIGNED_IN e INITIAL_SESSION
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          if (session?.user) {
            console.log('👤 Usuario autenticado:', session.user.email)
            setUser(session.user)
            await loadUserProfile(session.user.id)
          }
        }
        
        if (mounted) {
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('🔄 Cargando perfil para usuario:', userId)
      console.log('🔍 DEBUG - Timestamp de carga:', new Date().toISOString())
      
      // Prevenir recarga si ya tenemos el perfil del mismo usuario
      if (profile?.id === userId) {
        console.log('✅ Perfil ya cargado para este usuario, omitiendo recarga')
        return
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
      
      // Guardar perfil en localStorage para persistencia
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_profile', JSON.stringify(userProfile))
      }

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
          
          // Guardar permisos en localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('user_permissions', JSON.stringify(rolePermissions || []))
          }
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
      
      // Marcar que estamos haciendo logout
      isLoggingOut.current = true

      // Hacer logout en Supabase primero
      const { error: logoutError } = await supabase.auth.signOut({
        scope: 'global'
      })

      if (logoutError) {
        console.error('❌ Error en logout de Supabase:', logoutError)
      } else {
        console.log('✅ Logout de Supabase exitoso')
      }

      // Limpiar estado local
      setUser(null)
      setProfile(null)
      setPermissions([])

      // Limpiar storage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
        
        // Limpiar cookies
        document.cookie.split(";").forEach(function(c) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        })
      }

      // Redirigir inmediatamente
      console.log('🔄 Redirigiendo a login...')
      
      // Pequeño delay para asegurar que se limpió todo
      setTimeout(() => {
        window.location.href = '/login'
      }, 100)

    } catch (error) {
      console.error('❌ Error during signOut:', error)

      // Forzar logout incluso si hay error
      setUser(null)
      setProfile(null)
      setPermissions([])

      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
        document.cookie.split(";").forEach(function(c) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        })
      }

      // Forzar redirección
      window.location.href = '/login'
    }
  }

  const hasPermission = (module: string, action: string): boolean => {
    console.log('🔍 hasPermission llamado:', { 
      module, 
      action, 
      profileRole: profile?.role,
      profileExists: !!profile,
      permissionsCount: permissions?.length || 0
    })
    
    // Admin y super_admin tienen todos los permisos
    if (profile?.role === 'admin' || profile?.role === 'super_admin') {
      console.log('✅ Acceso concedido por rol admin/super_admin')
      return true
    }
    
    // Si no hay permisos cargados, denegar acceso
    if (!permissions || permissions.length === 0) {
      console.log('⚠️ No hay permisos cargados para verificar')
      return false
    }
    
    const hasAccess = permissions.some(p => 
      p.module === module && 
      p.action === action && 
      p.allowed
    )
    
    console.log('🔍 Resultado verificación:', { 
      hasAccess,
      permissionsChecked: permissions.filter(p => p.module === module)
    })
    
    return hasAccess
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
