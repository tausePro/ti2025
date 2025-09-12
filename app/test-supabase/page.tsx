'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestSupabasePage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()

  const testConnection = async () => {
    setLoading(true)
    setResult('Probando conexión...')
    
    try {
      // Test basic connection
      const { data, error } = await supabase.from('users').select('count').limit(1)
      
      if (error) {
        setResult(`Error de conexión: ${error.message}`)
      } else {
        setResult('✅ Conexión exitosa con Supabase')
      }
    } catch (err) {
      setResult(`❌ Error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const testAuth = async () => {
    setLoading(true)
    setResult('Probando autenticación...')
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@talentoinmobiliario.com',
        password: 'test123',
      })

      if (error) {
        setResult(`❌ Error de autenticación: ${error.message}`)
      } else if (data.user) {
        setResult(`✅ Login exitoso: ${data.user.email}`)
      } else {
        setResult('❌ No se recibió usuario')
      }
    } catch (err) {
      setResult(`❌ Error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const checkUser = async () => {
    setLoading(true)
    setResult('Verificando usuario actual...')
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        setResult(`❌ Error: ${error.message}`)
      } else if (user) {
        setResult(`✅ Usuario logueado: ${user.email}`)
      } else {
        setResult('❌ No hay usuario logueado')
      }
    } catch (err) {
      setResult(`❌ Error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Prueba de Conexión Supabase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={testConnection} disabled={loading}>
              Probar Conexión
            </Button>
            <Button onClick={testAuth} disabled={loading}>
              Probar Login
            </Button>
            <Button onClick={checkUser} disabled={loading}>
              Verificar Usuario
            </Button>
          </div>
          
          {result && (
            <div className="p-4 bg-gray-100 rounded-md">
              <pre className="whitespace-pre-wrap">{result}</pre>
            </div>
          )}
          
          <div className="text-sm text-gray-600">
            <p><strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
            <p><strong>Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
