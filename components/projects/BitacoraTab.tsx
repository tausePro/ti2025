'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  Calendar, 
  Cloud, 
  Users, 
  Wrench, 
  Package, 
  FileText,
  Camera,
  Edit,
  Eye
} from 'lucide-react'
import { BitacoraEntry } from '@/types'
import Link from 'next/link'

interface BitacoraTabProps {
  projectId: string
}

export function BitacoraTab({ projectId }: BitacoraTabProps) {
  const [entries, setEntries] = useState<BitacoraEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const { hasPermission, profile, loading: authLoading } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (!authLoading) {
      loadBitacoraEntries()
    }
  }, [projectId, authLoading])

  const loadBitacoraEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false })

      if (error) throw error
      setEntries(data || [])
    } catch (error: any) {
      console.error('Error loading bitacora entries:', error)
      setError(error.message || 'Error al cargar las entradas de bitácora')
    } finally {
      setLoading(false)
    }
  }

  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'soleado':
        return '☀️'
      case 'nublado':
        return '☁️'
      case 'lluvioso':
        return '🌧️'
      case 'parcialmente_nublado':
        return '⛅'
      default:
        return '🌤️'
    }
  }

  const getWeatherLabel = (weather: string) => {
    switch (weather) {
      case 'soleado':
        return 'Soleado'
      case 'nublado':
        return 'Nublado'
      case 'lluvioso':
        return 'Lluvioso'
      case 'parcialmente_nublado':
        return 'Parcialmente Nublado'
      default:
        return weather
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Bitácora del Proyecto</h3>
          <p className="text-sm text-gray-500">
            Registro diario de actividades, personal y observaciones
          </p>
        </div>
        {profile && (hasPermission('bitacora', 'create') || ['super_admin', 'admin', 'supervisor', 'residente'].includes(profile?.role || '')) && (
          <Button asChild className="mt-4 sm:mt-0">
            <Link href={`/projects/${projectId}/daily-logs/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Entrada
            </Link>
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Entries List */}
      {entries.length > 0 ? (
        <div className="space-y-4">
          {entries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                      {new Date((entry as any).date).toLocaleDateString('es-CO', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <Cloud className="h-4 w-4 mr-1" />
                      {getWeatherIcon(entry.weather)} {getWeatherLabel(entry.weather)}
                      {entry.temperature && (
                        <span className="ml-2">• {entry.temperature}°C</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={entry.status === 'draft' ? 'secondary' : 'default'}>
                      {entry.status === 'draft' ? 'Borrador' : 'Publicado'}
                    </Badge>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/projects/${projectId}/bitacora/${entry.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {(hasPermission('bitacora', 'update') || entry.created_by === profile?.id) && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/projects/${projectId}/bitacora/${entry.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Personal */}
                  <div className="flex items-center text-sm">
                    <Users className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="font-medium">Personal:</span>
                    <span className="ml-1">{entry.personnel_count || 0}</span>
                  </div>

                  {/* Equipos */}
                  <div className="flex items-center text-sm">
                    <Wrench className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="font-medium">Equipos:</span>
                    <span className="ml-1">{entry.equipment?.length || 0}</span>
                  </div>

                  {/* Materiales */}
                  <div className="flex items-center text-sm">
                    <Package className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="font-medium">Materiales:</span>
                    <span className="ml-1">{entry.materials?.length || 0}</span>
                  </div>
                </div>

                {/* Actividades principales */}
                {entry.activities && entry.activities.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      Actividades Principales
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {entry.activities.slice(0, 3).map((activity, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {activity.description}
                        </li>
                      ))}
                      {entry.activities.length > 3 && (
                        <li className="text-blue-600 text-xs">
                          +{entry.activities.length - 3} actividades más...
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Observaciones */}
                {entry.observations && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Observaciones</h4>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {entry.observations}
                    </p>
                  </div>
                )}

                {/* Fotos */}
                {entry.photos && entry.photos.length > 0 && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Camera className="h-4 w-4 mr-1" />
                    {entry.photos.length} foto{entry.photos.length !== 1 ? 's' : ''} adjunta{entry.photos.length !== 1 ? 's' : ''}
                  </div>
                )}

                {/* Autor y fecha */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t text-xs text-gray-500">
                  <span>
                    Creado por residente
                  </span>
                  <span>
                    {new Date(entry.created_at).toLocaleString('es-CO')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay entradas de bitácora
            </h3>
            <p className="text-gray-500 text-center mb-6">
              Aún no se han registrado entradas en la bitácora de este proyecto.
              Comienza creando la primera entrada.
            </p>
            {profile && (hasPermission('bitacora', 'create') || ['super_admin', 'admin', 'supervisor', 'residente'].includes(profile?.role || '')) && (
              <Button asChild>
                <Link href={`/projects/${projectId}/daily-logs/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Entrada
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
