import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { project_id, period_start, period_end, report_type } = await request.json()

    // Obtener datos del proyecto
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        companies (*)
      `)
      .eq('id', project_id)
      .single()

    if (projectError) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Obtener bitácoras del período
    const { data: daily_logs, error: logsError } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('project_id', project_id)
      .gte('date', period_start)
      .lte('date', period_end)
      .order('date', { ascending: true })

    if (logsError) {
      return NextResponse.json({ error: 'Error al obtener bitácoras' }, { status: 500 })
    }

    // Crear registro del reporte (sin PDF por ahora)
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        project_id,
        report_type,
        period_start,
        period_end,
        status: 'borrador',
        content: {
          project,
          daily_logs,
          generated_at: new Date().toISOString(),
          generated_by: user.id
        },
        created_by: user.id
      })
      .select()
      .single()

    if (reportError) {
      return NextResponse.json({ error: 'Error al crear reporte' }, { status: 500 })
    }

    // Por ahora retornamos el reporte sin PDF
    // TODO: Implementar generación de PDF con react-pdf o puppeteer
    return NextResponse.json({
      success: true,
      report: {
        ...report,
        message: 'Reporte creado exitosamente. Generación de PDF pendiente de implementar.'
      }
    })

  } catch (error) {
    console.error('Error generando reporte:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
