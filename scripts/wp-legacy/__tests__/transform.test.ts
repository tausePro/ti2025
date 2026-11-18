import { describe, it, expect } from 'vitest'
import {
  buildReport,
  classifyReport,
  documentDescription,
  dropDuplicateFiles,
  extractCity,
  isBlankHtml,
  matchCompanyByName,
  nitBase,
  normalizeCompanyName,
  parsePeriod,
  parseReportNumber,
  resolveProjectClient,
  rewriteUploadsUrls,
  safeRelPath,
  selectDocumentFiles,
  stableUuid,
  storageKey,
  toolsetDate,
  uploadsPathFromUrl,
  wpDateToIso
} from '../lib/transform.mjs'

const toUrl = (key: string) => `https://storage.test/legacy-wp-media/${key}`
const WP = 'https://app.talentoinmobiliario.com/wp-content/uploads'

describe('títulos de informe', () => {
  it.each([
    ['INFORME MENSUAL N°12 DEL 1 AL 31 DE OCTUBRE DE 2026', 'mensual', 12, '2026-10-01', '2026-10-31', 'rango_del_titulo'],
    ['INFORME QUINCENAL N°8, JUNIO 1 AL 15 DE 2021', 'quincenal', 8, '2021-06-01', '2021-06-15', 'rango_del_titulo'],
    ['INFORME MENSUAL # 10 FEBRERO 1 AL 28 DEL 2026', 'mensual', 10, '2026-02-01', '2026-02-28', 'rango_del_titulo'],
    ['INFORME MENSUAL # 15 DEL 01 AL 30 DE DICIEMBRE 2022', 'mensual', 15, '2022-12-01', '2022-12-30', 'rango_del_titulo'],
    ['INFORME MENSUAL N°20, MAYO 1 AL 31 DE 2022', 'mensual', 20, '2022-05-01', '2022-05-31', 'rango_del_titulo'],
    ['INFORME QUINCENAL N°33 MAYO 1 AL 15 DE 2025', 'quincenal', 33, '2025-05-01', '2025-05-15', 'rango_del_titulo'],
    ['INFORME QUINCENAL MAYO DE 2021', 'quincenal', null, '2021-05-01', '2021-05-31', 'mes_del_titulo'],
    ['Informe Quincenal STI Noviembre 2021', 'quincenal', null, '2021-11-01', '2021-11-30', 'mes_del_titulo'],
    ['INFORME MENSUAL N°2 JULIO DE 2021.', 'mensual', 2, '2021-07-01', '2021-07-31', 'mes_del_titulo'],
    ['INFORME QUINCENAL N°25 15 DE OCTUBRE DE 2021', 'quincenal', 25, '2021-10-01', '2021-10-31', 'mes_del_titulo']
  ])('%s', (title, kind, number, start, end, source) => {
    expect(classifyReport(title)).toBe(kind)
    expect(parseReportNumber(title)).toBe(number)
    expect(parsePeriod(title)).toEqual({ start, end, source })
  })

  it('reconoce períodos que cruzan mes y año', () => {
    expect(parsePeriod('INFORME MENSUAL DEL 16 DE MAYO AL 15 DE JUNIO DE 2023'))
      .toEqual({ start: '2023-05-16', end: '2023-06-15', source: 'rango_del_titulo' })
    expect(parsePeriod('INFORME MENSUAL DEL 26 DE DICIEMBRE AL 25 DE ENERO DE 2023'))
      .toEqual({ start: '2022-12-26', end: '2023-01-25', source: 'rango_del_titulo' })
  })

  it('acepta "a" como conector y meses a ambos lados', () => {
    expect(parsePeriod('INFORME QUINCENAL N°1 MARZO 01 A MARZO 15 DE 2021'))
      .toEqual({ start: '2021-03-01', end: '2021-03-15', source: 'rango_del_titulo' })
  })

  it('deduce el año desde la fecha de referencia cuando el título solo trae el mes', () => {
    expect(parsePeriod('TORRES DE LAS PALMAS ET4 T7 INFORME MENSUAL MARZO', '2021-04-15T15:00:00Z'))
      .toEqual({ start: '2021-03-01', end: '2021-03-31', source: 'mes_del_titulo_y_fecha' })
    expect(parsePeriod('INFORME MENSUAL DICIEMBRE', '2022-01-10'))
      .toEqual({ start: '2021-12-01', end: '2021-12-31', source: 'mes_del_titulo_y_fecha' })
    expect(parsePeriod('INFORME MENSUAL #1 MARZO 22 AL 31', '2022-04-05'))
      .toEqual({ start: '2022-03-01', end: '2022-03-31', source: 'mes_del_titulo_y_fecha' })
    expect(parsePeriod('INFORME MENSUAL MARZO')).toBeNull()
  })

  it.each([
    ['INFORME QUINCENAL N°02 MAYO 15 DE 2022', '2022-05-01', '2022-05-31', 'mes_del_titulo'],
    ['INFORME MENSUAL N° 7 AGOSTO - 2024', '2024-08-01', '2024-08-31', 'mes_del_titulo'],
    ['INFORME QUINCENAL# 17 AGOSTO1 AL 15 2024', '2024-08-01', '2024-08-15', 'rango_del_titulo'],
    ['INFORME QUINCENAL N°49, del 1 AL 15 DE FEBERO DE 2026', '2026-02-01', '2026-02-15', 'rango_del_titulo']
  ])('reconoce variantes reales: %s', (title, start, end, source) => {
    expect(parsePeriod(title, '2030-01-01')).toEqual({ start, end, source })
  })

  it('reconoce abreviaturas del tipo de informe', () => {
    expect(classifyReport('INFORME QUINC  ST - BUR. N°4  OCTUBRE 1 Al 15 DE 2021')).toBe('quincenal')
    expect(classifyReport('INFORME MENS ST - BUR. N°4  OCTUBRE 1 Al 31 DE 2021')).toBe('mensual')
    expect(classifyReport('TORRES DE LAS PALMAS ET4 TORRE 7 INFORME  QUINCENA OCTUBRE 2021')).toBe('quincenal')
    expect(classifyReport('INFORME QUICENAL N°03 JUNIO 15 DE 2022')).toBe('quincenal')
    expect(classifyReport('INFORME MESUAL N°3, 1 al 31 DE DICIEMBRE 2025')).toBe('mensual')
    expect(classifyReport('INFORME DE CIERRE, OCTUBRE 1 AL 15 DE 2022')).toBe('otro')
    expect(classifyReport('INFORME DE SUPERVISION TECNICA INDEPENDIENTE')).toBe('otro')
    expect(parseReportNumber('INFORME QUINCENAL# 17 AGOSTO1 AL 15 2024')).toBe(17)
  })

  it('no confunde palabras que contienen un mes', () => {
    expect(parsePeriod('INFORME PLAZA MAYOR 2021', '2021-06-01T00:00:00Z')).toBeNull()
  })

  it('ajusta días que no existen en el mes', () => {
    expect(parsePeriod('INFORME MENSUAL FEBRERO 1 AL 30 DE 2026'))
      .toEqual({ start: '2026-02-01', end: '2026-02-28', source: 'rango_del_titulo' })
  })

  it('no inventa período si el título no lo trae', () => {
    expect(parsePeriod('INFORME FINAL DE OBRA')).toBeNull()
    expect(classifyReport('INFORME FINAL DE OBRA')).toBe('otro')
  })
})

