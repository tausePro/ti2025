'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { FiduciaryInfoForm } from '@/components/projects/FiduciaryInfoForm'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Project {
  id: string
  name: string
  code: string
}

export default function FinancialSetupPage() {
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
        .select('id, name, code')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setProject(data)
    } catch (error) {
      console.error('Error loading project:', error)
      setError('Error al cargar el proyecto')
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
      // Crear cuentas fiduciarias
      if (data.accounts && data.accounts.length > 0) {
        const accountsToInsert = data.accounts.map((acc: any) => ({
          project_id: params.id,
          sifi_code: acc.sifi_code,
          account_name: acc.account_name,
          bank_name: acc.bank_name,
          account_number: acc.account_number,
          initial_balance: acc.initial_balance,
          current_balance: acc.initial_balance,
          is_active: true,
          created_by: user.id
        }))

        const { error: accountsError } = await supabase
          .from('fiduciary_accounts')
          .insert(accountsToInsert)

        if (accountsError) throw accountsError
      }

      // Crear configuración financiera
      if (data.financial_config) {
        const config = data.financial_config
        const { error: configError } = await supabase
          .from('project_financial_config')
          .insert({
            project_id: params.id,
            requires_construction_acts: config.control_type === 'construction_acts',
            requires_legalizations: config.control_type === 'legalizations',
            approval_flow: config.approval_flow,
            budget_alerts: config.budget_alerts,
            max_approval_amount: config.max_approval_amount,
            requires_client_approval: config.requires_client_approval,
            auto_approve_under: config.auto_approve_under,
            created_by: user.id
          })

        if (configError) throw configError
      }

      // Redirigir a la página financiera del proyecto
      router.push(`/projects/${params.id}/financial`)
    } catch (error: any) {
      console.error('Error setting up financial:', error)
      setError(error.message || 'Error al configurar interventoría financiera')
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    router.push(`/projects/${params.id}/financial`)
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
          <h1 className="text-2xl font-bold text-gray-900">Configurar Interventoría Financiera</h1>
          <p className="text-gray-600">{project.name} - {project.code}</p>
        </div>
      </div>

      {/* Info */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Configure las cuentas fiduciarias (SIFI) y el flujo de aprobación para este proyecto.
          Esta configuración es necesaria para gestionar órdenes de pago y control presupuestal.
        </AlertDescription>
      </Alert>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración SIFI</CardTitle>
          <CardDescription>
            Complete la información de las cuentas fiduciarias y la configuración financiera
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FiduciaryInfoForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
