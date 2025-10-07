import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar que sea super_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'No tienes permisos para exportar métricas' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      company_id,
      metric_type,
      date_range = '30'
    } = body

    // Calcular fecha de inicio
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(date_range))

    // Construir query
    let query = supabase
      .from('performance_metrics')
      .select(`
        *,
        companies:company_id (
          id,
          name,
          company_type
        ),
        projects:project_id (
          id,
          name
        ),
        profiles:user_id (
          id,
          full_name,
          email
        )
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    // Aplicar filtros
    if (company_id) {
      query = query.eq('company_id', company_id)
    }
    if (metric_type) {
      query = query.eq('metric_type', metric_type)
    }

    const { data: metrics, error } = await query

    if (error) {
      console.error('Error fetching metrics for export:', error)
      return NextResponse.json(
        { error: 'Error al obtener métricas para exportar' },
        { status: 500 }
      )
    }

    // Generar CSV
    const headers = [
      'Fecha',
      'Tipo de Métrica',
      'Nombre de Métrica',
      'Valor',
      'Unidad',
      'Empresa',
      'Proyecto',
      'Usuario',
      'Metadata'
    ]

    const csvRows = [
      headers.join(','),
      ...(metrics || []).map(metric => [
        new Date(metric.created_at).toLocaleString(),
        metric.metric_type,
        metric.metric_name,
        metric.value,
        metric.unit || '',
        metric.companies?.name || '',
        metric.projects?.name || '',
        metric.profiles?.full_name || '',
        JSON.stringify(metric.metadata || {})
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ]

    const csvContent = csvRows.join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="metrics-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Error in metrics export API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}