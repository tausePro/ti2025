import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const DEFAULT_FROM = process.env.RESEND_FROM || 'app@talentoinmobiliario.com'

export type EmailTemplatePayload = {
  templateType: string
  to: string
  variables: Record<string, string>
  from?: string
}

function replaceVariables(content: string, variables: Record<string, string>) {
  let result = content
  Object.entries(variables).forEach(([key, value]) => {
    const safeValue = value ?? ''
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), safeValue)
  })
  return result
}

export async function sendTemplateEmail({
  templateType,
  to,
  variables,
  from = DEFAULT_FROM
}: EmailTemplatePayload) {
  const supabase = createAdminClient()

  const { data: template, error } = await (supabase
    .from('email_templates') as any)
    .select('*')
    .eq('template_type', templateType)
    .eq('is_active', true)
    .single()

  if (error || !template) {
    throw new Error('Plantilla de email no encontrada o inactiva')
  }

  const subject = replaceVariables(template.subject, variables)
  const html = replaceVariables(template.html_content, variables)

  const result = await resend.emails.send({
    from,
    to,
    subject,
    html
  })

  if (result.error) {
    throw new Error(result.error.message)
  }

  return result
}
