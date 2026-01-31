import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AutoPrint } from '@/components/print/AutoPrint'
import { replacePlaceholders } from '@/lib/reports/placeholder-replacer'

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
    .select('id, name, project_code, location, address, client_name')
    .eq('id', log.project_id)
    .single()

  const { data: assignedProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', log.assigned_to)
    .maybeSingle()

  const { data: residentProfile } = await supabase
    .from('profiles')
    .select('full_name, email, role, professional_license, phone, signature_url')
    .eq('id', log.created_by)
    .maybeSingle()

  const { data: configData } = await supabase
    .from('daily_log_configs')
    .select('custom_fields')
    .eq('project_id', log.project_id)
    .single()

  const { data: template } = await supabase
    .from('report_templates')
    .select('*')
    .eq('template_type', 'bitacora_diaria')
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: sections } = template
    ? await supabase
        .from('section_templates')
        .select('*')
        .eq('report_template_id', template.id)
        .eq('is_active', true)
        .order('section_order')
    : { data: null }

  const storedLabels = (log.custom_fields as any)?._field_labels || {}
  const customFieldLabels = (configData?.custom_fields || []).reduce(
    (acc: Record<string, string>, field: any) => {
      if (field?.id && field?.label) {
        acc[field.id] = field.label
      }
      return acc
    },
    { ...storedLabels }
  )

  const checklistSections = (log.custom_fields?.checklists || [])
    .map((section: any) => ({
      ...section,
      items: (section.items || []).filter((item: any) =>
        item.status === 'compliant' || item.status === 'non_compliant'
      )
    }))
    .filter((section: any) => section.items?.length)
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

  const hasTemplate = Boolean(template && sections?.length)
  const content = hasTemplate
    ? sections?.map((section) => {
        const baseContent = section.base_content || section.content_template || ''
        return {
          ...section,
          html: replacePlaceholders(baseContent, {
            project,
            periodStart: log.date,
            periodEnd: log.date,
            dailyLogs: [log],
            qualityControl: [],
            photos: (log.photos || []).map((photo: string, index: number) => ({
              file_url: photo,
              file_name: `Foto ${index + 1}`
            })),
            summary: {
              totalDays: 1,
              workDays: log.weather === 'lluvia_intensa' || log.weather === 'lluvioso' ? 0 : 1,
              rainDays: log.weather === 'lluvia_intensa' || log.weather === 'lluvioso' ? 1 : 0,
              totalWorkers: log.personnel_count || 0,
              totalTests: 0,
              passedTests: 0,
              failedTests: 0
            },
            dailyLog: log,
            resident: residentProfile,
            assigned: assignedProfile
          })
        }
      })
    : []

  return (
    <div className="bg-white min-h-screen">
      <AutoPrint />

      {hasTemplate ? (
        <div
          className="max-w-[210mm] mx-auto"
          style={{
            paddingTop: template?.styles?.margins?.top ?? 40,
            paddingBottom: template?.styles?.margins?.bottom ?? 40,
            paddingLeft: template?.styles?.margins?.left ?? 40,
            paddingRight: template?.styles?.margins?.right ?? 40
          }}
        >
          <div className="border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <header
              className="px-6 py-4"
              style={{
                backgroundColor: template?.header_config?.background_color || '#ffffff',
                color: template?.header_config?.text_color || '#1f2937'
              }}
            >
              <div className="flex items-center justify-between gap-6">
                {template?.header_config?.logo_url && (
                  <img
                    src={template.header_config.logo_url}
                    alt="Logo"
                    className="h-14 w-24 object-contain"
                  />
                )}
                <div className="flex-1">
                  {template?.header_config?.company_name && (
                    <p className="text-sm font-semibold">
                      {template.header_config.company_name}
                    </p>
                  )}
                  {template?.header_config?.custom_text && (
                    <p className="text-xs">{template.header_config.custom_text}</p>
                  )}
                  {template?.header_config?.show_project_code && (
                    <p className="text-xs">
                      Proyecto: {project?.project_code} - {project?.name}
                    </p>
                  )}
                </div>
                {template?.header_config?.show_date && (
                  <div className="text-right text-xs">
                    {new Date(log.date).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                )}
              </div>
            </header>

            <div className="px-6 py-6 space-y-6">
              {content?.map((section) => (
                <section key={section.id} className="print-avoid-break">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: section.html }}
                  />
                </section>
              ))}
            </div>

            <footer
              className="px-6 py-4 text-xs text-gray-500 border-t"
              style={{ color: template?.footer_config?.text_color || '#6b7280' }}
            >
              <div className="flex items-center justify-between gap-4">
                {template?.footer_config?.custom_text ? (
                  <span>{template.footer_config.custom_text}</span>
                ) : (
                  <span>Documento generado desde plantilla global.</span>
                )}
                {template?.footer_config?.show_generation_date && (
                  <span>
                    Generado: {new Date().toLocaleDateString('es-CO')}
                  </span>
                )}
              </div>
            </footer>
          </div>
        </div>
      ) : (
        <>
          <img
            src="/brand/MEMBRETE%20TI.jpg"
            alt="Membrete"
            className="fixed inset-0 w-full h-full object-cover pointer-events-none select-none"
            style={{ zIndex: 0 }}
          />

          <div className="max-w-[210mm] mx-auto px-6 pb-10 pt-24">
            <div className="relative" style={{ zIndex: 1 }}>
              <div className="bg-white/95 p-6">
                <header className="border-b border-gray-200 pb-4 mb-6">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Reporte Diario</p>
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
                  </div>
                </header>

                <section className="grid grid-cols-2 gap-4 text-sm mb-6 print-avoid-break">
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
              <section className="mb-5 print-avoid-break">
                <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-2">Actividades realizadas</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{log.activities}</p>
              </section>
            )}

            {log.materials && (
              <section className="mb-5 print-avoid-break">
                <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-2">Materiales utilizados</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{log.materials}</p>
              </section>
            )}

            {log.equipment && (
              <section className="mb-5 print-avoid-break">
                <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-2">Equipos utilizados</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{log.equipment}</p>
              </section>
            )}

            {log.observations && (
              <section className="mb-5 print-avoid-break">
                <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-2">Observaciones</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{log.observations}</p>
              </section>
            )}

            {log.issues && (
              <section className="mb-5 print-avoid-break">
                <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-2">Problemas encontrados</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{log.issues}</p>
              </section>
            )}

            {log.recommendations && (
              <section className="mb-5 print-avoid-break">
                <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-2">Recomendaciones</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{log.recommendations}</p>
              </section>
            )}

            {customFields.length > 0 && (
              <section className="mb-6 print-avoid-break">
                <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-2">Campos personalizados</h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {customFields.map(([key, value]) => (
                    <div key={key} className="px-1">
                      <span className="text-gray-500">{customFieldLabels[key] || key}:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {checklistSections.length > 0 && (
              <section className="mb-6 print-avoid-break">
                <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-3">Checklist</h2>
                <div className="space-y-4">
                  {checklistSections.map((section: any) => (
                    <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
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
              <section className="mb-6 print-avoid-break">
                <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-3">Registro fotográfico</h2>
                <div className="grid grid-cols-2 gap-3">
                  {log.photos.map((photo: string, index: number) => (
                    <img
                      key={`${photo}-${index}`}
                      src={photo}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-auto max-h-72 object-contain rounded-lg border border-gray-200 bg-white"
                    />
                  ))}
                </div>
              </section>
            )}

            {residentProfile && (
              <section className="mb-6 print-avoid-break">
                <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-3">Realizada por</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    {residentProfile.signature_url && (
                      <img
                        src={residentProfile.signature_url}
                        alt={`Firma de ${residentProfile.full_name || residentProfile.email}`}
                        className="h-16 w-32 object-contain"
                      />
                    )}
                    <p className="mt-2 font-medium text-gray-900">
                      {residentProfile.full_name || residentProfile.email}
                    </p>
                    {residentProfile.role && (
                      <p className="text-xs text-gray-500 capitalize">{residentProfile.role}</p>
                    )}
                    {residentProfile.professional_license && (
                      <p className="text-xs text-gray-500">Licencia: {residentProfile.professional_license}</p>
                    )}
                    {residentProfile.phone && (
                      <p className="text-xs text-gray-500">Teléfono: {residentProfile.phone}</p>
                    )}
                    {residentProfile.email && (
                      <p className="text-xs text-gray-500">Correo: {residentProfile.email}</p>
                    )}
                  </div>
                </div>
              </section>
            )}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #fff;
          }
          .print-avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
