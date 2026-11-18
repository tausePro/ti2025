import { describe, expect, it } from 'vitest'
import { isAllowedPrintResource } from '../print-security'
import { buildReportPdfHtml, pdfPhotoGrid, pdfSection } from '../report-pdf-template'
import {
  LEGACY_PDF_VERSION,
  buildLegacyReportPdfHtml,
  fitTablesForPrint,
  legacyReportPdfFileName,
  legacyReportPdfPath,
  type LegacyReportForPdf
} from '../../legacy-wp/report-pdf'

describe('isAllowedPrintResource', () => {
  it('permite datos embebidos e imágenes públicas por HTTPS', () => {
    expect(isAllowedPrintResource('data:image/jpeg;base64,AAAA', 'image')).toBe(true)
    expect(isAllowedPrintResource('https://x.supabase.co/storage/v1/object/public/legacy-wp-media/a.jpg', 'image')).toBe(true)
    expect(isAllowedPrintResource('https://www.indika.com.co/foto.jpg', 'image')).toBe(true)
  })

  it('bloquea direcciones internas, HTTP y recursos que no son imágenes o fuentes', () => {
    expect(isAllowedPrintResource('http://x.supabase.co/a.jpg', 'image')).toBe(false)
    expect(isAllowedPrintResource('https://169.254.169.254/latest/meta-data', 'image')).toBe(false)
    expect(isAllowedPrintResource('https://[::1]/a.png', 'image')).toBe(false)
    expect(isAllowedPrintResource('https://localhost/a.png', 'image')).toBe(false)
    expect(isAllowedPrintResource('https://metadata.google.internal/a', 'image')).toBe(false)
    expect(isAllowedPrintResource('https://servidor.local/a.png', 'image')).toBe(false)
    expect(isAllowedPrintResource('https://usuario:clave@x.com/a.png', 'image')).toBe(false)
    expect(isAllowedPrintResource('https://x.com/script.js', 'script')).toBe(false)
    expect(isAllowedPrintResource('https://x.com/pagina', 'document')).toBe(false)
  })
})

describe('plantilla del PDF', () => {
  it('escapa los textos y omite los datos vacíos del cuadro', () => {
    const html = buildReportPdfHtml({
      docType: 'Informe',
      title: 'Informe <1>',
      subtitle: [['Proyecto', 'Torre "A"']],
      info: [['Período', 'Octubre de 2021'], ['Informe N°', null], ['Cliente', '']],
      body: pdfSection('Avance & obra', '<p>Texto</p>') + pdfPhotoGrid('Fotos', [{ url: 'https://x.co/a.jpg?b=1&c=2', caption: 'Fachada' }]),
      membreteDataUrl: 'data:image/jpeg;base64,AAAA'
    })
    expect(html).toContain('<h1 class="doc-title">Informe &lt;1&gt;</h1>')
    expect(html).toContain('<strong>Proyecto:</strong> Torre &quot;A&quot;')
    expect(html).toContain('Octubre de 2021')
    expect(html).not.toContain('Informe N°')
    expect(html).toContain('<div class="section-title">Avance &amp; obra</div><div class="section-content"><p>Texto</p></div>')
    expect(html).toContain('src="https://x.co/a.jpg?b=1&amp;c=2"')
    expect(html).toContain('<img class="membrete" src="data:image/jpeg;base64,AAAA"')
  })

  it('no agrega galería si no hay fotos', () => {
    expect(pdfPhotoGrid('Fotos', [])).toBe('')
  })
})

describe('PDF del informe histórico', () => {
  const report: LegacyReportForPdf = {
    id: '6aeb9bfc-bd76-49b6-84fc-fba45a1512e8',
    wp_post_id: 66877,
    title: 'INFORME DE SUPERVISION TECNICA INDEPENDIENTE',
    short_title: 'INFORME MENSUAL N°12 DEL 1 AL 31 DE OCTUBRE DE 2026',
    report_kind: 'mensual',
    report_number: 12,
    period_start: '2026-10-01',
    period_end: '2026-10-31',
    period_source: 'rango_del_titulo',
    notified_on: null,
    sections: [
      { key: 'informacion-general', title: 'Información General', html: 'Texto\r\n\r\n<table width="900" style="width: 900px;height: 40px"><tr><td style="width: 450px">a</td></tr></table>' },
      { key: 'registro-fotografico-galeria', title: 'Registro', gallery: true },
      { key: 'seccion-ii', title: 'Sección II', html: '<p>Final</p>' }
    ],
    photos_title: null,
    photos: [{ url: 'https://x.co/foto.jpg', sort_order: 0 }],
    signatures: { residente: true, directora_general: false },
    director_de_obra: 'Nombre del director',
    director_de_obra_matricula: '05202',
    author_name: 'Nombre del autor',
    wp_created_at: '2026-11-04T15:00:00Z',
    updated_at: '2026-11-10T21:48:22.06143+00:00',
    project: { name: 'Sonora Montana Etapa 1', project_code: 'PROJ-2026-0016', client_company: { name: 'Coninsa S.A.S.' } }
  }

  it('arma el documento con los datos, las secciones y la galería en su lugar', () => {
    const html = buildLegacyReportPdfHtml(report, { membreteDataUrl: 'data:image/jpeg;base64,AAAA', generatedAt: new Date('2026-11-11T15:00:00Z') })
    expect(html).toContain('INFORME MENSUAL N°12 DEL 1 AL 31 DE OCTUBRE DE 2026')
    expect(html).toContain('Sonora Montana Etapa 1 · PROJ-2026-0016')
    expect(html).toContain('1 al 31 de octubre de 2026')
    expect(html).toContain('Nombre del director · Mat. 05202')
    expect(html).toContain('<span class="info-value">Residente</span>')
    expect(html).toContain('<span class="info-value">Coninsa S.A.S.</span>')
    expect(html.indexOf('Registro fotográfico')).toBeGreaterThan(html.indexOf('Información General'))
    expect(html.indexOf('Registro fotográfico')).toBeLessThan(html.indexOf('Sección II'))
    expect(html).toContain('PDF generado el 11 de noviembre de 2026')
    expect(html).not.toContain('loading="lazy"')
    expect(html).not.toContain('900px')
  })

  it('quita anchos fijos en píxeles y conserva los porcentajes', () => {
    expect(fitTablesForPrint('<table width="900" style="width: 900px;height: 40px"><td width="50%" style="width: 120px">'))
      .toBe('<table style="height: 40px"><td width="50%" style="">')
    expect(fitTablesForPrint('<table style="border-collapse: collapse;width: 100%">'))
      .toBe('<table style="border-collapse: collapse;width: 100%">')
    expect(fitTablesForPrint('<td style="min-width: 300px">')).toBe('<td style="min-width: 300px">')
  })

  it('usa una ruta que cambia con la versión de la plantilla y un nombre de archivo limpio', () => {
    expect(legacyReportPdfPath(report)).toBe(`legacy/${report.id}/v${LEGACY_PDF_VERSION}-${Date.parse(report.updated_at)}.pdf`)
    expect(legacyReportPdfFileName(report)).toBe('Informe_PROJ-2026-0016_2026-10-01.pdf')
    expect(legacyReportPdfFileName({ ...report, period_start: null, project: { name: 'Año Ñ', project_code: 'HIST-3414' } }))
      .toBe('Informe_HIST-3414_2026-11-04.pdf')
  })
})