describe('fechas de WordPress', () => {
  it('convierte fechas Toolset (medianoche UTC) y fechas de post', () => {
    expect(toolsetDate('1793750400')).toBe('2026-11-04')
    expect(toolsetDate('')).toBeNull()
    expect(wpDateToIso('2026-10-29 20:25:03', '2026-10-29 15:25:03')).toBe('2026-10-29T20:25:03Z')
    expect(wpDateToIso('0000-00-00 00:00:00', '2020-09-14 09:00:00')).toBe('2020-09-14T09:00:00-05:00')
  })
})

describe('URLs y claves de Storage', () => {
  it('extrae la ruta de uploads y decodifica', () => {
    expect(uploadsPathFromUrl(`${WP}/2026/10/TimePhoto_20261020_141731.jpg`)).toBe('2026/10/TimePhoto_20261020_141731.jpg')
    expect(uploadsPathFromUrl(`${WP}/2023/05/Foto%20obra.jpg?ver=2`)).toBe('2023/05/Foto obra.jpg')
    expect(uploadsPathFromUrl('https://otro.sitio.com/wp-content/uploads/2023/05/a.jpg')).toBeNull()
  })

  it('reconoce el CDN antiguo de Kinsta como el mismo directorio de uploads', () => {
    const cdn = 'https://mk0apptalentoinx2txr.kinstacdn.com/wp-content/uploads/2020/09/vista-1-300x300.jpg'
    expect(uploadsPathFromUrl(cdn)).toBe('2020/09/vista-1-300x300.jpg')
    expect(rewriteUploadsUrls(`<img src="${cdn}">`, toUrl).html)
      .toBe('<img src="https://storage.test/legacy-wp-media/2020/09/vista-1-300x300.jpg">')
  })

  it('rechaza rutas que salen de uploads', () => {
    expect(uploadsPathFromUrl(`${WP}/../../wp-config.php`)).toBeNull()
    expect(uploadsPathFromUrl(`${WP}/2023/%2E%2E/%2E%2E/wp-config.php`)).toBeNull()
    expect(safeRelPath('/etc/passwd')).toBeNull()
    expect(safeRelPath('2026/10/a.jpg')).toBe('2026/10/a.jpg')
    const result = rewriteUploadsUrls(`<img src="${WP}/../../wp-config.php">`, toUrl)
    expect(result.paths).toEqual([])
  })

  it('genera claves seguras y estables', () => {
    expect(storageKey('2026/10/TimePhoto_20261020_141731.jpg')).toBe('2026/10/TimePhoto_20261020_141731.jpg')
    const key = storageKey('2023/05/Foto obra ñ.jpg')
    expect(key).toMatch(/^2023\/05\/Foto-obra-n_[0-9a-f]{8}\.jpg$/)
    expect(storageKey('2023/05/Foto obra ñ.jpg')).toBe(key)
  })

  it('solo usa caracteres que Supabase Storage admite en las claves', () => {
    for (const rel of ['2021/06/Resolución N° 12 (final)~v2.pdf', '2020/09/Plano+Fundaciones#1.png', '2022/01/Logo-1-wpcf_60x60..jpg']) {
      expect(storageKey(rel)).toMatch(/^[A-Za-z0-9._/-]+$/)
    }
  })

  it('reescribe src y srcset y deja intactos otros dominios', () => {
    const html = `<img src="${WP}/2026/10/a.jpg" srcset="${WP}/2026/10/a-300x200.jpg 300w, ${WP}/2026/10/a.jpg 1024w"><img src="https://otro.com/b.jpg">`
    const result = rewriteUploadsUrls(html, toUrl)
    expect(result.html).toBe('<img src="https://storage.test/legacy-wp-media/2026/10/a.jpg" srcset="https://storage.test/legacy-wp-media/2026/10/a-300x200.jpg 300w, https://storage.test/legacy-wp-media/2026/10/a.jpg 1024w"><img src="https://otro.com/b.jpg">')
    expect(result.paths.sort()).toEqual(['2026/10/a-300x200.jpg', '2026/10/a.jpg'])
  })
})

