import { describe, expect, it } from 'vitest'
import {
  applyComputedCustomFields,
  computeCustomFieldValue,
  type CustomFieldDefinition
} from '../custom-fields'

const diametro: CustomFieldDefinition = {
  name: 'diametro',
  type: 'number',
  label: 'Diámetro de Diseño',
  unit: 'm',
  required: true
}
const profundidad: CustomFieldDefinition = {
  name: 'profundidad',
  type: 'number',
  label: 'Profundidad de Diseño',
  unit: 'm',
  required: true
}
const volumenTeorico: CustomFieldDefinition = {
  name: 'volumen_teorico',
  type: 'number',
  label: 'Volumen Teórico',
  unit: 'm³',
  required: true,
  computed: 'cylinder_volume:diametro/profundidad'
}
const tolerancia: CustomFieldDefinition = {
  name: 'sobreconsumo_maximo',
  type: 'number',
  label: 'Sobreconsumo Máximo Admisible',
  unit: '%',
  default: 10
}
const fields = [diametro, profundidad, volumenTeorico, tolerancia]

describe('computeCustomFieldValue', () => {
  it('calcula el volumen del cilindro π·D²/4·L', () => {
    expect(computeCustomFieldValue(volumenTeorico, { diametro: 1.2, profundidad: 12 })).toBe(13.57)
    expect(computeCustomFieldValue(volumenTeorico, { diametro: 1, profundidad: 10 })).toBe(7.85)
    expect(computeCustomFieldValue(volumenTeorico, { diametro: '0.8', profundidad: '6.5' })).toBe(3.27)
  })

  it('respeta los decimales configurados', () => {
    expect(
      computeCustomFieldValue(
        { ...volumenTeorico, decimals: 3 },
        { diametro: 1.2, profundidad: 12 }
      )
    ).toBe(13.572)
  })

  it('devuelve null si faltan operandos o no son positivos', () => {
    expect(computeCustomFieldValue(volumenTeorico, { diametro: 1.2 })).toBeNull()
    expect(computeCustomFieldValue(volumenTeorico, { diametro: 0, profundidad: 12 })).toBeNull()
    expect(computeCustomFieldValue(volumenTeorico, { diametro: 1.2, profundidad: -3 })).toBeNull()
    expect(computeCustomFieldValue(volumenTeorico, { diametro: '', profundidad: 12 })).toBeNull()
    expect(computeCustomFieldValue(volumenTeorico, null)).toBeNull()
  })

  it('devuelve null para campos sin fórmula o con fórmula desconocida', () => {
    expect(computeCustomFieldValue(diametro, { diametro: 1.2, profundidad: 12 })).toBeNull()
    expect(
      computeCustomFieldValue(
        { ...volumenTeorico, computed: 'sphere_volume:diametro' },
        { diametro: 1.2, profundidad: 12 }
      )
    ).toBeNull()
  })
})

describe('applyComputedCustomFields', () => {
  it('rellena los campos calculados a partir de los demás datos', () => {
    const data = applyComputedCustomFields(fields, { diametro: 1.2, profundidad: 12 }, [])
    expect(data.volumen_teorico).toBe(13.57)
    expect(data.diametro).toBe(1.2)
  })

  it('no toca los campos que el usuario ajustó manualmente', () => {
    const data = applyComputedCustomFields(
      fields,
      { diametro: 1.2, profundidad: 12, volumen_teorico: 15.2 },
      ['volumen_teorico']
    )
    expect(data.volumen_teorico).toBe(15.2)
  })

  it('limpia el campo calculado cuando ya no se puede calcular', () => {
    const data = applyComputedCustomFields(
      fields,
      { diametro: 1.2, profundidad: null, volumen_teorico: 13.57 },
      []
    )
    expect(data.volumen_teorico).toBeNull()
  })

  it('no modifica campos sin fórmula ni el objeto original', () => {
    const original = { diametro: 1.2, profundidad: 12, sobreconsumo_maximo: 10 }
    const data = applyComputedCustomFields(fields, original, [])
    expect(data.sobreconsumo_maximo).toBe(10)
    expect(original).not.toHaveProperty('volumen_teorico')
  })
})
