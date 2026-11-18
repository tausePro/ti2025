// Prepara el HTML de los informes de la plataforma anterior (WordPress) para
// mostrarlo en un iframe aislado (sin scripts). Reproduce lo que WordPress
// hacía al publicar el contenido: convertir [caption] en figuras y agregar los
// párrafos y saltos de línea que el texto guardado no trae.

export interface LegacySection {
  key: string
  title: string
  html?: string | null
  gallery?: boolean
}

export interface LegacyPhoto {
  url: string
  caption?: string | null
  sort_order?: number | null
}

const BLOCK_TAGS =
  'table|thead|tfoot|caption|col|colgroup|tbody|tr|td|th|div|dl|dd|dt|ul|ol|li|pre|form|map|area|blockquote|address|math|style|p|h[1-6]|hr|fieldset|legend|section|article|aside|hgroup|header|footer|nav|figure|figcaption|details|menu|summary'
const OPEN_BLOCK = new RegExp(`(<(?:${BLOCK_TAGS})[\\s/>])`, 'gi')
const CLOSE_BLOCK = new RegExp(`(</(?:${BLOCK_TAGS})>)`, 'gi')
const LONE_BLOCK_IN_P = new RegExp(`<p>\\s*(</?(?:${BLOCK_TAGS})[^>]*>)\\s*</p>`, 'gi')
const P_BEFORE_BLOCK = new RegExp(`<p>\\s*(</?(?:${BLOCK_TAGS})[^>]*>)`, 'gi')
const P_AFTER_BLOCK = new RegExp(`(</?(?:${BLOCK_TAGS})[^>]*>)\\s*</p>`, 'gi')
const BR_AFTER_BLOCK = new RegExp(`(</?(?:${BLOCK_TAGS})[^>]*>)\\s*<br />`, 'gi')

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Párrafos automáticos de WordPress (wpautop): los bloques separados por una
 * línea en blanco se vuelven <p> y los saltos sueltos, <br />.
 */
export function autop(input: string): string {
  if (!input.trim()) return ''
  const preBlocks: string[] = []
  let text = input.replace(/<pre\b[\s\S]*?<\/pre>/gi, block => `<pre data-autop="${preBlocks.push(block) - 1}"></pre>`)
  text = text.replace(/<[^>]*>/g, tag => tag.replace(/\s*\r?\n\s*/g, ' '))
  text = text.replace(/\r\n?/g, '\n')
  text = text.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n')
  text = text.replace(OPEN_BLOCK, '\n\n$1').replace(CLOSE_BLOCK, '$1\n\n')
  text = text.replace(/\n\n+/g, '\n\n')
  text = text
    .split(/\n\s*\n/)
    .filter(chunk => chunk.trim())
    .map(chunk => `<p>${chunk.replace(/^\n+|\n+$/g, '')}</p>\n`)
    .join('')
  text = text.replace(/<p>\s*<\/p>/g, '')
  text = text.replace(/<p>([^<]+)<\/(div|address|form)>/gi, '<p>$1</p></$2>')
  text = text.replace(LONE_BLOCK_IN_P, '$1')
  text = text.replace(/<p>(<li.+?)<\/p>/gi, '$1')
  text = text.replace(/<p><blockquote([^>]*)>/gi, '<blockquote$1><p>').replace(/<\/blockquote><\/p>/gi, '</p></blockquote>')
  text = text.replace(P_BEFORE_BLOCK, '$1').replace(P_AFTER_BLOCK, '$1')
  text = text.replace(/(<br \/>)?\s*\n/g, (match, br) => (br ? match : '<br />\n'))
  text = text.replace(BR_AFTER_BLOCK, '$1')
  text = text.replace(/<br \/>(\s*<\/?(?:p|li|div|dl|dd|dt|th|pre|td|ul|ol)[^>]*>)/gi, '$1')
  text = text.replace(/\n<\/p>$/, '</p>')
  return text.replace(/<pre data-autop="(\d+)"><\/pre>/g, (_, index) => preBlocks[Number(index)])
}

