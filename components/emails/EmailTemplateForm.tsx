'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

export interface EmailTemplate {
  id?: string
  template_type: string
  template_name: string
  subject: string
  html_content: string
  variables?: string[]
  is_active?: boolean
}

interface EmailTemplateFormProps {
  template?: EmailTemplate | null
  onSuccess?: () => void
  redirectTo?: string
}

export function EmailTemplateForm({ template, onSuccess, redirectTo }: EmailTemplateFormProps) {
  const supabase = createClient()
  const { profile } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [useIframePreview, setUseIframePreview] = useState(true)
  const [useSampleValues, setUseSampleValues] = useState(true)
  const [testEmail, setTestEmail] = useState('')
  const [formData, setFormData] = useState<EmailTemplate>({
    template_type: template?.template_type || '',
    template_name: template?.template_name || '',
    subject: template?.subject || '',
    html_content: template?.html_content || '',
    variables: template?.variables || [],
    is_active: template?.is_active ?? true
  })

  const handleChange = (field: keyof EmailTemplate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const sampleVariables: Record<string, string> = {
    full_name: 'María González',
    email: 'maria@empresa.com',
    company_name: 'Constructora Atlas',
    project_name: 'Torre Central',
    login_url: 'https://beta.talentoinmobiliario.com/login',
    report_number: 'Informe #3'
  }

  const getPreviewHtml = () => {
    if (!useSampleValues) return formData.html_content
    return Object.keys(sampleVariables).reduce((result, key) => {
      return result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), sampleVariables[key])
    }, formData.html_content)
  }

  const handleSendTestEmail = async () => {
    try {
      if (!formData.template_type) {
        alert('Debes definir el tipo de plantilla antes de enviar prueba.')
        return
      }

      if (!testEmail.trim()) {
        alert('Ingresa un email para enviar la prueba.')
        return
      }

      const response = await fetch('/api/emails/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType: formData.template_type,
          to: testEmail.trim(),
          variables: useSampleValues ? sampleVariables : {}
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'No se pudo enviar el correo')
      }

      alert('✅ Correo de prueba enviado')
    } catch (error: any) {
      console.error('Error enviando correo de prueba:', error)
      alert('Error enviando correo: ' + (error?.message || 'desconocido'))
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)

    try {
      if (!formData.template_type || !formData.template_name || !formData.subject || !formData.html_content) {
        alert('Todos los campos son requeridos')
        return
      }

      const payload = {
        template_type: formData.template_type.trim(),
        template_name: formData.template_name.trim(),
        subject: formData.subject.trim(),
        html_content: formData.html_content,
        variables: formData.variables || [],
        is_active: formData.is_active ?? true,
        updated_by: profile?.id || null
      }

      if (template?.id) {
        const { error } = await (supabase
          .from('email_templates') as any)
          .update(payload)
          .eq('id', template.id)

        if (error) throw error
      } else {
        const { error } = await (supabase
          .from('email_templates') as any)
          .insert({
            ...payload,
            created_by: profile?.id || null
          })

        if (error) throw error
      }

      alert('✅ Plantilla guardada')
      onSuccess?.()
      if (redirectTo) {
        router.push(redirectTo)
      }
    } catch (error: any) {
      console.error('Error saving email template:', error)
      alert('Error al guardar plantilla: ' + (error?.message || 'desconocido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="template_type">Tipo *</Label>
          <Input
            id="template_type"
            value={formData.template_type}
            onChange={(e) => handleChange('template_type', e.target.value)}
            placeholder="welcome_user"
            disabled={!!template?.id}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="template_name">Nombre *</Label>
          <Input
            id="template_name"
            value={formData.template_name}
            onChange={(e) => handleChange('template_name', e.target.value)}
            placeholder="Bienvenida de Usuario"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Asunto *</Label>
        <Input
          id="subject"
          value={formData.subject}
          onChange={(e) => handleChange('subject', e.target.value)}
          placeholder="Bienvenido(a) a Talento"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="html_content">Contenido HTML *</Label>
        <Textarea
          id="html_content"
          value={formData.html_content}
          onChange={(e) => handleChange('html_content', e.target.value)}
          rows={14}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Vista previa</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUseSampleValues((prev) => !prev)}
          >
            {useSampleValues ? 'Valores reales' : 'Valores demo'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUseIframePreview((prev) => !prev)}
          >
            {useIframePreview ? 'Vista inline' : 'Vista aislada'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((prev) => !prev)}
          >
            {showPreview ? 'Ocultar' : 'Mostrar'}
          </Button>
        </div>
      </div>

      {showPreview && (
        <div className="border rounded-lg bg-white p-4">
          {useIframePreview ? (
            <iframe
              title="Vista previa email"
              className="w-full min-h-[300px] border-0"
              srcDoc={getPreviewHtml()}
            />
          ) : (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
        <div className="space-y-2">
          <Label htmlFor="test_email">Enviar prueba a</Label>
          <Input
            id="test_email"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="tu-correo@empresa.com"
          />
          <p className="text-xs text-gray-500">
            Guarda la plantilla para asegurar que el envío use la última versión.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={handleSendTestEmail}>
          Enviar prueba
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => handleChange('is_active', checked)}
        />
        <span className="text-sm text-gray-600">Plantilla activa</span>
      </div>

      {formData.variables && formData.variables.length > 0 && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Variables disponibles</p>
          <div className="flex flex-wrap gap-2">
            {formData.variables.map(variable => (
              <span key={variable} className="text-xs bg-white border rounded px-2 py-1 text-gray-600">
                {'{{' + variable + '}}'}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar Plantilla'}
        </Button>
      </div>
    </form>
  )
}
