import { describe, it, expect } from 'vitest'
import {
  getCurrentDateInputValue,
  parseDateValue,
  formatDateValue,
  getCustomFieldLabelsMap
} from '@/lib/utils'

describe('getCurrentDateInputValue', () => {
  it('formatea una fecha local como YYYY-MM-DD', () => {
    const date = new Date(2026, 0, 5) // 5 enero 2026 local
    expect(getCurrentDateInputValue(date)).toBe('2026-01-05')
  })

  it('no sufre desfase UTC cerca de medianoche', () => {
    const date = new Date(2026, 5, 10, 23, 59, 59)
    expect(getCurrentDateInputValue(date)).toBe('2026-06-10')
  })
})

describe('parseDateValue', () => {
  it('interpreta YYYY-MM-DD como fecha local, no UTC', () => {
    const parsed = parseDateValue('2026-06-11')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(5)
    expect(parsed.getDate()).toBe(11)
    expect(parsed.getHours()).toBe(0)
  })

  it('devuelve la misma instancia si recibe un Date', () => {
    const date = new Date(2026, 2, 3)
    expect(parseDateValue(date)).toBe(date)
  })

  it('delega a new Date() para valores con hora', () => {
    const parsed = parseDateValue('2026-06-11T15:30:00')
    expect(parsed.getHours()).toBe(15)
    expect(parsed.getMinutes()).toBe(30)
  })
})

describe('formatDateValue', () => {
  it('devuelve cadena vacía para null/undefined', () => {
    expect(formatDateValue(null)).toBe('')
    expect(formatDateValue(undefined)).toBe('')
  })

  it('formatea YYYY-MM-DD sin retroceder un día', () => {
    const result = formatDateValue('2026-06-11', 'es-CO', { day: 'numeric' })
    expect(result).toBe('11')
  })
})

describe('getCustomFieldLabelsMap', () => {
  it('combina etiquetas de configuración con etiquetas almacenadas', () => {
    const config = [
      { id: 'campo_a', label: 'Etiqueta Config A' },
      { id: 'campo_b', label: 'Etiqueta Config B' }
    ]
    const stored = { campo_a: 'Etiqueta Histórica A' }

    const result = getCustomFieldLabelsMap(config, stored)
    expect(result).toEqual({
      campo_a: 'Etiqueta Histórica A',
      campo_b: 'Etiqueta Config B'
    })
  })

  it('las etiquetas almacenadas tienen prioridad sobre la configuración', () => {
    const result = getCustomFieldLabelsMap(
      [{ id: 'x', label: 'Nueva' }],
      { x: 'Original' }
    )
    expect(result.x).toBe('Original')
  })

  it('ignora campos sin id o sin label', () => {
    const result = getCustomFieldLabelsMap(
      [{ id: 'ok', label: 'OK' }, { id: 'sin_label' }, { label: 'sin id' }],
      {}
    )
    expect(result).toEqual({ ok: 'OK' })
  })

  it('funciona sin argumentos', () => {
    expect(getCustomFieldLabelsMap()).toEqual({})
  })
})
