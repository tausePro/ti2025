// PDF de un informe histórico con el formato de la bitácora.

import { renderLegacyHtml, type LegacyPhoto, type LegacySection } from './report-html'
import {
  LEGACY_REPORT_KIND_LABELS,
  formatLegacyDate,
  formatLegacyPeriod,
  legacySignatureList,
  type LegacyReportKind
} from './report-meta'
import { buildReportPdfHtml, pdfPhotoGrid, pdfSection } from '../print/report-pdf-template'

// Subir cuando cambie la plantilla: los PDF guardados con otra versión se regeneran.
export const LEGACY_PDF_VERSION = 1
export const REPORT_PDFS_BUCKET = 'report-pdfs'

export interface LegacyReportForPdf {
  id: string
  wp_post_id: number
  title: string
  short_title: string | null
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
  updated_at: string
  project: { name: string; project_code: string | null; client_company?: { name: string } | null } | null
}

/**
 * Quita los anchos fijos en píxeles de tablas y celdas (en una hoja carta no
 * caben las tablas pensadas para pantalla). Los porcentajes se conservan.
 */
export function fitTablesForPrint(html: string): string {
  return html.replace(/<(table|td|th)\b([^>]*)>/gi, (_, name: string, attrs: string) => {
    const cleaned = attrs
      .replace(/\swidth\s*=\s*(["']?)\d+(?:px)?\1(?=[\s/]|$)/gi, '')
      .replace(/\sstyle\s*=\s*(["'])(.*?)\1/i, (_m, quote: string, css: string) => {
        const kept = css.split(';').filter(rule => !/^\s*width\s*:\s*[\d.]+px\s*$/i.test(rule)).join(';')
        return ` style=${quote}${kept}${quote}`
      })
    return `<${name}${cleaned}>`
  })
}

/** Ruta del PDF en Storage: cambia si se reimporta el informe o cambia la plantilla. */
export function legacyReportPdfPath(report: { id: string; updated_at: string }): string {
  return `legacy/${report.id}/v${LEGACY_PDF_VERSION}-${Date.parse(report.updated_at)}.pdf`
}

/** Nombre del archivo al descargar, sin tildes ni espacios. */
export function legacyReportPdfFileName(report: Pick<LegacyReportForPdf, 'period_start' | 'wp_created_at' | 'project'>): string {
  const code = report.project?.project_code || 'informe'
  const when = report.period_start ?? report.wp_created_at.slice(0, 10)
  const base = `Informe_${code}_${when}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_-]+/g, '-')
  return `${base}.pdf`
}

export function buildLegacyReportPdfHtml(
  report: LegacyReportForPdf,
  assets: { membreteDataUrl: string; fontCss?: string; generatedAt?: Date }
): string {
  const kind = LEGACY_REPORT_KIND_LABELS[report.report_kind] ?? 'Informe'
  const period = formatLegacyPeriod(report.period_start, report.period_end, report.period_source)
  const photos = [...(report.photos ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const gallery = pdfPhotoGrid(report.photos_title || 'Registro fotográfico', photos)
  let galleryPlaced = false
  const sections = (report.sections ?? [])
    .map(section => {
      if (section.gallery) {
        galleryPlaced = true
        return gallery
      }
      if (!section.html?.trim()) return ''
      return pdfSection(section.title, fitTablesForPrint(renderLegacyHtml(section.html, { lazy: false })))
    })
    .filter(Boolean)
    .join('\n')
  const project = report.project
  const director = report.director_de_obra
    ? `${report.director_de_obra}${report.director_de_obra_matricula ? ` · Mat. ${report.director_de_obra_matricula}` : ''}`
    : null
  const signatures = legacySignatureList(report.signatures)
  const published = formatLegacyDate(report.wp_created_at)
  const generated = formatLegacyDate((assets.generatedAt ?? new Date()).toISOString())

  return buildReportPdfHtml({
    docType: report.short_title && report.title !== report.short_title ? report.title : `Informe ${kind.toLowerCase()}`,
    title: report.short_title || report.title,
    subtitle: [
      ['Proyecto', project ? `${project.name}${project.project_code ? ` · ${project.project_code}` : ''}` : 'Sin proyecto'],
      ...(period ? [['Período', period] as [string, string]] : [])
    ],
    info: [
      ['Tipo de informe', kind],
      ['Informe N°', report.report_number ? String(report.report_number) : null],
      ['Cliente', project?.client_company?.name],
      ['Publicado', published],
      ['Notificado al residente', formatLegacyDate(report.notified_on)],
      ['Elaborado por', report.author_name],
      ['Director de obra', director],
      ['Firmas', signatures.length ? signatures.join(', ') : null]
    ],
    body: sections + (galleryPlaced ? '' : gallery),
    footerNote: `Reproducción del informe publicado en la plataforma anterior el ${published} (ID ${report.wp_post_id}). PDF generado el ${generated}.`,
    membreteDataUrl: assets.membreteDataUrl,
    fontCss: assets.fontCss
  })
}
