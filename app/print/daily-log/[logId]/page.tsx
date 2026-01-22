import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AutoPrint } from '@/components/print/AutoPrint'

export default async function DailyLogPrintPage({
  params
}: {
  params: { logId: string }
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: log, error } = await (supabase
    .from('daily_logs') as any)
    .select(`
      *,
      created_by_profile:profiles!daily_logs_created_by_fkey(full_name, email)
    `)
    .eq('id', params.logId)
    .single()

  if (error || !log) {
    redirect('/dashboard')
  }

  const { data: project } = await (supabase
    .from('projects') as any)
    .select('name')
    .eq('id', log.project_id)
    .single()

  const { data: assignedProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', log.assigned_to)
    .maybeSingle()

  const { data: configData } = await supabase
    .from('daily_log_configs')
    .select('custom_fields')
    .eq('project_id', log.project_id)
    .single()

  const customFieldLabels = (configData?.custom_fields || []).reduce(
    (acc: Record<string, string>, field: any) => {
      if (field?.id && field?.label) {
        acc[field.id] = field.label
      }
      return acc
    },
    {}
  )

  const checklistSections = log.custom_fields?.checklists || []
  const customFields = Object.entries({ ...(log.custom_fields || {}) }).filter(([key]) => key !== 'checklists')

  const getWeatherLabel = (weather: string) => {
    switch (weather) {
      case 'soleado': return '☀️ Soleado'
      case 'nublado': return '☁️ Nublado'
      case 'lluvioso': return '🌧️ Lluvioso'
      case 'tormentoso': return '⛈️ Tormentoso'
      case 'parcialmente_nublado': return '⛅ Parcialmente Nublado'
      default: return weather
    }
  }

  return (
    <div className="bg-white min-h-screen">
      <AutoPrint />

      <img
        src="/brand/MEMBRETE%20TI.jpg"
        alt="Membrete"
        className="fixed inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ zIndex: 0 }}
      />

      <div className="max-w-[210mm] mx-auto px-6 py-8">
        <div className="relative" style={{ zIndex: 1 }}>
        <header className="border-b pb-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Bitácora diaria</h1>
          <p className="text-gray-600">Proyecto: {project?.name}</p>
          <p className="text-gray-600">
            Fecha: {new Date(log.date).toLocaleDateString('es-CO', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </header>

        <section className="grid grid-cols-2 gap-4 text-sm mb-6">
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
            <p className="font-medium">
              {assignedProfile?.full_name || assignedProfile?.email || log.created_by_profile?.full_name || 'Usuario'}
            </p>
          </div>
        </section>

        {log.activities && (
          <section className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Actividades realizadas</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{log.activities}</p>
          </section>
        )}

        {log.materials && (
          <section className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Materiales utilizados</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{log.materials}</p>
          </section>
        )}

        {log.equipment && (
          <section className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Equipos utilizados</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{log.equipment}</p>
          </section>
        )}

        {log.observations && (
          <section className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Observaciones</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{log.observations}</p>
          </section>
        )}

        {log.issues && (
          <section className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Problemas encontrados</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{log.issues}</p>
          </section>
        )}

        {log.recommendations && (
          <section className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Recomendaciones</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{log.recommendations}</p>
          </section>
        )}

        {customFields.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Campos personalizados</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {customFields.map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-gray-500">{customFieldLabels[key] || key}:</span>
                  <span className="font-medium text-gray-900">
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {checklistSections.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Checklist</h2>
            <div className="space-y-4">
              {checklistSections.map((section: any) => (
                <div key={section.id} className="border rounded">
                  <div className="bg-gray-100 px-3 py-2 font-semibold text-gray-800 text-sm">
                    {section.title}
                  </div>
                  <div className="divide-y">
                    {section.items?.map((item: any) => (
                      <div key={item.id} className="px-3 py-2 text-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-gray-900">{item.description}</p>
                            {item.observations && (
                              <p className="text-gray-500 mt-1">{item.observations}</p>
                            )}
                          </div>
                          <span className="text-xs font-medium text-gray-700">
                            {item.status === 'compliant'
                              ? 'Cumple'
                              : item.status === 'non_compliant'
                                ? 'No cumple'
                                : item.status === 'not_applicable'
                                  ? 'No aplica'
                                  : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {log.photos && log.photos.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Fotos</h2>
            <div className="grid grid-cols-2 gap-3">
              {log.photos.map((photo: string, index: number) => (
                <img
                  key={`${photo}-${index}`}
                  src={photo}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-48 object-cover rounded border"
                />
              ))}
            </div>
          </section>
        )}
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #fff;
          }
        }
      `}</style>
    </div>
  )
}
