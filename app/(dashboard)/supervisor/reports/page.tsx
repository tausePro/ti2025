'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Eye,
  MessageSquare,
  Calendar,
  User
} from 'lucide-react'
import Link from 'next/link'

interface Report {
  id: string
  project_id: string
  short_title?: string
  long_title?: string
  report_number?: string
  period_start: string
  period_end: string
  status: string
  created_at: string
  created_by: string
  content?: Record<string, string>
  source_data?: any
  project: {
    name: string
    project_code: string
  }
}

export default function SupervisorReportsPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [correctionNotes, setCorrectionNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (profile && profile.role !== 'supervisor') {
      router.push('/dashboard')
      return
    }

    if (profile) {
      loadReports()
    }
  }, [profile, router])

  async function loadReports() {
    try {
      console.log('🔄 Cargando reportes para revisión...')

      // Obtener proyectos del supervisor
      const { data: projectsData, error: projectsError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', profile!.id)
        .eq('is_active', true)

      if (projectsError) throw projectsError

      const projectIds = (projectsData || []).map(pm => pm.project_id)

      if (projectIds.length === 0) {
        setReports([])
        setLoading(false)
        return
      }

      // Cargar informes quincenales pendientes de revisión
      const { data: reportsData, error: reportsError } = await supabase
        .from('biweekly_reports')
        .select(`
          *,
          project:projects(name, project_code)
        `)
        .in('project_id', projectIds)
        .in('status', ['pending_review', 'rejected'])
        .order('created_at', { ascending: false })

      if (reportsError) throw reportsError

      console.log('✅ Reportes cargados:', reportsData?.length || 0)
      setReports(reportsData || [])
    } catch (error: any) {
      console.error('❌ Error loading reports:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedReport) return

    try {
      setActionLoading(true)
      setError('')

      const { error } = await supabase
        .from('biweekly_reports')
        .update({
          status: 'approved',
          reviewed_by: profile!.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedReport.id)

      if (error) throw error

      setSuccess('Informe aprobado correctamente')
      setShowApproveDialog(false)
      setCorrectionNotes('')
      loadReports()
    } catch (error: any) {
      console.error('Error approving report:', error)
      setError(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedReport || !rejectionReason.trim()) {
      setError('Debes proporcionar un motivo de rechazo')
      return
    }

    try {
      setActionLoading(true)
      setError('')

      const { error } = await supabase
        .from('biweekly_reports')
        .update({
          status: 'rejected',
          reviewed_by: profile!.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedReport.id)

      if (error) throw error

      setSuccess('Informe devuelto para correcciones')
      setShowRejectDialog(false)
      setRejectionReason('')
      setCorrectionNotes('')
      loadReports()
    } catch (error: any) {
      console.error('Error rejecting report:', error)
      setError(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: any }> = {
      pending_review: { label: 'Pendiente Revisión', variant: 'secondary', icon: Clock },
      rejected: { label: 'Rechazado', variant: 'destructive', icon: AlertCircle },
      approved: { label: 'Aprobado', variant: 'default', icon: CheckCircle },
      draft: { label: 'Borrador', variant: 'secondary', icon: FileText }
    }

    const config = statusConfig[status] || { label: status, variant: 'secondary', icon: FileText }
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-talento-green"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Revisión de Informes</h1>
        <p className="text-gray-600 mt-1">
          Revisa y aprueba los informes de tus proyectos
        </p>
      </div>

      {/* Alerts */}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground">
              Informes esperando revisión
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes Revisión</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.status === 'pending_review').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Primera revisión
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Correcciones</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.status === 'corrections').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Esperando correcciones
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Reportes */}
      <Card>
        <CardHeader>
          <CardTitle>Informes Pendientes</CardTitle>
          <CardDescription>
            Informes que requieren tu revisión y aprobación
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ¡Todo al día!
              </h3>
              <p className="text-gray-500">
                No hay informes pendientes de revisión
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{report.short_title || report.long_title || `Informe ${report.report_number || ''}`}</h3>
                      {getStatusBadge(report.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {report.project?.name} • {report.project?.project_code}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        N° {report.report_number || 'Sin número'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Creado {new Date(report.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Link href={`/reports/biweekly/${report.id}/preview`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Ver
                      </Button>
                    </Link>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setSelectedReport(report)
                        setShowApproveDialog(true)
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprobar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedReport(report)
                        setShowRejectDialog(true)
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rechazar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Aprobar Reporte */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar Reporte</DialogTitle>
            <DialogDescription>
              El reporte será enviado al gerente para aprobación final
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Notas de Revisión (opcional)</Label>
              <Textarea
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                placeholder="Comentarios o sugerencias para el residente..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveDialog(false)
                setCorrectionNotes('')
              }}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleApprove} disabled={actionLoading}>
              {actionLoading ? 'Aprobando...' : 'Aprobar Reporte'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Rechazar Reporte */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Correcciones</DialogTitle>
            <DialogDescription>
              El reporte será devuelto al residente para correcciones
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Motivo del Rechazo *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explica qué debe corregirse..."
                rows={3}
                required
              />
            </div>

            <div>
              <Label>Notas Adicionales (opcional)</Label>
              <Textarea
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                placeholder="Comentarios adicionales..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false)
                setRejectionReason('')
                setCorrectionNotes('')
              }}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading || !rejectionReason.trim()}
            >
              {actionLoading ? 'Enviando...' : 'Solicitar Correcciones'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
