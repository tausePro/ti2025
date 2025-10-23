'use client'

import Link from 'next/link'
import { PhotoGallery } from './PhotoGallery'
import { Camera, Clock, MapPin, User, FileText } from 'lucide-react'

interface DailyLogsTimelineProps {
  logs: any[]
  projectId: string
}

export function DailyLogsTimeline({ logs, projectId }: DailyLogsTimelineProps) {
  // Agrupar bitácoras por día
  const groupedLogs = logs.reduce((acc: any, log: any) => {
    const dateKey = log.date
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(log)
    return acc
  }, {})

  // Ordenar días descendente y entradas por hora
  const sortedDays = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a))
  sortedDays.forEach(day => {
    groupedLogs[day].sort((a: any, b: any) => {
      const timeA = a.time || '00:00'
      const timeB = b.time || '00:00'
      return timeB.localeCompare(timeA)
    })
  })

  return (
    <div className="space-y-8">
      {sortedDays.map((date) => (
        <div key={date} className="relative">
          {/* Fecha del día */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-white border-l-4 border-blue-500 py-3 px-4 mb-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">
              {new Date(date).toLocaleDateString('es-CO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h2>
            <p className="text-sm text-gray-600">
              {groupedLogs[date].length} {groupedLogs[date].length === 1 ? 'entrada' : 'entradas'}
            </p>
          </div>

          {/* Entradas del día - Timeline */}
          <div className="relative pl-8 space-y-6">
            {/* Línea vertical del timeline */}
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-300" />

            {groupedLogs[date].map((log: any) => (
              <div key={log.id} className="relative">
                {/* Punto en el timeline */}
                <div className="absolute -left-[1.6rem] top-6 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-4 border-white shadow-lg z-10">
                  <div className="text-center leading-tight">
                    {log.time || new Date(log.created_at).toLocaleTimeString('es-CO', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>

                {/* Card de la entrada */}
                <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 ml-4">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Hora */}
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">
                            {log.time || new Date(log.created_at).toLocaleTimeString('es-CO', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>

                        {/* Estado de sincronización */}
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

                        {/* Ubicación GPS */}
                        {log.location && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />
                            <span>GPS</span>
                          </div>
                        )}

                        {/* Asignado a */}
                        {log.assigned_to && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <User className="h-3 w-3" />
                            <span>Asignado</span>
                          </div>
                        )}

                        {/* Firmas */}
                        {log.signatures && log.signatures.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <FileText className="h-3 w-3" />
                            <span>{log.signatures.length} firma{log.signatures.length > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-2">
                      <Link
                        href={`/projects/${projectId}/daily-logs/${log.id}`}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        Ver
                      </Link>
                      <Link
                        href={`/projects/${projectId}/daily-logs/${log.id}/edit`}
                        className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded transition-colors"
                      >
                        Editar
                      </Link>
                    </div>
                  </div>

                  {/* Información general */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                    <div>
                      <span className="text-gray-500">Clima:</span>{' '}
                      <span className="font-medium">
                        {log.weather === 'soleado' ? '☀️ Soleado' :
                         log.weather === 'nublado' ? '☁️ Nublado' :
                         log.weather === 'lluvioso' ? '🌧️ Lluvioso' :
                         '⛈️ Tormentoso'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Personal:</span>{' '}
                      <span className="font-medium">{log.personnel_count || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Creado por:</span>{' '}
                      <span className="font-medium">{log.created_by_profile?.full_name || 'Desconocido'}</span>
                    </div>
                    {log.temperature && (
                      <div>
                        <span className="text-gray-500">Temperatura:</span>{' '}
                        <span className="font-medium">{log.temperature}°C</span>
                      </div>
                    )}
                  </div>

                  {/* Actividades y detalles */}
                  {log.activities && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Actividades:</p>
                      <p className="text-sm text-gray-600">{log.activities}</p>
                    </div>
                  )}

                  {log.materials && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Materiales:</p>
                      <p className="text-sm text-gray-600">{log.materials}</p>
                    </div>
                  )}

                  {log.equipment && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Equipos:</p>
                      <p className="text-sm text-gray-600">{log.equipment}</p>
                    </div>
                  )}

                  {log.observations && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Observaciones:</p>
                      <p className="text-sm text-gray-600">{log.observations}</p>
                    </div>
                  )}

                  {log.issues && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-red-700 mb-1">⚠️ Problemas:</p>
                      <p className="text-sm text-red-600">{log.issues}</p>
                    </div>
                  )}

                  {/* Fotos */}
                  {log.photos && log.photos.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 mb-3">
                        <Camera className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          {log.photos.length} {log.photos.length === 1 ? 'foto' : 'fotos'}
                        </span>
                      </div>
                      <PhotoGallery photos={log.photos} />
                    </div>
                  )}

                  {/* Firmas */}
                  {log.signatures && log.signatures.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium text-gray-700 mb-3">Firmas:</p>
                      <div className="flex flex-wrap gap-3">
                        {log.signatures.map((sig: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded p-2">
                            {sig.signature_url && (
                              <img 
                                src={sig.signature_url} 
                                alt={`Firma de ${sig.user_name}`}
                                className="h-12 w-20 object-contain"
                              />
                            )}
                            <div className="text-xs">
                              <p className="font-medium">{sig.user_name}</p>
                              <p className="text-gray-500 capitalize">{sig.user_role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
