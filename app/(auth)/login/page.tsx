'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { auth } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GlobalLogo } from '@/components/shared/GlobalLogo'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

// Esquema de validación
const loginSchema = z.object({
  email: z.string().email('Ingresa un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    setError('')

    try {
      const result = await auth.signIn(data.email, data.password)
      
      if (result.user) {
        console.log('Login exitoso, redirigiendo...')
        router.push('/dashboard')
      }
    } catch (error: any) {
      console.error('Error en login:', error)
      
      // Traducir errores comunes de Supabase al español
      let errorMessage = 'Error al iniciar sesión'
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Credenciales inválidas. Verifica tu email y contraseña.'
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Debes confirmar tu email antes de iniciar sesión.'
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = 'Demasiados intentos. Intenta de nuevo en unos minutos.'
      } else if (error.message?.includes('User not found')) {
        errorMessage = 'Usuario no encontrado en el sistema.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card>
          {/* Logo dentro del card */}
          <div className="text-center pt-8 pb-2">
            <img 
              src="/logo.png" 
              alt="Talento Inmobiliario" 
              className="h-40 w-40 mx-auto mb-3"
            />
            <h2 className="text-2xl font-bold text-gray-900">Talento Inmobiliario</h2>
            <p className="text-sm text-gray-600 mt-1">Supervisión Técnica</p>
          </div>

          <CardHeader className="space-y-1 pt-6 pb-4">
            <CardTitle className="text-2xl font-bold text-center">
              Iniciar Sesión
            </CardTitle>
            <CardDescription className="text-center">
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
        <CardContent className="px-6 pb-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                {...register('email')}
                disabled={loading}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={loading}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full bg-talento-green hover:bg-talento-green/90 text-white" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿No tienes cuenta?{' '}
              <Link href="/register" className="font-medium text-talento-green hover:text-talento-green/80">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  )
}
