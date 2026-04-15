import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { BatchDailyLogPdf } from '@/lib/print/BatchDailyLogPdf'
import { getCustomFieldLabelsMap } from '@/lib/utils'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const idsParam = searchParams.get('ids')
  const projectIdParam = searchParams.get('projectId')
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Construir query
    let query = supabase
      .from('daily_logs')
      .select(`
        *,
        created_by_profile:profiles!daily_logs_created_by_fkey(full_name, email)
      `)

    if (idsParam) {
      const ids = idsParam.split(',').filter(Boolean)
      if (ids.length === 0) {
        return NextResponse.json({ error: 'No se proporcionaron IDs válidos' }, { status: 400 })
      }
      query = query.in('id', ids)
    } else if (projectIdParam && (startParam || endParam)) {
      query = query.eq('project_id', projectIdParam)
      if (startParam) query = query.gte('date', startParam)
      if (endParam) query = query.lte('date', endParam)
    } else {
      return NextResponse.json({ error: 'Debes indicar IDs o rango de fechas' }, { status: 400 })
    }

    const { data: logs, error: logsError } = await (query as any).order('date', { ascending: true })
    if (logsError || !logs || logs.length === 0) {
      return NextResponse.json({ error: 'No se encontraron bitácoras' }, { status: 404 })
    }

    // Normalizar relaciones
    const normalizedLogs = logs.map((log: any) => ({
      ...log,
      created_by_profile: Array.isArray(log.created_by_profile) ? log.created_by_profile[0] : log.created_by_profile,
    }))

    // Convertir fotos a URLs públicas
    const logsWithUrls = normalizedLogs.map((log: any) => {
      if (log.photos && Array.isArray(log.photos) && log.photos.length > 0) {
        const publicUrls = log.photos.map((p: string) => {
          if (p.startsWith('http')) return p
          const { data: { publicUrl } } = supabase.storage.from('daily-logs-photos').getPublicUrl(p)
          return publicUrl
        })
        return { ...log, photos: publicUrls }
      }
      return log
    })

    // Cargar proyecto
    const projectId = logsWithUrls[0].project_id
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    // Cargar perfiles de residentes (únicos)
    const profileIds = Array.from(new Set(logsWithUrls.flatMap((l: any) => [l.created_by, l.assigned_to].filter(Boolean)))) as string[]
    const residents: Record<string, any> = {}
    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, professional_license, phone, signature_url')
        .in('id', profileIds)
      if (profiles) {
        profiles.forEach((p: any) => { residents[p.id] = p })
      }
    }

    // Labels de campos personalizados
    const { data: configData } = await supabase
      .from('daily_log_configs')
      .select('custom_fields')
      .eq('project_id', projectId)
      .maybeSingle()

    const storedLabels = (logsWithUrls[0]?.custom_fields as any)?._field_labels || {}
    const customFieldLabels = getCustomFieldLabelsMap(
      (configData?.custom_fields || []) as Array<{ id?: string; label?: string }>,
      storedLabels
    )

    // Leer membrete
    let membreteSrc = ''
    try {
      const membretePath = path.join(process.cwd(), 'public', 'brand', 'Membrete Talento Inmobiliario.jpg')
      const membreteBuffer = fs.readFileSync(membretePath)
      membreteSrc = `data:image/jpeg;base64,${membreteBuffer.toString('base64')}`
    } catch (e) {
      console.warn('No se pudo leer el membrete JPG:', e)
    }

    // Generar PDF
    const element = React.createElement(BatchDailyLogPdf, {
      logs: logsWithUrls,
      project,
      residents,
      customFieldLabels,
      membreteSrc,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(element as any)

    const projectCode = project?.project_code || 'PROJ'
    const startDate = logsWithUrls[0]?.date || 'inicio'
    const endDate = logsWithUrls[logsWithUrls.length - 1]?.date || 'fin'
    const filename = `Bitacoras_${projectCode}_${startDate}_a_${endDate}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error generando PDF batch:', error)
    return NextResponse.json({ error: 'Error generando el PDF' }, { status: 500 })
  }
}

export const maxDuration = 60
