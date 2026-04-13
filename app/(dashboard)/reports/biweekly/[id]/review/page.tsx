'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Loader2,
  Send,
  XCircle,
} from 'lucide-react'

interface Report {
  id: string
  report_number: string | null
  short_title: string | null
  long_title: string | null
  status: string
  period_start: string
  period_end: string
  created_at: string
  rejection_reason?: string | null
  supervisor_notes?: string | null
  project?: {
    name: string
    project_code: string
  } | null
  creator?: {
    full_name: string
  } | null
}

const REVIEW_ROLES = ['supervisor', 'admin', 'super_admin']

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-800', icon: FileText },
  pending_review: { label: 'Pendiente Revisión', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-800', icon: XCircle },
  approved: { label: 'Aprobado', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  pending_signature: { label: 'Pendiente Firma', color: 'bg-purple-100 text-purple-800', icon: Send },
  published: { label: 'Publicado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </span>
  )
}

export default function ReviewBiweeklyReportPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const supabase = createClient()

  const reportId = params.id as string

  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [correctionNotes, setCorrectionNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!profile) return

    if (!REVIEW_ROLES.includes(profile.role)) {
      router.push('/dashboard')
      return
    }

    loadReport()
  }, [profile, reportId, router])

  const loadReport = async () => {
    try {
      setLoading(true)
      setError('')

      const { data, error: reportError } = await supabase
        .from('biweekly_reports')
        .select(`
          *,
          project:projects(name, project_code),
          creator:profiles!created_by(full_name)
        `)
        .eq('id', reportId)
        .single()

      if (reportError) throw reportError

      const normalizedReport = {
        ...data,
        project: Array.isArray(data?.project) ? data.project[0] : data?.project,
        creator: Array.isArray(data?.creator) ? data.creator[0] : data?.creator,
      } as Report

      setReport(normalizedReport)
    } catch (err: any) {
      console.error('Error loading report for review:', err)
      setError(err.message || 'No fue posible cargar el informe')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!report || !profile) return

    try {
      setActionLoading(true)
      setError('')
      setSuccess('')

      const { data: approved, error: approveError } = await supabase
        .rpc('approve_biweekly_report', {
          p_report_id: report.id,
          p_supervisor_id: profile.id,
          p_notes: correctionNotes.trim() || null,
        })

      if (approveError) throw approveError
      if (!approved) {
        throw new Error('No fue posible aprobar el informe. Verifica que siga pendiente de revisión.')
      }

      setReport((current) => (
        current
          ? {
              ...current,
              status: 'pending_signature',
              supervisor_notes: correctionNotes.trim() || current.supervisor_notes || null,
            }
          : current
      ))
      setSuccess('Informe aprobado y enviado a gerencia para firma.')
    } catch (err: any) {
      console.error('Error approving report:', err)
      setError(err.message || 'No fue posible aprobar el informe')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!report || !profile) return
    if (!rejectionReason.trim()) {
      setError('Debes indicar el motivo del rechazo.')
      return
    }

    const rejectionDetail = correctionNotes.trim()
      ? `${rejectionReason.trim()}\n\nNotas adicionales:\n${correctionNotes.trim()}`
      : rejectionReason.trim()

    try {
      setActionLoading(true)
      setError('')
      setSuccess('')

      const { data: rejected, error: rejectError } = await supabase
        .rpc('reject_biweekly_report', {
          p_report_id: report.id,
          p_supervisor_id: profile.id,
          p_reason: rejectionDetail,
        })

      if (rejectError) throw rejectError
      if (!rejected) {
        throw new Error('No fue posible rechazar el informe. Verifica que siga pendiente de revisión.')
      }

      setReport((current) => (
        current
          ? {
              ...current,
              status: 'rejected',
              rejection_reason: rejectionDetail,
            }
          : current
      ))
      setSuccess('Informe devuelto al residente para correcciones.')
    } catch (err: any) {
      console.error('Error rejecting report:', err)
      setError(err.message || 'No fue posible rechazar el informe')
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600">{error || 'Informe no encontrado'}</p>
          <Link href="/reports/biweekly">
            <Button className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Informes
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/reports/biweekly" className="mb-3 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver a Informes
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Revisión de Informe Quincenal</h1>
          <p className="mt-1 text-gray-600">Revisa el informe y decide si pasa a firma de gerencia o si vuelve con correcciones.</p>
        </div>
        <Link href={`/reports/biweekly/${report.id}/preview`}>
          <Button variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            Ver vista previa
          </Button>
        </Link>
      </div>

      {success && (
        <Alert className="border-green-200 bg-green-50">
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

      {report.status !== 'pending_review' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Este informe ya no está en estado de revisión. Estado actual: <strong>{STATUS_CONFIG[report.status]?.label || report.status}</strong>.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{report.short_title || report.long_title || 'Informe quincenal'}</CardTitle>
          <CardDescription>Resumen operativo del informe a revisar</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-sm text-gray-500">Número</p>
            <p className="font-medium text-gray-900">{report.report_number || 'Sin número'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Proyecto</p>
            <p className="font-medium text-gray-900">{report.project?.project_code} - {report.project?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Período</p>
            <p className="font-medium text-gray-900">{formatDate(report.period_start)} - {formatDate(report.period_end)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Estado</p>
            <div className="pt-1">
              <StatusBadge status={report.status} />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Creado por</p>
            <p className="font-medium text-gray-900">{report.creator?.full_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Fecha de creación</p>
            <p className="font-medium text-gray-900">{formatDate(report.created_at)}</p>
          </div>
        </CardContent>
      </Card>

      {report.rejection_reason && (
        <Card>
          <CardHeader>
            <CardTitle>Último motivo de corrección</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{report.rejection_reason}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Decisión de revisión</CardTitle>
          <CardDescription>Estas acciones usan el workflow operativo de `biweekly_reports`.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="review-notes">Notas de revisión</Label>
            <Textarea
              id="review-notes"
              value={correctionNotes}
              onChange={(event) => setCorrectionNotes(event.target.value)}
              placeholder="Comentarios o sugerencias para el residente..."
              rows={5}
              disabled={actionLoading || report.status !== 'pending_review'}
            />
          </div>

          <div>
            <Label htmlFor="rejection-reason">Motivo del rechazo</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Indica qué debe corregirse si decides devolver el informe..."
              rows={4}
              disabled={actionLoading || report.status !== 'pending_review'}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading || report.status !== 'pending_review' || !rejectionReason.trim()}
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Solicitar correcciones
            </Button>
            <Button
              onClick={handleApprove}
              disabled={actionLoading || report.status !== 'pending_review'}
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Aprobar y enviar a gerencia
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
