import { formatDateValue } from '@/lib/utils'

interface PrintData {
  log: any
  project: any
  assignedProfile: any
  residentProfile: any
  customFieldLabels: Record<string, string>
  baseUrl: string
  membreteBgBase64?: string
}

function getWeatherLabel(weather: string): string {
  switch (weather) {
    case 'soleado': return 'Soleado'
    case 'nublado': return 'Nublado'
    case 'lluvioso': return 'Lluvioso'
    case 'tormentoso': return 'Tormentoso'
    case 'parcialmente_nublado': return 'Parcialmente Nublado'
    default: return weather
  }
}

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function generateDailyLogHtml(data: PrintData): string {
  const { log, project, assignedProfile, residentProfile, customFieldLabels, baseUrl } = data

  const membreteBg = data.membreteBgBase64
    ? `data:image/jpeg;base64,${data.membreteBgBase64}`
    : `${baseUrl}/brand/Membrete%20Talento%20Inmobiliario.jpg`

  const checklistSections = (log.custom_fields?.checklists || [])
    .map((section: any) => ({
      ...section,
      items: (section.items || []).filter((item: any) =>
        item.status === 'compliant' || item.status === 'non_compliant'
      )
    }))
    .filter((section: any) => section.items?.length)

  const customFields = Object.entries({ ...(log.custom_fields || {}) })
    .filter(([key]) => !['checklists', '_field_labels', 'photo_count', 'photo_captions', 'work_front', 'element'].includes(key))

  const photoCaptions: string[] = Array.isArray(log.custom_fields?.photo_captions)
    ? log.custom_fields.photo_captions
    : typeof log.custom_fields?.photo_captions === 'string'
      ? log.custom_fields.photo_captions.split(',')
      : []

  const elaboradoPor = assignedProfile?.full_name || assignedProfile?.email || log.created_by_profile?.full_name || 'Usuario'

  const dateFormatted = formatDateValue(log.date, 'es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const textSections = [
    { label: 'Actividades Realizadas', content: log.activities },
    { label: 'Materiales Utilizados', content: log.materials },
    { label: 'Equipos Utilizados', content: log.equipment },
    { label: 'Observaciones', content: log.observations },
    { label: 'Problemas Encontrados', content: log.issues },
    { label: 'Recomendaciones', content: log.recommendations },
  ].filter(s => s.content)

  const textSectionsHtml = textSections.map(s => `
    <div class="section">
      <h2 class="section-title">${esc(s.label)}</h2>
      <div class="rich-content">${s.content}</div>
    </div>
  `).join('')

  const customFieldsHtml = customFields.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Campos Personalizados</h2>
      <div class="info-grid">
        ${customFields.map(([key, value]) => `
          <div class="info-item">
            <span class="info-label">${esc(customFieldLabels[key] || key)}</span>
            <span class="info-value">${esc(Array.isArray(value) ? value.join(', ') : String(value))}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : ''

  const checklistHtml = checklistSections.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Checklist de Verificación</h2>
      ${checklistSections.map((section: any) => `
        <div class="checklist-group">
          <div class="checklist-header">${esc(section.title)}</div>
          ${(section.items || []).map((item: any) => `
            <div class="checklist-item">
              <div class="checklist-desc">
                <strong>${esc(item.description)}</strong>
                ${item.observations ? `<br/><span class="text-muted">${esc(item.observations)}</span>` : ''}
              </div>
              <span class="checklist-status ${item.status === 'compliant' ? 'status-ok' : 'status-fail'}">
                ${item.status === 'compliant' ? 'Cumple' : 'No cumple'}
              </span>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  ` : ''

  const photosHtml = log.photos && log.photos.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Registro Fotográfico</h2>
      <div class="photo-grid">
        ${log.photos.map((photo: string, index: number) => `
          <div class="photo-item">
            <img src="${photo}" alt="Foto ${index + 1}" />
            ${photoCaptions[index] ? `<p class="photo-caption">${esc(photoCaptions[index])}</p>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : ''

  const signatureHtml = residentProfile ? `
    <div class="section signature-block">
      <h2 class="section-title">Realizada Por</h2>
      ${residentProfile.signature_url ? `<img src="${residentProfile.signature_url}" class="signature-img" />` : ''}
      <p class="signature-name">${esc(residentProfile.full_name || residentProfile.email)}</p>
      ${residentProfile.role ? `<p class="signature-detail">${esc(residentProfile.role)}</p>` : ''}
      ${residentProfile.professional_license ? `<p class="signature-detail">Licencia: ${esc(residentProfile.professional_license)}</p>` : ''}
      ${residentProfile.phone ? `<p class="signature-detail">Tel: ${esc(residentProfile.phone)}</p>` : ''}
      ${residentProfile.email ? `<p class="signature-detail">${esc(residentProfile.email)}</p>` : ''}
    </div>
  ` : ''

  const workFrontHtml = (log.work_front || log.element) ? `
    <div class="info-grid" style="margin-bottom: 14px;">
      ${log.work_front ? `<div class="info-item"><span class="info-label">Frente de Trabajo</span><span class="info-value">${esc(log.work_front)}</span></div>` : ''}
      ${log.element ? `<div class="info-item"><span class="info-label">Elemento</span><span class="info-value">${esc(log.element)}</span></div>` : ''}
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Bitácora - ${esc(project?.name || '')} - ${log.date}</title>
<style>
  /* ============ PÁGINA: Tamaño carta con JPG de fondo ============ */
  @page {
    size: letter;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 215.9mm;
    height: 279.4mm;
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 11.5px;
    line-height: 1.55;
    color: #222;
    background: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Membrete JPG como fondo fijo en cada página */
  body::before {
    content: '';
    position: fixed;
    top: 0; left: 0;
    width: 215.9mm;
    height: 279.4mm;
    background-image: url('${membreteBg}');
    background-size: 215.9mm 279.4mm;
    background-repeat: no-repeat;
    background-position: center;
    z-index: -1;
  }

  /* ============ ÁREA DE CONTENIDO ============ */
  /* Márgenes que respetan header del logo (~22mm) y footer del membrete (~28mm) */
  .content {
    padding: 26mm 20mm 32mm 20mm;
    min-height: 279.4mm;
  }

  /* ============ TÍTULO DEL DOCUMENTO ============ */
  .doc-type {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: #689F38;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .doc-title {
    font-size: 20px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 4px;
    border-bottom: 2px solid #8BC34A;
    padding-bottom: 6px;
  }
  .doc-subtitle {
    font-size: 12px;
    color: #555;
    margin-bottom: 2px;
  }
  .doc-header {
    margin-bottom: 18px;
  }

  /* ============ GRID DE INFO ============ */
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 20px;
    margin-bottom: 14px;
  }
  .info-item {
    display: flex;
    flex-direction: column;
    padding: 4px 0;
  }
  .info-label {
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #888;
    font-weight: 500;
  }
  .info-value {
    font-size: 12px;
    font-weight: 600;
    color: #222;
    margin-top: 1px;
  }

  /* ============ SECCIONES DE TEXTO ============ */
  .section {
    margin-bottom: 16px;
    break-inside: avoid;
  }
  .section-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #4a7c10;
    border-left: 3px solid #8BC34A;
    padding-left: 8px;
    margin-bottom: 6px;
  }

  /* Contenido rich-text del editor WYSIWYG */
  .rich-content {
    font-size: 11.5px;
    line-height: 1.6;
    color: #333;
    text-align: justify;
  }
  .rich-content p { margin-bottom: 4px; }
  .rich-content ul, .rich-content ol { margin-left: 18px; margin-bottom: 4px; }
  .rich-content li { margin-bottom: 2px; }
  .rich-content strong, .rich-content b { font-weight: 700; }
  .rich-content em, .rich-content i { font-style: italic; }
  .rich-content u { text-decoration: underline; }
  .rich-content table { border-collapse: collapse; width: 100%; margin: 6px 0; }
  .rich-content th, .rich-content td {
    border: 1px solid #ccc;
    padding: 4px 8px;
    font-size: 10.5px;
    text-align: left;
  }
  .rich-content th { background: #f0f0f0; font-weight: 600; }

  /* ============ CHECKLIST ============ */
  .checklist-group {
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 10px;
    break-inside: avoid;
  }
  .checklist-header {
    background: #f5f5f5;
    padding: 5px 10px;
    font-weight: 700;
    font-size: 11px;
    color: #333;
    border-bottom: 1px solid #ddd;
  }
  .checklist-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 4px 10px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 10.5px;
    gap: 10px;
  }
  .checklist-item:last-child { border-bottom: none; }
  .checklist-desc { flex: 1; color: #333; }
  .checklist-status {
    white-space: nowrap;
    font-weight: 600;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
  }
  .status-ok { color: #2e7d32; background: #e8f5e9; }
  .status-fail { color: #c62828; background: #ffebee; }
  .text-muted { color: #888; font-size: 10px; }

  /* ============ FOTOS ============ */
  .photo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .photo-item {
    break-inside: avoid;
    text-align: center;
  }
  .photo-item img {
    width: 100%;
    height: auto;
    max-height: 220px;
    object-fit: contain;
    border: 1px solid #ddd;
    border-radius: 3px;
  }
  .photo-caption {
    font-size: 9.5px;
    color: #666;
    font-style: italic;
    margin-top: 3px;
  }

  /* ============ FIRMA ============ */
  .signature-block { break-inside: avoid; }
  .signature-img { height: 50px; width: 120px; object-fit: contain; margin-bottom: 4px; }
  .signature-name { font-weight: 700; font-size: 12px; color: #222; }
  .signature-detail { font-size: 10px; color: #666; line-height: 1.4; }
</style>
</head>
<body>
  <div class="content">
    <!-- ENCABEZADO DEL DOCUMENTO -->
    <div class="doc-header">
      <p class="doc-type">Reporte Diario</p>
      <h1 class="doc-title">Bitácora de Obra</h1>
      <p class="doc-subtitle"><strong>Proyecto:</strong> ${esc(project?.name || '')}</p>
      <p class="doc-subtitle"><strong>Fecha:</strong> ${dateFormatted}</p>
    </div>

    <!-- INFORMACIÓN GENERAL -->
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Clima</span>
        <span class="info-value">${getWeatherLabel(log.weather)}</span>
      </div>
      ${log.temperature ? `
      <div class="info-item">
        <span class="info-label">Temperatura</span>
        <span class="info-value">${log.temperature}°C</span>
      </div>` : ''}
      <div class="info-item">
        <span class="info-label">Personal en Obra</span>
        <span class="info-value">${log.personnel_count ?? 0} personas</span>
      </div>
      <div class="info-item">
        <span class="info-label">Elaborado por</span>
        <span class="info-value">${esc(elaboradoPor)}</span>
      </div>
    </div>

    ${workFrontHtml}
    ${textSectionsHtml}
    ${customFieldsHtml}
    ${checklistHtml}
    ${photosHtml}
    ${signatureHtml}
  </div>
</body>
</html>`
}
