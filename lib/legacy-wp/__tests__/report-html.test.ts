import { describe, expect, it } from 'vitest'
import { autop, buildLegacyReportDocument, expandCaptions, renderLegacyHtml, stripUnsafeHtml } from '../report-html'
import { formatLegacyDate, formatLegacyPeriod, legacyReportYear, legacySignatureList } from '../report-meta'

const IMG = '<img class="wp-image-1439 size-medium" src="https://x.supabase.co/storage/v1/object/public/legacy-wp-media/2020/09/foto-300x300.jpeg" alt="" width="300" height="300" />'

describe('expandCaptions', () => {
  it('convierte el shortcode [caption] en una figura con su pie', () => {
    const html = `[caption id="attachment_1439" align="alignnone" width="300"]${IMG} torres y plataforma[/caption]`
    expect(expandCaptions(html)).toBe(
      `<figure class="wp-caption alignnone" style="max-width: 300px">${IMG}<figcaption class="wp-caption-text">torres y plataforma</figcaption></figure>`
    )
  })

  it('conserva el enlace de la imagen y omite el pie vacío', () => {
    const html = `[caption id="attachment_7" align="aligncenter" width="640"]<a href="https://x/foto.jpg">${IMG}</a>[/caption]`
    expect(expandCaptions(html)).toBe(`<figure class="wp-caption aligncenter" style="max-width: 640px"><a href="https://x/foto.jpg">${IMG}</a></figure>`)
  })

  it('si no hay imagen deja solo el contenido', () => {
    expect(expandCaptions('[caption id="a" align="alignnone" width="10"]solo texto[/caption]')).toBe('solo texto')
  })
})

describe('autop', () => {
  it('convierte texto plano en párrafos y saltos de línea', () => {
    expect(autop('SECCIÓN I\r\n\r\n1. INFORMACIÓN GENERAL\r\nOBJETIVO DEL INFORME')).toBe(
      '<p>SECCIÓN I</p>\n<p>1. INFORMACIÓN GENERAL<br />\nOBJETIVO DEL INFORME</p>\n'
    )
  })

  it('separa en párrafos el texto suelto entre etiquetas en línea', () => {
    expect(autop('<strong>1 INFORMACIÓN GENERAL:</strong>\r\n\r\nA través de este informe')).toBe(
      '<p><strong>1 INFORMACIÓN GENERAL:</strong></p>\n<p>A través de este informe</p>\n'
    )
  })

  it('no mete párrafos ni saltos dentro de la estructura de una tabla', () => {
    const table = '<table style="width: 100%">\r\n<tbody>\r\n<tr>\r\n<td>Valor</td>\r\n<td>$ 1.000</td>\r\n</tr>\r\n</tbody>\r\n</table>'
    const out = autop(table)
    expect(out).not.toContain('<p>')
    expect(out).not.toContain('<br />')
    expect(out).toContain('<td>Valor</td>')
  })

  it('deja igual el HTML que ya tiene párrafos', () => {
    expect(autop('<p>Uno</p>\n<p>Dos</p>')).toBe('<p>Uno</p>\n<p>Dos</p>\n')
  })

  it('no toca el contenido de <pre>', () => {
    expect(autop('Antes\n\n<pre>a\n\nb</pre>\n\nDespués')).toBe('<p>Antes</p>\n<pre>a\n\nb</pre>\n<p>Después</p>\n')
  })

  it('devuelve vacío si no hay contenido', () => {
    expect(autop(' \r\n ')).toBe('')
  })
})

describe('stripUnsafeHtml', () => {
  it('quita scripts, manejadores de eventos y URLs javascript', () => {
    const out = stripUnsafeHtml(
      '<p onclick="x()">Hola</p><script>alert(1)</script><a href="javascript:alert(1)">a</a><iframe src="https://x"></iframe><img src="a.jpg" onerror="x()">'
    )
    expect(out).toBe('<p>Hola</p><a href="#">a</a><img src="a.jpg">')
  })

  it('conserva estilos en línea, tablas e imágenes', () => {
    const html = '<table style="border-collapse: collapse;width: 100%"><tbody><tr><td style="border: 1px solid #000">x</td></tr></tbody></table>'
    expect(stripUnsafeHtml(html)).toBe(html)
  })

  it('no altera texto que parece un atributo fuera de una etiqueta', () => {
    expect(stripUnsafeHtml('<p>Valor onda = 5</p>')).toBe('<p>Valor onda = 5</p>')
  })
})