/** [caption align="..." width="..."]<img> texto[/caption] → <figure> como lo publicaba WordPress. */
export function expandCaptions(html: string): string {
  return html.replace(/\[caption([^\]]*)\]([\s\S]*?)\[\/caption\]/gi, (_, attrs: string, inner: string) => {
    const media = /^\s*((?:<a\b[^>]*>\s*)?<img\b[^>]*>(?:\s*<\/a>)?)([\s\S]*)$/i.exec(inner)
    if (!media) return inner
    const align = /\balign\s*=\s*["']?(align(?:none|left|right|center))/i.exec(attrs)?.[1].toLowerCase() ?? 'alignnone'
    const width = Number(/\bwidth\s*=\s*["']?(\d+)/i.exec(attrs)?.[1])
    // max-width y no width: así la figura se achica en pantallas o columnas angostas
    const style = width > 0 ? ` style="max-width: ${width}px"` : ''
    const text = media[2].replace(/^(?:\s*<br\s*\/?>)+/i, '').trim()
    return `<figure class="wp-caption ${align}"${style}>${media[1]}${text ? `<figcaption class="wp-caption-text">${text}</figcaption>` : ''}</figure>`
  })
}

/**
 * Quita lo que no debe ejecutarse ni cargarse. Es una capa adicional: el
 * iframe donde se muestra ya bloquea los scripts.
 */
export function stripUnsafeHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed|noscript|template|svg|math)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?(?:script|style|iframe|object|embed|noscript|template|svg|math|form|input|button|select|textarea|meta|link|base|frame|frameset)\b[^>]*>/gi, '')
    .replace(/<[a-z][^>]*>/gi, tag =>
      tag
        .replace(/\s(?:on[a-z]+|srcdoc|formaction)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/\s(href|src|action|xlink:href)\s*=\s*(["']?)\s*(?:javascript|vbscript|data:text\/html)[^"'\s>]*\2/gi, ' $1="#"')
    )
}

function lazyImages(html: string): string {
  return html.replace(/<img\b(?![^>]*\bloading\s*=)/gi, '<img loading="lazy"')
}

const CAPTION = String.raw`\[caption[^\]]*\](?:(?!\[\/?caption)[\s\S])*\[\/caption\]`
const CAPTION_PARAGRAPH = new RegExp(String.raw`<p>\s*((?:${CAPTION}\s*(?:<br \/>\s*)?)+)<\/p>`, 'gi')

/**
 * Como shortcode_unautop de WordPress: saca de su <p> los párrafos que solo
 * tienen fotos con pie. Además quita el salto entre fotos seguidas para que se
 * acomoden en filas en lugar de una columna.
 */
function unwrapCaptionParagraphs(html: string): string {
  return html.replace(CAPTION_PARAGRAPH, (_, run: string) => run.replace(/\[\/caption\]\s*<br \/>\s*/gi, '[/caption]\n').trim())
}

/**
 * HTML de una sección listo para el documento del informe, en el orden de
 * WordPress: párrafos automáticos primero y después los [caption]. Para
 * imprimir se desactiva la carga diferida: todas las imágenes deben cargar.
 */
export function renderLegacyHtml(html: string, { lazy = true }: { lazy?: boolean } = {}): string {
  const rendered = expandCaptions(unwrapCaptionParagraphs(autop(stripUnsafeHtml(html))))
  return lazy ? lazyImages(rendered) : rendered
}

const DOCUMENT_CSS = `
:root{color-scheme:light}
html{-webkit-text-size-adjust:100%}
body{margin:0;padding:4px 2px 8px;font:14px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1f2937;background:#fff;overflow-wrap:break-word}
section{margin:0 0 28px;overflow-x:auto}
section::after{content:"";display:table;clear:both}
.section-label{margin:0 0 12px;padding-bottom:4px;border-bottom:2px solid #8BC34A;color:#4b5563;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
p{margin:0 0 10px}
h1,h2,h3,h4,h5,h6{margin:16px 0 8px;line-height:1.3;color:#111827}
h1{font-size:20px}h2{font-size:18px}h3{font-size:16px}h4,h5,h6{font-size:14px}
ul,ol{margin:0 0 10px;padding-left:24px}
a{color:#2563eb}
img{max-width:100%;height:auto}
table{border-collapse:collapse;max-width:100%;margin:0 0 14px}
td,th{padding:4px 6px;vertical-align:top;border:1px solid #d1d5db}
th{background:#f9fafb;text-align:left}
td>p:last-child,th>p:last-child{margin-bottom:0}
.alignleft{float:left;margin:4px 14px 10px 0}
.alignright{float:right;margin:4px 0 10px 14px}
.aligncenter{display:block;margin-left:auto;margin-right:auto}
figure.wp-caption{display:inline-block;vertical-align:top;max-width:100%;margin:0 10px 12px 0;padding:4px;background:#f3f4f6;text-align:center}
figure.wp-caption.aligncenter{display:block}
figure.wp-caption img{display:block;margin:0 auto}
.wp-caption-text{margin:4px 0 0;font-size:12px;line-height:1.3;color:#4b5563}
.gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}
.gallery-grid figure{margin:0}
.gallery-grid img{display:block;width:100%;height:150px;object-fit:cover;border-radius:4px;background:#f3f4f6}
.gallery-grid figcaption{margin-top:4px;font-size:12px;color:#4b5563}
@media print{section{overflow:visible}img,figure,tr{break-inside:avoid}}
`

/**
 * Documento HTML completo de un informe histórico, para usar como srcdoc de
 * un iframe con sandbox. La galería va donde estaba en el informe original.
 */
export function buildLegacyReportDocument(report: {
  sections: LegacySection[]
  photos: LegacyPhoto[]
  photos_title?: string | null
}): string {
  const photos = [...(report.photos ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const gallery = photos.length
    ? `<section><div class="section-label">${escapeHtml(report.photos_title || 'Registro fotográfico')}</div><div class="gallery-grid">${photos
        .map(photo => {
          const url = escapeHtml(photo.url)
          const caption = photo.caption ? `<figcaption>${escapeHtml(photo.caption)}</figcaption>` : ''
          return `<figure><a href="${url}"><img src="${url}" alt="" loading="lazy"></a>${caption}</figure>`
        })
        .join('')}</div></section>`
    : ''
  let galleryPlaced = false
  const body = (report.sections ?? [])
    .map(section => {
      if (section.gallery) {
        galleryPlaced = true
        return gallery
      }
      const html = section.html?.trim() ? renderLegacyHtml(section.html) : ''
      return html ? `<section><div class="section-label">${escapeHtml(section.title)}</div>${html}</section>` : ''
    })
    .filter(Boolean)
    .join('\n')
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><base target="_blank"><style>${DOCUMENT_CSS}</style></head><body>${body}${galleryPlaced ? '' : gallery}</body></html>`
}
