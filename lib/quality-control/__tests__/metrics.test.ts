import { describe, expect, it } from 'vitest'
import {
  computeMetricValue,
  describeCriterion,
  evaluateMetricValue,
  evaluateNamedTest,
  findNamedTest,
  resolveMetricCriterion,
  type NamedTestDefinition
} from '../metrics'

const fisicoBarra: NamedTestDefinition = {
  key: 'fisico',
  name: 'Ensayo físico de tracción',
  metrics: [
    {
      key: 'fluencia',
      label: 'Límite de fluencia',
      unit: 'MPa',
      criteria: [
        {
          operator: 'range',
          min: 420,
          max: 540,
          when: { tipo_producto: ['Barra corrugada'] },
          message: 'Fluencia fuera del rango 420-540 MPa (NTC-2289)'
        },
        {
          operator: '>=',
          value: 485,
          when: { tipo_producto: ['Malla electrosoldada'] },
          message: 'Fluencia menor a 485 MPa (NTC-5806)'
        }
      ]
    },
    {
      key: 'traccion',
      label: 'Resistencia a la tracción',
      unit: 'MPa',
      criteria: [{ operator: '>=', value: 550, message: 'Tracción menor a 550 MPa' }]
    },
    {
      key: 'relacion',
      label: 'Relación tracción/fluencia',
      computed: 'ratio:traccion/fluencia',
      decimals: 2,
      criteria: [
        {
          operator: '>=',
          value: 1.25,
          when: { tipo_producto: ['Barra corrugada'] },
          message: 'Relación tracción/fluencia menor a 1.25'
        }
      ]
    },
    {
      key: 'alargamiento',
      label: 'Alargamiento',
      unit: '%',
      criteria: [
        {
          operator: '>=',
          value: 14,
          when: { tipo_producto: ['Barra corrugada'], diametro: ['#2', '#3', '#4', '#5', '#6'] },
          message: 'Alargamiento menor a 14%'
        },
        {
          operator: '>=',
          value: 12,
          when: { tipo_producto: ['Barra corrugada'], diametro: ['#7', '#8', '#9', '#10'] },
          message: 'Alargamiento menor a 12%'
        }
      ]
    }
  ]
}

const quimico: NamedTestDefinition = {
  key: 'quimico',
  name: 'Análisis químico de colada',
  metrics: [
    {
      key: 'carbono',
      label: 'Carbono (C)',
      unit: '%',
      criteria: [{ operator: '<=', value: 0.33, message: 'Carbono mayor a 0.33%' }]
    },
    {
      key: 'fosforo',
      label: 'Fósforo (P)',
      unit: '%',
      criteria: [{ operator: '<=', value: 0.043, message: 'Fósforo mayor a 0.043%' }]
    }
  ]
}

describe('resolveMetricCriterion', () => {
  it('selecciona el criterio de barra por tipo de producto', () => {
    const criterion = resolveMetricCriterion(fisicoBarra.metrics[0], {
      tipo_producto: 'Barra corrugada'
    })
    expect(criterion?.operator).toBe('range')
    expect(criterion?.min).toBe(420)
  })

  it('selecciona el criterio de malla por tipo de producto', () => {
    const criterion = resolveMetricCriterion(fisicoBarra.metrics[0], {
      tipo_producto: 'Malla electrosoldada'
    })
    expect(criterion?.operator).toBe('>=')
    expect(criterion?.value).toBe(485)
  })

  it('selecciona alargamiento del 12% para diámetros gruesos', () => {
    const criterion = resolveMetricCriterion(fisicoBarra.metrics[3], {
      tipo_producto: 'Barra corrugada',
      diametro: '#8'
    })
    expect(criterion?.value).toBe(12)
  })

  it('devuelve null cuando ninguna condición aplica', () => {
    const criterion = resolveMetricCriterion(fisicoBarra.metrics[2], {
      tipo_producto: 'Malla electrosoldada'
    })
    expect(criterion).toBeNull()
  })
})

