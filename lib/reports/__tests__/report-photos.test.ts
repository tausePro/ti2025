import { describe, it, expect } from 'vitest'

import {
  buildInitialReportPhotos,
  mergeReportPhotos,
  getIncludedReportPhotos,
  renderReportPhotoGallery,
  hasPhotoGalleryMarker,
  resolveSectionPhotoGallery,
  resolveReportContent,
  PHOTO_GALLERY_MARKER,
  PHOTO_GALLERY_TOKEN,
  FALLBACK_GALLERY_SECTION_KEY,
  type ReportPhoto
} from '@/lib/reports/report-photos'

const collected = [
  {
    file_url: 'https://cdn/a.jpg',
    description: 'Excavación eje 3',
    uploaded_at: '2026-06-02T08:00:00',
    source_type: 'daily_log',
    source_id: 'log-1'
  },
  {
    file_url: 'https://cdn/b.jpg',
    description: 'Fundida losa',
    uploaded_at: '2026-06-03T08:00:00',
    source_type: 'daily_log',
    source_id: 'log-2'
  },
  // duplicada por URL: debe descartarse
  {
    file_url: 'https://cdn/a.jpg',
    description: 'Duplicada',
    uploaded_at: '2026-06-02T08:00:00',
    source_type: 'daily_log',
    source_id: 'log-1'
  },
  {
    file_url: 'https://cdn/doc.jpg',
    file_name: 'plano.jpg',
    uploaded_at: '2026-06-04T08:00:00',
    source_type: 'project_document',
    id: 'doc-1'
  }
]

describe('buildInitialReportPhotos', () => {
  it('incluye todas las fotos, deduplica por URL y conserva el origen', () => {
    const photos = buildInitialReportPhotos(collected)

    expect(photos).toHaveLength(3)
    expect(photos.map((p) => p.file_url)).toEqual([
      'https://cdn/a.jpg',
      'https://cdn/b.jpg',
      'https://cdn/doc.jpg'
    ])
    expect(photos.every((p) => p.included)).toBe(true)
    expect(photos.map((p) => p.sort_order)).toEqual([0, 1, 2])
    expect(photos[0].caption).toBe('Excavación eje 3')
    expect(photos[0].source_type).toBe('daily_log')
    expect(photos[0].source_id).toBe('log-1')
    expect(photos[2].caption).toBe('plano.jpg')
    expect(photos[2].source_id).toBe('doc-1')
  })

  it('no aplica límite de cantidad', () => {
    const many = Array.from({ length: 120 }, (_, i) => ({
      file_url: `https://cdn/${i}.jpg`,
      description: `Foto ${i}`
    }))
    expect(buildInitialReportPhotos(many)).toHaveLength(120)
  })
})

describe('mergeReportPhotos', () => {
  it('conserva pie, orden e inclusión de la curaduría previa y agrega las nuevas al final', () => {
    const existing: ReportPhoto[] = [
      { file_url: 'https://cdn/b.jpg', caption: 'Pie editado', sort_order: 0, included: true },
      { file_url: 'https://cdn/a.jpg', caption: 'Excavación eje 3', sort_order: 1, included: false },
      { file_url: 'https://cdn/borrada.jpg', caption: 'Ya no existe', sort_order: 2, included: true }
    ]

    const merged = mergeReportPhotos(existing, collected)

    expect(merged.map((p) => p.file_url)).toEqual([
      'https://cdn/b.jpg',
      'https://cdn/a.jpg',
      'https://cdn/doc.jpg'
    ])
    expect(merged[0].caption).toBe('Pie editado')
    expect(merged[1].included).toBe(false)
    expect(merged[2].included).toBe(true)
    expect(merged.map((p) => p.sort_order)).toEqual([0, 1, 2])
  })
})

describe('getIncludedReportPhotos', () => {
  it('filtra excluidas y ordena por sort_order', () => {
    const photos: ReportPhoto[] = [
      { file_url: 'c', caption: '', sort_order: 2, included: true },
      { file_url: 'a', caption: '', sort_order: 0, included: false },
      { file_url: 'b', caption: '', sort_order: 1, included: true }
    ]
    expect(getIncludedReportPhotos(photos).map((p) => p.file_url)).toEqual(['b', 'c'])
  })
})

