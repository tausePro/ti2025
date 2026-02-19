'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const searchParams = useSearchParams()

  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const hasToken = !!(tokenHash && type)

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
      // TODO server-side: verificar token + actualizar contraseña (el browser NUNCA toca sesión de Supabase)
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_hash: tokenHash,
          type,
          password
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ Error actualizando contraseña:', result.error)
        setError(result.error || 'No se pudo actualizar la contraseña')
        return
      }

      console.log('✅ Contraseña creada exitosamente')
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

  if (!hasToken) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-600">Enlace inválido. Solicita uno nuevo al administrador.</p>
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
        {!success && (
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