describe('evaluateMetricValue', () => {
  it('evalúa operador >=', () => {
    expect(evaluateMetricValue(550, { operator: '>=', value: 550 })).toBe(true)
    expect(evaluateMetricValue(549.9, { operator: '>=', value: 550 })).toBe(false)
  })

  it('evalúa operador <=', () => {
    expect(evaluateMetricValue(0.33, { operator: '<=', value: 0.33 })).toBe(true)
    expect(evaluateMetricValue(0.34, { operator: '<=', value: 0.33 })).toBe(false)
  })

  it('evalúa rango inclusivo', () => {
    expect(evaluateMetricValue(420, { operator: 'range', min: 420, max: 540 })).toBe(true)
    expect(evaluateMetricValue(540, { operator: 'range', min: 420, max: 540 })).toBe(true)
    expect(evaluateMetricValue(541, { operator: 'range', min: 420, max: 540 })).toBe(false)
  })
})

describe('computeMetricValue', () => {
  it('calcula la relación tracción/fluencia', () => {
    const value = computeMetricValue(fisicoBarra.metrics[2], { traccion: 630, fluencia: 450 })
    expect(value).toBe(1.4)
  })

  it('devuelve null si falta un componente del cálculo', () => {
    const value = computeMetricValue(fisicoBarra.metrics[2], { traccion: 630 })
    expect(value).toBeNull()
  })
})

describe('describeCriterion', () => {
  it('describe los tres operadores', () => {
    expect(describeCriterion({ operator: '>=', value: 550 }, 'MPa')).toBe('≥ 550 MPa')
    expect(describeCriterion({ operator: '<=', value: 0.33 }, '%')).toBe('≤ 0.33 %')
    expect(describeCriterion({ operator: 'range', min: 420, max: 540 }, 'MPa')).toBe('420 – 540 MPa')
  })
})

describe('evaluateNamedTest', () => {
  const barra = { tipo_producto: 'Barra corrugada', diametro: '#5' }

  it('aprueba una barra que cumple todos los criterios NTC-2289', () => {
    const result = evaluateNamedTest(
      [{ specimenNumber: 1, values: { fluencia: 460, traccion: 640, alargamiento: 16 } }],
      fisicoBarra,
      barra
    )
    expect(result.meetsCriteria).toBe(true)
    expect(result.failures).toHaveLength(0)
    const relacion = result.specimens[0].metrics.find(m => m.key === 'relacion')
    expect(relacion?.value).toBe(1.39)
    expect(relacion?.meets).toBe(true)
  })

  it('rechaza una barra con fluencia sobre 540 MPa aunque la tracción cumpla', () => {
    const result = evaluateNamedTest(
      [{ specimenNumber: 1, values: { fluencia: 560, traccion: 720, alargamiento: 16 } }],
      fisicoBarra,
      barra
    )
    expect(result.meetsCriteria).toBe(false)
    expect(result.failures.some(f => f.includes('Límite de fluencia'))).toBe(true)
  })

  it('rechaza cuando la relación tracción/fluencia es menor a 1.25', () => {
    const result = evaluateNamedTest(
      [{ specimenNumber: 1, values: { fluencia: 530, traccion: 620, alargamiento: 16 } }],
      fisicoBarra,
      barra
    )
    const relacion = result.specimens[0].metrics.find(m => m.key === 'relacion')
    expect(relacion?.value).toBe(1.17)
    expect(relacion?.meets).toBe(false)
    expect(result.meetsCriteria).toBe(false)
  })

  it('evalúa malla electrosoldada con fluencia >= 485 y sin relación', () => {
    const result = evaluateNamedTest(
      [{ specimenNumber: 1, values: { fluencia: 500, traccion: 560, alargamiento: 8 } }],
      fisicoBarra,
      { tipo_producto: 'Malla electrosoldada' }
    )
    expect(result.meetsCriteria).toBe(true)
    const relacion = result.specimens[0].metrics.find(m => m.key === 'relacion')
    expect(relacion?.meets).toBeNull()
    const alargamiento = result.specimens[0].metrics.find(m => m.key === 'alargamiento')
    expect(alargamiento?.meets).toBeNull()
  })

  it('cada probeta debe cumplir individualmente', () => {
    const result = evaluateNamedTest(
      [
        { specimenNumber: 1, values: { fluencia: 460, traccion: 640, alargamiento: 16 } },
        { specimenNumber: 2, values: { fluencia: 460, traccion: 500, alargamiento: 16 } }
      ],
      fisicoBarra,
      barra
    )
    expect(result.specimens[0].meetsCriteria).toBe(true)
    expect(result.specimens[1].meetsCriteria).toBe(false)
    expect(result.meetsCriteria).toBe(false)
  })

  it('evalúa el análisis químico con máximos', () => {
    const result = evaluateNamedTest(
      [{ specimenNumber: 1, values: { carbono: 0.28, fosforo: 0.05 } }],
      quimico,
      {}
    )
    expect(result.meetsCriteria).toBe(false)
    expect(result.failures.some(f => f.includes('Fósforo'))).toBe(true)
  })

  it('devuelve null cuando no hay métricas evaluables', () => {
    const result = evaluateNamedTest(
      [{ specimenNumber: 1, values: {} }],
      quimico,
      {}
    )
    expect(result.meetsCriteria).toBeNull()
  })
})

