import { describe, it, expect } from 'vitest'
import {
  evaluateTestResults,
  findPeriodCriterion,
  parseMinPercentageFromRule
} from '@/lib/quality-control/evaluation'

const CONCRETE_TEST_CONFIGURATION = {
  acceptance_criteria: {
    min_percentage_3d: 40,
    min_percentage_7d: 65,
    min_percentage_14d: 85,
    min_percentage_28d: 100,
    max_deviation: 15
  },
  units: 'PSI'
}

const CONCRETE_VALIDATION_RULES = [
  {
    test_period: 3,
    rule: 'average >= expected * 0.40',
    message: 'No cumple resistencia mínima a 3 días (40%)'
  },
  {
    test_period: 7,
    rule: 'average >= expected * 0.65',
    message: 'No cumple resistencia mínima a 7 días (65%)'
  },
  {
    test_period: 14,
    rule: 'average >= expected * 0.85',
    message: 'No cumple resistencia mínima a 14 días (85%)'
  },
  {
    test_period: 28,
    rule: 'average >= expected * 1.00',
    message: 'No cumple resistencia mínima a 28 días (100%)'
  }
]

describe('parseMinPercentageFromRule', () => {
  it('convierte el multiplicador de la regla en porcentaje', () => {
    expect(parseMinPercentageFromRule('average >= expected * 0.40')).toBe(40)
    expect(parseMinPercentageFromRule('average >= expected * 1.00')).toBe(100)
  })

  it('devuelve null cuando la regla no compara contra el valor esperado', () => {
    expect(parseMinPercentageFromRule('yield_strength >= 40000')).toBeNull()
    expect(parseMinPercentageFromRule(null)).toBeNull()
  })
})

describe('findPeriodCriterion', () => {
  it('toma el porcentaje de las reglas de validación según el período', () => {
    const criterion = findPeriodCriterion(
      CONCRETE_TEST_CONFIGURATION,
      CONCRETE_VALIDATION_RULES,
      28
    )
    expect(criterion).toEqual({
      minPercentage: 100,
      message: 'No cumple resistencia mínima a 28 días (100%)',
      source: 'validation_rules'
    })
  })

  it('usa acceptance_criteria cuando no hay reglas de validación', () => {
    const criterion = findPeriodCriterion(CONCRETE_TEST_CONFIGURATION, null, 7)
    expect(criterion?.minPercentage).toBe(65)
    expect(criterion?.source).toBe('acceptance_criteria')
  })

  it('devuelve null para períodos sin criterio definido', () => {
    expect(
      findPeriodCriterion(CONCRETE_TEST_CONFIGURATION, CONCRETE_VALIDATION_RULES, 0)
    ).toBeNull()
  })
})

describe('evaluateTestResults', () => {
  it('no aprueba a 28 días un promedio por debajo del 100% de lo esperado', () => {
    const evaluation = evaluateTestResults({
      specimens: [
        { specimenNumber: 1, value: 2700 },
        { specimenNumber: 2, value: 2750 },
        { specimenNumber: 3, value: 2800 }
      ],
      expectedValue: 3000,
      period: 28,
      testConfiguration: CONCRETE_TEST_CONFIGURATION,
      validationRules: CONCRETE_VALIDATION_RULES
    })

    expect(evaluation.evaluable).toBe(true)
    expect(evaluation.minPercentage).toBe(100)
    expect(evaluation.threshold).toBe(3000)
    expect(evaluation.average).toBe(2750)
    expect(evaluation.meetsCriteria).toBe(false)
    expect(evaluation.message).toBe('No cumple resistencia mínima a 28 días (100%)')
  })

  it('aprueba a 3 días un promedio que supera el 40% de lo esperado', () => {
    const evaluation = evaluateTestResults({
      specimens: [
        { specimenNumber: 1, value: 1250 },
        { specimenNumber: 2, value: 1300 },
        { specimenNumber: 3, value: 1350 }
      ],
      expectedValue: 3000,
      period: 3,
      testConfiguration: CONCRETE_TEST_CONFIGURATION,
      validationRules: CONCRETE_VALIDATION_RULES
    })

    expect(evaluation.minPercentage).toBe(40)
    expect(evaluation.threshold).toBe(1200)
    expect(evaluation.average).toBe(1300)
    expect(evaluation.meetsCriteria).toBe(true)
    expect(evaluation.message).toBeNull()
  })

  it('aprueba por promedio aunque una probeta quede bajo el umbral y la señala', () => {
    const evaluation = evaluateTestResults({
      specimens: [
        { specimenNumber: 1, value: 2900 },
        { specimenNumber: 2, value: 3050 },
        { specimenNumber: 3, value: 3100 }
      ],
      expectedValue: 3000,
      period: 28,
      testConfiguration: CONCRETE_TEST_CONFIGURATION,
      validationRules: CONCRETE_VALIDATION_RULES
    })

    expect(evaluation.meetsCriteria).toBe(true)
    expect(evaluation.specimens[0].meetsThreshold).toBe(false)
    expect(evaluation.specimens[1].meetsThreshold).toBe(true)
    expect(evaluation.specimens[0].deviationPercentage).toBe(-3.33)
  })

  it('acepta el promedio exactamente igual al umbral', () => {
    const evaluation = evaluateTestResults({
      specimens: [{ specimenNumber: 1, value: 3000 }],
      expectedValue: 3000,
      period: 28,
      testConfiguration: CONCRETE_TEST_CONFIGURATION,
      validationRules: CONCRETE_VALIDATION_RULES
    })

    expect(evaluation.meetsCriteria).toBe(true)
    expect(evaluation.averageDeviationPercentage).toBe(0)
  })

  it('no emite veredicto cuando falta el valor esperado', () => {
    const evaluation = evaluateTestResults({
      specimens: [{ specimenNumber: 1, value: 4200 }],
      expectedValue: null,
      period: 28,
      testConfiguration: CONCRETE_TEST_CONFIGURATION,
      validationRules: CONCRETE_VALIDATION_RULES
    })

    expect(evaluation.evaluable).toBe(false)
    expect(evaluation.reason).toBe('sin_valor_esperado')
    expect(evaluation.meetsCriteria).toBeNull()
    expect(evaluation.average).toBe(4200)
  })

  it('no emite veredicto cuando el período no tiene criterio', () => {
    const evaluation = evaluateTestResults({
      specimens: [{ specimenNumber: 1, value: 45000 }],
      expectedValue: 40000,
      period: 0,
      testConfiguration: { acceptance_criteria: { min_yield_strength: 40000 } },
      validationRules: [{ rule: 'yield_strength >= 40000', message: 'No cumple' }]
    })

    expect(evaluation.evaluable).toBe(false)
    expect(evaluation.reason).toBe('sin_criterio')
    expect(evaluation.meetsCriteria).toBeNull()
    expect(evaluation.averageDeviationPercentage).toBe(12.5)
  })

  it('informa cuando no hay resultados que evaluar', () => {
    const evaluation = evaluateTestResults({
      specimens: [],
      expectedValue: 3000,
      period: 28,
      testConfiguration: CONCRETE_TEST_CONFIGURATION,
      validationRules: CONCRETE_VALIDATION_RULES
    })

    expect(evaluation.reason).toBe('sin_resultados')
    expect(evaluation.average).toBeNull()
    expect(evaluation.specimens).toEqual([])
  })
})
