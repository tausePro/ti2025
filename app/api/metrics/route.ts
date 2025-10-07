import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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
        { error: 'No tienes permisos para acceder a estas métricas' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const company_id = searchParams.get('company_id')
    const metric_type = searchParams.get('metric_type')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const limit = parseInt(searchParams.get('limit') || '100')

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
      .order('created_at', { ascending: false })
      .limit(limit)

    // Aplicar filtros
    if (company_id && company_id !== 'all') {
      query = query.eq('company_id', company_id)
    }
    if (metric_type && metric_type !== 'all') {
      query = query.eq('metric_type', metric_type)
    }
    if (date_from) {
      query = query.gte('created_at', date_from)
    }
    if (date_to) {
      query = query.lte('created_at', date_to)
    }

    const { data: metrics, error } = await query

    if (error) {
      console.error('Error fetching metrics:', error)
      return NextResponse.json(
        { error: 'Error al obtener métricas' },
        { status: 500 }
      )
    }

    return NextResponse.json({ metrics })
  } catch (error) {
    console.error('Error in metrics API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

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

    const body = await request.json()
    const {
      metric_type,
      metric_name,
      value,
      unit = 'ms',
      company_id,
      project_id,
      metadata = {}
    } = body

    // Validar datos requeridos
    if (!metric_type || !metric_name || value === undefined) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: metric_type, metric_name, value' },
        { status: 400 }
      )
    }

    // Insertar métrica
    const { data, error } = await supabase
      .from('performance_metrics')
      .insert({
        metric_type,
        metric_name,
        value,
        unit,
        company_id,
        project_id,
        user_id: user.id,
        metadata
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting metric:', error)
      return NextResponse.json(
        { error: 'Error al guardar métrica' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error in metrics POST API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}