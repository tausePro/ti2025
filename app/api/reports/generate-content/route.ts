import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// OpenAI se configura dinámicamente desde la BD o env
async function getOpenAIClient(supabase: any) {
  // Primero intentar obtener de la BD
  const { data: aiSettings } = await supabase
    .from('ai_settings')
    .select('api_key, model_name, temperature, max_tokens')
    .eq('provider', 'openai')
    .eq('is_active', true)
    .single()

  let apiKey = aiSettings?.api_key || process.env.OPENAI_API_KEY
  
  if (!apiKey) return null

  const OpenAI = require('openai')
  return {
    client: new OpenAI({ apiKey }),
    config: {
      model: aiSettings?.model_name || 'gpt-4o',
      temperature: aiSettings?.temperature || 0.7,
      max_tokens: aiSettings?.max_tokens || 2000
    }
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Request body:', body)
    
    const { 
      projectId, 
      periodStart, 
      periodEnd, 
      sectionKey,
      regenerate = false 
    } = body

    if (!projectId || !periodStart || !periodEnd) {
      console.error('Missing required params:', { projectId, periodStart, periodEnd })
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    // 1. Recopilar datos del período
    console.log('Calling collect_report_data with:', { projectId, periodStart, periodEnd })
    const { data: sourceData, error: dataError } = await supabase
      .rpc('collect_report_data', {
        p_project_id: projectId,
        p_period_start: periodStart,
        p_period_end: periodEnd
      })

    if (dataError) {
      console.error('Error collecting data:', dataError)
      return NextResponse.json(
        { error: 'Error al recopilar datos del proyecto: ' + dataError.message },
        { status: 500 }
      )
    }
    
    console.log('Source data collected:', sourceData)

    // 2. Obtener configuración de IA
    const { data: aiConfig } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('provider', 'openai')
      .eq('is_active', true)
      .single()

    // 3. Obtener secciones a generar
    let sectionsToGenerate: any[] = []
    
    if (sectionKey) {
      // Generar solo una sección específica
      const { data: section } = await supabase
        .from('section_templates')
        .select('*')
        .eq('section_key', sectionKey)
        .single()
      
      if (section) sectionsToGenerate = [section]
    } else {
      // Generar todas las secciones de la plantilla quincenal
      const { data: template } = await supabase
        .from('report_templates')
        .select('id')
        .eq('template_name', 'Informe Quincenal de Interventoría')
        .eq('is_active', true)
        .single()

      if (template) {
        const { data: sections } = await supabase
          .from('section_templates')
          .select('*')
          .eq('report_template_id', template.id)
          .eq('is_active', true)
          .order('section_order')
        
        sectionsToGenerate = sections || []
      }
    }

    // 4. Obtener cliente de OpenAI
    const openaiSetup = await getOpenAIClient(supabase)

    // 5. Generar contenido para cada sección con IA
    const generatedContent: any = {}
    let totalTokens = 0

    for (const section of sectionsToGenerate) {
      if (!section.use_ai) {
        // Si no usa IA, usar template estático
        generatedContent[section.section_key] = {
          title: section.section_name,
          content: section.content_template || ''
        }
        continue
      }

      // Preparar contexto para la IA
      const context = prepareContext(section, sourceData)
      
      let content = ''
      
      // Generar contenido con OpenAI si está disponible
      if (openaiSetup) {
        try {
          const completion = await openaiSetup.client.chat.completions.create({
            model: openaiSetup.config.model,
            messages: [
              {
                role: 'system',
                content: aiConfig?.system_prompt || 
                  'Eres un ingeniero civil experto en redacción de informes técnicos de interventoría. Escribe de forma profesional, técnica y detallada.'
              },
              {
                role: 'user',
                content: `${section.content_template}\n\nContexto del proyecto:\n${context}\n\nGenera el contenido en formato HTML profesional con etiquetas <h3>, <p>, <ul>, <li>, etc. No incluyas estilos inline.`
              }
            ],
            temperature: openaiSetup.config.temperature,
            max_tokens: openaiSetup.config.max_tokens,
          })

          content = completion.choices[0]?.message?.content || ''
          totalTokens += completion.usage?.total_tokens || 0

          // Registrar uso
          await supabase.rpc('log_ai_usage', {
            p_user_id: user.id,
            p_feature: 'biweekly_report',
            p_entity_type: 'section',
            p_entity_id: null,
            p_tokens_total: completion.usage?.total_tokens || 0,
            p_model: openaiSetup.config.model
          })
        } catch (error) {
          console.error('Error generating with OpenAI:', error)
          // Fallback: usar template con contexto
          content = `<div class="placeholder">
            <h3>${section.section_name}</h3>
            <p>${section.content_template}</p>
            <pre>${context}</pre>
          </div>`
        }
      } else {
        // Sin OpenAI: usar template con contexto básico
        content = `<div class="placeholder">
          <h3>${section.section_name}</h3>
          <p>${section.content_template}</p>
          <p><em>Nota: Configura la API key de OpenAI en Administración → Configuración de IA</em></p>
        </div>`
      }

      generatedContent[section.section_key] = {
        title: section.section_name,
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
    console.error('Error in generate-content API:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Error interno del servidor: ' + error.message },
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
