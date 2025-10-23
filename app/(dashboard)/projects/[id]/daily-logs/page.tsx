'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { PhotoGallery } from '@/components/daily-logs/PhotoGallery'
import { Camera, Loader2 } from 'lucide-react'

export default function DailyLogsPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<any>(null)
  const [dailyLogs, setDailyLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

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
          <p className="text-gray-600 mt-2">
            Proyecto: {project.name}
          </p>
        </div>
        <Link
          href={`/projects/${params.id}/daily-logs/new`}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Nueva Bitácora
        </Link>
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
        <div className="grid gap-4">
          {dailyLogs.map((log: any) => (
            <div key={log.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {new Date(log.date).toLocaleDateString('es-CO', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      log.sync_status === 'synced' 
                        ? 'bg-green-100 text-green-800'
                        : log.sync_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {log.sync_status === 'synced' ? '✓ Sincronizado' : 
                       log.sync_status === 'pending' ? '⏳ Pendiente' : 
                       log.sync_status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                    <div>
                      <span className="font-medium">Clima:</span>{' '}
                      {log.data?.weather === 'soleado' ? '☀️ Soleado' :
                       log.data?.weather === 'nublado' ? '☁️ Nublado' :
                       log.data?.weather === 'lluvioso' ? '🌧️ Lluvioso' :
                       '⛈️ Tormentoso'}
                    </div>
                    <div>
                      <span className="font-medium">Personal:</span> {log.data?.personnel_count || 0}
                    </div>
                    <div>
                      <span className="font-medium">Creado por:</span>{' '}
                      {log.created_by_profile?.full_name || 'Desconocido'}
                    </div>
                    <div>
                      <span className="font-medium">Hora:</span>{' '}
                      {new Date(log.created_at).toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  {/* Detalles adicionales */}
                  <div className="space-y-2 mt-3">
                    {log.data?.activities && (
                      <p className="text-sm text-gray-700 line-clamp-2">
                        <span className="font-medium">Actividades:</span> {log.data.activities}
                      </p>
                    )}
                    
                    {log.data?.materials && (
                      <p className="text-sm text-gray-700 line-clamp-1">
                        <span className="font-medium">Materiales:</span> {log.data.materials}
                      </p>
                    )}
                    
                    {log.data?.equipment && (
                      <p className="text-sm text-gray-700 line-clamp-1">
                        <span className="font-medium">Equipos:</span> {log.data.equipment}
                      </p>
                    )}
                    
                    {log.data?.observations && (
                      <p className="text-sm text-gray-700 line-clamp-2">
                        <span className="font-medium">Observaciones:</span> {log.data.observations}
                      </p>
                    )}
                    
                    {log.data?.issues && (
                      <p className="text-sm text-red-600 line-clamp-1">
                        <span className="font-medium">⚠️ Problemas:</span> {log.data.issues}
                      </p>
                    )}
                  </div>

                  {/* Fotos */}
                  {log.photos && log.photos.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Camera className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          {log.photos.length} {log.photos.length === 1 ? 'foto' : 'fotos'}
                        </span>
                      </div>
                      <PhotoGallery photos={log.photos} />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <Link
                    href={`/projects/${params.id}/daily-logs/${log.id}`}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Ver
                  </Link>
                  <Link
                    href={`/projects/${params.id}/daily-logs/${log.id}/edit`}
                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
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