describe('buildReport', () => {
  it('ordena secciones, omite las vacías y ubica la galería', () => {
    const fields = {
      'seccion-ii': '<h1>SECCION II</h1>',
      contenido: `<p>SECCION I</p><img src="${WP}/2026/10/c.jpg">`,
      'control-presupuestal': '<p>&nbsp;</p>  <p>&nbsp;</p>  <p>&nbsp;</p>',
      'registro-fotografico-galeria': [`${WP}/2026/10/g1.jpg`, `${WP}/2026/10/g2.jpg`],
      'firma-residente': '1',
      'firma-director-interventoria': '0'
    }
    const labels = { contenido: { name: 'Contenido' }, 'registro-fotografico-galeria': { name: 'Registro fotografico galería' } }
    const report = buildReport(fields, labels, toUrl)

    expect(report.sections.map(s => s.key)).toEqual(['contenido', 'registro-fotografico-galeria', 'seccion-ii'])
    expect(report.sections[0]).toEqual({ key: 'contenido', title: 'Contenido', html: '<p>SECCION I</p><img src="https://storage.test/legacy-wp-media/2026/10/c.jpg">' })
    expect(report.sections[1]).toEqual({ key: 'registro-fotografico-galeria', title: 'Registro fotografico galería', gallery: true })
    expect(report.photos).toEqual([
      { url: 'https://storage.test/legacy-wp-media/2026/10/g1.jpg', sort_order: 0 },
      { url: 'https://storage.test/legacy-wp-media/2026/10/g2.jpg', sort_order: 1 }
    ])
    expect(report.signatures).toEqual({ directora_general: false, coordinador_de_proyectos: false, residente: true, director_interventoria: false })
    expect(report.paths.sort()).toEqual(['2026/10/c.jpg', '2026/10/g1.jpg', '2026/10/g2.jpg'])
  })

  it('detecta HTML vacío', () => {
    expect(isBlankHtml('<p>&nbsp;</p>')).toBe(true)
    expect(isBlankHtml('<p><img src="x.jpg"></p>')).toBe(false)
    expect(isBlankHtml('<table><tr><td></td></tr></table>')).toBe(false)
  })
})

