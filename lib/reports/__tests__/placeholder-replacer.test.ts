import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

import { replacePlaceholders, getAvailablePlaceholders } from '@/lib/reports/placeholder-replacer'

function buildContext(overrides: Record<string, unknown> = {}) {
  return {
    project: {
      name: 'Edificio Prueba',
      project_code: 'EP-001',
      location: 'Bogotá',
      client_name: 'Cliente Demo'
    },
    periodStart: '2026-06-01',
    periodEnd: '2026-06-15',
    dailyLogs: [],
    qualityControl: [],
    photos: [],
    summary: {
      totalDays: 15,
      workDays: 12,
      rainDays: 3,
      totalWorkers: 120,
      totalTests: 10,
      passedTests: 8,
      failedTests: 1
    },
    ...overrides
  }
}

describe('replacePlaceholders', () => {
  it('devuelve cadena vacía para contenido vacío', () => {
    expect(replacePlaceholders('', buildContext())).toBe('')
  })

  it('reemplaza placeholders de proyecto', () => {
    const result = replacePlaceholders(
      '{{project_name}} ({{project_code}}) en {{project_location}} para {{project_client}}',
      buildContext()
    )
    expect(result).toBe('Edificio Prueba (EP-001) en Bogotá para Cliente Demo')
  })

  it('usa N/A cuando faltan datos de proyecto', () => {
    const result = replacePlaceholders('{{project_name}}', buildContext({ project: {} }))
    expect(result).toBe('N/A')
  })

  it('reemplaza fechas de período sin desfase de día', () => {
    const result = replacePlaceholders('{{period_start_short}}', buildContext())
    expect(result).toContain('1')
    expect(result).not.toContain('31')
  })

  it('reemplaza placeholders de resumen', () => {
    const result = replacePlaceholders(
      '{{work_days}}/{{total_days}} días, {{rain_days}} con lluvia',
      buildContext()
    )
    expect(result).toBe('12/15 días, 3 con lluvia')
  })

  it('calcula el personal promedio', () => {
    const result = replacePlaceholders('{{bitacora.personal}}', buildContext())
    expect(result).toBe('8') // 120 trabajadores / 15 días
  })

  it('calcula porcentaje de ensayos aprobados', () => {
    const result = replacePlaceholders('{{qc.porcentaje_aprobados}}', buildContext())
    expect(result).toBe('80')
  })

  it('usa el resumen de actividades de las bitácoras', () => {
    const result = replacePlaceholders(
      '{{bitacora.resumen}}',
      buildContext({
        dailyLogs: [{ activities: 'Vaciado de placa' }, { activities: 'Mampostería' }]
      })
    )
    expect(result).toBe('Vaciado de placa, Mampostería')
  })

  it('muestra mensaje por defecto sin actividades', () => {
    const result = replacePlaceholders('{{bitacora.resumen}}', buildContext())
    expect(result).toBe('No se registraron actividades')
  })

  it('reemplaza total de fotos', () => {
    const result = replacePlaceholders(
      '{{total_fotos}}',
      buildContext({ photos: [{ file_url: 'a' }, { file_url: 'b' }] })
    )
    expect(result).toBe('2')
  })

  it('no deja placeholders documentados sin resolver en una plantilla completa', () => {
    const template = getAvailablePlaceholders()
      .map((p) => p.placeholder)
      .join(' ')
    const result = replacePlaceholders(template, buildContext())
    expect(result).not.toMatch(/\{\{[a-z_.]+\}\}/i)
  })
})
