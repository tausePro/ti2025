'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { PhotoGallery } from '@/components/daily-logs/PhotoGallery'
import { ArrowLeft, Calendar, Cloud, Users, Wrench, Package, FileText, Camera, Edit, Printer, Loader2, WifiOff, Trash2, Download } from 'lucide-react'
import { formatDateValue, getCustomFieldLabelsMap } from '@/lib/utils'
import { SyncStatusBadge } from '@/components/shared/OfflineIndicator'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { getLocalDailyLog, getCachedProjectConfig } from '@/lib/offline/daily-log-service'

export default function DailyLogDetailPage() {
  const params = useParams<{ id: string; logId: string }>()
  const router = useRouter()
  const supabase = createClient()
  const { profile } = useAuth()
  const { isOnline } = useOnlineStatus()

  const [log, setLog] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [assignedProfile, setAssignedProfile] = useState<any>(null)
  const [customFieldLabels, setCustomFieldLabels] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true)
      const response = await fetch(`/api/print/daily-log?logId=${params.logId}`)
      if (!response.ok) throw new Error('Error generando PDF')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || `Bitacora_${params.logId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error descargando PDF:', error)
      alert('Error generando el PDF. Intenta de nuevo.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  useEffect(() => {
    async function loadData() {
      setLoading(true)

      if (isOnline) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) { router.push('/login'); return }

          const { data: logData, error } = await (supabase
            .from('daily_logs') as any)
            .select(`*, created_by_profile:profiles!daily_logs_created_by_fkey(full_name, email)`)
            .eq('id', params.logId)
            .single()

          if (error || !logData) { router.push(`/projects/${params.id}/daily-logs`); return }
          setLog(logData)

          const { data: projectData } = await (supabase.from('projects') as any)
            .select('name').eq('id', params.id).single()
          setProject(projectData)

          if (logData.assigned_to) {
            const { data: assigned } = await supabase.from('profiles')
              .select('full_name, email').eq('id', logData.assigned_to).maybeSingle()
            setAssignedProfile(assigned)
          }

          const { data: configData } = await supabase.from('daily_log_configs')
            .select('custom_fields').eq('project_id', params.id).single()

          const storedLabels = (logData.custom_fields as any)?._field_labels || {}
          setCustomFieldLabels(getCustomFieldLabelsMap(
            (configData?.custom_fields || []) as Array<{ id?: string; label?: string }>,
            storedLabels
          ))
        } catch {
          await loadOffline()
        }
      } else {
        await loadOffline()
      }

      setLoading(false)
    }

    async function loadOffline() {
      setIsOfflineMode(true)
      const localLog = await getLocalDailyLog(params.logId)
      if (!localLog) { router.push(`/projects/${params.id}/daily-logs`); return }

      setLog(localLog)
      setProject({ name: 'Proyecto (offline)' })

      const cachedConfig = await getCachedProjectConfig(params.id, 'daily_log_config')
      const storedLabels = (localLog.custom_fields as any)?._field_labels || {}
      setCustomFieldLabels(getCustomFieldLabelsMap(
        (cachedConfig?.custom_fields || []) as Array<{ id?: string; label?: string }>,
        storedLabels
      ))
    }

    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, params.logId, isOnline])

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar esta bitácora? Esta acción no se puede deshacer.')) return
    setDeleting(true)
    try {
      if (isOnline && !params.logId.startsWith('offline_')) {
        const { error } = await supabase.from('daily_logs').delete().eq('id', params.logId)
        if (error) throw error
      }
      // Eliminar también de IndexedDB
      const { db } = await import('@/lib/db/schema')
      await db.daily_logs.delete(params.logId)
      await db.photos.where('daily_log_id').equals(params.logId).delete()

      router.push(`/projects/${params.id}/daily-logs`)
    } catch (err: any) {
      console.error('Error eliminando bitácora:', err)
      alert('Error al eliminar: ' + (err.message || 'Error desconocido'))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!log) return null

  const isAdmin = ['admin', 'super_admin'].includes(profile?.role || '')
  const isOwnerOrSupervisor = profile?.id === log.created_by || ['gerente', 'supervisor'].includes(profile?.role || '')
  const hoursElapsed = (Date.now() - new Date(log.created_at).getTime()) / (1000 * 60 * 60)
  const withinEditWindow = hoursElapsed <= 72
  const canEdit = isAdmin || (isOwnerOrSupervisor && withinEditWindow)

  const checklistSections = (log.custom_fields?.checklists || [])
    .map((section: any) => ({
      ...section,
      items: (section.items || []).filter((item: any) =>
        item.status === 'compliant' || item.status === 'non_compliant'
      )
    }))
    .filter((section: any) => section.items?.length)
  const customFields = Object.entries({ ...(log.custom_fields || {}) }).filter(([key]) => !['checklists', '_field_labels', 'photo_count', 'photo_captions'].includes(key))
  const photoCaptions: string[] = log.custom_fields?.photo_captions || []

  const getWeatherLabel = (weather: string) => {
    switch (weather) {
      case 'soleado': return '☀️ Soleado'
      case 'nublado': return '☁️ Nublado'
      case 'lluvioso': return '🌧️ Lluvioso'
      case 'tormentoso': return '⛈️ Tormentoso'
      case 'parcialmente_nublado': return '⛅ Parcialmente Nublado'
      default: return weather
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Banner offline */}
      {isOfflineMode && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg mb-4">
          <WifiOff className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">Mostrando datos locales — sin conexión</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/projects/${params.id}/daily-logs`}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a bitácoras
        </Link>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Bitácora del {formatDateValue(log.date, 'es-CO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h1>
            <p className="text-gray-600 mt-2">
              Proyecto: {project?.name}
            </p>
          </div>
          
          <div className="flex gap-2 flex-shrink-0">
            {canEdit && !isOfflineMode && (
              <Link
                href={`/projects/${params.id}/daily-logs/${params.logId}/edit`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Link>
            )}
            {!isOfflineMode && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center disabled:opacity-50"
                >
                  {downloadingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  {downloadingPdf ? 'Generando...' : 'Descargar PDF'}
                </button>
                <Link
                  href={`/print/daily-log/${params.logId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 flex items-center"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Vista previa
                </Link>
              </>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-md hover:bg-red-50 flex items-center disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Eliminar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Aviso de ventana expirada */}
      {!canEdit && isOwnerOrSupervisor && !withinEditWindow && (
        <div className="text-xs text-gray-400 mb-2">
          La ventana de edición de 72 horas ha expirado. Contacta a un administrador si necesitas modificar esta bitácora.
        </div>
      )}

      {/* Contenido */}
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* Información básica */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b">
          <div>
            <p className="text-sm text-gray-500">Clima</p>
            <p className="text-lg font-medium">{getWeatherLabel(log.weather)}</p>
          </div>
          
          {log.temperature && (
            <div>
              <p className="text-sm text-gray-500">Temperatura</p>
              <p className="text-lg font-medium">{log.temperature}°C</p>
            </div>
          )}
          
          <div>
            <p className="text-sm text-gray-500">Personal</p>
            <p className="text-lg font-medium">{log.personnel_count ?? 0} personas</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Elaborado por</p>
            <p className="text-lg font-medium">
              {assignedProfile?.full_name || assignedProfile?.email || log.created_by_profile?.full_name || 'Usuario'}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Estado</p>
            <SyncStatusBadge syncStatus={log.sync_status || 'synced'} />
          </div>
        </div>

        {/* Frente de Trabajo y Elemento */}
        {(log.work_front || log.element) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b">
            {log.work_front && (
              <div>
                <p className="text-sm text-gray-500">Frente de Trabajo</p>
                <p className="text-lg font-medium text-gray-900">{log.work_front}</p>
              </div>
            )}
            {log.element && (
              <div>
                <p className="text-sm text-gray-500">Elemento</p>
                <p className="text-lg font-medium text-gray-900">{log.element}</p>
              </div>
            )}
          </div>
        )}

        {/* Actividades */}
        {log.activities && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Actividades Realizadas
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: log.activities }} />
          </div>
        )}

        {/* Materiales */}
        {log.materials && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
              <Package className="h-5 w-5 mr-2 text-blue-600" />
              Materiales Utilizados
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: log.materials }} />
          </div>
        )}

        {/* Equipos */}
        {log.equipment && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
              <Wrench className="h-5 w-5 mr-2 text-blue-600" />
              Equipos Utilizados
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: log.equipment }} />
          </div>
        )}

        {/* Observaciones */}
        {log.observations && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Observaciones
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: log.observations }} />
          </div>
        )}

        {/* Problemas */}
        {log.issues && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Problemas Encontrados
            </h2>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200 prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: log.issues }} />
          </div>
        )}

        {/* Recomendaciones */}
        {log.recommendations && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Recomendaciones
            </h2>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: log.recommendations }} />
          </div>
        )}

        {customFields.length > 0 && (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Campos personalizados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customFields.map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{customFieldLabels[key] || key}</p>
                  <p className="text-base font-medium text-gray-900">
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(log.signatures) && log.signatures.length > 0 && (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Firmas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {log.signatures.map((signature: any) => (
                <div key={signature.user_id} className="border rounded-lg p-4">
                  {signature.signature_url && (
                    <img
                      src={signature.signature_url}
                      alt={`Firma de ${signature.user_name}`}
                      className="h-16 w-32 object-contain border rounded bg-white"
                    />
                  )}
                  <p className="mt-2 text-sm font-medium text-gray-900">
                    {signature.user_name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{signature.user_role}</p>
                  {signature.signed_at && (
                    <p className="text-xs text-gray-400">
                      {formatDateValue(signature.signed_at, 'es-CO', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {checklistSections.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Checklist</h2>
            <div className="space-y-4">
              {checklistSections.map((section: any) => (
                <div key={section.id} className="border rounded-lg">
                  <div className="bg-gray-50 px-4 py-3 font-semibold text-gray-800">
                    {section.title}
                  </div>
                  <div className="divide-y">
                    {section.items?.map((item: any) => (
                      <div key={item.id} className="px-4 py-3 text-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-gray-900">{item.description}</p>
                            {item.observations && (
                              <p className="text-gray-500 mt-1">{item.observations}</p>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                            item.status === 'compliant'
                              ? 'bg-green-100 text-green-700'
                              : item.status === 'non_compliant'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {item.status === 'compliant'
                              ? 'Cumple'
                              : item.status === 'non_compliant'
                                ? 'No cumple'
                                : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fotos */}
        {log.photos && log.photos.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
              <Camera className="h-5 w-5 mr-2 text-blue-600" />
              Fotos del Día ({log.photos.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {log.photos.map((photo: string, idx: number) => (
                <div key={idx} className="space-y-2">
                  <div className="relative aspect-video rounded-lg overflow-hidden border">
                    <img
                      src={photo}
                      alt={photoCaptions[idx] || `Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                      {idx + 1}/{log.photos.length}
                    </span>
                  </div>
                  {photoCaptions[idx] && (
                    <p className="text-sm text-gray-600 italic px-1">{photoCaptions[idx]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Información de creación */}
        <div className="pt-6 border-t text-sm text-gray-500">
          <p>
            Creado por <span className="font-medium text-gray-700">{log.created_by_profile?.full_name || 'Usuario'}</span>
            {' '}el {new Date(log.created_at).toLocaleString('es-CO')}
          </p>
          {log.updated_at && log.updated_at !== log.created_at && (
            <p className="mt-1">
              Última actualización: {new Date(log.updated_at).toLocaleString('es-CO')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
