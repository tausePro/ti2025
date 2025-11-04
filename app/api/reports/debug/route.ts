import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    
    // Test 1: Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Auth failed',
        details: authError?.message 
      }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, periodStart, periodEnd } = body

    // Test 2: Basic params
    if (!projectId || !periodStart || !periodEnd) {
      return NextResponse.json({
        error: 'Missing params',
        received: { projectId, periodStart, periodEnd }
      }, { status: 400 })
    }

    // Test 3: Check if function exists
    try {
      const { data: functions } = await supabase
        .rpc('collect_report_data', {
          p_project_id: projectId,
          p_period_start: periodStart,
          p_period_end: periodEnd
        })
      
      return NextResponse.json({
        success: true,
        message: 'Function works!',
        data: functions,
        user: user.email
      })
    } catch (rpcError: any) {
      return NextResponse.json({
        error: 'RPC failed',
        details: rpcError.message,
        code: rpcError.code
      }, { status: 500 })
    }

  } catch (error: any) {
    return NextResponse.json({
      error: 'General error',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
