'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Save, Plus, Trash2, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface CustomField {
  name: string
  type: string
  label: string
  required?: boolean
  unit?: string
  options?: string[]
}

export interface QualityTemplateData {
  id?: string
  template_name: string
  template_type: string
  description: string | null
  is_active: boolean
  is_global: boolean
  custom_fields: CustomField[]
  test_configuration: Record<string, unknown> | null
  validation_rules: unknown[] | null
}

const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'select', label: 'Selección' },
  { value: 'date', label: 'Fecha' }
]

const TEMPLATE_TYPES = [
  { value: 'concrete', label: 'Concreto' },
  { value: 'steel', label: 'Acero' },
  { value: 'soil', label: 'Suelos' },
  { value: 'mortar', label: 'Mortero' },
  { value: 'masonry', label: 'Mampostería' },
  { value: 'plumbing', label: 'Instalaciones' },
  { value: 'custom', label: 'Personalizado' }
]

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function QualityTemplateForm({
  template,
  samplesCount = 0
}: {
  template?: QualityTemplateData
  samplesCount?: number
}) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = Boolean(template?.id)

  const [name, setName] = useState(template?.template_name || '')
  const [type, setType] = useState(template?.template_type || 'custom')
  const [description, setDescription] = useState(template?.description || '')
  const [isActive, setIsActive] = useState(template?.is_active ?? true)
  const [isGlobal, setIsGlobal] = useState(template?.is_global ?? true)
  const [fields, setFields] = useState<CustomField[]>(template?.custom_fields || [])
  const [testConfigJson, setTestConfigJson] = useState(
    JSON.stringify(template?.test_configuration ?? {}, null, 2)
  )
  const [validationRulesJson, setValidationRulesJson] = useState(
    JSON.stringify(template?.validation_rules ?? [], null, 2)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateField = (index: number, patch: Partial<CustomField>) => {
    setFields(prev => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  const moveField = (index: number, direction: -1 | 1) => {
    setFields(prev => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const handleSave = async () => {
    setError(null)

    if (!name.trim()) {
      setError('El nombre de la plantilla es obligatorio')
      return
    }
    for (const field of fields) {
      if (!field.name.trim() || !field.label.trim()) {
        setError('Todos los campos personalizados necesitan nombre interno y etiqueta')
        return
      }
      if (field.type === 'select' && (!field.options || field.options.length === 0)) {
        setError(`El campo "${field.label}" es de selección y no tiene opciones`)
        return
      }
    }
    const fieldNames = fields.map(f => f.name)
    if (new Set(fieldNames).size !== fieldNames.length) {
      setError('Hay campos personalizados con el mismo nombre interno')
      return
    }

    let testConfiguration: Record<string, unknown>
    try {
      testConfiguration = JSON.parse(testConfigJson)
      if (typeof testConfiguration !== 'object' || testConfiguration === null || Array.isArray(testConfiguration)) {
        throw new Error('debe ser un objeto JSON')
      }
    } catch (err) {
      setError(`Configuración de ensayos inválida: ${err instanceof Error ? err.message : 'JSON malformado'}`)
      return
    }

    let validationRules: unknown[]
    try {
      validationRules = JSON.parse(validationRulesJson)
      if (!Array.isArray(validationRules)) {
        throw new Error('debe ser una lista JSON')
      }
    } catch (err) {
      setError(`Reglas de validación inválidas: ${err instanceof Error ? err.message : 'JSON malformado'}`)
      return
    }

    setSaving(true)
    try {
      const payload = {
        template_name: name.trim(),
        template_type: type,
        description: description.trim() || null,
        is_active: isActive,
        is_global: isGlobal,
        custom_fields: fields,
        test_configuration: testConfiguration,
        validation_rules: validationRules
      }

      if (isEdit && template?.id) {
        const { error: updateError } = await supabase
          .from('quality_control_templates')
          .update(payload)
          .eq('id', template.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('quality_control_templates')
          .insert(payload)
        if (insertError) throw insertError
      }

      router.push('/admin/quality-templates')
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar la plantilla'
      setError(
        message.includes('duplicate') || message.includes('unique')
          ? 'Ya existe una plantilla con ese nombre'
          : message
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/quality-templates"
        className="inline-flex items-center text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver a Plantillas
      </Link>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {isEdit && samplesCount > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Esta plantilla tiene {samplesCount} muestra{samplesCount === 1 ? '' : 's'} registrada
            {samplesCount === 1 ? '' : 's'}. Los cambios en criterios y ensayos solo afectan la
            evaluación de resultados futuros; las muestras existentes conservan sus datos.
          </AlertDescription>
        </Alert>
      )}

      {/* Información básica */}
      <Card>
        <CardHeader>
          <CardTitle>Información Básica</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Nombre de la plantilla *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Tipo de material</Label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {TEMPLATE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>Descripción</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
            />
            <Label htmlFor="is_active">Activa (disponible al crear muestras)</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_global"
              checked={isGlobal}
              onChange={e => setIsGlobal(e.target.checked)}
            />
            <Label htmlFor="is_global">Global (visible en todos los proyectos)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Campos personalizados */}
      <Card>
        <CardHeader>
          <CardTitle>Campos del Formulario de Muestra</CardTitle>
          <CardDescription>
            Datos que el residente diligencia al registrar una muestra (elemento, resistencia esperada, proveedor, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Campo {index + 1}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => moveField(index, -1)} disabled={index === 0}>
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => moveField(index, 1)} disabled={index === fields.length - 1}>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFields(prev => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Etiqueta *</Label>
                  <Input
                    value={field.label}
                    onChange={e => {
                      const patch: Partial<CustomField> = { label: e.target.value }
                      if (!isEdit || !field.name) {
                        patch.name = slugify(e.target.value)
                      }
                      updateField(index, patch)
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Nombre interno *</Label>
                  <Input
                    value={field.name}
                    onChange={e => updateField(index, { name: slugify(e.target.value) })}
                    className="mt-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <select
                    value={field.type}
                    onChange={e => updateField(index, { type: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {FIELD_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Unidad</Label>
                  <Input
                    value={field.unit || ''}
                    onChange={e => updateField(index, { unit: e.target.value || undefined })}
                    placeholder="MPa, %, mm..."
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id={`required-${index}`}
                    checked={field.required || false}
                    onChange={e => updateField(index, { required: e.target.checked })}
                  />
                  <Label htmlFor={`required-${index}`} className="text-xs">Obligatorio</Label>
                </div>
                {field.type === 'select' && (
                  <div className="sm:col-span-3">
                    <Label className="text-xs">Opciones (una por línea) *</Label>
                    <Textarea
                      value={(field.options || []).join('\n')}
                      onChange={e =>
                        updateField(index, {
                          options: e.target.value.split('\n').filter(o => o.trim() !== '')
                        })
                      }
                      className="mt-1 font-mono text-xs"
                      rows={4}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() => setFields(prev => [...prev, { name: '', type: 'text', label: '', required: false }])}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Campo
          </Button>
        </CardContent>
      </Card>

      {/* Configuración de ensayos */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Ensayos (JSON)</CardTitle>
          <CardDescription>
            Períodos, criterios de aceptación, ensayos nombrados (named_tests) con métricas y unidades.
            Se valida el formato antes de guardar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={testConfigJson}
            onChange={e => setTestConfigJson(e.target.value)}
            className="font-mono text-xs"
            rows={16}
          />
        </CardContent>
      </Card>

      {/* Reglas de validación */}
      <Card>
        <CardHeader>
          <CardTitle>Reglas de Validación (JSON)</CardTitle>
          <CardDescription>
            Reglas de aceptación por período, por ejemplo: {'{"test_period": 28, "min_percentage": 100}'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={validationRulesJson}
            onChange={e => setValidationRulesJson(e.target.value)}
            className="font-mono text-xs"
            rows={8}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/admin/quality-templates')} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Plantilla'}
        </Button>
      </div>
    </div>
  )
}
