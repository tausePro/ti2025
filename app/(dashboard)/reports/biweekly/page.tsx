'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send,
  Eye,
  Edit,
  Loader2,
  Filter
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface BiweeklyReport {
  id: string
  report_number: string
  period_start: string
  period_end: string
  short_title: string
  status: string
  created_at: string
  submitted_at: string | null
  approved_at: string | null
  project: {
    id: string
    name: string
    project_code: string
  }
  created_by_profile: {
    full_name: string
  } | null
}

const STATUS_CONFIG: Record<string, { label: string, color: string, icon: any }> = {
  draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-800', icon: Edit },
  pending_review: { label: 'Pendiente Revisión', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-800', icon: XCircle },
  approved: { label: 'Aprobado', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  pending_signature: { label: 'Pendiente Firma', color: 'bg-purple-100 text-purple-800', icon: Send },
  published: { label: 'Publicado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
}

export default function BiweeklyReportsPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  const [reports, setReports] = useState<BiweeklyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const isSupervisor = profile?.role === 'supervisor' || profile?.role === 'admin' || profile?.role === 'super_admin'
  const isGerente = profile?.role === 'gerente'

  useEffect(() => {
    loadReports()
  }, [statusFilter])

  const loadReports = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('biweekly_reports')
        .select(`
          id,
          report_number,
          period_start,
          period_end,
          short_title,
          status,
          created_at,
          submitted_at,
          approved_at,
          project:projects(id, name, project_code),
          created_by_profile:profiles!biweekly_reports_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading reports:', error)
        return
      }

      // Transformar datos para manejar relaciones
      const transformedData = (data || []).map((report: any) => ({
        ...report,
        project: Array.isArray(report.project) ? report.project[0] : report.project,
        created_by_profile: Array.isArray(report.created_by_profile) ? report.created_by_profile[0] : report.created_by_profile
      }))

      setReports(transformedData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Informes Quincenales</h1>
          <p className="text-gray-600 mt-1">
            {isSupervisor ? 'Gestiona y revisa los informes de tus proyectos' : 'Crea y gestiona tus informes quincenales'}
          </p>
        </div>
        
        {!isGerente && (
          <Link
            href="/reports/biweekly/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Informe
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="draft">Borradores</option>
            <option value="pending_review">Pendientes de revisión</option>
            <option value="rejected">Rechazados</option>
            <option value="pending_signature">Pendientes de firma</option>
            <option value="published">Publicados</option>
          </select>

          {isSupervisor && (
            <Badge variant="outline" className="ml-auto">
              {reports.filter(r => r.status === 'pending_review').length} pendientes de revisión
            </Badge>
          )}

          {isGerente && (
            <Badge variant="outline" className="ml-auto">
              {reports.filter(r => r.status === 'pending_signature').length} pendientes de firma
            </Badge>
          )}
        </div>
      </div>

      {/* Lista de informes */}
      {reports.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay informes</h3>
          <p className="text-gray-600 mb-4">
            {statusFilter !== 'all' 
              ? 'No hay informes con el estado seleccionado'
              : 'Comienza creando tu primer informe quincenal'}
          </p>
          {!isGerente && statusFilter === 'all' && (
            <Link
              href="/reports/biweekly/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Crear Informe
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Informe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proyecto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Creado por
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{report.report_number}</p>
                      <p className="text-sm text-gray-500">{report.short_title || 'Sin título'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-900">{report.project?.project_code}</p>
                    <p className="text-sm text-gray-500">{report.project?.name}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(report.period_start)} - {formatDate(report.period_end)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(report.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {report.created_by_profile?.full_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {/* Ver/Previsualizar */}
                      <Link
                        href={`/reports/biweekly/${report.id}/preview`}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver informe"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>

                      {/* Editar (solo borradores o rechazados del creador) */}
                      {(report.status === 'draft' || report.status === 'rejected') && 
                       report.created_by_profile?.full_name === profile?.full_name && (
                        <Link
                          href={`/reports/biweekly/${report.id}/edit`}
                          className="text-gray-600 hover:text-gray-900"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </Link>
                      )}

                      {/* Revisar (supervisor) */}
                      {isSupervisor && report.status === 'pending_review' && (
                        <Link
                          href={`/reports/biweekly/${report.id}/review`}
                          className="text-purple-600 hover:text-purple-900"
                          title="Revisar"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </Link>
                      )}

                      {/* Firmar (gerente) */}
                      {isGerente && report.status === 'pending_signature' && (
                        <Link
                          href={`/reports/biweekly/${report.id}/sign`}
                          className="text-green-600 hover:text-green-900"
                          title="Firmar"
                        >
                          <Send className="w-5 h-5" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
