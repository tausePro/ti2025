'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { SimplePaymentOrderForm } from '@/components/financial/SimplePaymentOrderForm'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  project_code: string
}

export default function NewPaymentOrderSimplePage() {
  const params = useParams()
  const router = useRouter()
  const { user, profile } = useAuth()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    // Verificar permisos
    if (profile && !['admin', 'super_admin', 'gerente', 'supervisor'].includes(profile.role)) {
      router.push('/projects')
      return
    }

    if (params.id) {
      loadProject()
    }
  }, [params.id, profile, router])

  async function loadProject() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, project_code')
        .eq('id', params.id)
        .single()

      if (error) throw error
      
      setProject({
        id: data.id,
        name: data.name,
        project_code: data.project_code || 'N/A'
      })
    } catch (error: any) {
      console.error('Error loading project:', error)
      setError(error.message || 'Error al cargar proyecto')
    }
  }

  async function handleSubmit(data: any) {
    if (!user) {
      setError('Usuario no autenticado')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Crear orden de pago
      const { data: order, error: orderError } = await supabase
        .from('payment_orders')
        .insert({
          project_id: params.id,
          order_number: data.order_number,
          order_date: data.order_date,
          amount: data.amount,
          concept: data.concept,
          beneficiary_name: data.beneficiary_name,
          construction_act_reference: data.construction_act_reference,
          status: data.status,
          created_by: user.id,
          description: data.concept // Usar concepto como descripción
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Redirigir a la lista de órdenes
      router.push(`/projects/${params.id}/financial`)
    } catch (error: any) {
      console.error('Error creating payment order:', error)
      setError(error.message || 'Error al registrar la orden de pago')
      throw error
    } finally {
      setLoading(false)
    }
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-talento-green"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/projects/${params.id}/financial`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registrar Orden de Pago</h1>
          <p className="text-gray-600">{project.name} - {project.project_code}</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <SimplePaymentOrderForm
        projectId={params.id as string}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/projects/${params.id}/financial`)}
        loading={loading}
      />
    </div>
  )
}
