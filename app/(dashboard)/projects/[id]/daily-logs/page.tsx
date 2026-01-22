'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { DailyLogsTimeline } from '@/components/daily-logs/DailyLogsTimeline'
import { Loader2, Settings } from 'lucide-react'

export default function DailyLogsPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<any>(null)
  const [dailyLogs, setDailyLogs] = useState<any[]>([])
  const [customFieldLabels, setCustomFieldLabels] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const { profile } = useAuth()
  
  // Solo admin, super_admin, gerente y supervisor pueden configurar bitácoras
  const canConfigureDailyLogs = profile?.role && ['admin', 'super_admin', 'gerente', 'supervisor'].includes(profile.role)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // Verificar autenticación
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Obtener proyecto
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .single()

      if (projectError || !projectData) {
        console.error('Error loading project:', projectError)
        router.push('/projects')
        return
      }

      setProject(projectData)

      // Obtener bitácoras del proyecto
      const { data: logsData, error: logsError } = await supabase
        .from('daily_logs')
        .select(`
          *,
          created_by_profile:profiles!daily_logs_created_by_fkey(full_name, email)
        `)
        .eq('project_id', params.id)
        .order('date', { ascending: false })

      if (logsError) {
        console.error('Error loading logs:', logsError)
        setDailyLogs([])
        return
      }

      // Convertir rutas de fotos a URLs públicas
      const logsWithPublicUrls = logsData?.map((log: any) => {
        if (log.photos && Array.isArray(log.photos) && log.photos.length > 0) {
          const publicUrls = log.photos.map((photoPath: string) => {
            // Si ya es una URL completa, devolverla tal cual
            if (photoPath.startsWith('http')) {
              return photoPath
            }
            // Si es una ruta, convertirla a URL pública
            const { data: { publicUrl } } = supabase.storage
              .from('daily-logs-photos')
              .getPublicUrl(photoPath)
            return publicUrl
          })
          return { ...log, photos: publicUrls }
        }
        return log
      }) || []

      setDailyLogs(logsWithPublicUrls)

      // Obtener labels de campos personalizados
      const { data: configData } = await supabase
        .from('daily_log_configs')
        .select('custom_fields')
        .eq('project_id', params.id)
        .single()

      if (configData?.custom_fields) {
        const labels = (configData.custom_fields as any[]).reduce((acc: Record<string, string>, field: any) => {
          if (field?.id && field?.label) {
            acc[field.id] = field.label
          }
          return acc
        }, {})
        setCustomFieldLabels(labels)
      } else {
        setCustomFieldLabels({})
      }
    } catch (error) {
      console.error('Error in loadData:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id, router, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Proyecto no encontrado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bitácoras Diarias</h1>
          <p className="text-gray-600 mt-1">
            {project?.name}
          </p>
        </div>
        <div className="flex gap-3">
          {canConfigureDailyLogs && (
            <Link
              href={`/projects/${params.id}/daily-logs/settings`}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurar
            </Link>
          )}
          <Link
            href={`/projects/${params.id}/daily-logs/new`}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Nueva Bitácora
          </Link>
        </div>
      </div>

      {/* Lista de bitácoras */}
      {!dailyLogs || dailyLogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No hay bitácoras registradas</p>
          <Link
            href={`/projects/${params.id}/daily-logs/new`}
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Crear Primera Bitácora
          </Link>
        </div>
      ) : (
        <DailyLogsTimeline logs={dailyLogs} projectId={params.id} customFieldLabels={customFieldLabels} />
      )}

      {/* Botón volver */}
      <div className="mt-6">
        <Link
          href={`/projects/${params.id}`}
          className="text-blue-600 hover:text-blue-700"
        >
          ← Volver al proyecto
        </Link>
      </div>
    </div>
  )
}
