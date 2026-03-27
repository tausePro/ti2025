'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { formatDateValue, getCustomFieldLabelsMap } from '@/lib/utils'

interface DailyLog {
  id: string
  project_id: string
  date: string
  time: string | null
  weather: string
  temperature: number | null
  personnel_count: number | null
  activities: string | null
  materials: string | null
  equipment: string | null
  observations: string | null
  issues: string | null
  recommendations: string | null
  work_front: string | null
  element: string | null
  photos: string[] | null
  custom_fields: any
  created_by: string
  assigned_to: string | null
  created_at: string
  created_by_profile?: { full_name: string | null; email: string | null }
  assigned_to_profile?: { full_name: string | null; email: string | null; role?: string; professional_license?: string; phone?: string; signature_url?: string }
}

interface Project {
  name: string
  project_code: string
  address?: string
}

const getWeatherLabel = (weather: string) => {
  switch (weather) {
    case 'soleado': return 'Soleado'
    case 'nublado': return 'Nublado'
    case 'lluvioso': return 'Lluvioso'
    case 'tormentoso': return 'Tormentoso'
    case 'parcialmente_nublado': return 'Parcialmente Nublado'
    default: return weather
  }
}

export default function BatchPrintPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    }>
      <BatchPrintContent />
    </Suspense>
  )
}

