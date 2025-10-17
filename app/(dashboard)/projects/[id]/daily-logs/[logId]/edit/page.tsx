'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { PhotoUpload } from '@/components/daily-logs/PhotoUpload'

export default function EditDailyLogPage({ 
  params 
}: { 
  params: { id: string; logId: string } 
}) {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [log, setLog] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    date: '',
    weather: 'soleado',
    temperature: '',
    personnel_count: 0,
    activities: '',
    materials: '',
    equipment: '',
    observations: '',
    issues: '',
    recommendations: '',
    photos: [] as File[]
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Verificar autenticación
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Obtener bitácora
      const { data: logData, error: logError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('id', params.logId)
        .single()

      if (logError || !logData) {
        setError('No se encontró la bitácora')
        return
      }

      // Verificar que el usuario sea el creador
      if (logData.created_by !== user.id) {
        setError('No tienes permisos para editar esta bitácora')
        return
      }

      setLog(logData)

      // Obtener proyecto
      const { data: projectData } = await supabase
        .from('projects')
        .select('name')
        .eq('id', params.id)
        .single()

      setProject(projectData)

      // Cargar datos en el formulario
      setFormData({
        date: logData.date || '',
        weather: logData.data?.weather || logData.weather || 'soleado',
        temperature: logData.data?.temperature || logData.temperature || '',
        personnel_count: logData.data?.personnel_count || logData.personnel_count || 0,
        activities: logData.data?.activities || logData.activities || '',
        materials: logData.data?.materials || logData.materials || '',
        equipment: logData.data?.equipment || logData.equipment || '',
        observations: logData.data?.observations || logData.observations || '',
        issues: logData.data?.issues || logData.issues || '',
        recommendations: logData.data?.recommendations || logData.recommendations || '',
        photos: []
      })

    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      // Preparar datos actualizados
      const updateData = {
        date: formData.date,
        weather: formData.weather,
        temperature: formData.temperature,
        personnel_count: formData.personnel_count,
        activities: formData.activities,
        materials: formData.materials,
        equipment: formData.equipment,
        observations: formData.observations,
        issues: formData.issues,
        recommendations: formData.recommendations,
        data: {
          weather: formData.weather,
          temperature: formData.temperature,
          personnel_count: formData.personnel_count,
          activities: formData.activities,
          materials: formData.materials,
          equipment: formData.equipment,
          observations: formData.observations,
          issues: formData.issues,
          recommendations: formData.recommendations
        },
        updated_at: new Date().toISOString()
      }

      // Actualizar bitácora
      const { error: updateError } = await supabase
        .from('daily_logs')
        .update(updateData)
        .eq('id', params.logId)

      if (updateError) throw updateError

      // Subir nuevas fotos si hay
      if (formData.photos && formData.photos.length > 0) {
        const photoUrls: string[] = log.photos || []
        
        for (let i = 0; i < formData.photos.length; i++) {
          const file = formData.photos[i]
          const fileExt = file.name.split('.').pop()
          const fileName = `${user.id}/${params.id}/${params.logId}/${Date.now()}_${i}.${fileExt}`
          
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
          
          const { data: { publicUrl } } = supabase.storage
            .from('daily-logs-photos')
            .getPublicUrl(uploadData.path)
          
          photoUrls.push(publicUrl)
        }
        
        // Actualizar con nuevas fotos
        if (photoUrls.length > 0) {
          await supabase
            .from('daily_logs')
            .update({ photos: photoUrls })
            .eq('id', params.logId)
        }
      }

      // Redirigir a la vista de detalle
      router.push(`/projects/${params.id}/daily-logs/${params.logId}`)
      
    } catch (err: any) {
      console.error('Error updating log:', err)
      setError(err.message || 'Error al actualizar la bitácora')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <Link
            href={`/projects/${params.id}/daily-logs`}
            className="text-blue-600 hover:text-blue-700 mt-2 inline-block"
          >
            ← Volver a bitácoras
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/projects/${params.id}/daily-logs/${params.logId}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a la bitácora
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900">
          Editar Bitácora
        </h1>
        <p className="text-gray-600 mt-2">
          Proyecto: {project?.name}
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* Fecha */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Clima y Temperatura */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clima
            </label>
            <select
              value={formData.weather}
              onChange={(e) => setFormData({ ...formData, weather: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="soleado">☀️ Soleado</option>
              <option value="nublado">☁️ Nublado</option>
              <option value="parcialmente_nublado">⛅ Parcialmente Nublado</option>
              <option value="lluvioso">🌧️ Lluvioso</option>
              <option value="tormentoso">⛈️ Tormentoso</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperatura (°C)
            </label>
            <input
              type="number"
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: 25"
            />
          </div>
        </div>

        {/* Personal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cantidad de Personal
          </label>
          <input
            type="number"
            value={formData.personnel_count}
            onChange={(e) => setFormData({ ...formData, personnel_count: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            min="0"
          />
        </div>

        {/* Actividades */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Actividades Realizadas
          </label>
          <textarea
            value={formData.activities}
            onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe las actividades realizadas durante el día..."
          />
        </div>

        {/* Materiales */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Materiales Utilizados
          </label>
          <textarea
            value={formData.materials}
            onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Lista de materiales utilizados..."
          />
        </div>

        {/* Equipos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Equipos Utilizados
          </label>
          <textarea
            value={formData.equipment}
            onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Lista de equipos utilizados..."
          />
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observaciones
          </label>
          <textarea
            value={formData.observations}
            onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Observaciones generales..."
          />
        </div>

        {/* Problemas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Problemas Encontrados
          </label>
          <textarea
            value={formData.issues}
            onChange={(e) => setFormData({ ...formData, issues: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-red-300 rounded-md focus:ring-red-500 focus:border-red-500"
            placeholder="Describe cualquier problema o incidente..."
          />
        </div>

        {/* Recomendaciones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recomendaciones
          </label>
          <textarea
            value={formData.recommendations}
            onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Recomendaciones para el próximo día..."
          />
        </div>

        {/* Fotos actuales */}
        {log.photos && log.photos.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fotos Actuales ({log.photos.length})
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {log.photos.map((photo: string, index: number) => (
                <img
                  key={index}
                  src={photo}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-24 object-cover rounded"
                />
              ))}
            </div>
          </div>
        )}

        {/* Agregar nuevas fotos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Agregar Nuevas Fotos
          </label>
          <PhotoUpload
            photos={formData.photos}
            onChange={(photos) => setFormData({ ...formData, photos })}
          />
        </div>

        {/* Botones */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </button>
          
          <Link
            href={`/projects/${params.id}/daily-logs/${params.logId}`}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
