import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { QualityReportPdf } from '@/lib/print/QualityReportPdf'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sampleId = searchParams.get('sampleId')

  if (!sampleId) {
    return NextResponse.json({ error: 'sampleId es requerido' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: sample, error: sampleError } = await supabase
      .from('quality_control_samples')
      .select(`
        *,
        template:quality_control_templates(
          template_name,
          custom_fields,
          test_configuration
        )
      `)
      .eq('id', sampleId)
      .single()

    if (sampleError || !sample) {
      return NextResponse.json({ error: 'Muestra no encontrada' }, { status: 404 })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('name, project_code, address, city')
      .eq('id', sample.project_id)
      .single()

    const { data: tests, error: testsError } = await supabase
      .from('quality_control_tests')
      .select(`
        *,
        results:quality_control_results(
          specimen_number,
          result_value,
          result_data,
          meets_criteria,
          deviation_percentage,
          notes
        )
      `)
      .eq('sample_id', sampleId)
      .order('test_period')

    if (testsError) {
      throw testsError
    }

    // Leer el JPG del membrete y convertir a data URL
    let membreteSrc = ''
    try {
      const membretePath = path.join(process.cwd(), 'public', 'brand', 'Membrete Talento Inmobiliario.jpg')
      const membreteBuffer = fs.readFileSync(membretePath)
      membreteSrc = `data:image/jpeg;base64,${membreteBuffer.toString('base64')}`
    } catch (e) {
      console.warn('No se pudo leer el membrete JPG:', e)
    }

    const template = Array.isArray(sample.template) ? sample.template[0] : sample.template

    const element = React.createElement(QualityReportPdf, {
      sample,
      project: project || null,
      template: template || null,
      tests: (tests || []).map(test => ({
        ...test,
        results: (test.results || []).sort(
          (a: { specimen_number: number }, b: { specimen_number: number }) =>
            a.specimen_number - b.specimen_number
        )
      })),
      membreteSrc,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(element as any)

    const filename = `Informe_Calidad_${sample.sample_code || sample.sample_number}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error generando PDF de control de calidad:', error)
    return NextResponse.json(
      { error: 'Error generando el PDF' },
      { status: 500 }
    )
  }
}

export const maxDuration = 30
