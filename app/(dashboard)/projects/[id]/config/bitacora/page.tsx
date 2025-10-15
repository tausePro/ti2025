'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  Save, 
  Plus,
  Trash2,
  FileText,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface DailyLogTemplate {
  id: string
  project_id: string
  template_name: string
  base_fields: any[]
  custom_fields: CustomField[]
  is_active: boolean
}

interface CustomField {
  id: string
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox'
  required: boolean
  options?: string[]
  placeholder?: string
  order: number
}

export default function BitacoraConfigPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const supabase = createClient()

  const projectId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [template, setTemplate] = useState<DailyLogTemplate | null>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadTemplate()
  }, [projectId])

  async function loadTemplate() {
    try {
      const { data, error } = await supabase
        .from('daily_log_templates')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setTemplate(data)
        setCustomFields(data.custom_fields || [])
      }
    } catch (error: any) {
      console.error('Error loading template:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddField = () => {
    const newField: CustomField = {
      id: `field_${Date.now()}`,
      name: `campo_${customFields.length + 1}`,
      label: '',
      type: 'text',
      required: false,
      order: customFields.length
    }
    setCustomFields([...customFields, newField])
  }

  const handleRemoveField = (fieldId: string) => {
    setCustomFields(customFields.filter(f => f.id !== fieldId))
  }

  const handleFieldChange = (fieldId: string, key: keyof CustomField, value: any) => {
    setCustomFields(customFields.map(f => 
      f.id === fieldId ? { ...f, [key]: value } : f
    ))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const templateData = {
        project_id: projectId,
        template_name: 'Plantilla Principal',
        base_fields: [
          { name: 'date', label: 'Fecha', type: 'date', required: true },
          { name: 'weather', label: 'Clima', type: 'text', required: false },
          { name: 'temperature', label: 'Temperatura', type: 'text', required: false },
          { name: 'personnel_count', label: 'Personal en Obra', type: 'number', required: false },
          { name: 'activities', label: 'Actividades', type: 'textarea', required: true },
          { name: 'materials', label: 'Materiales', type: 'textarea', required: false },
          { name: 'equipment', label: 'Equipos', type: 'textarea', required: false },
          { name: 'observations', label: 'Observaciones', type: 'textarea', required: false }
        ],
        custom_fields: customFields,
        is_active: true,
        created_by: profile!.id
      }

      if (template) {
        // Actualizar template existente
        const { error } = await supabase
          .from('daily_log_templates')
          .update(templateData)
          .eq('id', template.id)

        if (error) throw error
      } else {
        // Crear nuevo template
        const { error } = await supabase
          .from('daily_log_templates')
          .insert(templateData)

        if (error) throw error
      }

      setSuccess('Plantilla guardada correctamente')
      loadTemplate()
    } catch (error: any) {
      console.error('Error saving template:', error)
      setError(error.message || 'Error al guardar la plantilla')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-talento-green"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="h-6 w-6 mr-3" />
              Configuración de Bitácoras
            </h1>
            <p className="text-gray-500 mt-1">
              Personaliza los campos de las bitácoras diarias
            </p>
          </div>
        </div>
        
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>

      {/* Alerts */}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Campos Base */}
      <Card>
        <CardHeader>
          <CardTitle>Campos Base</CardTitle>
          <CardDescription>
            Campos estándar que siempre aparecen en las bitácoras
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Fecha', 'Clima', 'Temperatura', 'Personal', 'Actividades', 'Materiales', 'Equipos', 'Observaciones'].map((field) => (
              <Badge key={field} variant="secondary" className="justify-center py-2">
                {field}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Campos Personalizados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Campos Personalizados</CardTitle>
              <CardDescription>
                Agrega campos adicionales específicos para este proyecto
              </CardDescription>
            </div>
            <Button onClick={handleAddField} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Campo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {customFields.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No hay campos personalizados</p>
              <Button onClick={handleAddField} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Primer Campo
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {customFields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Campo #{index + 1}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveField(field.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Etiqueta</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => handleFieldChange(field.id, 'label', e.target.value)}
                        placeholder="Ej: Avance de Obra"
                      />
                    </div>

                    <div>
                      <Label>Tipo de Campo</Label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={field.type}
                        onChange={(e) => handleFieldChange(field.id, 'type', e.target.value)}
                      >
                        <option value="text">Texto</option>
                        <option value="textarea">Texto Largo</option>
                        <option value="number">Número</option>
                        <option value="date">Fecha</option>
                        <option value="select">Selección</option>
                        <option value="checkbox">Checkbox</option>
                      </select>
                    </div>

                    <div>
                      <Label>Placeholder</Label>
                      <Input
                        value={field.placeholder || ''}
                        onChange={(e) => handleFieldChange(field.id, 'placeholder', e.target.value)}
                        placeholder="Texto de ayuda"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) => handleFieldChange(field.id, 'required', checked)}
                      />
                      <Label>Campo Obligatorio</Label>
                    </div>
                  </div>

                  {field.type === 'select' && (
                    <div>
                      <Label>Opciones (separadas por coma)</Label>
                      <Input
                        value={field.options?.join(', ') || ''}
                        onChange={(e) => handleFieldChange(field.id, 'options', e.target.value.split(',').map(o => o.trim()))}
                        placeholder="Opción 1, Opción 2, Opción 3"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