describe('identificadores estables', () => {
  it('genera siempre el mismo UUID válido para la misma entidad e ID de WordPress', () => {
    const id = stableUuid('proyecto', 115)
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(stableUuid('proyecto', 115)).toBe(id)
    expect(stableUuid('empresa', 115)).not.toBe(id)
    expect(stableUuid('proyecto', 116)).not.toBe(id)
  })
})

describe('archivos de documentos legales', () => {
  const documents = [
    {
      wp_id: 3545,
      fields: { 'doc-adjunto': `${WP}/2021/03/TRC.pdf` },
      files: [{ file: '2021/03/RC.pdf', attachment_wp_id: 3546 }, { file: '2021/03/TRC.pdf', attachment_wp_id: 3544 }]
    },
    { wp_id: 3548, fields: { 'doc-adjunto': `${WP}/2021/03/RC.pdf` }, files: [{ file: '2021/03/RC.pdf', attachment_wp_id: 3546 }] },
    { wp_id: 1571, fields: {}, files: [{ file: '2020/09/GAS.pdf', attachment_wp_id: 1572 }, { file: '../wp-config.php', attachment_wp_id: 1 }] },
    {
      wp_id: 6223,
      fields: { 'doc-adjunto': `${WP}/2021/07/Poliza-2.pdf` },
      files: [{ file: '2021/07/Poliza.pdf', attachment_wp_id: 6224 }, { file: '2021/07/Poliza-2.pdf', attachment_wp_id: 6226 }]
    },
    { wp_id: 7000, fields: { 'doc-adjunto': `${WP}/2021/08/Solo-campo.pdf` }, files: [] }
  ]
  const selected = selectDocumentFiles(documents)
  const byId = (id: number) => selected.find(s => s.wp_id === id)!

  it('pone primero el archivo principal y no repite el que pertenece a otro documento', () => {
    expect(byId(3545).files.map(f => [f.rel, f.role])).toEqual([['2021/03/TRC.pdf', 'principal']])
    expect(byId(3545).skipped).toEqual([{ file: '2021/03/RC.pdf', reason: 'principal_de_otro_documento', owner_wp_id: 3548 }])
    expect(byId(3548).files.map(f => [f.rel, f.role, f.attachment_wp_id])).toEqual([['2021/03/RC.pdf', 'principal', 3546]])
  })

  it('conserva los adjuntos de documentos sin archivo principal y descarta rutas no válidas', () => {
    expect(byId(1571).files.map(f => [f.rel, f.role])).toEqual([['2020/09/GAS.pdf', 'adjunto']])
    expect(byId(1571).skipped).toEqual([{ file: '../wp-config.php', reason: 'ruta_no_valida' }])
  })

  it('marca como adicionales los demás archivos y agrega el principal si no venía en la lista', () => {
    expect(byId(6223).files.map(f => [f.rel, f.role])).toEqual([['2021/07/Poliza-2.pdf', 'principal'], ['2021/07/Poliza.pdf', 'adicional']])
    expect(byId(7000).files.map(f => [f.rel, f.role, f.attachment_wp_id])).toEqual([['2021/08/Solo-campo.pdf', 'principal', null]])
  })

  it('arma la descripción sin repetir el título', () => {
    expect(documentDescription({ title: 'POLIZA RC', detail: 'Poliza RC', role: 'principal', documentDate: '2026-10-20' }))
      .toBe('POLIZA RC — fecha del documento: 20/10/2026')
    expect(documentDescription({ title: 'Licencia', detail: 'Resolución 541 de 2020', role: 'principal' }))
      .toBe('Licencia — Resolución 541 de 2020')
    expect(documentDescription({ title: 'Licencia', detail: 'Resolución 541 de 2020', role: 'adicional' }))
      .toBe('Licencia — archivo adicional adjunto en la plataforma anterior')
  })

  it('descarta copias exactas conservando el principal', () => {
    const hashes: Record<string, string> = { '2021/07/Poliza-2.pdf': 'aaa', '2021/07/Poliza.pdf': 'aaa' }
    const { kept, duplicates } = dropDuplicateFiles(byId(6223).files, rel => hashes[rel])
    expect(kept.map(f => f.rel)).toEqual(['2021/07/Poliza-2.pdf'])
    expect(duplicates.map(f => f.rel)).toEqual(['2021/07/Poliza.pdf'])
    expect(dropDuplicateFiles(byId(6223).files, () => undefined).kept).toHaveLength(2)
  })
})

