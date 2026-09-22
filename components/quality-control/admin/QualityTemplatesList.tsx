'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Pencil, Copy, Power } from 'lucide-react'

export interface QualityTemplateRow {
  id: string
  template_name: string
  template_type: string
  description: string | null
  is_active: boolean
  is_global: boolean
  custom_fields: unknown[]
  test_configuration: {
    test_periods?: number[]
    named_tests?: unknown[]
  } | null
  samples_count?: number
}

const TYPE_LABELS: Record<string, string> = {
  concrete: 'Concreto',
  steel: 'Acero',
  soil: 'Suelos',
  mortar: 'Mortero',
  masonry: 'Mampostería',
  plumbing: 'Instalaciones',
  custom: 'Personalizado'
}

export function QualityTemplatesList({ templates: initialTemplates }: { templates: QualityTemplateRow[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [templates, setTemplates] = useState(initialTemplates)
  const [busyId, setBusyId] = useState<string | null>(null)

  const toggleActive = async (template: QualityTemplateRow) => {
    setBusyId(template.id)
    const { error } = await supabase
      .from('quality_control_templates')
      .update({ is_active: !template.is_active })
      .eq('id', template.id)
    if (!error) {
      setTemplates(prev =>
        prev.map(t => (t.id === template.id ? { ...t, is_active: !t.is_active } : t))
      )
    }
    setBusyId(null)
  }

  const duplicate = async (template: QualityTemplateRow) => {
    setBusyId(template.id)
    const { data: full, error: loadError } = await supabase
      .from('quality_control_templates')
      .select('*')
      .eq('id', template.id)
      .single()
    if (loadError || !full) {
      setBusyId(null)
      return
    }
    const { data: created, error } = await supabase
      .from('quality_control_templates')
      .insert({
        template_name: `${full.template_name} (copia)`,
        template_type: full.template_type,
        description: full.description,
        is_active: false,
        is_global: full.is_global,
        custom_fields: full.custom_fields,
        test_configuration: full.test_configuration,
        validation_rules: full.validation_rules
      })
      .select('id')
      .single()
    setBusyId(null)
    if (!error && created) {
      router.push(`/admin/quality-templates/${created.id}`)
    }
  }

  const describeTests = (template: QualityTemplateRow) => {
    const config = template.test_configuration
    if (config?.named_tests?.length) {
      return `${config.named_tests.length} ensayo${config.named_tests.length > 1 ? 's' : ''} definido${config.named_tests.length > 1 ? 's' : ''}`
    }
    if (config?.test_periods?.length) {
      return `Períodos: ${config.test_periods.join(', ')} días`
    }
    return 'Sin ensayos configurados'
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => router.push('/admin/quality-templates/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No hay plantillas de control de calidad.
          </CardContent>
        </Card>
      ) : (
        templates.map(template => (
          <Card key={template.id} className={template.is_active ? '' : 'opacity-60'}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{template.template_name}</h3>
                    <Badge variant="outline">
                      {TYPE_LABELS[template.template_type] || template.template_type}
                    </Badge>
                    {template.is_global && <Badge className="bg-blue-100 text-blue-800">Global</Badge>}
                    <Badge className={template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {template.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {Array.isArray(template.custom_fields) ? template.custom_fields.length : 0} campos
                    {' · '}
                    {describeTests(template)}
                    {typeof template.samples_count === 'number'
                      ? ` · ${template.samples_count} muestra${template.samples_count === 1 ? '' : 's'} registrada${template.samples_count === 1 ? '' : 's'}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Editar"
                    onClick={() => router.push(`/admin/quality-templates/${template.id}`)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Duplicar"
                    disabled={busyId === template.id}
                    onClick={() => duplicate(template)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title={template.is_active ? 'Desactivar' : 'Activar'}
                    disabled={busyId === template.id}
                    onClick={() => toggleActive(template)}
                  >
                    <Power className={`w-4 h-4 ${template.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