describe('renderLegacyHtml', () => {
  const caption = (text: string) => `[caption id="a" align="alignnone" width="300"]${IMG} ${text}[/caption]`

  it('aplica captions, párrafos y carga diferida de imágenes', () => {
    const out = renderLegacyHtml(`Avance\r\n\r\n${caption('Bocín dados')}`)
    expect(out).toBe(
      '<p>Avance</p>\n<figure class="wp-caption alignnone" style="max-width: 300px">' +
        IMG.replace('<img ', '<img loading="lazy" ') +
        '<figcaption class="wp-caption-text">Bocín dados</figcaption></figure>\n'
    )
  })

  it('pone en fila las fotos seguidas y no las parte con saltos', () => {
    const out = renderLegacyHtml(`${caption('Uno')}\r\n${caption('Dos')}\r\n\r\n${caption('Tres')}`)
    expect(out).not.toContain('<p>')
    expect(out).not.toContain('<br />')
    expect(out.match(/<figure /g)).toHaveLength(3)
  })

  it('deja en su párrafo las fotos que comparten línea con texto', () => {
    const out = renderLegacyHtml(`Texto ${caption('Uno')}\r\n\r\n${caption('Dos')}`)
    expect(out).toContain('<p>Texto <figure')
    expect(out).toContain('<figcaption class="wp-caption-text">Uno</figcaption></figure></p>')
    expect(out).toContain('</p>\n<figure class="wp-caption alignnone" style="max-width: 300px">')
  })
})

describe('buildLegacyReportDocument', () => {
  const report = {
    sections: [
      { key: 'informacion-general', title: 'Información <General>', html: 'Texto' },
      { key: 'vacia', title: 'Vacía', html: '  ' },
      { key: 'registro-fotografico-galeria', title: 'Registro', gallery: true },
      { key: 'seccion-ii', title: 'Sección II', html: '<p>Final</p>' }
    ],
    photos: [
      { url: 'https://x/b.jpg?a=1&b=2', sort_order: 1 },
      { url: 'https://x/a.jpg', sort_order: 0, caption: 'Fachada "norte"' }
    ],
    photos_title: null
  }

  it('arma el documento con las secciones, la galería en su lugar y enlaces en otra pestaña', () => {
    const doc = buildLegacyReportDocument(report)
    expect(doc.startsWith('<!doctype html>')).toBe(true)
    expect(doc).toContain('<base target="_blank">')
    expect(doc).toContain('<div class="section-label">Información &lt;General&gt;</div><p>Texto</p>')
    expect(doc).not.toContain('Vacía')
    const gallery = doc.indexOf('Registro fotográfico')
    expect(gallery).toBeGreaterThan(doc.indexOf('Información'))
    expect(gallery).toBeLessThan(doc.indexOf('Sección II'))
    expect(doc.indexOf('https://x/a.jpg')).toBeLessThan(doc.indexOf('https://x/b.jpg'))
    expect(doc).toContain('src="https://x/b.jpg?a=1&amp;b=2"')
    expect(doc).toContain('<figcaption>Fachada &quot;norte&quot;</figcaption>')
  })

  it('pone la galería al final si el informe no indica su posición', () => {
    const doc = buildLegacyReportDocument({ ...report, sections: report.sections.filter(s => !s.gallery), photos_title: 'Fotos del mes' })
    expect(doc.indexOf('Fotos del mes')).toBeGreaterThan(doc.indexOf('Sección II'))
  })
})

describe('report-meta', () => {
  it('muestra el período según cómo venía en el título', () => {
    expect(formatLegacyPeriod('2021-10-01', '2021-10-31', 'mes_del_titulo')).toBe('Octubre de 2021')
    expect(formatLegacyPeriod('2021-10-01', '2021-10-31', 'rango_del_titulo')).toBe('1 al 31 de octubre de 2021')
    expect(formatLegacyPeriod('2021-09-16', '2021-10-15', 'rango_del_titulo')).toBe('16 de septiembre al 15 de octubre de 2021')
    expect(formatLegacyPeriod('2021-12-16', '2022-01-15', 'rango_del_titulo')).toBe('16 de diciembre de 2021 al 15 de enero de 2022')
    expect(formatLegacyPeriod(null, '2021-10-31', 'rango_del_titulo')).toBeNull()
  })

  it('lee las fechas sin correrlas por la zona horaria', () => {
    expect(formatLegacyDate('2021-11-01')).toBe('1 de noviembre de 2021')
    expect(formatLegacyDate('2021-11-01T03:00:00Z')).toBe('31 de octubre de 2021')
    expect(formatLegacyDate(null)).toBeNull()
  })

  it('agrupa por el año del período o, si falta, por el de publicación', () => {
    expect(legacyReportYear({ period_start: '2021-12-16', wp_created_at: '2022-01-20T10:00:00Z' })).toBe(2021)
    expect(legacyReportYear({ period_start: null, wp_created_at: '2022-01-20T10:00:00Z' })).toBe(2022)
  })

  it('lista solo las firmas marcadas', () => {
    expect(legacySignatureList({ residente: true, directora_general: false, director_interventoria: true, otra_firma: true }))
      .toEqual(['Residente', 'Director de interventoría', 'Otra firma'])
  })
})