describe('empresas y municipios', () => {
  it('normaliza NIT y nombres', () => {
    expect(nitBase('890911431-1')).toBe('890911431')
    expect(nitBase('890911431')).toBe('890911431')
    expect(nitBase('811.033.006-8')).toBe('811033006')
    expect(normalizeCompanyName('C.A.S.A. S.A.')).toBe('casa')
    expect(normalizeCompanyName('Coninsa S.A.S.')).toBe('coninsa')
    expect(normalizeCompanyName('Edificaciones y proyectos SAS')).toBe('edificaciones proyectos')
  })

  it('empareja por nombre solo cuando no hay ambigüedad', () => {
    const companies = [{ name: 'C.A.S.A. S.A.' }, { name: 'Casa Zuleta' }, { name: 'Coninsa S.A.S.' }, { name: 'Constructora Conconcreto S.A.' }]
    expect(matchCompanyByName('CASA', companies)?.name).toBe('C.A.S.A. S.A.')
    expect(matchCompanyByName('Coninsa Ramón H', companies)?.name).toBe('Coninsa S.A.S.')
    expect(matchCompanyByName('Perfek', companies)).toBeNull()
  })

  it('resuelve la empresa cliente: confirmada, enlazada en WordPress o por gerencia', () => {
    const companies = [
      { wp_id: 61, name: 'Promotora Costa Azúl S.A.S.', supabase_id: null, supabase_name: null },
      { wp_id: 89, name: 'Coninsa S.A.S.', supabase_id: 'sb-coninsa', supabase_name: 'Coninsa S.A.S.' }
    ]
    const context = {
      overrides: { '9098': { company_wp_id: 61 }, '7': { company_wp_id: 999 } },
      companies,
      supabaseCompanies: [{ id: 'sb-coninsa', name: 'Coninsa S.A.S.' }, { id: 'sb-casa', name: 'C.A.S.A. S.A.' }]
    }
    expect(resolveProjectClient({ wp_id: 9098, empresa_wp_id: null, fields: { 'gerencia-del-proyecto': 'Bemsa S.A.S' } }, context))
      .toEqual({ via: 'confirmada en mapping.json', company_wp_id: 61, supabase_id: null, name: 'Promotora Costa Azúl S.A.S.' })
    expect(resolveProjectClient({ wp_id: 113, empresa_wp_id: 89, fields: { 'gerencia-del-proyecto': 'Otra' } }, context))
      .toEqual({ via: 'empresa enlazada en WordPress', company_wp_id: 89, supabase_id: 'sb-coninsa', name: 'Coninsa S.A.S.' })
    expect(resolveProjectClient({ wp_id: 24780, empresa_wp_id: null, fields: { 'gerencia-del-proyecto': 'CASA' } }, context))
      .toEqual({ via: 'gerencia "CASA"', supabase_id: 'sb-casa', name: 'C.A.S.A. S.A.' })
    expect(resolveProjectClient({ wp_id: 42970, empresa_wp_id: null, fields: { 'gerencia-del-proyecto': 'John Mario Agudelo' } }, context)).toBeNull()
    expect(resolveProjectClient({ wp_id: 7, empresa_wp_id: 89, fields: {} }, context)).toBeNull()
  })

  it('toma el municipio solo si es único en la dirección', () => {
    const cities = ['Itagüí', 'El Retiro', 'La Ceja', 'Medellín']
    expect(extractCity('Calle 69 No 57-161, Itagui, Antioquia', cities)).toBe('Itagüí')
    expect(extractCity('Kilometro 1,5 via el retiro la ceja', cities)).toBe('')
    expect(extractCity('Carrera 23 #25 sur 29', cities)).toBe('')
  })
})
