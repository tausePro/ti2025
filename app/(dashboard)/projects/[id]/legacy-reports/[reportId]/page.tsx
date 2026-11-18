'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Archive, ArrowLeft, Download, FileText, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LegacyReportFrame } from '@/components/legacy-wp/LegacyReportFrame'
import { buildLegacyReportDocument, type LegacyPhoto, type LegacySection } from '@/lib/legacy-wp/report-html'
import {
  LEGACY_REPORT_KIND_LABELS,
  formatLegacyDate,
  formatLegacyPeriod,
  legacySignatureList,
  type LegacyReportKind
} from '@/lib/legacy-wp/report-meta'

interface LegacyReport {
  id: string
  wp_post_id: number
  title: string
  short_title: string | null
  long_title: string | null
  report_kind: LegacyReportKind
  report_number: number | null
  period_start: string | null
  period_end: string | null
  period_source: string | null
  notified_on: string | null
  sections: LegacySection[]
  photos_title: string | null
  photos: LegacyPhoto[]
  signatures: Record<string, unknown> | null
  director_de_obra: string | null
  director_de_obra_matricula: string | null
  author_name: string | null
  wp_created_at: string
  project: { name: string; project_code: string | null } | null
}

export default function LegacyReportPage() {
  const params = useParams()
  const projectId = params.id as string
  const reportId = params.reportId as string
  const [report, setReport] = useState<LegacyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    createClient()
      .from('legacy_wp_reports')
      .select('*, project:projects(name, project_code)')
      .eq('id', reportId)
      .eq('project_id', projectId)
      .maybeSingle()
      .then(({ data, error: queryError }) => {
        if (!active) return
        if (queryError) setError(queryError.message)
        else if (!data) setError('Informe no encontrado o sin acceso')
        else setReport(data as LegacyReport)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectId, reportId])

  const document = useMemo(() => (report ? buildLegacyReportDocument(report) : ''), [report])
  const backHref = `/projects/${projectId}?tab=historico`

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al proyecto
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error || 'Informe no encontrado'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const period = formatLegacyPeriod(report.period_start, report.period_end, report.period_source)
  const signatures = legacySignatureList(report.signatures)
  const details: Array<[string, string | null]> = [
    ['Período', period ?? 'Sin dato en el título'],
    ['Informe N°', report.report_number ? String(report.report_number) : null],
    ['Publicado', formatLegacyDate(report.wp_created_at)],
    ['Notificado al residente', formatLegacyDate(report.notified_on)],
    ['Elaborado por', report.author_name],
    [
      'Director de obra',
      report.director_de_obra
        ? `${report.director_de_obra}${report.director_de_obra_matricula ? ` · Mat. ${report.director_de_obra_matricula}` : ''}`
        : null
    ],
    ['Firmas', signatures.length ? signatures.join(', ') : null]
  ]

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={backHref}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al proyecto
        </Link>
      </Button>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Archive className="h-3 w-3" />
                Plataforma anterior · solo lectura
              </Badge>
              <Badge variant="secondary">{LEGACY_REPORT_KIND_LABELS[report.report_kind]}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/legacy-wp/reports/${report.id}/pdf`} target="_blank" rel="noopener noreferrer">
                  <FileText className="mr-2 h-4 w-4" />
                  Ver PDF
                </a>
              </Button>
              <Button size="sm" asChild>
                <a href={`/api/legacy-wp/reports/${report.id}/pdf?download=1`}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar PDF
                </a>
              </Button>
            </div>
          </div>
          <div>
            {report.short_title && report.title !== report.short_title && (
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{report.title}</p>
            )}
            <h1 className="text-xl font-bold text-gray-900">{report.short_title || report.title}</h1>
            {report.project && (
              <p className="text-sm text-gray-500">
                {report.project.name}
                {report.project.project_code && ` · ${report.project.project_code}`}
              </p>
            )}
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {details.filter(([, value]) => value).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-gray-500">{label}</dt>
                <dd className="text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <LegacyReportFrame html={document} title={report.short_title || report.title} />
        </CardContent>
      </Card>
    </div>
  )
}
