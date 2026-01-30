import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PhotoGallery } from '@/components/daily-logs/PhotoGallery'
import { ArrowLeft, Calendar, Cloud, Users, Wrench, Package, FileText, Camera, Edit, Printer } from 'lucide-react'

export default async function DailyLogDetailPage({ 
  params 
}: { 
  params: { id: string; logId: string } 
}) {
  const supabase = createClient()

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Obtener bitácora
  const { data: log, error } = await (supabase
    .from('daily_logs') as any)
    .select(`
      *,
      created_by_profile:profiles!daily_logs_created_by_fkey(full_name, email)
    `)
    .eq('id', params.logId)
    .single()

  if (error || !log) {
    redirect(`/projects/${params.id}/daily-logs`)
  }

  // Obtener proyecto
  const { data: project } = await (supabase
    .from('projects') as any)
    .select('name')
    .eq('id', params.id)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('id', user.id)
    .single()

  const { data: assignedProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', log.assigned_to)
    .maybeSingle()

  const { data: configData } = await supabase
    .from('daily_log_configs')
    .select('custom_fields')
    .eq('project_id', params.id)
    .single()

  const storedLabels = (log.custom_fields as any)?._field_labels || {}
  const customFieldLabels = (configData?.custom_fields || []).reduce(
    (acc: Record<string, string>, field: any) => {
      if (field?.id && field?.label) {
        acc[field.id] = field.label
      }
      return acc
    },
    { ...storedLabels }
  )

  const canEdit = user.id === log.created_by || ['admin', 'super_admin', 'gerente', 'supervisor'].includes(profile?.role || '')

  const checklistSections = (log.custom_fields?.checklists || [])
    .map((section: any) => ({
      ...section,
      items: (section.items || []).filter((item: any) =>
        item.status === 'compliant' || item.status === 'non_compliant'
      )
    }))
    .filter((section: any) => section.items?.length)
  const customFields = Object.entries({ ...(log.custom_fields || {}) }).filter(([key]) => key !== 'checklists')

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
              Bitácora del {new Date(log.date).toLocaleDateString('es-CO', {
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
          
          {canEdit && (
            <Link
              href={`/projects/${params.id}/daily-logs/${params.logId}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          )}
          <Link
            href={`/print/daily-log/${params.logId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 flex items-center"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Link>
        </div>
      </div>

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
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              log.sync_status === 'synced' 
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {log.sync_status === 'synced' ? '✓ Sincronizado' : '⏳ Pendiente'}
            </span>
          </div>
        </div>

        {/* Actividades */}
        {log.activities && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Actividades Realizadas
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{log.activities}</p>
            </div>
          </div>
        )}

        {/* Materiales */}
        {log.materials && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
              <Package className="h-5 w-5 mr-2 text-blue-600" />
              Materiales Utilizados
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{log.materials}</p>
            </div>
          </div>
        )}

        {/* Equipos */}
        {log.equipment && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
              <Wrench className="h-5 w-5 mr-2 text-blue-600" />
              Equipos Utilizados
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{log.equipment}</p>
            </div>
          </div>
        )}

        {/* Observaciones */}
        {log.observations && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Observaciones
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{log.observations}</p>
            </div>
          </div>
        )}

        {/* Problemas */}
        {log.issues && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Problemas Encontrados
            </h2>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="text-gray-700 whitespace-pre-wrap">{log.issues}</p>
            </div>
          </div>
        )}

        {/* Recomendaciones */}
        {log.recommendations && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Recomendaciones
            </h2>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-gray-700 whitespace-pre-wrap">{log.recommendations}</p>
            </div>
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
                      {new Date(signature.signed_at).toLocaleDateString('es-CO')}
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
            <PhotoGallery photos={log.photos} />
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
