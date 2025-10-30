import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      projectId, 
      periodStart, 
      periodEnd, 
      sectionKey,
      regenerate = false 
    } = body

    if (!projectId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    // 1. Recopilar datos del período
    const { data: sourceData, error: dataError } = await supabase
      .rpc('collect_report_data', {
        p_project_id: projectId,
        p_period_start: periodStart,
        p_period_end: periodEnd
      })

    if (dataError) {
      console.error('Error collecting data:', dataError)
      return NextResponse.json(
        { error: 'Error al recopilar datos del proyecto' },
        { status: 500 }
      )
    }

    // 2. Obtener configuración de IA
    const { data: aiConfig } = await supabase
      .from('ai_writing_config')
      .select('*')
      .eq('is_global', true)
      .eq('is_active', true)
      .single()

    // 3. Obtener secciones a generar
    let sectionsToGenerate: any[] = []
    
    if (sectionKey) {
      // Generar solo una sección específica
      const { data: section } = await supabase
        .from('report_sections')
        .select('*')
        .eq('section_key', sectionKey)
        .single()
      
      if (section) sectionsToGenerate = [section]
    } else {
      // Generar todas las secciones
      const { data: sections } = await supabase
        .from('report_sections')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
      
      sectionsToGenerate = sections || []
    }

    // 4. Generar contenido para cada sección con IA
    const generatedContent: any = {}
    let totalTokens = 0

    for (const section of sectionsToGenerate) {
      if (!section.use_ai) {
        // Si no usa IA, usar template estático
        generatedContent[section.section_key] = {
          title: section.section_title,
          content: section.content_template || ''
        }
        continue
      }

      // Preparar contexto para la IA
      const context = prepareContext(section, sourceData)
      
      // Generar contenido con OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: aiConfig?.system_prompt || 
              'Eres un ingeniero civil experto en redacción de informes técnicos de interventoría. Escribe de forma profesional, técnica y detallada.'
          },
          {
            role: 'user',
            content: `${section.ai_prompt}\n\nContexto del proyecto:\n${context}\n\nGenera el contenido en formato HTML profesional con etiquetas <h3>, <p>, <ul>, <li>, etc. No incluyas estilos inline.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      })

      const content = completion.choices[0]?.message?.content || ''
      totalTokens += completion.usage?.total_tokens || 0

      generatedContent[section.section_key] = {
        title: section.section_title,
        content: content
      }
    }

    return NextResponse.json({
      success: true,
      content: generatedContent,
      tokensUsed: totalTokens,
      sourceData: sourceData
    })

  } catch (error: any) {
    console.error('Error generating content:', error)
    return NextResponse.json(
      { error: error.message || 'Error al generar contenido' },
      { status: 500 }
    )
  }
}

function prepareContext(section: any, sourceData: any): string {
  const dataSources = section.data_sources || []
  let context = ''

  // Información del proyecto
  if (dataSources.includes('project_info') && sourceData.project_info) {
    const project = sourceData.project_info
    context += `\n## INFORMACIÓN DEL PROYECTO\n`
    context += `- Nombre: ${project.name}\n`
    context += `- Código: ${project.project_code}\n`
    context += `- Dirección: ${project.address}, ${project.city}\n`
    context += `- Cliente: ${project.client_company?.name || 'N/A'}\n`
    context += `- Presupuesto: $${project.budget?.toLocaleString() || 'N/A'}\n`
  }

  // Bitácoras diarias
  if (dataSources.includes('daily_logs') && sourceData.daily_logs?.length > 0) {
    context += `\n## BITÁCORAS DIARIAS (${sourceData.daily_logs.length} registros)\n`
    sourceData.daily_logs.forEach((log: any) => {
      context += `\n### ${log.date}\n`
      context += `- Actividades: ${log.activities || 'N/A'}\n`
      context += `- Personal: ${log.personnel_count || 0} personas\n`
      context += `- Clima: ${log.weather || 'N/A'}\n`
      if (log.observations) {
        context += `- Observaciones: ${log.observations}\n`
      }
    })
  }

  // Muestras de calidad
  if (dataSources.includes('quality_samples') && sourceData.quality_samples?.length > 0) {
    context += `\n## CONTROL DE CALIDAD (${sourceData.quality_samples.length} muestras)\n`
    sourceData.quality_samples.forEach((sample: any) => {
      context += `\n### Muestra ${sample.sample_number}\n`
      context += `- Tipo: ${sample.template_name}\n`
      context += `- Fecha: ${sample.sample_date}\n`
      context += `- Ubicación: ${sample.location}\n`
      context += `- Estado: ${sample.status}\n`
      context += `- Resultado: ${sample.overall_result || 'Pendiente'}\n`
      context += `- Ensayos: ${sample.tests_count} programados\n`
    })
  }

  // Fotos
  if (dataSources.includes('photos') && sourceData.photos?.length > 0) {
    context += `\n## REGISTRO FOTOGRÁFICO\n`
    context += `- Total de fotos: ${sourceData.photos.length}\n`
  }

  return context
}
