'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { DailyLogsTimeline } from '@/components/daily-logs/DailyLogsTimeline'
import { DailyLogsCalendar } from '@/components/daily-logs/DailyLogsCalendar'
import { Loader2, Settings, WifiOff, Printer, CheckSquare, X } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  getLocalDailyLogsByProject,
  cacheDailyLogsFromRemote,
  cacheProjectConfig,
  getCachedProjectConfig,
} from '@/lib/offline/daily-log-service'

export default function DailyLogsPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<any>(null)
  const [dailyLogs, setDailyLogs] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [customFieldLabels, setCustomFieldLabels] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const { profile } = useAuth()
  const { isOnline } = useOnlineStatus()
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Solo admin, super_admin, gerente y supervisor pueden configurar bitácoras
  const canConfigureDailyLogs = profile?.role && ['admin', 'super_admin', 'gerente', 'supervisor'].includes(profile.role)

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filteredLogs.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredLogs.map(l => l.id)))
    }
  }

  const handlePrintSelected = () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds).join(',')
    window.open(`/print/daily-logs/batch?ids=${ids}`, '_blank')
  }

  const handleExitSelection = () => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setIsOfflineMode(false)

      if (isOnline) {
        // ============================================================
        // ONLINE: cargar de Supabase, cachear en IndexedDB
        // ============================================================
        try {
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

          // Cachear proyecto para uso offline
          await cacheProjectConfig(params.id, 'template', { project_name: projectData.name, project_code: projectData.project_code })

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
                if (photoPath.startsWith('http')) return photoPath
                const { data: { publicUrl } } = supabase.storage
                  .from('daily-logs-photos')
                  .getPublicUrl(photoPath)
                return publicUrl
              })
              return { ...log, photos: publicUrls }
            }
            return log
          }) || []

          // Cachear remotos en IndexedDB
          await cacheDailyLogsFromRemote(params.id, logsWithPublicUrls)

          // Merge: incluir registros offline pendientes que no están en remoto
          const localLogs = await getLocalDailyLogsByProject(params.id)
          const remoteIds = new Set(logsWithPublicUrls.map((l: any) => l.id))
          const pendingLocalLogs = localLogs
            .filter(l => !remoteIds.has(l.id) && l.sync_status !== 'synced')
            .map(l => ({ ...l, _isLocal: true }))

          setDailyLogs([...pendingLocalLogs, ...logsWithPublicUrls])

          // Obtener y cachear labels de campos personalizados
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
            await cacheProjectConfig(params.id, 'daily_log_config', configData)
          } else {
            setCustomFieldLabels({})
          }

        } catch (onlineError) {
          console.warn('⚠️ Error online, cargando datos locales...', onlineError)
          await loadOfflineData()
        }
      } else {
        // ============================================================
        // OFFLINE: cargar desde IndexedDB
        // ============================================================
        await loadOfflineData()
      }
    } catch (error) {
      console.error('Error in loadData:', error)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, isOnline])

  const loadOfflineData = async () => {
    setIsOfflineMode(true)

    // Cargar proyecto desde caché (guardado como tipo 'template')
    const cachedTemplate = await getCachedProjectConfig(params.id, 'template')
    if (cachedTemplate?.project_name) {
      setProject({ id: params.id, name: cachedTemplate.project_name })
    } else {
      setProject({ id: params.id, name: 'Proyecto (offline)' })
    }

    // Cargar bitácoras locales
    const localLogs = await getLocalDailyLogsByProject(params.id)
    setDailyLogs(localLogs.map(l => ({ ...l, _isLocal: true })))

    // Cargar labels cacheados
    const cachedConfig = await getCachedProjectConfig(params.id, 'daily_log_config')
    if (cachedConfig?.custom_fields) {
      const labels = (cachedConfig.custom_fields as any[]).reduce((acc: Record<string, string>, field: any) => {
        if (field?.id && field?.label) {
          acc[field.id] = field.label
        }
        return acc
      }, {})
      setCustomFieldLabels(labels)
    }
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  const datesWithLogs = useMemo(
    () => Array.from(new Set(dailyLogs.map(log => log.date).filter(Boolean))),
    [dailyLogs]
  )

  const filteredLogs = useMemo(() => {
    if (!selectedDate) return dailyLogs
    return dailyLogs.filter(log => log.date === selectedDate)
  }, [dailyLogs, selectedDate])

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
      {/* Banner offline */}
      {isOfflineMode && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg mb-4">
          <WifiOff className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Modo offline — datos locales</p>
            <p className="text-xs text-amber-600">Mostrando bitácoras guardadas en el dispositivo. Se actualizarán al volver la conexión.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bitácoras Diarias</h1>
          <p className="text-gray-600 mt-1">
            {project?.name}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => selectionMode ? handleExitSelection() : setSelectionMode(true)}
            className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm ${selectionMode ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <CheckSquare className="h-4 w-4" />
            {selectionMode ? 'Cancelar selección' : 'Seleccionar'}
          </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <DailyLogsCalendar
          datesWithLogs={datesWithLogs}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        <div>
          {selectedDate && (
            <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-100 text-blue-700 text-sm rounded-lg px-4 py-3">
              <span>
                Mostrando registros del {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('es-CO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-blue-700 font-medium hover:underline"
              >
                Ver todos
              </button>
            </div>
          )}

          {/* Lista de bitácoras */}
          {!filteredLogs || filteredLogs.length === 0 ? (
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
            <DailyLogsTimeline
              logs={filteredLogs}
              projectId={params.id}
              customFieldLabels={customFieldLabels}
              selectable={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          )}
        </div>
      </div>

      {/* Barra de acción de selección */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 shadow-2xl rounded-xl px-6 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">
            {selectedIds.size} bitácora{selectedIds.size > 1 ? 's' : ''} seleccionada{selectedIds.size > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:underline"
          >
            {selectedIds.size === filteredLogs.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>
          <button
            type="button"
            onClick={handlePrintSelected}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm"
          >
            <Printer className="h-4 w-4" />
            Imprimir seleccionadas
          </button>
          <button
            type="button"
            onClick={handleExitSelection}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            title="Cerrar selección"
          >
            <X className="h-4 w-4" />
          </button>
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