describe('findNamedTest', () => {
  it('encuentra el ensayo por clave', () => {
    const config = { named_tests: [fisicoBarra, quimico] }
    expect(findNamedTest(config, 'quimico')?.name).toBe('Análisis químico de colada')
    expect(findNamedTest(config, 'otro')).toBeNull()
    expect(findNamedTest(null, 'fisico')).toBeNull()
  })
})

describe('criterios con value_from (unidades de mampostería)', () => {
  const unidadTest: NamedTestDefinition = {
    key: 'unidad',
    name: 'Ensayo de unidades de mampostería',
    specimens_label: 'Unidad',
    metrics: [
      {
        key: 'compresion',
        label: 'Resistencia a la compresión',
        unit: 'MPa',
        criteria: [
          {
            operator: '>=',
            value_from: 'resistencia_minima',
            message: 'Resistencia menor a la mínima especificada'
          }
        ]
      },
      {
        key: 'absorcion',
        label: 'Absorción de agua',
        unit: '%',
        criteria: [
          {
            operator: '<=',
            value_from: 'absorcion_maxima',
            message: 'Absorción mayor a la máxima especificada'
          }
        ]
      }
    ]
  }

  it('resuelve el valor del criterio desde custom_data', () => {
    const criterion = resolveMetricCriterion(unidadTest.metrics[0], {
      resistencia_minima: 18
    })
    expect(criterion?.value).toBe(18)
    expect(describeCriterion(criterion, 'MPa')).toBe('≥ 18 MPa')
  })

  it('acepta valores como texto (inputs de formulario)', () => {
    const criterion = resolveMetricCriterion(unidadTest.metrics[1], {
      absorcion_maxima: '13.5'
    })
    expect(criterion?.value).toBe(13.5)
  })

  it('devuelve null cuando el campo de referencia no existe', () => {
    expect(resolveMetricCriterion(unidadTest.metrics[0], {})).toBeNull()
    expect(resolveMetricCriterion(unidadTest.metrics[0], null)).toBeNull()
  })

  it('evalúa compresión y absorción contra los valores de la muestra', () => {
    const customData = { resistencia_minima: 18, absorcion_maxima: 13.5 }

    const cumple = evaluateNamedTest(
      [{ specimenNumber: 1, values: { compresion: 20.5, absorcion: 11.2 } }],
      unidadTest,
      customData
    )
    expect(cumple.meetsCriteria).toBe(true)

    const falla = evaluateNamedTest(
      [{ specimenNumber: 1, values: { compresion: 20.5, absorcion: 15.1 } }],
      unidadTest,
      customData
    )
    expect(falla.meetsCriteria).toBe(false)
    expect(falla.failures.some(f => f.includes('Absorción'))).toBe(true)
  })

  it('queda sin evaluar cuando la muestra no define los límites', () => {
    const result = evaluateNamedTest(
      [{ specimenNumber: 1, values: { compresion: 20.5, absorcion: 11.2 } }],
      unidadTest,
      {}
    )
    expect(result.meetsCriteria).toBeNull()
  })
})
