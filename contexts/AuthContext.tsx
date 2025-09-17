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
      async (event, session) => {
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
      
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('❌ Error loading user profile:', error)
        setProfile(null)
        return
      }
      
      console.log('✅ Perfil cargado:', {
        id: userProfile.id,
        email: userProfile.email,
        role: userProfile.role,
        full_name: userProfile.full_name
      })
      
      setProfile(userProfile)

      // Cargar permisos del usuario
      if (userProfile?.role) {
        console.log('🔐 Cargando permisos para rol:', userProfile.role)
        
        const { data: rolePermissions } = await supabase
          .from('role_permissions')
          .select('*')
          .eq('role', userProfile.role)
          .eq('allowed', true)
        
        console.log('📋 Permisos cargados:', rolePermissions?.length || 0)
        setPermissions(rolePermissions || [])
      }
    } catch (error) {
      console.error('❌ Error in loadUserProfile:', error)
      setProfile(null)
    }
  }

  const signOut = async () => {
    try {
      console.log('🚪 Iniciando logout...')
      
      // Limpiar estado local primero
      setUser(null)
      setProfile(null)
      setPermissions([])
      
      // Hacer logout en Supabase
      const { error: logoutError } = await supabase.auth.signOut()
      
      if (logoutError) {
        console.error('❌ Error en logout de Supabase:', logoutError)
      } else {
        console.log('✅ Logout de Supabase exitoso')
      }
      
      // Limpiar localStorage y sessionStorage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
        console.log('🧹 Storage limpiado')
      }
      
      // Forzar recarga completa para limpiar cualquier estado residual
      console.log('🔄 Redirigiendo a login...')
      window.location.href = '/login'
    } catch (error) {
      console.error('❌ Error during signOut:', error)
      // Forzar logout incluso si hay error
      setUser(null)
      setProfile(null)
      setPermissions([])
      
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      
      window.location.href = '/login'
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
