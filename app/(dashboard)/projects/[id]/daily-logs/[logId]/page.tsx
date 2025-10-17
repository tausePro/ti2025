import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PhotoGallery } from '@/components/daily-logs/PhotoGallery'
import { ArrowLeft, Calendar, Cloud, Users, Wrench, Package, FileText, Camera, Edit } from 'lucide-react'

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
          
          {user.id === log.created_by && (
            <Link
              href={`/projects/${params.id}/daily-logs/${params.logId}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* Información básica */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b">
          <div>
            <p className="text-sm text-gray-500">Clima</p>
            <p className="text-lg font-medium">{getWeatherLabel(log.data?.weather || log.weather)}</p>
          </div>
          
          {log.data?.temperature && (
            <div>
              <p className="text-sm text-gray-500">Temperatura</p>
              <p className="text-lg font-medium">{log.data.temperature}°C</p>
            </div>
          )}
          
          <div>
            <p className="text-sm text-gray-500">Personal</p>
            <p className="text-lg font-medium">{log.data?.personnel_count || 0} personas</p>
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
        {log.data?.activities && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Actividades Realizadas
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{log.data.activities}</p>
            </div>
          </div>
        )}

        {/* Materiales */}
        {log.data?.materials && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
              <Package className="h-5 w-5 mr-2 text-blue-600" />
              Materiales Utilizados
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{log.data.materials}</p>
            </div>
          </div>
        )}

        {/* Equipos */}
        {log.data?.equipment && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
              <Wrench className="h-5 w-5 mr-2 text-blue-600" />
              Equipos Utilizados
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{log.data.equipment}</p>
            </div>
          </div>
        )}

        {/* Observaciones */}
        {log.data?.observations && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Observaciones
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{log.data.observations}</p>
            </div>
          </div>
        )}

        {/* Problemas */}
        {log.data?.issues && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Problemas Encontrados
            </h2>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="text-gray-700 whitespace-pre-wrap">{log.data.issues}</p>
            </div>
          </div>
        )}

        {/* Recomendaciones */}
        {log.data?.recommendations && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Recomendaciones
            </h2>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-gray-700 whitespace-pre-wrap">{log.data.recommendations}</p>
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
