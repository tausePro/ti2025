import { NextRequest, NextResponse } from 'next/server'
import { collectReportData, buildSourceSnapshot } from '@/lib/reports/data-collector'

/**
 * Recopila el snapshot de datos fuente (bitácoras, control de calidad y
 * fotos) de un proyecto para un período. Se usa al guardar el borrador
 * del informe quincenal para refrescar source_data y la lista de fotos
 * candidatas. Respeta RLS porque usa el cliente del usuario autenticado.
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, periodStart, periodEnd } = await request.json()

    if (!projectId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    const collected = await collectReportData(projectId, periodStart, periodEnd)
    const snapshot = buildSourceSnapshot(collected)

    return NextResponse.json({ success: true, snapshot })
  } catch (error: unknown) {
    console.error('❌ Error recopilando datos del informe:', error)
    const details = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Error al recopilar datos del informe', details },
      { status: 500 }
    )
  }
}
