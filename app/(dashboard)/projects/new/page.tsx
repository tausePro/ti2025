'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ProjectFormWithFinancial } from '@/components/projects/ProjectFormWithFinancial'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type ProjectFormData = {
  name: string
  client_company_id: string
  address: string
  city: string
  start_date?: string
  end_date?: string
  intervention_types: (
    'sti_continua' | 
    'sti_itinerante' | 
    'interventoria_desembolsos' | 
    'interventoria' | 
    'interventoria_itinerante' | 
    'otro'
  )[]
  intervention_types_other?: string
  budget?: number
  description?: string
  enable_financial_intervention?: boolean
  fiduciary_data?: {
    accounts: Array<{
      sifi_code: '1' | '2'
      account_name: string
      bank_name: string
      account_number: string
      initial_balance: number
    }>
    financial_config: {
      control_type: 'construction_acts' | 'legalizations'
      approval_flow: string[]
      budget_alerts: number[]
      max_approval_amount?: number
      requires_client_approval: boolean
      auto_approve_under: number
    }
  }
}

export default function NewProjectPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const handleSubmit = async (data: ProjectFormData) => {
    if (!user) {
      setError('Usuario no autenticado')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Crear el proyecto
      const projectData = {
        name: data.name,
        client_company_id: data.client_company_id,
        address: data.address,
        intervention_types: data.intervention_types,
        intervention_types_other: data.intervention_types_other,
        status: 'planificacion' as const,
        custom_fields_config: {
          city: data.city,
          description: data.description,
          budget: data.budget,
          start_date: data.start_date,
          end_date: data.end_date
        },
        created_by: user.id
      }

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single()

      if (projectError) throw projectError

      // Asignar automáticamente al usuario creador como miembro del equipo
      const { error: teamError } = await supabase
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: user.id,
          role_in_project: 'supervisor', // Rol por defecto para el creador
          assigned_by: user.id,
          is_active: true
        })

      if (teamError) {
        console.warn('Error asignando usuario al equipo:', teamError)
        // No fallar por esto, solo advertir
      }

      // Si se habilitó interventoría financiera y hay datos fiduciarios, crearlos
      if (data.enable_financial_intervention && data.fiduciary_data) {
        try {
          // Crear cuentas fiduciarias
          if (data.fiduciary_data.accounts && data.fiduciary_data.accounts.length > 0) {
            const accountsToInsert = data.fiduciary_data.accounts.map(acc => ({
              project_id: project.id,
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
          if (data.fiduciary_data.financial_config) {
            const config = data.fiduciary_data.financial_config
            const { error: configError } = await supabase
              .from('project_financial_config')
              .insert({
                project_id: project.id,
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
        } catch (fiduciaryError: any) {
          console.error('Error creando configuración fiduciaria:', fiduciaryError)
          // No fallar el proyecto por esto, solo advertir
          setError('Proyecto creado pero hubo un error en la configuración fiduciaria: ' + fiduciaryError.message)
        }
      }

      // Redirigir a la lista de proyectos
      router.push('/projects')
    } catch (error: any) {
      console.error('Error creating project:', error)
      setError(error.message || 'Error al crear el proyecto')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/dashboard/projects')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/projects">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Proyectos
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nuevo Proyecto</h1>
            <p className="text-sm text-gray-500">
              Crea un nuevo proyecto de supervisión técnica o interventoría administrativa
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl">
        <ProjectFormWithFinancial
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
        
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
