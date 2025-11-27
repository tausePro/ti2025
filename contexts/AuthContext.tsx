'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User as SupabaseUser, Session } from '@supabase/supabase-js'
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

// Cliente Supabase singleton para evitar recreaciones
let supabaseClient: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient()
  }
  return supabaseClient
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [permissions, setPermissions] = useState<any[]>([])
  const isLoggingOut = useRef(false)
  const profileLoadedRef = useRef<string | null>(null)

  useEffect(() => {
    const supabase = getSupabase()
    let mounted = true

    // Función para cargar perfil
    const loadUserProfile = async (userId: string) => {
      if (profileLoadedRef.current === userId) {
        console.log('✅ Perfil ya cargado, omitiendo')
        return
      }

      try {
        console.log('🔄 Cargando perfil para:', userId)

        const { data: userProfile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) {
          console.error('❌ Error loading profile:', error)
          return
        }

        if (!mounted) return

        console.log('✅ Perfil cargado:', userProfile.email, 'Rol:', userProfile.role)
        
        setProfile(userProfile)
        profileLoadedRef.current = userId

        // Cache en localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_profile', JSON.stringify(userProfile))
        }

        // Cargar permisos
        if (userProfile?.role) {
          const { data: rolePermissions, error: permError } = await supabase
            .from('role_permissions')
            .select('*')
            .eq('role', userProfile.role)
            .eq('allowed', true)

          if (!permError && rolePermissions && mounted) {
            setPermissions(rolePermissions)
            if (typeof window !== 'undefined') {
              localStorage.setItem('user_permissions', JSON.stringify(rolePermissions))
            }
          } else if ((userProfile.role === 'super_admin' || userProfile.role === 'admin') && mounted) {
            const defaultPermissions = [
              { module: 'projects', action: 'create', allowed: true },
              { module: 'projects', action: 'read', allowed: true },
              { module: 'projects', action: 'update', allowed: true },
              { module: 'projects', action: 'delete', allowed: true },
              { module: 'reports', action: 'create', allowed: true },
              { module: 'reports', action: 'read', allowed: true },
              { module: 'companies', action: 'create', allowed: true },
              { module: 'companies', action: 'read', allowed: true },
              { module: 'users', action: 'create', allowed: true },
              { module: 'users', action: 'read', allowed: true },
            ]
            setPermissions(defaultPermissions)
          }
        }
      } catch (error) {
        console.error('❌ Error in loadUserProfile:', error)
      }
    }

    // Función para manejar sesión
    const handleSession = async (session: Session | null) => {
      if (!mounted) return

      if (session?.user) {
        console.log('👤 Sesión activa:', session.user.email)
        setUser(session.user)

        // Cargar desde cache primero
        if (typeof window !== 'undefined') {
          const cachedProfile = localStorage.getItem('user_profile')
          if (cachedProfile) {
            try {
              const parsed = JSON.parse(cachedProfile)
              if (parsed.id === session.user.id) {
                console.log('📦 Usando perfil desde cache')
                setProfile(parsed)
                profileLoadedRef.current = session.user.id
                const cachedPerms = localStorage.getItem('user_permissions')
                if (cachedPerms) setPermissions(JSON.parse(cachedPerms))
              }
            } catch (e) {
              console.error('Error parsing cache:', e)
            }
          }
        }

        // Cargar perfil fresco desde BD
        await loadUserProfile(session.user.id)
      } else {
        console.log('❌ Sin sesión activa')
        setUser(null)
        setProfile(null)
        setPermissions([])
        profileLoadedRef.current = null
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user_profile')
          localStorage.removeItem('user_permissions')
        }
      }

      if (mounted) {
        setLoading(false)
      }
    }

    // Inicializar
    const initializeAuth = async () => {
      try {
        console.log('🚀 Inicializando autenticación...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error obteniendo sesión:', error)
          if (mounted) setLoading(false)
          return
        }

        await handleSession(session)
      } catch (error) {
        console.error('❌ Error en initializeAuth:', error)
        if (mounted) setLoading(false)
      }
    }

    initializeAuth()

    // Listener de cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        console.log('🔄 Auth event:', event)

        if (isLoggingOut.current) {
          console.log('🚪 Ignorando evento durante logout')
          return
        }

        switch (event) {
          case 'SIGNED_IN':
            console.log('✅ Usuario inició sesión')
            await handleSession(session)
            break

          case 'SIGNED_OUT':
            console.log('👋 Usuario cerró sesión')
            setUser(null)
            setProfile(null)
            setPermissions([])
            profileLoadedRef.current = null
            if (typeof window !== 'undefined') {
              localStorage.removeItem('user_profile')
              localStorage.removeItem('user_permissions')
              if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login'
              }
            }
            break

          case 'TOKEN_REFRESHED':
            console.log('🔄 Token renovado')
            if (session?.user) {
              setUser(session.user)
            }
            break

          case 'USER_UPDATED':
            console.log('👤 Usuario actualizado')
            if (session?.user) {
              setUser(session.user)
              profileLoadedRef.current = null
              await loadUserProfile(session.user.id)
            }
            break

          default:
            break
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // Sin dependencias - solo se ejecuta una vez

  // Función de logout robusta
  const signOut = async () => {
    // Prevenir múltiples llamadas
    if (isLoggingOut.current) {
      console.log('⚠️ Logout ya en progreso, ignorando')
      return
    }

    console.log('🚪 Iniciando logout...')
    isLoggingOut.current = true

    const supabase = getSupabase()

    try {
      // 1. Primero hacer logout en Supabase
      await supabase.auth.signOut()
      console.log('✅ Supabase signOut completado')
    } catch (error) {
      console.error('❌ Error en Supabase signOut:', error)
    }

    // 2. Limpiar estado local (después del signOut de Supabase)
    setUser(null)
    setProfile(null)
    setPermissions([])
    profileLoadedRef.current = null

    // 3. Limpiar localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_profile')
      localStorage.removeItem('user_permissions')
    }

    // 4. Redirigir a login (siempre, incluso si hubo error)
    console.log('🔄 Redirigiendo a login...')
    if (typeof window !== 'undefined') {
      window.location.replace('/login')
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
