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
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Clock, User, Loader2, CheckCircle2, XCircle, AlertCircle, WifiOff, CloudOff, Trash2 } from 'lucide-react'
import { CustomField, DailyLogConfig } from '@/types/daily-log-config'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentDateInputValue } from '@/lib/utils'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { saveLocalDailyLog, saveLocalPhoto, cacheProjectConfig, getCachedProjectConfig } from '@/lib/offline/daily-log-service'

interface DailyLogFormTabsProps {
  projectId: string
  templateId?: string
  logId?: string // Para modo edición
  onSuccess?: () => void
}

export default function DailyLogFormTabs({ projectId, templateId, logId, onSuccess }: DailyLogFormTabsProps) {
  const router = useRouter()
  const supabase = createClient()
  const { profile } = useAuth()
  const { isOnline } = useOnlineStatus()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [config, setConfig] = useState<DailyLogConfig | null>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [userRoleInProject, setUserRoleInProject] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('basica')
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  
  // Estado del formulario
  const [formData, setFormData] = useState<DailyLogFormData>({
    date: getCurrentDateInputValue(),
    time: new Date().toTimeString().slice(0, 5),
    weather: 'soleado',
    temperature: undefined,
    personnel_count: undefined,
    work_front: '',
    element: '',
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
  const [photoCaptions, setPhotoCaptions] = useState<string[]>([])

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

  // Cargar configuración, usuarios y datos existentes (si es edición)
  // Soporta fallback offline: si no hay red, usa caché local
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      
      let configData: any = null
      let usersData: any[] | null = null

      if (isOnline) {
        // --- ONLINE: cargar de Supabase y cachear ---
        try {
          const { data: cfgResp } = await supabase
            .from('daily_log_configs')
            .select('*')
            .eq('project_id', projectId)
            .single()
          configData = cfgResp

          const { data: usrResp } = await supabase
            .from('project_members')
            .select('user_id, role_in_project, user:profiles!user_id(id, full_name, email)')
            .eq('project_id', projectId)
          usersData = usrResp

          // Cachear para uso offline
          if (configData) {
            await cacheProjectConfig(projectId, 'daily_log_config', configData)
          }
          if (usersData) {
            await cacheProjectConfig(projectId, 'project_users', usersData)
          }
        } catch (err) {
          console.warn('⚠️ Error cargando datos online, intentando caché local...', err)
          configData = await getCachedProjectConfig(projectId, 'daily_log_config')
          usersData = await getCachedProjectConfig(projectId, 'project_users')
        }
      } else {
        // --- OFFLINE: cargar de caché local ---
        configData = await getCachedProjectConfig(projectId, 'daily_log_config')
        usersData = await getCachedProjectConfig(projectId, 'project_users')
      }
      
      if (configData) {
        setConfig(configData)
        setCustomFields(configData.custom_fields || [])
      }
      
      if (usersData) {
        setProjectUsers(usersData.map((d: any) => d.user).filter(Boolean))
        
        const currentUserMember = usersData.find((m: any) => m.user_id === profile?.id)
        if (currentUserMember) {
          setUserRoleInProject(currentUserMember.role_in_project)
          
          if (currentUserMember.role_in_project === 'residente' && !logId) {
            setFormData(prev => ({
              ...prev,
              assigned_to: profile?.id
            }))
          }
        }
      }
      
      // Si es modo edición, cargar datos existentes
      if (logId) {
        let logData: any = null

        if (isOnline) {
          try {
            const { data } = await supabase
              .from('daily_logs')
              .select('*')
              .eq('id', logId)
              .single()
            logData = data
          } catch {
            // Fallback: buscar en IndexedDB
            const { getLocalDailyLog } = await import('@/lib/offline/daily-log-service')
            logData = await getLocalDailyLog(logId)
          }
        } else {
          const { getLocalDailyLog } = await import('@/lib/offline/daily-log-service')
          logData = await getLocalDailyLog(logId)
        }
        
        if (logData) {
          const loadedChecklists = logData.custom_fields?.checklists || CHECKLIST_SECTIONS
          setFormData({
            date: logData.date || getCurrentDateInputValue(),
            time: logData.time || new Date().toTimeString().slice(0, 5),
            weather: logData.weather || 'soleado',
            temperature: logData.temperature ? parseFloat(logData.temperature) : undefined,
            personnel_count: logData.personnel_count || 0,
            work_front: logData.work_front || logData.custom_fields?.work_front || '',
            element: logData.element || logData.custom_fields?.element || '',
            activities: logData.activities || '',
            materials: logData.materials || '',
            equipment: logData.equipment || '',
            observations: logData.observations || '',
            issues: logData.issues || '',
            recommendations: logData.recommendations || '',
            assigned_to: logData.assigned_to || undefined,
            location: logData.location || undefined,
            signatures: logData.signatures || [],
            checklists: loadedChecklists,
            photos: [],
            custom_fields: logData.custom_fields || {}
          })

          setCollapsedSections(
            (loadedChecklists as ChecklistSection[]).reduce((acc, section) => {
              acc[section.id] = true
              return acc
            }, {} as Record<string, boolean>)
          )
        }
      } else {
        // Modo creación: inicializar campos custom con defaults
        if (configData?.custom_fields) {
          const customFieldsData: Record<string, any> = {}
          configData.custom_fields.forEach((field: CustomField) => {
            customFieldsData[field.id] = field.defaultValue || ''
          })
          setFormData(prev => ({
            ...prev,
            custom_fields: customFieldsData
          }))
        }

        setCollapsedSections(
          CHECKLIST_SECTIONS.reduce((acc, section) => {
            acc[section.id] = true
            return acc
          }, {} as Record<string, boolean>)
        )
      }
      
      setLoading(false)
    }
    
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, logId])

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

  const updateChecklistSectionTitle = (sectionId: string, title: string) => {
    setFormData(prev => ({
      ...prev,
      checklists: prev.checklists.map(section =>
        section.id === sectionId ? { ...section, title } : section
      )
    }))
  }

  const toggleChecklistSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  const markSectionNotApplicable = (sectionId: string) => {
    setFormData(prev => ({
      ...prev,
      checklists: prev.checklists.map(section => {
        if (section.id !== sectionId) return section
        return {
          ...section,
          items: section.items.map(item => ({
            ...item,
            status: 'not_applicable'
          }))
        }
      })
    }))
  }

  const removeChecklistSection = (sectionId: string) => {
    setFormData(prev => ({
      ...prev,
      checklists: prev.checklists.filter(section => section.id !== sectionId)
    }))
  }

  const removeChecklistItem = (sectionId: string, itemId: string) => {
    setFormData(prev => ({
      ...prev,
      checklists: prev.checklists.map(section => {
        if (section.id !== sectionId) return section
        return {
          ...section,
          items: section.items.filter(item => item.id !== itemId)
        }
      })
    }))
  }

  const addChecklistSection = () => {
    const nextIndex = formData.checklists.length + 1
    const newSectionId = `section_${Date.now()}`
    const newSection: ChecklistSection = {
      id: newSectionId,
      title: `${nextIndex}. Nueva categoria`,
      items: [
        {
          id: `${newSectionId}_item_1`,
          description: 'Nuevo item',
          status: null,
          observations: ''
        }
      ]
    }

    setFormData(prev => ({
      ...prev,
      checklists: [...prev.checklists, newSection]
    }))
  }

  const addChecklistItem = (sectionId: string) => {
    setFormData(prev => ({
      ...prev,
      checklists: prev.checklists.map(section => {
        if (section.id !== sectionId) return section
        const nextIndex = section.items.length + 1
        return {
          ...section,
          items: [
            ...section.items,
            {
              id: `${sectionId}_item_${Date.now()}`,
              description: `Item ${nextIndex}`,
              status: null,
              observations: ''
            }
          ]
        }
      })
    }))
  }

  // Actualizar checklist
  const updateChecklistItem = (
    sectionId: string,
    itemId: string,
    field: 'status' | 'observations' | 'description',
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

  // Manejar submit — flujo offline-first
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      console.log('🔄 Iniciando guardado de bitácora...')

      // Preparar datos comunes
      const normalizedChecklists = formData.checklists.map(section => ({
        ...section,
        items: section.items.map(item => ({
          ...item,
          status: item.status ?? 'not_applicable'
        }))
      }))

      const customFieldLabels = customFields.reduce((acc: Record<string, string>, field) => {
        if (field?.id && field?.label) {
          acc[field.id] = field.label
        }
        return acc
      }, {})
      const storedFieldLabels = (formData.custom_fields?._field_labels as Record<string, string> | undefined) || {}
      const mergedFieldLabels = logId
        ? { ...customFieldLabels, ...storedFieldLabels }
        : customFieldLabels

      // Construir firma con datos del perfil del AuthContext
      const autoSignature: Signature = {
        user_id: profile?.id || '',
        user_name: profile?.full_name || profile?.email || '',
        user_role: profile?.role || 'usuario',
        signature_url: (profile as any)?.signature_url || '',
        signed_at: new Date().toISOString()
      }

      const commonData = {
        project_id: projectId,
        template_id: templateId,
        created_by: profile?.id || '',
        date: formData.date,
        time: formData.time,
        weather: formData.weather,
        temperature: formData.temperature?.toString(),
        personnel_count: formData.personnel_count,
        activities: formData.activities,
        materials: formData.materials,
        equipment: formData.equipment,
        work_front: formData.work_front || null,
        element: formData.element || null,
        observations: formData.observations,
        issues: formData.issues,
        recommendations: formData.recommendations,
        assigned_to: formData.assigned_to || null,
        location: formData.location || null,
        signatures: logId ? formData.signatures : [autoSignature],
        custom_fields: {
          ...formData.custom_fields,
          checklists: normalizedChecklists,
          _field_labels: mergedFieldLabels,
          ...(photoCaptions.length > 0 ? { photo_captions: photoCaptions } : {})
        },
      }

      const isNew = !logId

      // ============================================================
      // INTENTAR GUARDADO ONLINE
      // ============================================================
      if (isOnline) {
        try {
          const supabaseData = {
            ...commonData,
            ...(isNew ? {} : { id: logId }),
            ...(isNew ? {} : { updated_at: new Date().toISOString() }),
            sync_status: 'synced',
          }
          // Quitar created_by en edición
          if (!isNew) delete (supabaseData as any).created_by

          let data
          if (isNew) {
            const { data: insertData, error: insertError } = await supabase
              .from('daily_logs')
              .insert(supabaseData)
              .select()
              .single()
            if (insertError) throw insertError
            data = insertData
          } else {
            const { id: _id, ...updatePayload } = supabaseData as any
            const { data: updateData, error: updateError } = await supabase
              .from('daily_logs')
              .update(updatePayload)
              .eq('id', logId)
              .select()
              .single()
            if (updateError) throw updateError
            data = updateData
          }

          // Upload de fotos online
          if (formData.photos && formData.photos.length > 0 && data) {
            const photoUrls: string[] = []
            for (let i = 0; i < formData.photos.length; i++) {
              const file = formData.photos[i]
              const fileExt = file.name.split('.').pop()
              const fileName = `${profile?.id}/${projectId}/${data.id}/${Date.now()}_${i}.${fileExt}`
              const { error: uploadError } = await supabase.storage
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
            if (photoUrls.length > 0) {
              await supabase
                .from('daily_logs')
                .update({ photos: photoUrls })
                .eq('id', data.id)
            }
          }

          // Cachear en local como synced
          const { cacheDailyLogsFromRemote } = await import('@/lib/offline/daily-log-service')
          await cacheDailyLogsFromRemote(projectId, [data])

          setSuccess('✅ Bitácora guardada exitosamente')
          console.log('✅ Bitácora guardada online')

          await new Promise(resolve => setTimeout(resolve, 800))
          if (onSuccess) { onSuccess() } else { router.push(`/projects/${projectId}/daily-logs`) }
          return

        } catch (onlineError: any) {
          console.warn('⚠️ Fallo online, guardando localmente...', onlineError.message)
          // Caer al flujo offline
        }
      }

      // ============================================================
      // GUARDADO OFFLINE (o fallback si falló el online)
      // ============================================================
      console.log('📱 Guardando bitácora localmente...')

      const localLog = await saveLocalDailyLog(
        {
          id: logId,
          ...commonData,
        },
        isNew
      )

      // Guardar fotos en IndexedDB
      if (formData.photos && formData.photos.length > 0) {
        for (const file of formData.photos) {
          await saveLocalPhoto(localLog.id, file)
        }
        console.log(`📸 ${formData.photos.length} fotos guardadas localmente`)
      }

      setSuccess(
        isOnline
          ? '⚠️ Error de red. Bitácora guardada localmente — se sincronizará automáticamente.'
          : '📱 Bitácora guardada localmente — se sincronizará cuando haya conexión.'
      )
      console.log('✅ Bitácora guardada offline:', localLog.id)

      await new Promise(resolve => setTimeout(resolve, 1200))
      if (onSuccess) { onSuccess() } else { router.push(`/projects/${projectId}/daily-logs`) }

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
      {/* Banner de estado offline */}
      {!isOnline && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg">
          <WifiOff className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Sin conexión a internet</p>
            <p className="text-xs text-amber-600">La bitácora se guardará localmente y se sincronizará cuando vuelva la conexión.</p>
          </div>
        </div>
      )}

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
                  <Label htmlFor="personnel">Cantidad de Personal</Label>
                  <Input
                    id="personnel"
                    type="number"
                    min="0"
                    value={formData.personnel_count ?? ''}
                    onChange={(e) => updateField('personnel_count', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
              </div>

              {/* Asignado a - Solo visible para admin/supervisor, oculto para residentes */}
              {userRoleInProject !== 'residente' && profile?.role !== 'residente' ? (
                <div>
                  <Label htmlFor="assigned_to">Elaborado por</Label>
                  <Select 
                    value={formData.assigned_to || 'unassigned'} 
                    onValueChange={(value) => updateField('assigned_to', value === 'unassigned' ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar usuario..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Sin asignar</SelectItem>
                      {projectUsers.map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Label className="text-gray-600">Elaborado por</Label>
                  <p className="font-medium text-gray-900">{profile?.full_name || profile?.email}</p>
                </div>
              )}

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="work_front">Frente de Trabajo</Label>
                  <Input
                    id="work_front"
                    value={formData.work_front || ''}
                    onChange={(e) => updateField('work_front', e.target.value)}
                    placeholder="Ej: Torre A, Zona Norte, Bloque 2..."
                  />
                </div>
                <div>
                  <Label htmlFor="element">Elemento</Label>
                  <Input
                    id="element"
                    value={formData.element || ''}
                    onChange={(e) => updateField('element', e.target.value)}
                    placeholder="Ej: Columna C-3, Losa Piso 5, Muro M-2..."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="activities">Actividades Realizadas</Label>
                <RichTextEditor
                  value={formData.activities}
                  onChange={(html) => updateField('activities', html)}
                  placeholder="Describe las actividades realizadas durante el día..."
                  minHeight="120px"
                />
              </div>

              <div>
                <Label htmlFor="materials">Materiales Utilizados</Label>
                <RichTextEditor
                  value={formData.materials || ''}
                  onChange={(html) => updateField('materials', html)}
                  placeholder="Lista de materiales utilizados..."
                  minHeight="90px"
                />
              </div>

              <div>
                <Label htmlFor="equipment">Equipos y Maquinaria</Label>
                <RichTextEditor
                  value={formData.equipment || ''}
                  onChange={(html) => updateField('equipment', html)}
                  placeholder="Equipos y maquinaria utilizada..."
                  minHeight="90px"
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
                <RichTextEditor
                  value={formData.observations || ''}
                  onChange={(html) => updateField('observations', html)}
                  placeholder="Observaciones generales del día..."
                  minHeight="120px"
                />
              </div>

              <div>
                <Label htmlFor="issues">Problemas o Incidentes</Label>
                <RichTextEditor
                  value={formData.issues || ''}
                  onChange={(html) => updateField('issues', html)}
                  placeholder="Problemas o incidentes presentados..."
                  minHeight="90px"
                />
              </div>

              <div>
                <Label htmlFor="recommendations">Recomendaciones</Label>
                <RichTextEditor
                  value={formData.recommendations || ''}
                  onChange={(html) => updateField('recommendations', html)}
                  placeholder="Recomendaciones para próximas jornadas..."
                  minHeight="90px"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: CHECKLISTS */}
        <TabsContent value="checklists" className="space-y-4">
          {/* Leyenda de estados */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">Leyenda de Estados:</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-gray-700">Cumple</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-gray-700">No Cumple</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-gray-600" />
                <span className="text-gray-700">No Aplica</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={addChecklistSection}
              className="text-xs px-3 py-2 rounded border border-gray-200 hover:bg-gray-50"
            >
              + Agregar categoria
            </button>
          </div>

          {formData.checklists.map((section) => (
            <Card key={section.id}>
              <CardHeader className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <Input
                    value={section.title}
                    onChange={(e) => updateChecklistSectionTitle(section.id, e.target.value)}
                    className="text-base font-semibold"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => markSectionNotApplicable(section.id)}
                      className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
                    >
                      Marcar todo No aplica
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleChecklistSection(section.id)}
                      className="text-xs px-3 py-1 rounded border border-gray-200 hover:bg-gray-50"
                    >
                      {collapsedSections[section.id] ? 'Expandir' : 'Contraer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeChecklistSection(section.id)}
                      className="text-xs p-1.5 rounded text-red-500 hover:bg-red-50 hover:text-red-700"
                      title="Eliminar categoría"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              {!collapsedSections[section.id] && (
                <CardContent className="space-y-4">
                  {section.items.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <Input
                          value={item.description}
                          onChange={(e) => updateChecklistItem(section.id, item.id, 'description', e.target.value)}
                          className="font-medium"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateChecklistItem(section.id, item.id, 'status', item.status === 'compliant' ? null : 'compliant')}
                          className={`p-2 rounded ${item.status === 'compliant' ? 'bg-green-100' : 'hover:bg-gray-100'}`}
                          title="Cumple"
                        >
                          <CheckCircle2 className={`h-5 w-5 ${item.status === 'compliant' ? 'text-green-600' : 'text-gray-400'}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateChecklistItem(section.id, item.id, 'status', item.status === 'non_compliant' ? null : 'non_compliant')}
                          className={`p-2 rounded ${item.status === 'non_compliant' ? 'bg-red-100' : 'hover:bg-gray-100'}`}
                          title="No Cumple"
                        >
                          <XCircle className={`h-5 w-5 ${item.status === 'non_compliant' ? 'text-red-600' : 'text-gray-400'}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateChecklistItem(section.id, item.id, 'status', item.status === 'not_applicable' ? null : 'not_applicable')}
                          className={`p-2 rounded ${item.status === 'not_applicable' ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                          title="No Aplica"
                        >
                          <AlertCircle className={`h-5 w-5 ${item.status === 'not_applicable' ? 'text-gray-600' : 'text-gray-400'}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeChecklistItem(section.id, item.id)}
                          className="p-2 rounded hover:bg-red-50"
                          title="Eliminar item"
                        >
                          <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
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
                  <div>
                    <button
                      type="button"
                      onClick={() => addChecklistItem(section.id)}
                      className="text-xs px-3 py-2 rounded border border-gray-200 hover:bg-gray-50"
                    >
                      + Agregar item
                    </button>
                  </div>
              </CardContent>
              )}
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
                captions={photoCaptions}
                onCaptionsChange={setPhotoCaptions}
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
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}
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
          className={`px-6 py-2 text-white rounded-md disabled:opacity-50 flex items-center gap-2 ${
            isOnline ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'
          }`}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {!isOnline && !loading && <CloudOff className="h-4 w-4" />}
          {loading ? 'Guardando...' : isOnline ? 'Guardar Bitácora' : 'Guardar Localmente'}
        </button>
      </div>
    </form>
  )
}
