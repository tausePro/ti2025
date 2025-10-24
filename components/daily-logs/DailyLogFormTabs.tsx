'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  DailyLogFormData, 
  ChecklistSection, 
  ChecklistItemStatus,
  CHECKLIST_SECTIONS,
  Signature,
  Location
} from '@/types/daily-log'
import { PhotoUpload } from './PhotoUpload'
import { CustomFieldRenderer } from './CustomFieldRenderer'
import { useGeolocation } from '@/hooks/useGeolocation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Clock, User, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { CustomField, DailyLogConfig } from '@/types/daily-log-config'

interface DailyLogFormTabsProps {
  projectId: string
  templateId?: string
  onSuccess?: () => void
}

export default function DailyLogFormTabs({ projectId, templateId, onSuccess }: DailyLogFormTabsProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<DailyLogConfig | null>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [activeTab, setActiveTab] = useState('basica')
  
  // Estado del formulario
  const [formData, setFormData] = useState<DailyLogFormData>({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    weather: 'soleado',
    temperature: undefined,
    personnel_count: 0,
    activities: '',
    materials: '',
    equipment: '',
    observations: '',
    issues: '',
    recommendations: '',
    assigned_to: undefined,
    location: undefined,
    signatures: [],
    checklists: CHECKLIST_SECTIONS,
    photos: [],
    custom_fields: {}
  })

  // Hook de geolocalización
  const { location, error: gpsError, loading: gpsLoading, requestLocation } = useGeolocation()
  
  // Usuarios del proyecto
  const [projectUsers, setProjectUsers] = useState<any[]>([])

  // Cargar ubicación automáticamente
  useEffect(() => {
    requestLocation().then(loc => {
      if (loc) {
        setFormData(prev => ({
          ...prev,
          location: {
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            timestamp: loc.timestamp
          }
        }))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cargar configuración y usuarios
  useEffect(() => {
    async function loadConfig() {
      const { data: configData } = await supabase
        .from('daily_log_configs')
        .select('*')
        .eq('project_id', projectId)
        .single()
      
      if (configData) {
        setConfig(configData)
        setCustomFields(configData.custom_fields || [])
        
        const customFieldsData: Record<string, any> = {}
        configData.custom_fields?.forEach((field: CustomField) => {
          customFieldsData[field.id] = field.defaultValue || ''
        })
        setFormData(prev => ({
          ...prev,
          custom_fields: customFieldsData
        }))
      }
    }
    
    async function loadUsers() {
      const { data } = await supabase
        .from('project_members')
        .select('user_id, profiles(id, full_name, email)')
        .eq('project_id', projectId)
      
      if (data) {
        setProjectUsers(data.map(d => d.profiles).filter(Boolean))
      }
    }
    
    loadConfig()
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Actualizar campo base
  const updateField = (field: keyof DailyLogFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Actualizar campo personalizado
  const updateCustomField = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: {
        ...prev.custom_fields,
        [fieldId]: value
      }
    }))
  }

  // Actualizar checklist
  const updateChecklistItem = (
    sectionId: string, 
    itemId: string, 
    field: 'status' | 'observations', 
    value: ChecklistItemStatus | string
  ) => {
    setFormData(prev => ({
      ...prev,
      checklists: prev.checklists.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            items: section.items.map(item => {
              if (item.id === itemId) {
                return { ...item, [field]: value }
              }
              return item
            })
          }
        }
        return section
      })
    }))
  }

  // Manejar submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log('🔄 Iniciando guardado de bitácora...')
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) throw authError
      if (!user) throw new Error('No hay usuario autenticado')

      // Obtener perfil con firma
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, signature_url')
        .eq('id', user.id)
        .single()
      
      if (profileError || !profile) {
        throw new Error('Perfil de usuario no encontrado')
      }

      // Firma automática
      const autoSignature: Signature = {
        user_id: profile.id,
        user_name: profile.full_name || profile.email,
        user_role: profile.role || 'usuario',
        signature_url: profile.signature_url || '',
        signed_at: new Date().toISOString()
      }

      // Preparar datos
      const dailyLogData = {
        project_id: projectId,
        template_id: templateId,
        created_by: user.id,
        date: formData.date,
        time: formData.time,
        weather: formData.weather,
        temperature: formData.temperature?.toString(),
        personnel_count: formData.personnel_count,
        activities: formData.activities,
        materials: formData.materials,
        equipment: formData.equipment,
        observations: formData.observations,
        issues: formData.issues,
        recommendations: formData.recommendations,
        assigned_to: formData.assigned_to || null,
        location: formData.location || null,
        signatures: [autoSignature],
        custom_fields: {
          ...formData.custom_fields,
          checklists: formData.checklists
        },
        sync_status: 'synced'
      }

      console.log('📝 Datos a guardar:', dailyLogData)

      // Guardar
      const { data, error: saveError } = await supabase
        .from('daily_logs')
        .insert(dailyLogData)
        .select()
        .single()

      if (saveError) throw saveError

      // Upload de fotos
      if (formData.photos && formData.photos.length > 0 && data) {
        console.log(`📸 Subiendo ${formData.photos.length} fotos...`)
        
        const photoUrls: string[] = []
        
        for (let i = 0; i < formData.photos.length; i++) {
          const file = formData.photos[i]
          const fileExt = file.name.split('.').pop()
          const fileName = `${user.id}/${projectId}/${data.id}/${Date.now()}_${i}.${fileExt}`
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('daily-logs-photos')
            .upload(fileName, file)
          
          if (uploadError) {
            console.error(`❌ Error subiendo foto ${i}:`, uploadError)
            continue
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('daily-logs-photos')
            .getPublicUrl(fileName)
          
          photoUrls.push(publicUrl)
        }
        
        // Actualizar con URLs de fotos
        const { error: updateError } = await supabase
          .from('daily_logs')
          .update({ photos: photoUrls })
          .eq('id', data.id)
        
        if (updateError) {
          console.error('❌ Error actualizando fotos:', updateError)
        } else {
          console.log('✅ Fotos guardadas:', photoUrls.length)
        }
      }

      console.log('✅ Bitácora guardada exitosamente')
      
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/projects/${projectId}/daily-logs`)
      }
    } catch (error: any) {
      console.error('❌ Error:', error)
      setError(error.message || 'Error al guardar la bitácora')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: ChecklistItemStatus | null) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'non_compliant':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'not_applicable':
        return <AlertCircle className="h-5 w-5 text-gray-400" />
      default:
        return <div className="h-5 w-5 border-2 border-gray-300 rounded" />
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="basica">📋 Básica</TabsTrigger>
          <TabsTrigger value="actividades">🏗️ Actividades</TabsTrigger>
          <TabsTrigger value="observaciones">📝 Observaciones</TabsTrigger>
          <TabsTrigger value="checklists">✅ Checklists</TabsTrigger>
          <TabsTrigger value="fotos">📸 Fotos</TabsTrigger>
          {customFields.length > 0 && (
            <TabsTrigger value="custom">⚙️ Personalizados</TabsTrigger>
          )}
        </TabsList>

        {/* TAB 1: INFORMACIÓN BÁSICA */}
        <TabsContent value="basica" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
              <CardDescription>Datos generales de la bitácora diaria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Fecha */}
                <div>
                  <Label htmlFor="date">Fecha *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    required
                  />
                </div>

                {/* Hora */}
                <div>
                  <Label htmlFor="time">Hora *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => updateField('time', e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Clima */}
                <div>
                  <Label htmlFor="weather">Clima *</Label>
                  <Select value={formData.weather} onValueChange={(value) => updateField('weather', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="soleado">☀️ Soleado</SelectItem>
                      <SelectItem value="nublado">☁️ Nublado</SelectItem>
                      <SelectItem value="lluvioso">🌧️ Lluvioso</SelectItem>
                      <SelectItem value="tormentoso">⛈️ Tormentoso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Temperatura */}
                <div>
                  <Label htmlFor="temperature">Temperatura (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    value={formData.temperature || ''}
                    onChange={(e) => updateField('temperature', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="Ej: 25"
                  />
                </div>

                {/* Personal */}
                <div>
                  <Label htmlFor="personnel">Cantidad de Personal *</Label>
                  <Input
                    id="personnel"
                    type="number"
                    min="0"
                    value={formData.personnel_count}
                    onChange={(e) => updateField('personnel_count', parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              {/* Asignado a */}
              <div>
                <Label htmlFor="assigned_to">Asignado a</Label>
                <Select 
                  value={formData.assigned_to || ''} 
                  onValueChange={(value) => updateField('assigned_to', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar usuario..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin asignar</SelectItem>
                    {projectUsers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* GPS */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Ubicación GPS</p>
                    {formData.location ? (
                      <p className="text-sm text-gray-600">
                        Lat: {formData.location.latitude.toFixed(6)}, 
                        Lon: {formData.location.longitude.toFixed(6)}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">No capturada</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => requestLocation()}
                  disabled={gpsLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {gpsLoading ? 'Obteniendo...' : 'Actualizar GPS'}
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: ACTIVIDADES */}
        <TabsContent value="actividades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actividades y Recursos</CardTitle>
              <CardDescription>Describe las actividades, materiales y equipos del día</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="activities">Actividades Realizadas *</Label>
                <Textarea
                  id="activities"
                  value={formData.activities}
                  onChange={(e) => updateField('activities', e.target.value)}
                  placeholder="Describe las actividades realizadas durante el día..."
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="materials">Materiales Utilizados</Label>
                <Textarea
                  id="materials"
                  value={formData.materials}
                  onChange={(e) => updateField('materials', e.target.value)}
                  placeholder="Lista de materiales utilizados..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="equipment">Equipos y Maquinaria</Label>
                <Textarea
                  id="equipment"
                  value={formData.equipment}
                  onChange={(e) => updateField('equipment', e.target.value)}
                  placeholder="Equipos y maquinaria utilizada..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: OBSERVACIONES */}
        <TabsContent value="observaciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Observaciones y Notas</CardTitle>
              <CardDescription>Observaciones, problemas encontrados y recomendaciones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="observations">Observaciones Generales</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => updateField('observations', e.target.value)}
                  placeholder="Observaciones generales del día..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="issues">Problemas o Incidentes</Label>
                <Textarea
                  id="issues"
                  value={formData.issues}
                  onChange={(e) => updateField('issues', e.target.value)}
                  placeholder="Problemas o incidentes presentados..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="recommendations">Recomendaciones</Label>
                <Textarea
                  id="recommendations"
                  value={formData.recommendations}
                  onChange={(e) => updateField('recommendations', e.target.value)}
                  placeholder="Recomendaciones para próximas jornadas..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: CHECKLISTS */}
        <TabsContent value="checklists" className="space-y-4">
          {formData.checklists.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                {/* Descripción opcional */}
              </CardHeader>
              <CardContent className="space-y-4">
                {section.items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="font-medium">{item.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateChecklistItem(section.id, item.id, 'status', 'compliant')}
                          className={`p-2 rounded ${item.status === 'compliant' ? 'bg-green-100' : 'hover:bg-gray-100'}`}
                          title="Cumple"
                        >
                          <CheckCircle2 className={`h-5 w-5 ${item.status === 'compliant' ? 'text-green-600' : 'text-gray-400'}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateChecklistItem(section.id, item.id, 'status', 'non_compliant')}
                          className={`p-2 rounded ${item.status === 'non_compliant' ? 'bg-red-100' : 'hover:bg-gray-100'}`}
                          title="No Cumple"
                        >
                          <XCircle className={`h-5 w-5 ${item.status === 'non_compliant' ? 'text-red-600' : 'text-gray-400'}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateChecklistItem(section.id, item.id, 'status', 'not_applicable')}
                          className={`p-2 rounded ${item.status === 'not_applicable' ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                          title="No Aplica"
                        >
                          <AlertCircle className={`h-5 w-5 ${item.status === 'not_applicable' ? 'text-gray-600' : 'text-gray-400'}`} />
                        </button>
                      </div>
                    </div>
                    {item.observations && (
                      <p className="text-sm text-gray-500 italic">{item.observations}</p>
                    )}
                    <Textarea
                      value={item.observations || ''}
                      onChange={(e) => updateChecklistItem(section.id, item.id, 'observations', e.target.value)}
                      placeholder="Observaciones adicionales..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* TAB 5: FOTOS */}
        <TabsContent value="fotos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fotos del Día</CardTitle>
              <CardDescription>Sube hasta 10 fotos (máx. 10MB cada una)</CardDescription>
            </CardHeader>
            <CardContent>
              <PhotoUpload
                photos={formData.photos}
                onPhotosChange={(photos) => updateField('photos', photos)}
                maxPhotos={10}
                maxSizeMB={10}
                disabled={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 6: CAMPOS PERSONALIZADOS */}
        {customFields.length > 0 && (
          <TabsContent value="custom" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Campos Personalizados</CardTitle>
                <CardDescription>Campos adicionales configurados para este proyecto</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFields
                    .sort((a, b) => a.order - b.order)
                    .map((field) => (
                      <CustomFieldRenderer
                        key={field.id}
                        field={field}
                        value={formData.custom_fields?.[field.id]}
                        onChange={(value) => updateCustomField(field.id, value)}
                      />
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-end gap-4 sticky bottom-0 bg-white p-4 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Guardando...' : 'Guardar Bitácora'}
        </button>
      </div>
    </form>
  )
}
