/**
 * Fotos curadas del informe quincenal.
 *
 * Helpers puros (sin acceso a Supabase) compartidos por servidor y cliente:
 * - construir la lista inicial de fotos curadas a partir del snapshot
 * - renderizar la galería HTML sin límite artificial de fotos
 * - resolver el marcador de galería dentro del contenido HTML del informe
 */

export interface ReportPhoto {
  /** URL pública o firmada de la imagen */
  file_url: string
  /** Pie de foto que aparece en el informe */
  caption: string
  /** Orden de aparición (0-based) */
  sort_order: number
  /** Si la foto se incluye en el informe/PDF */
  included: boolean
  /** Origen: bitácora diaria o documento del proyecto */
  source_type?: 'daily_log' | 'project_document' | string
  /** ID del registro origen (daily_log.id o project_documents.id) */
  source_id?: string
  /** Fecha/hora de captura o carga */
  taken_at?: string
}

/**
 * Marcador que reemplaza {{fotos}} en el HTML generado.
 *
 * Es texto plano dentro de un párrafo para que sobreviva al editor de
 * texto enriquecido (TipTap descarta divs vacíos o atributos desconocidos).
 */
export const PHOTO_GALLERY_TOKEN = '[[GALERIA_FOTOGRAFICA]]'
export const PHOTO_GALLERY_MARKER = `<p>${PHOTO_GALLERY_TOKEN}</p>`

// Acepta el token envuelto en <p> (con o sin atributos) o suelto, y el
// marcador antiguo basado en div.
const MARKER_REGEX = /(?:<p[^>]*>\s*\[\[GALERIA_FOTOGRAFICA\]\]\s*<\/p>)|\[\[GALERIA_FOTOGRAFICA\]\]|<div\s+data-report-photo-gallery="true"\s*><\/div>/g
const MARKER_TEST = /\[\[GALERIA_FOTOGRAFICA\]\]|data-report-photo-gallery="true"/

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Foto tal como la entrega el recopilador (source_data.photos). */
export interface CollectedPhoto {
  id?: string
  file_url: string
  file_name?: string
  description?: string
  uploaded_at?: string
  source_type?: string
  source_id?: string
}

/**
 * Convierte las fotos recopiladas (source_data.photos) en la lista inicial
 * de fotos curadas: todas incluidas, ordenadas por fecha, con el pie
 * propuesto a partir de la descripción de la bitácora.
 */
export function buildInitialReportPhotos(collectedPhotos: CollectedPhoto[] = []): ReportPhoto[] {
  const seen = new Set<string>()

  return collectedPhotos
    .filter((photo) => {
      const url = photo?.file_url
      if (!url || seen.has(url)) return false
      seen.add(url)
      return true
    })
    .map((photo, index) => ({
      file_url: photo.file_url,
      caption: photo.description || photo.file_name || '',
      sort_order: index,
      included: true,
      source_type: photo.source_type || 'project_document',
      source_id: photo.source_id || photo.id,
      taken_at: photo.uploaded_at
    }))
}

/**
 * Combina una curaduría existente con fotos recién recopiladas: conserva
 * pie, orden e inclusión de las fotos ya curadas y agrega al final las
 * nuevas. Las fotos que ya no existen en la fuente se descartan.
 */
export function mergeReportPhotos(existing: ReportPhoto[] = [], collectedPhotos: CollectedPhoto[] = []): ReportPhoto[] {
  const fresh = buildInitialReportPhotos(collectedPhotos)
  const freshByUrl = new Map(fresh.map((photo) => [photo.file_url, photo]))
  const kept: ReportPhoto[] = []

  for (const photo of [...existing].sort((a, b) => a.sort_order - b.sort_order)) {
    const source = freshByUrl.get(photo.file_url)
    if (!source) continue
    kept.push({ ...source, ...photo })
    freshByUrl.delete(photo.file_url)
  }

  const added = Array.from(freshByUrl.values())
  return [...kept, ...added].map((photo, index) => ({ ...photo, sort_order: index }))
}

/** Fotos incluidas, en orden de presentación. */
export function getIncludedReportPhotos(photos: ReportPhoto[] = []): ReportPhoto[] {
  return [...photos]
    .filter((photo) => photo?.included !== false && photo?.file_url)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

/**
 * Renderiza la galería del informe. No hay límite de fotos: cada foto va
 * numerada con su pie. Se usan dos columnas para que en impresión quepan
 * varias por página sin recortes.
 */
export function renderReportPhotoGallery(photos: ReportPhoto[] = []): string {
  const included = getIncludedReportPhotos(photos)

  if (included.length === 0) {
    return '<p>No se seleccionaron fotografías para este informe.</p>'
  }

  const items = included
    .map((photo, index) => {
      const caption = escapeHtml(photo.caption || `Fotografía ${index + 1}`)
      return (
        `<figure class="report-photo border border-gray-300 p-2 break-inside-avoid">` +
        `<img src="${escapeHtml(photo.file_url)}" alt="${caption}" class="w-full h-56 object-cover" loading="lazy" />` +
        `<figcaption class="text-sm text-gray-600 mt-2"><strong>Foto ${index + 1}.</strong> ${caption}</figcaption>` +
        `</figure>`
      )
    })
    .join('')

  return (
    `<p class="text-sm text-gray-600">Total de fotografías: <strong>${included.length}</strong></p>` +
    `<div class="report-photo-gallery grid grid-cols-2 gap-4">${items}</div>`
  )
}

/** Indica si el HTML contiene el marcador de galería. */
export function hasPhotoGalleryMarker(html: string): boolean {
  return MARKER_TEST.test(html || '')
}

/**
 * Sustituye el marcador de galería en una sección HTML por la galería
 * renderizada con las fotos curadas. Si la sección no tiene marcador se
 * devuelve sin cambios (compatibilidad con informes antiguos con la
 * galería ya incrustada en el HTML).
 */
export function resolveSectionPhotoGallery(html: string, photos: ReportPhoto[] = []): string {
  if (!html || !hasPhotoGalleryMarker(html)) return html || ''
  return html.replace(MARKER_REGEX, renderReportPhotoGallery(photos))
}

/** Clave de la sección añadida cuando el contenido perdió el marcador. */
export const FALLBACK_GALLERY_SECTION_KEY = '__report_photo_gallery'

/**
 * Aplica resolveSectionPhotoGallery a todas las secciones del contenido.
 *
 * Si ninguna sección tiene el marcador (por ejemplo, el residente lo borró
 * en el editor) pero hay fotos curadas incluidas, se agrega una sección de
 * registro fotográfico al final para que las fotos no se pierdan.
 */
export function resolveReportContent(
  content: Record<string, string> | null | undefined,
  photos: ReportPhoto[] = []
): Record<string, string> {
  const resolved: Record<string, string> = {}
  let markerFound = false

  for (const [key, html] of Object.entries(content || {})) {
    if (hasPhotoGalleryMarker(html)) markerFound = true
    resolved[key] = resolveSectionPhotoGallery(html, photos)
  }

  if (!markerFound && getIncludedReportPhotos(photos).length > 0) {
    resolved[FALLBACK_GALLERY_SECTION_KEY] =
      '<h2>REGISTRO FOTOGRÁFICO</h2>' + renderReportPhotoGallery(photos)
  }

  return resolved
}
