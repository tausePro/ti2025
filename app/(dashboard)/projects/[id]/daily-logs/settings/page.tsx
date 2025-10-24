'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Trash2, Save, ArrowLeft, GripVertical } from 'lucide-react'
import { 
  CustomField, 
  DailyLogConfig, 
  CUSTOM_FIELD_TYPES,
  CustomFieldType,
  DEFAULT_DAILY_LOG_SETTINGS 
} from '@/types/daily-log-config'

export default function DailyLogSettingsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [project, setProject] = useState<any>(null)
  const [config, setConfig] = useState<DailyLogConfig | null>(null)
  
  // Estados del formulario
  const [isEnabled, setIsEnabled] = useState(true)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [settings, setSettings] = useState(DEFAULT_DAILY_LOG_SETTINGS)

  useEffect(() => {
    loadData()
  }, [params.id])

  async function loadData() {
    try {
      setLoading(true)

      // Cargar proyecto
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Cargar configuración existente
      const { data: configData, error: configError } = await supabase
        .from('daily_log_configs')
        .select('*')
        .eq('project_id', params.id)
        .single()

      if (configData) {
        setConfig(configData)
        setIsEnabled(configData.is_enabled)
        setCustomFields(configData.custom_fields || [])
        setSettings(configData.settings || DEFAULT_DAILY_LOG_SETTINGS)
      }
    } catch (error: any) {
      console.error('Error loading data:', error)
      if (error.code !== 'PGRST116') { // No rows found es OK
        alert('Error al cargar configuración')
      }
    } finally {
      setLoading(false)
    }
  }

  function addCustomField() {
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

  function updateCustomField(id: string, updates: Partial<CustomField>) {
    setCustomFields(customFields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ))
  }

  function removeCustomField(id: string) {
    setCustomFields(customFields.filter(field => field.id !== id))
  }

  async function handleSave() {
    try {
      setSaving(true)

      const configData = {
        project_id: params.id,
        is_enabled: isEnabled,
        custom_fields: customFields,
        settings: settings
      }

      if (config) {
        // Actualizar
        const { error } = await supabase
          .from('daily_log_configs')
          .update(configData)
          .eq('id', config.id)

        if (error) throw error
      } else {
        // Crear
        const { error } = await supabase
          .from('daily_log_configs')
          .insert(configData)

        if (error) throw error
      }

      alert('✅ Configuración guardada exitosamente')
      router.push(`/projects/${params.id}/daily-logs`)
    } catch (error: any) {
      console.error('Error saving config:', error)
      alert('Error al guardar configuración: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/projects/${params.id}/daily-logs`}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Bitácoras
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          Configuración de Bitácoras
        </h1>
        <p className="text-gray-600 mt-2">
          {project?.name}
        </p>
      </div>

      {/* Estado del módulo */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Estado del Módulo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enabled" className="text-base font-medium">
                Bitácoras Activas
              </Label>
              <p className="text-sm text-gray-500">
                Habilitar o deshabilitar el módulo de bitácoras para este proyecto
              </p>
            </div>
            <Switch
              id="enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Configuración General */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Configuración General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Fotos Requeridas</Label>
              <p className="text-sm text-gray-500">Obligar a subir fotos en cada bitácora</p>
            </div>
            <Switch
              checked={settings.require_photos}
              onCheckedChange={(checked) => setSettings({ ...settings, require_photos: checked })}
            />
          </div>

          {settings.require_photos && (
            <div className="grid grid-cols-2 gap-4 ml-6">
              <div>
                <Label>Mínimo de fotos</Label>
                <Input
                  type="number"
                  min="1"
                  max={settings.max_photos}
                  value={settings.min_photos}
                  onChange={(e) => setSettings({ ...settings, min_photos: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Máximo de fotos</Label>
                <Input
                  type="number"
                  min={settings.min_photos}
                  max="20"
                  value={settings.max_photos}
                  onChange={(e) => setSettings({ ...settings, max_photos: parseInt(e.target.value) || 10 })}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label>Firmas Requeridas</Label>
              <p className="text-sm text-gray-500">Obligar a agregar al menos una firma</p>
            </div>
            <Switch
              checked={settings.require_signatures}
              onCheckedChange={(checked) => setSettings({ ...settings, require_signatures: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>GPS Requerido</Label>
              <p className="text-sm text-gray-500">Obligar a capturar ubicación GPS</p>
            </div>
            <Switch
              checked={settings.require_gps}
              onCheckedChange={(checked) => setSettings({ ...settings, require_gps: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Campos Personalizados */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Campos Personalizados</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Agrega campos adicionales específicos para este proyecto
            </p>
          </div>
          <Button onClick={addCustomField} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Campo
          </Button>
        </CardHeader>
        <CardContent>
          {customFields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay campos personalizados. Haz clic en "Agregar Campo" para crear uno.
            </div>
          ) : (
            <div className="space-y-4">
              {customFields.map((field, index) => (
                <Card key={field.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nombre del campo */}
                        <div>
                          <Label>Etiqueta *</Label>
                          <Input
                            placeholder="Ej: Avance del día"
                            value={field.label}
                            onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                          />
                        </div>

                        {/* Tipo de campo */}
                        <div>
                          <Label>Tipo de campo *</Label>
                          <Select
                            value={field.type}
                            onValueChange={(value) => updateCustomField(field.id, { type: value as CustomFieldType })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CUSTOM_FIELD_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Opciones para select/radio */}
                        {['select', 'multiselect', 'radio'].includes(field.type) && (
                          <div className="md:col-span-2">
                            <Label>Opciones (separadas por coma)</Label>
                            <Input
                              placeholder="Opción 1, Opción 2, Opción 3"
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => updateCustomField(field.id, { 
                                options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                              })}
                            />
                          </div>
                        )}

                        {/* Placeholder */}
                        <div>
                          <Label>Texto de ayuda</Label>
                          <Input
                            placeholder="Ej: Describe el avance en %"
                            value={field.placeholder || ''}
                            onChange={(e) => updateCustomField(field.id, { placeholder: e.target.value })}
                          />
                        </div>

                        {/* Requerido */}
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) => updateCustomField(field.id, { required: checked })}
                          />
                          <Label>Campo requerido</Label>
                        </div>
                      </div>

                      {/* Botón eliminar */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomField(field.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/projects/${params.id}/daily-logs`)}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Configuración
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
