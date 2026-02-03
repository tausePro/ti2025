import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTemplateEmail } from '@/lib/emails/sendTemplateEmail'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { templateType, to, variables, from } = body

    if (!templateType || !to) {
      return NextResponse.json({ error: 'templateType y to son requeridos' }, { status: 400 })
    }

    await sendTemplateEmail({
      templateType,
      to,
      variables: variables || {},
      from
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending template email:', error)
    return NextResponse.json({ error: error.message || 'Error enviando email' }, { status: 500 })
  }
}
