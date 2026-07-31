export interface QualityValidationRule {
  test_period?: number | string | null
  rule?: string | null
  message?: string | null
}

export interface QualityTestConfiguration {
  acceptance_criteria?: Record<string, unknown> | null
  units?: string | null
}

export type EvaluationReason =
  | 'ok'
  | 'sin_resultados'
  | 'sin_valor_esperado'
  | 'sin_criterio'

export interface PeriodCriterion {
  minPercentage: number
  message: string | null
  source: 'validation_rules' | 'acceptance_criteria'
}

export interface SpecimenEvaluation {
  specimenNumber: number
  value: number
  deviationPercentage: number | null
  meetsThreshold: boolean | null
}

export interface TestEvaluation {
  evaluable: boolean
  reason: EvaluationReason
  minPercentage: number | null
  threshold: number | null
  average: number | null
  averageDeviationPercentage: number | null
  meetsCriteria: boolean | null
  message: string | null
  specimens: SpecimenEvaluation[]
}

export interface EvaluateTestResultsInput {
  specimens: Array<{ specimenNumber: number; value: number }>
  expectedValue?: number | string | null
  period?: number | string | null
  testConfiguration?: QualityTestConfiguration | null
  validationRules?: QualityValidationRule[] | null
}

const EXPECTED_MULTIPLIER_PATTERN = /expected\s*\*\s*([0-9]*\.?[0-9]+)/i
const COMPARISON_TOLERANCE = 1e-9

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

export function parseMinPercentageFromRule(rule?: string | null): number | null {
  if (!rule) return null

  const match = EXPECTED_MULTIPLIER_PATTERN.exec(rule)
  if (!match) return null

  const multiplier = Number(match[1])
  if (!Number.isFinite(multiplier) || multiplier <= 0) return null

  return roundTo(multiplier * 100, 4)
}

export function findPeriodCriterion(
  testConfiguration?: QualityTestConfiguration | null,
  validationRules?: QualityValidationRule[] | null,
  period?: number | string | null
): PeriodCriterion | null {
  const targetPeriod = toFiniteNumber(period)
  if (targetPeriod === null) return null

  if (Array.isArray(validationRules)) {
    for (const entry of validationRules) {
      if (toFiniteNumber(entry?.test_period) !== targetPeriod) continue

      const minPercentage = parseMinPercentageFromRule(entry?.rule)
      if (minPercentage === null) continue

      return {
        minPercentage,
        message: entry?.message ?? null,
        source: 'validation_rules'
      }
    }
  }

  const criteria = testConfiguration?.acceptance_criteria
  if (criteria && typeof criteria === 'object') {
    const fromCriteria = toFiniteNumber(criteria[`min_percentage_${targetPeriod}d`])
    if (fromCriteria !== null && fromCriteria > 0) {
      return {
        minPercentage: fromCriteria,
        message: null,
        source: 'acceptance_criteria'
      }
    }
  }

  return null
}

export function evaluateTestResults(input: EvaluateTestResultsInput): TestEvaluation {
  const specimens = (input.specimens ?? []).filter(
    specimen => toFiniteNumber(specimen?.value) !== null
  )

  const expectedValue = toFiniteNumber(input.expectedValue)
  const hasExpectedValue = expectedValue !== null && expectedValue > 0

  const describeSpecimens = (threshold: number | null): SpecimenEvaluation[] =>
    specimens.map(specimen => ({
      specimenNumber: specimen.specimenNumber,
      value: specimen.value,
      deviationPercentage: hasExpectedValue
        ? roundTo((specimen.value / expectedValue!) * 100 - 100, 2)
        : null,
      meetsThreshold:
        threshold === null ? null : specimen.value >= threshold - COMPARISON_TOLERANCE
    }))

  if (specimens.length === 0) {
    return {
      evaluable: false,
      reason: 'sin_resultados',
      minPercentage: null,
      threshold: null,
      average: null,
      averageDeviationPercentage: null,
      meetsCriteria: null,
      message: null,
      specimens: []
    }
  }

  const rawAverage =
    specimens.reduce((total, specimen) => total + specimen.value, 0) / specimens.length
  const average = roundTo(rawAverage, 2)

  if (!hasExpectedValue) {
    return {
      evaluable: false,
      reason: 'sin_valor_esperado',
      minPercentage: null,
      threshold: null,
      average,
      averageDeviationPercentage: null,
      meetsCriteria: null,
      message: null,
      specimens: describeSpecimens(null)
    }
  }

  const averageDeviationPercentage = roundTo((rawAverage / expectedValue!) * 100 - 100, 2)
  const criterion = findPeriodCriterion(
    input.testConfiguration,
    input.validationRules,
    input.period ?? null
  )

  if (!criterion) {
    return {
      evaluable: false,
      reason: 'sin_criterio',
      minPercentage: null,
      threshold: null,
      average,
      averageDeviationPercentage,
      meetsCriteria: null,
      message: null,
      specimens: describeSpecimens(null)
    }
  }

  const threshold = roundTo(expectedValue! * (criterion.minPercentage / 100), 4)
  const meetsCriteria = rawAverage >= threshold - COMPARISON_TOLERANCE

  return {
    evaluable: true,
    reason: 'ok',
    minPercentage: criterion.minPercentage,
    threshold,
    average,
    averageDeviationPercentage,
    meetsCriteria,
    message: meetsCriteria ? null : criterion.message,
    specimens: describeSpecimens(threshold)
  }
}
