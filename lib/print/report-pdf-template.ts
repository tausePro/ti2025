// Plantilla HTML de los informes en PDF con el formato de la bitácora: hoja
// carta con el membrete en cada página, encabezado del documento, cuadro de
// datos, secciones con título verde y registro fotográfico a dos columnas.
// La renderiza Chromium en el servidor (lib/print/chromium.ts).

import { escapeHtml } from '../legacy-wp/report-html'

export interface ReportPdfPhoto {
  url: string
  caption?: string | null
}

export interface ReportPdfInput {
  docType: string
  title: string
  subtitle: Array<[string, string]>
  info: Array<[string, string | null | undefined]>
  body: string
  footerNote?: string
  membreteDataUrl: string
  fontCss?: string
}

const CSS = `
@page{size:letter;margin:0}
html,body{margin:0;padding:0}
body{font-family:'Arimo',Arial,Helvetica,sans-serif;font-size:10pt;line-height:1.5;color:#333;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.membrete{position:fixed;top:0;left:0;width:8.5in;height:11in;z-index:-1}
table.sheet{width:100%;border-collapse:collapse;border:0;table-layout:fixed}
table.sheet>thead>tr>td{height:95pt;padding:0;border:0}
table.sheet>tfoot>tr>td{height:100pt;padding:0;border:0}
table.sheet>tbody>tr>td.page-content{padding:0 56pt;vertical-align:top;border:0}
.doc-header{margin-bottom:14pt}
.doc-type{font-size:8pt;letter-spacing:2.5pt;color:#689F38;font-weight:700;text-transform:uppercase;margin-bottom:2pt}
.doc-title{font-size:18pt;font-weight:700;color:#1a1a1a;margin:0 0 4pt;border-bottom:2pt solid #8BC34A;padding-bottom:5pt;line-height:1.2}
.doc-subtitle{font-size:10.5pt;color:#444;margin-bottom:2pt}
.info-grid{display:flex;flex-wrap:wrap;margin-bottom:12pt}
.info-item{width:50%;padding:3pt 10pt 3pt 0;box-sizing:border-box;break-inside:avoid}
.info-label{display:block;font-size:7.5pt;text-transform:uppercase;letter-spacing:1pt;color:#888}
.info-value{display:block;font-size:10.5pt;font-weight:700;color:#222;margin-top:1pt}
.section-title{font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:2pt;color:#4a7c10;border-left:3pt solid #8BC34A;padding-left:7pt;margin:14pt 0 6pt;break-after:avoid;page-break-after:avoid}
.section-content{overflow-wrap:break-word}
.section-content::after{content:"";display:table;clear:both}
.section-content p{margin:0 0 6pt}
.section-content h1,.section-content h2,.section-content h3,.section-content h4,.section-content h5,.section-content h6{color:#1a1a1a;line-height:1.25;margin:10pt 0 5pt;break-after:avoid}
.section-content h1{font-size:13pt}.section-content h2{font-size:12pt}.section-content h3{font-size:11pt}.section-content h4,.section-content h5,.section-content h6{font-size:10pt}
.section-content ul,.section-content ol{margin:0 0 6pt;padding-left:18pt}
.section-content img{max-width:100%;height:auto !important;break-inside:avoid}
.section-content table{border-collapse:collapse;max-width:100%;margin:0 0 8pt;font-size:8.5pt;line-height:1.35}
.section-content td,.section-content th{border:0.5pt solid #bbb;padding:2pt 4pt;vertical-align:top;overflow-wrap:anywhere}
.section-content tr{break-inside:avoid}
.section-content td>p:last-child,.section-content th>p:last-child{margin-bottom:0}
.section-content .alignleft{float:left;margin:2pt 10pt 6pt 0}
.section-content .alignright{float:right;margin:2pt 0 6pt 10pt}
.section-content .aligncenter{display:block;margin-left:auto;margin-right:auto}
.section-content figure.wp-caption{display:inline-block;vertical-align:top;max-width:100%;margin:0 6pt 8pt 0;padding:3pt;background:#f3f4f6;text-align:center;break-inside:avoid}
.section-content figure.wp-caption.aligncenter{display:block}
.section-content figure.wp-caption img{display:block;margin:0 auto}
.section-content .wp-caption-text{margin:3pt 0 0;font-size:8pt;font-style:italic;color:#333;line-height:1.25}
.photo-grid{display:flex;flex-wrap:wrap;justify-content:space-between}
.photo-item{width:48%;margin-bottom:10pt;break-inside:avoid}
.photo-item img{display:block;box-sizing:border-box;width:100%;height:160pt;object-fit:contain;border:0.5pt solid #ddd;border-radius:2pt}
.photo-caption{font-size:8pt;color:#333;font-style:italic;text-align:center;margin-top:4pt;line-height:1.25}
.footer-note{margin-top:18pt;padding-top:6pt;border-top:0.5pt solid #ddd;font-size:7.5pt;color:#888}
`

/** Sección con el título verde de la bitácora. */
export function pdfSection(title: string, html: string): string {
  return `<section><div class="section-title">${escapeHtml(title)}</div><div class="section-content">${html}</div></section>`
}

/** Registro fotográfico a dos columnas, como en la bitácora. */
export function pdfPhotoGrid(title: string, photos: ReportPdfPhoto[]): string {
  if (!photos.length) return ''
  const items = photos
    .map(photo => {
      const caption = photo.caption?.trim() ? `<div class="photo-caption">${escapeHtml(photo.caption.trim())}</div>` : ''
      return `<div class="photo-item"><img src="${escapeHtml(photo.url)}" alt="">${caption}</div>`
    })
    .join('')
  return `<section><div class="section-title">${escapeHtml(title)}</div><div class="photo-grid">${items}</div></section>`
}

/**
 * Documento completo. El membrete va fijo (Chromium lo repite en cada página)
 * y la tabla exterior reserva en cada página el espacio de su encabezado y su
 * pie con thead y tfoot.
 */
export function buildReportPdfHtml(input: ReportPdfInput): string {
  const subtitle = input.subtitle
    .map(([label, value]) => `<div class="doc-subtitle"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`)
    .join('')
  const info = input.info
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, value]) => `<div class="info-item"><span class="info-label">${escapeHtml(label)}</span><span class="info-value">${escapeHtml(value)}</span></div>`)
    .join('')
  const footer = input.footerNote ? `<div class="footer-note">${escapeHtml(input.footerNote)}</div>` : ''
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(input.title)}</title><style>${input.fontCss ?? ''}${CSS}</style></head><body>
<img class="membrete" src="${input.membreteDataUrl}" alt="">
<table class="sheet"><thead><tr><td></td></tr></thead><tfoot><tr><td></td></tr></tfoot><tbody><tr><td class="page-content">
<div class="doc-header"><div class="doc-type">${escapeHtml(input.docType)}</div><h1 class="doc-title">${escapeHtml(input.title)}</h1>${subtitle}</div>
${info ? `<div class="info-grid">${info}</div>` : ''}
${input.body}
${footer}
</td></tr></tbody></table>
</body></html>`
}