function BatchPrintContent() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [logs, setLogs] = useState<DailyLog[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadLogs()
  }, [])

  useEffect(() => {
    if (!loading && logs.length > 0) {
      setTimeout(() => window.print(), 600)
    }
  }, [loading, logs])

  const loadLogs = async () => {
    try {
      const idsParam = searchParams.get('ids')
      if (!idsParam) {
        setError('No se proporcionaron IDs de bitácoras')
        return
      }

      const ids = idsParam.split(',').filter(Boolean)
      if (ids.length === 0) {
        setError('No se proporcionaron IDs válidos')
        return
      }

      const { data: logsData, error: logsError } = await supabase
        .from('daily_logs')
        .select(`
          *,
          created_by_profile:profiles!daily_logs_created_by_fkey(full_name, email),
          assigned_to_profile:profiles!daily_logs_assigned_to_fkey(full_name, email, role, professional_license, phone, signature_url)
        `)
        .in('id', ids)
        .order('date', { ascending: true })

      if (logsError) throw logsError
      if (!logsData || logsData.length === 0) {
        setError('No se encontraron bitácoras')
        return
      }

      // Normalizar relaciones
      const normalized = logsData.map((log: any) => ({
        ...log,
        created_by_profile: Array.isArray(log.created_by_profile) ? log.created_by_profile[0] : log.created_by_profile,
        assigned_to_profile: Array.isArray(log.assigned_to_profile) ? log.assigned_to_profile[0] : log.assigned_to_profile,
      }))

      // Convertir fotos a URLs públicas
      const logsWithUrls = normalized.map((log: any) => {
        if (log.photos && Array.isArray(log.photos) && log.photos.length > 0) {
          const publicUrls = log.photos.map((p: string) => {
            if (p.startsWith('http')) return p
            const { data: { publicUrl } } = supabase.storage.from('daily-logs-photos').getPublicUrl(p)
            return publicUrl
          })
          return { ...log, photos: publicUrls }
        }
        return log
      })

      setLogs(logsWithUrls)

      // Cargar proyecto
      const projectId = logsWithUrls[0].project_id
      const { data: projectData } = await supabase
        .from('projects')
        .select('name, project_code, address')
        .eq('id', projectId)
        .single()

      if (projectData) setProject(projectData)
    } catch (err: any) {
      console.error('Error loading batch logs:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Cargando {searchParams.get('ids')?.split(',').length || 0} bitácoras...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Portada resumen */}
      <div className="print-page flex flex-col items-center justify-center" style={{ minHeight: '297mm' }}>
        <img
          src="/brand/logo-footer.png"
          alt="Logo"
          className="w-28 h-28 object-contain mb-8"
        />
        <h1 className="text-2xl font-bold text-gray-900 text-center uppercase tracking-wide mb-2">
          Bitácoras Diarias
        </h1>
        {project && (
          <>
            <p className="text-lg font-medium text-green-700 mb-1">{project.name}</p>
            <p className="text-sm text-gray-600">Código: {project.project_code}</p>
            {project.address && <p className="text-sm text-gray-500 mt-1">{project.address}</p>}
          </>
        )}
        <div className="mt-8 border border-gray-200 rounded-lg px-8 py-4 text-center">
          <p className="text-sm text-gray-600">
            <strong>{logs.length}</strong> bitácora{logs.length > 1 ? 's' : ''} incluida{logs.length > 1 ? 's' : ''}
          </p>
          {logs.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Período: {formatDateValue(logs[0].date, 'es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
              {logs.length > 1 && (
                <> al {formatDateValue(logs[logs.length - 1].date, 'es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</>
              )}
            </p>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-6">
          Generado: {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Cada bitácora como página separada */}
      {logs.map((log, index) => {
        const customFields = Object.entries({ ...(log.custom_fields || {}) }).filter(([key]) => !['checklists', '_field_labels', 'photo_count', 'photo_captions'].includes(key))
        const storedLabels = log.custom_fields?._field_labels || {}
        const fieldLabels = getCustomFieldLabelsMap([], storedLabels)
        const checklistSections = (log.custom_fields?.checklists || [])
          .map((s: any) => ({ ...s, items: (s.items || []).filter((i: any) => i.status === 'compliant' || i.status === 'non_compliant') }))
          .filter((s: any) => s.items?.length)
        const resident = log.assigned_to_profile || log.created_by_profile

        return (
          <div key={log.id} className="print-page px-10 py-8" style={{ minHeight: '297mm' }}>
            {/* Encabezado de la bitácora */}
            <header className="border-b-2 border-green-500 pb-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Bitácora Diaria #{index + 1} de {logs.length}</p>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">
                    {formatDateValue(log.date, 'es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </h2>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>{project?.name}</p>
                  <p className="text-xs">{project?.project_code}</p>
                </div>
              </div>
            </header>

            {/* Info general */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
              <div>
                <p className="text-gray-500">Clima</p>
                <p className="font-medium">{getWeatherLabel(log.weather)}</p>
              </div>
              {log.temperature && (
                <div>
                  <p className="text-gray-500">Temperatura</p>
                  <p className="font-medium">{log.temperature}°C</p>
                </div>
              )}
              <div>
                <p className="text-gray-500">Personal</p>
                <p className="font-medium">{log.personnel_count ?? 0} personas</p>
              </div>
              <div>
                <p className="text-gray-500">Elaborado por</p>
                <p className="font-medium">{resident?.full_name || resident?.email || 'Usuario'}</p>
              </div>
            </section>

            {(log.work_front || log.element) && (
              <section className="grid grid-cols-2 gap-4 text-sm mb-6">
                {log.work_front && (
                  <div>
                    <p className="text-gray-500">Frente de Trabajo</p>
                    <p className="font-medium">{log.work_front}</p>
                  </div>
                )}
                {log.element && (
                  <div>
                    <p className="text-gray-500">Elemento</p>
                    <p className="font-medium">{log.element}</p>
                  </div>
                )}
              </section>
            )}

            {log.activities && (
              <section className="mb-4 print-avoid-break">
                <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-1">Actividades realizadas</h3>
                <div className="text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: log.activities }} />
              </section>
            )}

            {log.materials && (
              <section className="mb-4 print-avoid-break">
                <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-1">Materiales utilizados</h3>
                <div className="text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: log.materials }} />
              </section>
            )}

            {log.equipment && (
              <section className="mb-4 print-avoid-break">
                <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-1">Equipos utilizados</h3>
                <div className="text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: log.equipment }} />
              </section>
            )}

            {log.observations && (
              <section className="mb-4 print-avoid-break">
                <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-1">Observaciones</h3>
                <div className="text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: log.observations }} />
              </section>
            )}

            {log.issues && (
              <section className="mb-4 print-avoid-break">
                <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-1">Problemas encontrados</h3>
                <div className="text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: log.issues }} />
              </section>
            )}

            {log.recommendations && (
              <section className="mb-4 print-avoid-break">
                <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-1">Recomendaciones</h3>
                <div className="text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: log.recommendations }} />
              </section>
            )}

            {customFields.length > 0 && (
              <section className="mb-4 print-avoid-break">
                <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-1">Campos personalizados</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {customFields.map(([key, value]) => (
                    <div key={key}>
                      <span className="text-gray-500">{fieldLabels[key] || key}:</span>
                      <span className="ml-2 font-medium">{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {checklistSections.length > 0 && (
              <section className="mb-4 print-avoid-break">
                <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-2">Checklist</h3>
                <div className="space-y-3">
                  {checklistSections.map((section: any) => (
                    <div key={section.id} className="border border-gray-200 rounded overflow-hidden">
                      <div className="bg-gray-100 px-3 py-1.5 font-semibold text-gray-800 text-xs">{section.title}</div>
                      <div className="divide-y text-xs">
                        {section.items?.map((item: any) => (
                          <div key={item.id} className="px-3 py-1.5 flex justify-between">
                            <span>{item.description}</span>
                            <span className="font-medium">{item.status === 'compliant' ? 'Cumple' : 'No cumple'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {log.photos && log.photos.length > 0 && (
              <section className="mb-4 print-avoid-break">
                <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-2">Registro fotográfico</h3>
                <div className="grid grid-cols-2 gap-2">
                  {log.photos.map((photo: string, idx: number) => (
                    <img
                      key={`${photo}-${idx}`}
                      src={photo}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-auto max-h-60 object-contain rounded border border-gray-200 bg-white"
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )
      })}

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm 10mm 15mm 10mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-page {
            page-break-after: always;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
          .print-avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          h3 {
            page-break-after: avoid;
          }
          table {
            page-break-inside: avoid;
          }
          p {
            orphans: 3;
            widows: 3;
          }
        }
        .prose table {
          border-collapse: collapse;
          width: 100%;
        }
        .prose th,
        .prose td {
          border: 1px solid #d1d5db;
          padding: 0.4rem 0.6rem;
          font-size: 0.8rem;
        }
        .prose th {
          background-color: #f3f4f6;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
