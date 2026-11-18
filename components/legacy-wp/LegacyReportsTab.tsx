'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Archive, Eye, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  LEGACY_REPORT_KIND_LABELS,
  formatLegacyDate,
  formatLegacyPeriod,
  legacyReportYear,
  type LegacyReportKind
} from '@/lib/legacy-wp/report-meta'

interface LegacyReportRow {
  id: string
  title: string
  short_title: string | null
  report_kind: LegacyReportKind
  report_number: number | null
  period_start: string | null
  period_end: string | null
  period_source: string | null
  author_name: string | null
  wp_created_at: string
}

const KIND_COLORS: Record<LegacyReportKind, string> = {
  mensual: 'bg-blue-100 text-blue-800',
  quincenal: 'bg-green-100 text-green-800',
  otro: 'bg-gray-100 text-gray-800'
}

export function LegacyReportsTab({ projectId }: { projectId: string }) {
  const [reports, setReports] = useState<LegacyReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [kind, setKind] = useState('all')
  const [year, setYear] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    createClient()
      .from('legacy_wp_reports')
      .select('id,title,short_title,report_kind,report_number,period_start,period_end,period_source,author_name,wp_created_at')
      .eq('project_id', projectId)
      .order('period_start', { ascending: false, nullsFirst: false })
      .order('wp_created_at', { ascending: false })
      .then(({ data, error: queryError }) => {
        if (!active) return
        if (queryError) setError(queryError.message)
        else setReports((data ?? []) as LegacyReportRow[])
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectId])

  const years = useMemo(
    () => Array.from(new Set(reports.map(legacyReportYear).filter((value): value is number => value !== null))).sort((a, b) => b - a),
    [reports]
  )
  const term = search.trim().toLowerCase()
  const visible = reports.filter(report =>
    (kind === 'all' || report.report_kind === kind) &&
    (year === 'all' || String(legacyReportYear(report)) === year) &&
    (!term || `${report.short_title ?? ''} ${report.title} ${report.author_name ?? ''}`.toLowerCase().includes(term))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Archive className="h-5 w-5 text-gray-500" />
          Informes de la plataforma anterior
        </CardTitle>
        <CardDescription>
          {reports.length} informes publicados en WordPress
          {years.length > 0 && ` entre ${years[years.length - 1]} y ${years[0]}`}. Son de solo lectura.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por título o autor..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="md:w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {(Object.keys(LEGACY_REPORT_KIND_LABELS) as LegacyReportKind[]).map(value => (
                <SelectItem key={value} value={value}>{LEGACY_REPORT_KIND_LABELS[value]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="md:w-36">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los años</SelectItem>
              {years.map(value => (
                <SelectItem key={value} value={String(value)}>{value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            {reports.length === 0 ? 'Este proyecto no tiene informes de la plataforma anterior.' : 'Ningún informe coincide con los filtros.'}
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {visible.map(report => (
              <div key={report.id} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge className={KIND_COLORS[report.report_kind]}>{LEGACY_REPORT_KIND_LABELS[report.report_kind]}</Badge>
                    <span className="truncate font-medium text-gray-900">{report.short_title || report.title}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>
                      Período: {formatLegacyPeriod(report.period_start, report.period_end, report.period_source) ?? 'sin dato'}
                    </span>
                    <span>Publicado: {formatLegacyDate(report.wp_created_at)}</span>
                    {report.author_name && <span>Por {report.author_name}</span>}
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${projectId}/legacy-reports/${report.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
