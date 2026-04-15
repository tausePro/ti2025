import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AutoPrint } from '@/components/print/AutoPrint'
import { replacePlaceholders } from '@/lib/reports/placeholder-replacer'
import { formatDateValue, getCustomFieldLabelsMap } from '@/lib/utils'

export default async function DailyLogPrintPage({
  params
}: {
  params: Promise<{ logId: string }>
}) {
  const { logId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: log, error } = await (supabase
    .from('daily_logs') as any)
    .select(`
      *,
      created_by_profile:profiles!daily_logs_created_by_fkey(full_name, email),
      project:projects(*)
    `)
    .eq('id', logId)
    .single()

  if (error || !log) {
    redirect('/dashboard')
  }

  const { data: project } = await supabase
    .from('projects')
    .select('*')
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
  const customFieldLabels = getCustomFieldLabelsMap(
    (configData?.custom_fields || []) as Array<{ id?: string; label?: string }>,
    storedLabels
  )

  const checklistSections = (log.custom_fields?.checklists || [])
    .map((section: any) => ({
      ...section,
      items: (section.items || []).filter((item: any) =>
        item.status === 'compliant' || item.status === 'non_compliant'
      )
    }))
    .filter((section: any) => section.items?.length)
  const customFields = Object.entries({ ...(log.custom_fields || {}) }).filter(([key]) => !['checklists', '_field_labels', 'photo_count', 'photo_captions', 'work_front', 'element'].includes(key))
  const photoCaptions: string[] = Array.isArray(log.custom_fields?.photo_captions)
    ? log.custom_fields.photo_captions
    : typeof log.custom_fields?.photo_captions === 'string'
      ? log.custom_fields.photo_captions.split(',')
      : []

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
                    {formatDateValue(log.date, 'es-CO', {
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
        <div className="membrete-page max-w-[215.9mm] mx-auto">
          {/* ===== FONDO JPG FIJO ===== */}
          <img
            src="/brand/Membrete%20Talento%20Inmobiliario.jpg"
            alt=""
            className="membrete-bg"
          />

          {/* ===== CONTENIDO ===== */}
          <main className="membrete-body px-10">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Reporte Diario</p>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">Bitácora diaria</h1>
              <p className="text-gray-600 mt-1">Proyecto: {project?.name}</p>
              <p className="text-gray-600">
                Fecha: {formatDateValue(log.date, 'es-CO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

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

            {(log.work_front || log.element) && (
              <section className="grid grid-cols-2 gap-4 text-sm mb-6 print-avoid-break">
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
              <section className="mb-5 print-avoid-break">
                <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-2">Actividades realizadas</h2>
                <div className="text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: log.activities }} />
              </section>
            )}

            {log.materials && (
              <section className="mb-5 print-avoid-break">
                <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-2">Materiales utilizados</h2>
                <div className="text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: log.materials }} />
              </section>
            )}

            {log.equipment && (
              <section className="mb-5 print-avoid-break">
                <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-2">Equipos utilizados</h2>
                <div className="text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: log.equipment }} />
              </section>
            )}

            {log.observations && (
              <section className="mb-5 print-avoid-break">
                <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-2">Observaciones</h2>
                <div className="text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: log.observations }} />
              </section>
            )}

            {log.issues && (
              <section className="mb-5 print-avoid-break">
                <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-2">Problemas encontrados</h2>
                <div className="text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: log.issues }} />
              </section>
            )}

            {log.recommendations && (
              <section className="mb-5 print-avoid-break">
                <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-2">Recomendaciones</h2>
                <div className="text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: log.recommendations }} />
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
              <section className="mb-6">
                <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-3">Checklist</h2>
                <div className="space-y-4">
                  {checklistSections.map((section: any) => (
                    <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden print-avoid-break">
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
              <section className="mb-6">
                <h2 className="text-sm uppercase tracking-[0.18em] text-gray-500 mb-3">Registro fotográfico</h2>
                <div className="grid grid-cols-2 gap-4">
                  {log.photos.map((photo: string, index: number) => (
                    <div key={`${photo}-${index}`} className="print-avoid-break">
                      <img
                        src={photo}
                        alt={photoCaptions[index] || `Foto ${index + 1}`}
                        className="w-full h-auto max-h-72 object-contain rounded-lg border border-gray-200 bg-white"
                      />
                      {photoCaptions[index] && (
                        <p className="text-xs text-gray-600 text-center mt-1 italic">
                          {photoCaptions[index]}
                        </p>
                      )}
                    </div>
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
          </main>

          {/* ===== FOOTER FIJO: Contacto + Decoración verde ===== */}
          <footer className="membrete-footer">
            <div className="membrete-footer-line" />
            <div className="membrete-footer-content">
              <div className="membrete-footer-contact">
                <span>📞 (604) 3288739</span>
                <span>✉️ gerencia@talentoinmobiliario.com</span>
                <span>🌐 https://talentoinmobiliario.com/</span>
                <span>📍 Calle 71 Sur # 43B – 52 Oficina 203, Sabaneta, Antioquia</span>
              </div>
            </div>
            {/* Decoración geométrica verde esquina inferior derecha */}
            <div className="membrete-corner-decoration" />
          </footer>
        </div>
      )}

      <style>{`
        /* ===== MEMBRETE CON JPG OFICIAL DE FONDO ===== */
        .membrete-page {
          position: relative;
          min-height: 279.4mm;
          max-width: 215.9mm;
          margin: 0 auto;
        }
        .membrete-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 215.9mm;
          height: 279.4mm;
          z-index: 0;
          pointer-events: none;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .membrete-header { display: none; }
        .membrete-footer { display: none; }
        .membrete-corner-decoration { display: none; }
        .membrete-footer-line { display: none; }
        .membrete-footer-content { display: none; }
        .membrete-body {
          position: relative;
          z-index: 1;
          padding: 26mm 18mm 32mm 18mm;
        }
        @media print {
          @page {
            size: letter;
            margin: 0;
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
          .membrete-bg {
            position: fixed !important;
          }
          .print-avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          h2 { page-break-after: avoid; }
          table { page-break-inside: avoid; }
          p { orphans: 3; widows: 3; }
        }
        /* Tipografía profesional */
        .membrete-body h2 {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #4a7c10;
          border-left: 3px solid #8BC34A;
          padding-left: 8px;
          margin-bottom: 6px;
        }
        .membrete-body section { margin-bottom: 16px; }
        .membrete-body .prose, .membrete-body .text-gray-700 {
          text-align: justify;
          font-size: 11.5px;
          line-height: 1.6;
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
