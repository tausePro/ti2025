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
  FileText, 
  Download, 
  Eye, 
  Edit, 
  Clock,
  CheckCircle,
  AlertCircle,
  PenTool
} from 'lucide-react'
import { Report } from '@/types'
import Link from 'next/link'

interface ReportsTabProps {
  projectId: string
}

export function ReportsTab({ projectId }: ReportsTabProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const { hasPermission, profile } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    loadReports()
  }, [projectId])

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          created_by_user:users!created_by(
            id,
            email,
            profile:user_profiles(full_name)
          ),
          approved_by_user:users!approved_by(
            id,
            email,
            profile:user_profiles(full_name)
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReports(data || [])
    } catch (error: any) {
      console.error('Error loading reports:', error)
      setError(error.message || 'Error al cargar los reportes')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Edit className="h-4 w-4" />
      case 'review':
        return <Clock className="h-4 w-4" />
      case 'approved':
        return <CheckCircle className="h-4 w-4" />
      case 'signed':
        return <PenTool className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Borrador'
      case 'review':
        return 'En Revisión'
      case 'approved':
        return 'Aprobado'
      case 'signed':
        return 'Firmado'
      default:
        return status
    }
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'draft':
        return 'secondary'
      case 'review':
        return 'outline'
      case 'approved':
        return 'default'
      case 'signed':
        return 'default'
      default:
        return 'secondary'
    }
  }

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'daily':
        return 'Reporte Diario'
      case 'weekly':
        return 'Reporte Semanal'
      case 'monthly':
        return 'Reporte Mensual'
      case 'progress':
        return 'Reporte de Avance'
      case 'final':
        return 'Reporte Final'
      default:
        return type
    }
  }

  if (loading) {
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
          <h3 className="text-lg font-semibold">Reportes del Proyecto</h3>
          <p className="text-sm text-gray-500">
            Informes generados a partir de las entradas de bitácora
          </p>
        </div>
        {hasPermission('reports', 'create') && (
          <Button asChild className="mt-4 sm:mt-0">
            <Link href={`/dashboard/projects/${projectId}/reports/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Reporte
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

      {/* Reports List */}
      {reports.length > 0 ? (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-blue-600" />
                      {report.title}
                    </CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      {getReportTypeLabel(report.report_type)}
                      {report.period_start && report.period_end && (
                        <span className="ml-2">
                          • {new Date(report.period_start).toLocaleDateString('es-CO')} - {new Date(report.period_end).toLocaleDateString('es-CO')}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusVariant(report.status)} className="flex items-center">
                      {getStatusIcon(report.status)}
                      <span className="ml-1">{getStatusLabel(report.status)}</span>
                    </Badge>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/projects/${projectId}/reports/${report.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {(hasPermission('reports', 'update') || report.created_by === profile?.id) && 
                       report.status === 'draft' && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/projects/${projectId}/reports/${report.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      {report.pdf_url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={report.pdf_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Descripción */}
                {report.description && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {report.description}
                    </p>
                  </div>
                )}

                {/* Estadísticas del reporte */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Entradas de bitácora:</span>
                    <span className="ml-1">{report.bitacora_entries_count || 0}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Páginas:</span>
                    <span className="ml-1">{report.pages_count || 'N/A'}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Fotos incluidas:</span>
                    <span className="ml-1">{report.photos_count || 0}</span>
                  </div>
                </div>

                {/* Flujo de aprobación */}
                {report.status !== 'draft' && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Estado de Aprobación</h4>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {report.submitted_at && (
                        <span>
                          Enviado: {new Date(report.submitted_at).toLocaleDateString('es-CO')}
                        </span>
                      )}
                      {report.approved_at && report.approved_by_user && (
                        <span>
                          Aprobado por: {report.approved_by_user.profile?.full_name || report.approved_by_user.email}
                          el {new Date(report.approved_at).toLocaleDateString('es-CO')}
                        </span>
                      )}
                      {report.signed_at && (
                        <span>
                          Firmado: {new Date(report.signed_at).toLocaleDateString('es-CO')}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Comentarios de revisión */}
                {report.review_comments && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Comentarios de Revisión</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {report.review_comments}
                    </p>
                  </div>
                )}

                {/* Autor y fecha */}
                <div className="flex items-center justify-between pt-4 border-t text-xs text-gray-500">
                  <span>
                    Creado por: {report.created_by_user?.profile?.full_name || report.created_by_user?.email || 'Usuario'}
                  </span>
                  <span>
                    {new Date(report.created_at).toLocaleString('es-CO')}
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
              No hay reportes generados
            </h3>
            <p className="text-gray-500 text-center mb-6">
              Aún no se han generado reportes para este proyecto.
              Los reportes se crean a partir de las entradas de bitácora.
            </p>
            {hasPermission('reports', 'create') && (
              <Button asChild>
                <Link href={`/dashboard/projects/${projectId}/reports/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generar Primer Reporte
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