describe('renderReportPhotoGallery', () => {
  it('numera las fotos incluidas, escapa el pie y muestra el total', () => {
    const photos: ReportPhoto[] = [
      { file_url: 'https://cdn/1.jpg', caption: 'Muro <b>eje</b> "A"', sort_order: 0, included: true },
      { file_url: 'https://cdn/2.jpg', caption: 'Excluida', sort_order: 1, included: false },
      { file_url: 'https://cdn/3.jpg', caption: '', sort_order: 2, included: true }
    ]

    const html = renderReportPhotoGallery(photos)

    expect(html).toContain('Total de fotografías: <strong>2</strong>')
    expect(html).toContain('<strong>Foto 1.</strong> Muro &lt;b&gt;eje&lt;/b&gt; &quot;A&quot;')
    expect(html).toContain('<strong>Foto 2.</strong> Fotografía 2')
    expect(html).not.toContain('Excluida')
    expect(html).not.toContain('<b>eje</b>')
  })

  it('devuelve mensaje cuando no hay fotos incluidas', () => {
    expect(renderReportPhotoGallery([])).toContain('No se seleccionaron fotografías')
  })
})

describe('marcador de galería', () => {
  const photos: ReportPhoto[] = [
    { file_url: 'https://cdn/1.jpg', caption: 'Uno', sort_order: 0, included: true }
  ]

  it('detecta el marcador en párrafo, suelto y el formato antiguo', () => {
    expect(hasPhotoGalleryMarker(PHOTO_GALLERY_MARKER)).toBe(true)
    expect(hasPhotoGalleryMarker(`<p class="x">${PHOTO_GALLERY_TOKEN}</p>`)).toBe(true)
    expect(hasPhotoGalleryMarker(PHOTO_GALLERY_TOKEN)).toBe(true)
    expect(hasPhotoGalleryMarker('<div data-report-photo-gallery="true"></div>')).toBe(true)
    expect(hasPhotoGalleryMarker('<p>Sin marcador</p>')).toBe(false)
  })

  it('reemplaza el marcador por la galería dentro de la sección', () => {
    const html = `<h2>REGISTRO FOTOGRÁFICO</h2>${PHOTO_GALLERY_MARKER}<p>Fin</p>`
    const resolved = resolveSectionPhotoGallery(html, photos)

    expect(resolved).not.toContain(PHOTO_GALLERY_TOKEN)
    expect(resolved).toContain('<h2>REGISTRO FOTOGRÁFICO</h2>')
    expect(resolved).toContain('<strong>Foto 1.</strong> Uno')
    expect(resolved).toContain('<p>Fin</p>')
  })

  it('resolveReportContent reemplaza en la sección que tiene el marcador y no agrega sección extra', () => {
    const resolved = resolveReportContent(
      { s1: '<p>Texto</p>', s2: `<h2>Fotos</h2>${PHOTO_GALLERY_MARKER}` },
      photos
    )
    expect(Object.keys(resolved)).toEqual(['s1', 's2'])
    expect(resolved.s1).toBe('<p>Texto</p>')
    expect(resolved.s2).toContain('Foto 1.')
  })

  it('resolveReportContent agrega sección de galería si el marcador se perdió y hay fotos', () => {
    const resolved = resolveReportContent({ s1: '<p>Texto</p>' }, photos)
    expect(resolved[FALLBACK_GALLERY_SECTION_KEY]).toContain('REGISTRO FOTOGRÁFICO')
    expect(resolved[FALLBACK_GALLERY_SECTION_KEY]).toContain('Foto 1.')
  })

  it('resolveReportContent no altera informes históricos sin marcador ni fotos curadas', () => {
    const legacy = { s1: '<p>HTML antiguo</p><img src="x.jpg" />' }
    expect(resolveReportContent(legacy, [])).toEqual(legacy)
  })
})
