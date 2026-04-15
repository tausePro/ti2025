import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { DailyLogPdf } from '@/lib/print/DailyLogPdf'
import { getCustomFieldLabelsMap } from '@/lib/utils'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const logId = searchParams.get('logId')

  if (!logId) {
    return NextResponse.json({ error: 'logId es requerido' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: log, error: logError } = await (supabase
      .from('daily_logs') as any)
      .select(`
        *,
        created_by_profile:profiles!daily_logs_created_by_fkey(full_name, email)
      `)
      .eq('id', logId)
      .single()

    if (logError || !log) {
      return NextResponse.json({ error: 'Bitácora no encontrada' }, { status: 404 })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', log.project_id)
      .single()

    const { data: assignedProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', log.assigned_to)
      .maybeSingle()

    const { data: residentProfile } = await supabase
      .from('profiles')
      .select('full_name, email, role, professional_license, phone, signature_url')
      .eq('id', log.created_by)
      .maybeSingle()

    const { data: configData } = await supabase
      .from('daily_log_configs')
      .select('custom_fields')
      .eq('project_id', log.project_id)
      .maybeSingle()

    const storedLabels = (log.custom_fields as any)?._field_labels || {}
    const customFieldLabels = getCustomFieldLabelsMap(
      (configData?.custom_fields || []) as Array<{ id?: string; label?: string }>,
      storedLabels
    )

    // Leer el JPG del membrete y convertir a data URL
    let membreteSrc = ''
    try {
      const membretePath = path.join(process.cwd(), 'public', 'brand', 'Membrete Talento Inmobiliario.jpg')
      const membreteBuffer = fs.readFileSync(membretePath)
      membreteSrc = `data:image/jpeg;base64,${membreteBuffer.toString('base64')}`
    } catch (e) {
      console.warn('No se pudo leer el membrete JPG:', e)
    }

    // Generar PDF con @react-pdf/renderer
    const element = React.createElement(DailyLogPdf, {
      log,
      project,
      assignedProfile,
      residentProfile,
      customFieldLabels,
      membreteSrc,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(element as any)

    const projectCode = project?.project_code || 'PROJ'
    const logDate = log.date || 'sin-fecha'
    const filename = `Bitacora_${projectCode}_${logDate}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error generando PDF:', error)
    return NextResponse.json(
      { error: 'Error generando el PDF' },
      { status: 500 }
    )
  }
}

export const maxDuration = 30
