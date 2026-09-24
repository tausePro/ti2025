import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

import {
  formatDailyLogObservations,
  formatDailyLogIssues,
  formatDailyLogRecommendations,
  formatDailyLogConclusions,
  formatPhotosGallery,
  buildSourceSnapshot
} from '@/lib/reports/data-collector'
import { PHOTO_GALLERY_MARKER } from '@/lib/reports/report-photos'
import { replacePlaceholders } from '@/lib/reports/placeholder-replacer'

const dailyLogs = [
  {
    id: 'log-2',
    date: '2026-06-03',
    work_front: 'Torre B',
    activities: 'Fundida de losa',
    observations: 'Se detectó <script>alert(1)</script> segregación en el concreto',
    issues: '',
    recommendations: 'Vibrar mejor el concreto'
  },
  {
    id: 'log-1',
    date: '2026-06-02',
    work_front: 'Torre A',
    activities: 'Excavación',
    observations: '   ',
    issues: 'Lluvia detuvo la actividad 2 horas',
    recommendations: null
  }
]

describe('conclusiones desde bitácora', () => {
  it('lista observaciones con fecha y frente, ordenadas por fecha y escapadas', () => {
    const html = formatDailyLogObservations(dailyLogs)
    expect(html).toContain('Torre B')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
    // la observación vacía de log-1 no aparece
    expect(html).not.toContain('Torre A')
  })

  it('lista novedades y recomendaciones', () => {
    expect(formatDailyLogIssues(dailyLogs)).toContain('Lluvia detuvo la actividad 2 horas')
    expect(formatDailyLogRecommendations(dailyLogs)).toContain('Vibrar mejor el concreto')
  })

  it('consolida las tres listas con conteos', () => {
    const html = formatDailyLogConclusions(dailyLogs)
    expect(html).toContain('<h4>Observaciones (1)</h4>')
    expect(html).toContain('<h4>Novedades e incidencias (1)</h4>')
    expect(html).toContain('<h4>Recomendaciones (1)</h4>')
  })

  it('devuelve mensaje cuando no hay registros', () => {
    expect(formatDailyLogConclusions([])).toContain('no registran observaciones')
    expect(formatDailyLogObservations([{ observations: '' }])).toContain('No se registraron observaciones')
  })

  it('reemplaza los placeholders nuevos en la plantilla', () => {
    const template = '<h3>Conclusiones</h3>{{bitacora.conclusiones}}<h3>Fotos</h3>{{fotos}}'
    const result = replacePlaceholders(template, {
      project: { name: 'P', project_code: 'P-1' },
      periodStart: '2026-06-01',
      periodEnd: '2026-06-15',
      dailyLogs,
      qualityControl: [],
      photos: [{ file_url: 'https://cdn/a.jpg' }],
      summary: {
        totalDays: 15,
        workDays: 2,
        rainDays: 1,
        totalWorkers: 20,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0
      }
    } as unknown as Parameters<typeof replacePlaceholders>[1])

    expect(result).not.toContain('{{bitacora.conclusiones}}')
    expect(result).toContain('Vibrar mejor el concreto')
    expect(result).toContain(PHOTO_GALLERY_MARKER)
    expect(result).not.toContain('<img')
  })
})

describe('galería y snapshot', () => {
  it('formatPhotosGallery devuelve el marcador en lugar de una galería limitada', () => {
    const photos = Array.from({ length: 60 }, (_, i) => ({ file_url: `https://cdn/${i}.jpg` }))
    expect(formatPhotosGallery(photos)).toBe(PHOTO_GALLERY_MARKER)
  })

  it('buildSourceSnapshot conserva ids de bitácora, fotos y resumen en ambos formatos', () => {
    const snapshot = buildSourceSnapshot({
      project: { id: 'p1', name: 'P', project_code: 'P-1' },
      periodStart: '2026-06-01',
      periodEnd: '2026-06-15',
      dailyLogs,
      qualityControl: [],
      photos: [{ file_url: 'https://cdn/a.jpg', description: 'A', source_type: 'daily_log', source_id: 'log-1' }],
      summary: {
        totalDays: 15,
        workDays: 2,
        rainDays: 1,
        totalWorkers: 20,
        totalTests: 3,
        passedTests: 2,
        failedTests: 1
      }
    } as unknown as Parameters<typeof buildSourceSnapshot>[0])

    expect(snapshot.daily_log_ids).toEqual(['log-2', 'log-1'])
    expect(snapshot.daily_logs).toHaveLength(2)
    expect(snapshot.daily_logs[0]).toMatchObject({ id: 'log-2', work_front: 'Torre B' })
    expect(snapshot.photos).toHaveLength(1)
    expect(snapshot.summary.work_days).toBe(2)
    expect(snapshot.summary.workDays).toBe(2)
    expect(snapshot.summary.failed_tests).toBe(1)
    expect(typeof snapshot.collected_at).toBe('string')
  })
})
