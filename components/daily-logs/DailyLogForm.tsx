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
import { SignatureSelector } from './SignatureSelector'
import { useGeolocation } from '@/hooks/useGeolocation'
import { MapPin, Clock, User } from 'lucide-react'

interface DailyLogFormProps {
  projectId: string
  templateId?: string
  onSuccess?: () => void
}

export default function DailyLogForm({ projectId, templateId, onSuccess }: DailyLogFormProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Estado del formulario
  const [formData, setFormData] = useState<DailyLogFormData>({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5), // HH:MM
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
    photos: []
  })

  // Hook de geolocalización
  const { location, error: gpsError, loading: gpsLoading, requestLocation } = useGeolocation()
  
  // Usuarios del proyecto para asignar
  const [projectUsers, setProjectUsers] = useState<any[]>([])

  // Cargar ubicación automáticamente al montar
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

  // Cargar usuarios del proyecto
  useEffect(() => {
    async function loadUsers() {
      const { data } = await supabase
        .from('project_team')
        .select('user_id, profiles(id, full_name, email)')
        .eq('project_id', projectId)
      
      if (data) {
        setProjectUsers(data.map(d => d.profiles).filter(Boolean))
      }
    }
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Actualizar campo base
  const updateField = (field: keyof DailyLogFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Actualizar estado de checklist
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
      
      // Obtener usuario actual
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      console.log('👤 Usuario:', user?.id, authError ? `Error: ${authError.message}` : 'OK')
      
      if (authError) throw authError
      if (!user) throw new Error('No hay usuario autenticado')
      if (!user.id) throw new Error('Usuario sin ID')

      // Validar que el usuario existe en profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()
      
      if (profileError || !profile) {
        console.error('❌ Perfil no encontrado:', profileError)
        throw new Error('Perfil de usuario no encontrado')
      }

      // Preparar datos para guardar
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
        signatures: formData.signatures || [],
        custom_fields: {
          checklists: formData.checklists
        },
        sync_status: 'synced'
      }

      console.log('📝 Datos a guardar:', dailyLogData)

      // Guardar en Supabase
      const { data, error: saveError } = await supabase
        .from('daily_logs')
        .insert(dailyLogData)
        .select()
        .single()

      console.log('💾 Resultado:', data ? 'OK' : 'NULL', saveError ? `Error: ${saveError.message}` : 'OK')

      if (saveError) throw saveError

      // Upload de fotos si hay
      if (formData.photos && formData.photos.length > 0 && data) {
        console.log(`📸 Subiendo ${formData.photos.length} fotos...`)
        
        const photoUrls: string[] = []
        
        for (let i = 0; i < formData.photos.length; i++) {
          const file = formData.photos[i]
          const fileExt = file.name.split('.').pop()
          const fileName = `${user.id}/${projectId}/${data.id}/${Date.now()}_${i}.${fileExt}`
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('daily-logs-photos')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            })
          
          if (uploadError) {
            console.error(`Error subiendo foto ${i + 1}:`, uploadError)
            continue
          }
          
          // Obtener URL pública
          const { data: { publicUrl } } = supabase.storage
            .from('daily-logs-photos')
            .getPublicUrl(uploadData.path)
          
          photoUrls.push(publicUrl)
          console.log(`✅ Foto ${i + 1} subida:`, publicUrl)
        }
        
        // Actualizar bitácora con URLs de fotos
        if (photoUrls.length > 0) {
          const { error: updateError } = await supabase
            .from('daily_logs')
            .update({ 
              photos: photoUrls,
              custom_fields: {
                ...dailyLogData.custom_fields,
                photo_count: photoUrls.length
              }
            })
            .eq('id', data.id)
          
          if (updateError) {
            console.error('Error actualizando URLs de fotos:', updateError)
          } else {
            console.log(`✅ ${photoUrls.length} fotos guardadas en BD`)
          }
        }
      }

      // Éxito
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/projects/${projectId}/daily-logs`)
      }
    } catch (err: any) {
      console.error('Error guardando bitácora:', err)
      setError(err.message || 'Error al guardar la bitácora')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Información General */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Información General</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => updateField('date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          {/* Hora */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Hora *
            </label>
            <input
              type="time"
              value={formData.time || ''}
              onChange={(e) => updateField('time', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          {/* Clima */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clima *
            </label>
            <select
              value={formData.weather}
              onChange={(e) => updateField('weather', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="soleado">☀️ Soleado</option>
              <option value="nublado">☁️ Nublado</option>
              <option value="lluvioso">🌧️ Lluvioso</option>
              <option value="tormentoso">⛈️ Tormentoso</option>
            </select>
          </div>

          {/* Temperatura */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperatura (°C)
            </label>
            <input
              type="number"
              value={formData.temperature || ''}
              onChange={(e) => updateField('temperature', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Ej: 25"
            />
          </div>

          {/* Personal en obra */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Personal en Obra *
            </label>
            <input
              type="number"
              value={formData.personnel_count}
              onChange={(e) => updateField('personnel_count', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
              min="0"
            />
          </div>

          {/* Asignado a */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <User className="h-4 w-4" />
              Asignado a
            </label>
            <select
              value={formData.assigned_to || ''}
              onChange={(e) => updateField('assigned_to', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Sin asignar</option>
              {projectUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Ubicación GPS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Ubicación GPS
            </label>
            <div className="flex items-center gap-2">
              {gpsLoading && (
                <span className="text-sm text-gray-500">Obteniendo ubicación...</span>
              )}
              {formData.location && (
                <span className="text-sm text-green-600">
                  ✓ Capturada ({formData.location.accuracy.toFixed(0)}m precisión)
                </span>
              )}
              {gpsError && (
                <span className="text-sm text-red-600">{gpsError}</span>
              )}
              {!formData.location && !gpsLoading && (
                <button
                  type="button"
                  onClick={() => requestLocation()}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Obtener ubicación
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Actividades */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Actividades Realizadas *
          </label>
          <textarea
            value={formData.activities}
            onChange={(e) => updateField('activities', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={3}
            required
            placeholder="Describe las actividades realizadas en el día..."
          />
        </div>

        {/* Materiales */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Materiales Utilizados
          </label>
          <textarea
            value={formData.materials}
            onChange={(e) => updateField('materials', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={2}
            placeholder="Lista de materiales utilizados..."
          />
        </div>

        {/* Equipo */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Equipo y Maquinaria
          </label>
          <textarea
            value={formData.equipment}
            onChange={(e) => updateField('equipment', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={2}
            placeholder="Equipo y maquinaria utilizada..."
          />
        </div>
      </div>

      {/* Checklists de Revisión */}
      {formData.checklists.map((section) => (
        <div key={section.id} className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-600">
            {section.title}
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                    Ítem
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Descripción
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-32">
                    Cumple
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Observaciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {section.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.description}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateChecklistItem(section.id, item.id, 'status', 'compliant')}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            item.status === 'compliant'
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                          }`}
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => updateChecklistItem(section.id, item.id, 'status', 'non_compliant')}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            item.status === 'non_compliant'
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                          }`}
                        >
                          ✗
                        </button>
                        <button
                          type="button"
                          onClick={() => updateChecklistItem(section.id, item.id, 'status', 'not_applicable')}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            item.status === 'not_applicable'
                              ? 'bg-gray-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          N/A
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.observations}
                        onChange={(e) => updateChecklistItem(section.id, item.id, 'observations', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        placeholder={item.observations || 'Observaciones...'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Observaciones Generales */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Observaciones y Recomendaciones</h2>

        <div className="space-y-4">
          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones Generales
            </label>
            <textarea
              value={formData.observations}
              onChange={(e) => updateField('observations', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Observaciones generales del día..."
            />
          </div>

          {/* Problemas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Problemas o Incidentes
            </label>
            <textarea
              value={formData.issues}
              onChange={(e) => updateField('issues', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Problemas o incidentes presentados..."
            />
          </div>

          {/* Recomendaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recomendaciones
            </label>
            <textarea
              value={formData.recommendations}
              onChange={(e) => updateField('recommendations', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Recomendaciones para el próximo día..."
            />
          </div>
        </div>
      </div>

      {/* Fotos */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Fotos del Día</h2>
        <PhotoUpload
          photos={formData.photos}
          onPhotosChange={(photos) => updateField('photos', photos)}
          maxPhotos={10}
          maxSizeMB={10}
          disabled={loading}
        />
      </div>

      {/* Firmas Digitales */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Firmas Digitales</h2>
        <p className="text-sm text-gray-600 mb-4">
          Selecciona los usuarios que firman esta bitácora. Las firmas se toman del perfil de cada usuario.
        </p>
        <SignatureSelector
          projectId={projectId}
          signatures={formData.signatures || []}
          onChange={(signatures: Signature[]) => updateField('signatures', signatures)}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Guardar Bitácora'}
        </button>
      </div>
    </form>
  )
}
