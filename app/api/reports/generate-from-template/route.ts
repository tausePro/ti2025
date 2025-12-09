import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { collectReportData } from '@/lib/reports/data-collector'
import { replacePlaceholders } from '@/lib/reports/placeholder-replacer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, templateId, periodStart, periodEnd } = body

    if (!projectId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // 1. Obtener plantilla - si se proporciona templateId, usar esa; sino buscar la default
    let template = null
    
    if (templateId) {
      // Usar la plantilla específica seleccionada por el usuario
      const { data: templateData, error: templateError } = await supabase
        .from('project_report_templates')
        .select('*')
        .eq('id', templateId)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .single()

      if (templateError || !templateData) {
        console.error('Error obteniendo plantilla específica:', templateError)
        return NextResponse.json(
          { error: 'Plantilla no encontrada o no activa' },
          { status: 404 }
        )
      }
      template = templateData
    } else {
      // Buscar plantilla default del proyecto
      const { data: templates, error: templateError } = await supabase
        .from('project_report_templates')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (templateError) {
        console.error('Error obteniendo plantilla:', templateError)
        return NextResponse.json(
          { error: 'Error al obtener plantilla del proyecto' },
          { status: 500 }
        )
      }

      template = templates?.[0]
    }

    if (!template) {
      return NextResponse.json(
        { error: 'No hay plantilla configurada para este proyecto. El supervisor debe crear una primero.' },
        { status: 404 }
      )
    }

    // 2. Obtener secciones de la plantilla
    const { data: sections, error: sectionsError } = await supabase
      .from('section_templates')
      .select('*')
      .eq('project_template_id', template.id)
      .eq('is_active', true)
      .order('section_order')

    if (sectionsError) {
      console.error('Error obteniendo secciones:', sectionsError)
      return NextResponse.json(
        { error: 'Error al obtener secciones de la plantilla' },
        { status: 500 }
      )
    }

    if (!sections || sections.length === 0) {
      return NextResponse.json(
        { error: 'La plantilla no tiene secciones configuradas' },
        { status: 404 }
      )
    }

    // 3. Recopilar datos del período
    console.log('📊 Recopilando datos del período...')
    const collectedData = await collectReportData(projectId, periodStart, periodEnd)

    // 4. Generar contenido reemplazando placeholders
    console.log('🔄 Generando contenido desde plantilla...')
    const content: any = {}
    const replacementContext = {
      project: collectedData.project,
      periodStart,
      periodEnd,
      dailyLogs: collectedData.dailyLogs,
      qualityControl: collectedData.qualityControl,
      photos: collectedData.photos,
      summary: collectedData.summary
    }

    sections.forEach(section => {
      // Usar base_content si existe, sino usar content_template
      const baseContent = section.base_content || section.content_template || ''
      
      // Reemplazar placeholders
      content[section.section_key] = replacePlaceholders(baseContent, replacementContext)
    })

    // 5. Generar títulos automáticos
    const startDate = new Date(periodStart)
    const endDate = new Date(periodEnd)
    
    const shortTitle = `Informe Quincenal ${startDate.toLocaleDateString('es-CO')} - ${endDate.toLocaleDateString('es-CO')}`
    const longTitle = `INFORME QUINCENAL DE INTERVENTORÍA Y SUPERVISIÓN TÉCNICA INDEPENDIENTE`

    // 6. Retornar contenido generado
    return NextResponse.json({
      success: true,
      content,
      shortTitle,
      longTitle,
      template: {
        id: template.id,
        name: template.template_name
      },
      sourceData: {
        dailyLogsCount: collectedData.dailyLogs.length,
        qualityControlCount: collectedData.qualityControl.length,
        photosCount: collectedData.photos.length,
        summary: collectedData.summary
      },
      message: 'Informe generado exitosamente desde plantilla del proyecto'
    })

  } catch (error: any) {
    console.error('❌ Error generando informe:', error)
    return NextResponse.json(
      { 
        error: 'Error al generar informe',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
