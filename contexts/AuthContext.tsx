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
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await loadUserProfile(session.user.id)
      }
      
      setLoading(false)
    }

    getInitialSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await loadUserProfile(session.user.id)
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Error loading user profile:', error)
        setProfile(null)
        return
      }
      
      setProfile(userProfile)

      // Cargar permisos del usuario
      if (userProfile?.role) {
        const { data: rolePermissions } = await supabase
          .from('role_permissions')
          .select('*')
          .eq('role', userProfile.role)
          .eq('allowed', true)
        
        setPermissions(rolePermissions || [])
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error)
      setProfile(null)
    }
  }

  const signOut = async () => {
    try {
      // Limpiar estado local primero
      setUser(null)
      setProfile(null)
      setPermissions([])
      
      // Luego hacer logout en Supabase
      await supabase.auth.signOut()
      
      // Limpiar localStorage y sessionStorage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      
      // Forzar recarga completa para limpiar cualquier estado residual
      window.location.href = '/login'
    } catch (error) {
      console.error('Error during signOut:', error)
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
