'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Session } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

function ConfirmPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabaseRef = useRef(createClient())
  const sessionRef = useRef<Session | null>(null)

  useEffect(() => {
    const verifyToken = async () => {
      const supabase = supabaseRef.current
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      if (tokenHash && type) {
        console.log('🔑 Verificando token_hash...')
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'recovery' | 'email'
        })

        if (verifyError) {
          console.error('❌ Error verificando token:', verifyError)
          setError('El enlace ha expirado o no es válido. Solicita uno nuevo al administrador.')
          setVerifying(false)
          return
        }

        if (data?.session) {
          console.log('✅ Sesión establecida vía token_hash')
          sessionRef.current = data.session
          setSessionReady(true)
          setVerifying(false)
          return
        }
      }

      // Fallback: verificar si ya hay sesión activa
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.log('✅ Sesión ya activa')
        sessionRef.current = session
        setSessionReady(true)
      } else {
        console.log('❌ Sin sesión ni token válido')
        setError('No se pudo verificar tu identidad. Solicita un nuevo enlace al administrador.')
      }
      setVerifying(false)
    }

    verifyToken()
  }, [searchParams])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      const supabase = supabaseRef.current

      // Restaurar sesión guardada para garantizar que esté activa
      if (sessionRef.current) {
        console.log('🔄 Restaurando sesión antes de actualizar contraseña...')
        await supabase.auth.setSession({
          access_token: sessionRef.current.access_token,
          refresh_token: sessionRef.current.refresh_token
        })
      }

      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        console.error('❌ Error actualizando contraseña:', updateError)
        setError(updateError.message || 'No se pudo actualizar la contraseña')
        return
      }

      console.log('✅ Contraseña actualizada exitosamente')
      // Cerrar sesión para forzar login con nueva contraseña
      await supabase.auth.signOut()
      setSuccess('Contraseña creada correctamente. Redirigiendo al login...')
      setTimeout(() => {
        window.location.href = '/login'
      }, 1500)
    } catch (err: any) {
      console.error('❌ Error inesperado:', err)
      setError(err?.message || 'Error inesperado al crear contraseña')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-500" />
          <p className="text-gray-600">Verificando enlace...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Crear contraseña</CardTitle>
        <CardDescription className="text-center">
          Define tu contraseña para activar el acceso
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        {sessionReady && !success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full bg-talento-green hover:bg-talento-green/90" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Crear contraseña'
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export default function ConfirmPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Suspense fallback={
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-500" />
              <p className="text-gray-600">Cargando...</p>
            </CardContent>
          </Card>
        }>
          <ConfirmPasswordContent />
        </Suspense>
      </div>
    </div>
  )
}
