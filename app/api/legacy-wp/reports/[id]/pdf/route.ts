import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { renderPdf } from '@/lib/print/chromium'
import { loadPdfAssets } from '@/lib/print/pdf-assets'
import {
  REPORT_PDFS_BUCKET,
  buildLegacyReportPdfHtml,
  legacyReportPdfFileName,
  legacyReportPdfPath,
  type LegacyReportForPdf
} from '@/lib/legacy-wp/report-pdf'

export const runtime = 'nodejs'
export const maxDuration = 120

// PDF de un informe histórico, generado en el servidor con Chromium para que
// salga igual para todos. Se guarda en un bucket privado (Vercel no puede
// responder archivos de más de 4,5 MB) y se entrega con una URL firmada.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // La lectura con la sesión del usuario aplica RLS: si no lo puede ver, no hay PDF
  const { data: report } = await supabase
    .from('legacy_wp_reports')
    .select('*, project:projects(name, project_code, client_company:companies!client_company_id(name))')
    .eq('id', id)
    .maybeSingle()
  if (!report) {
    return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })
  }

  const legacyReport = report as LegacyReportForPdf
  const storage = createAdminClient().storage.from(REPORT_PDFS_BUCKET)
  const objectPath = legacyReportPdfPath(legacyReport)
  const download = request.nextUrl.searchParams.has('download') ? { download: legacyReportPdfFileName(legacyReport) } : undefined

  let signed = await storage.createSignedUrl(objectPath, 300, download)
  if (signed.error) {
    try {
      const pdf = await renderPdf(buildLegacyReportPdfHtml(legacyReport, loadPdfAssets()))
      const { error: uploadError } = await storage.upload(objectPath, pdf, { contentType: 'application/pdf', upsert: false })
      if (uploadError && !/exists|duplicate/i.test(uploadError.message)) throw uploadError
    } catch (error) {
      console.error('Error generando el PDF del informe histórico:', error)
      return NextResponse.json({ error: 'No se pudo generar el PDF' }, { status: 500 })
    }
    signed = await storage.createSignedUrl(objectPath, 300, download)
  }
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ error: 'No se pudo entregar el PDF' }, { status: 500 })
  }
  return NextResponse.redirect(signed.data.signedUrl)
}
