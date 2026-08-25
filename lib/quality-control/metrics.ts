export type MetricOperator = '>=' | '<=' | 'range'

export interface MetricCriterion {
  operator: MetricOperator
  value?: number
  min?: number
  max?: number
  when?: Record<string, string[]>
  message?: string | null
}

export interface MetricDefinition {
  key: string
  label: string
  unit?: string | null
  decimals?: number
  computed?: string | null
  criteria?: MetricCriterion[]
}

export interface NamedTestDefinition {
  key: string
  name: string
  period?: number
  optional?: boolean
  samples_per_test?: number
  specimens_label?: string
  metrics: MetricDefinition[]
}

export interface SpecimenMetricValues {
  specimenNumber: number
  values: Record<string, number | null | undefined>
}

export interface MetricEvaluation {
  key: string
  label: string
  unit: string | null
  value: number | null
  computed: boolean
  criterion: MetricCriterion | null
  criterionLabel: string | null
  meets: boolean | null
  message: string | null
}

export interface SpecimenMetricsEvaluation {
  specimenNumber: number
  metrics: MetricEvaluation[]
  meetsCriteria: boolean | null
}

export interface NamedTestEvaluation {
  specimens: SpecimenMetricsEvaluation[]
  meetsCriteria: boolean | null
  failures: string[]
}

const COMPARISON_TOLERANCE = 1e-9
const RATIO_PATTERN = /^ratio\s*:\s*([a-z0-9_]+)\s*\/\s*([a-z0-9_]+)$/i

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

function matchesCondition(
  when: Record<string, string[]> | undefined,
  customData: Record<string, unknown> | null | undefined
): boolean {
  if (!when) return true
  if (!customData) return false

  return Object.entries(when).every(([field, allowed]) => {
    const current = customData[field]
    if (current === null || current === undefined) return false
    return allowed.map(String).includes(String(current))
  })
}

export function resolveMetricCriterion(
  metric: MetricDefinition,
  customData: Record<string, unknown> | null | undefined
): MetricCriterion | null {
  if (!Array.isArray(metric.criteria)) return null

  for (const criterion of metric.criteria) {
    if (matchesCondition(criterion.when, customData)) {
      return criterion
    }
  }

  return null
}

export function describeCriterion(criterion: MetricCriterion | null, unit?: string | null): string | null {
  if (!criterion) return null
  const suffix = unit ? ` ${unit}` : ''

  switch (criterion.operator) {
    case '>=':
      return `≥ ${criterion.value}${suffix}`
    case '<=':
      return `≤ ${criterion.value}${suffix}`
    case 'range':
      return `${criterion.min} – ${criterion.max}${suffix}`
    default:
      return null
  }
}

export function evaluateMetricValue(value: number, criterion: MetricCriterion): boolean | null {
  switch (criterion.operator) {
    case '>=': {
      const target = toFiniteNumber(criterion.value)
      if (target === null) return null
      return value >= target - COMPARISON_TOLERANCE
    }
    case '<=': {
      const target = toFiniteNumber(criterion.value)
      if (target === null) return null
      return value <= target + COMPARISON_TOLERANCE
    }
    case 'range': {
      const min = toFiniteNumber(criterion.min)
      const max = toFiniteNumber(criterion.max)
      if (min === null || max === null) return null
      return value >= min - COMPARISON_TOLERANCE && value <= max + COMPARISON_TOLERANCE
    }
    default:
      return null
  }
}

export function computeMetricValue(
  metric: MetricDefinition,
  values: Record<string, number | null | undefined>
): number | null {
  if (!metric.computed) {
    return toFiniteNumber(values[metric.key])
  }

  const match = RATIO_PATTERN.exec(metric.computed)
  if (!match) return null

  const numerator = toFiniteNumber(values[match[1]])
  const denominator = toFiniteNumber(values[match[2]])
  if (numerator === null || denominator === null || denominator === 0) return null

  return roundTo(numerator / denominator, metric.decimals ?? 2)
}

export function evaluateSpecimenMetrics(
  specimen: SpecimenMetricValues,
  test: NamedTestDefinition,
  customData: Record<string, unknown> | null | undefined
): SpecimenMetricsEvaluation {
  const metrics: MetricEvaluation[] = test.metrics.map(metric => {
    const value = computeMetricValue(metric, specimen.values)
    const criterion = resolveMetricCriterion(metric, customData)
    const meets =
      value === null || criterion === null ? null : evaluateMetricValue(value, criterion)

    return {
      key: metric.key,
      label: metric.label,
      unit: metric.unit ?? null,
      value,
      computed: Boolean(metric.computed),
      criterion,
      criterionLabel: describeCriterion(criterion, metric.unit),
      meets,
      message: meets === false ? criterion?.message ?? null : null
    }
  })

  const evaluated = metrics.filter(metric => metric.meets !== null)
  const meetsCriteria =
    evaluated.length === 0 ? null : evaluated.every(metric => metric.meets === true)

  return {
    specimenNumber: specimen.specimenNumber,
    metrics,
    meetsCriteria
  }
}

export function evaluateNamedTest(
  specimens: SpecimenMetricValues[],
  test: NamedTestDefinition,
  customData: Record<string, unknown> | null | undefined
): NamedTestEvaluation {
  const evaluations = specimens.map(specimen =>
    evaluateSpecimenMetrics(specimen, test, customData)
  )

  const evaluated = evaluations.filter(evaluation => evaluation.meetsCriteria !== null)
  const meetsCriteria =
    evaluated.length === 0
      ? null
      : evaluated.every(evaluation => evaluation.meetsCriteria === true)

  const failures: string[] = []
  for (const evaluation of evaluations) {
    for (const metric of evaluation.metrics) {
      if (metric.meets === false) {
        failures.push(
          `Probeta ${evaluation.specimenNumber}: ${metric.label} = ${metric.value}${
            metric.unit ? ` ${metric.unit}` : ''
          } (criterio ${metric.criterionLabel})`
        )
      }
    }
  }

  return {
    specimens: evaluations,
    meetsCriteria,
    failures
  }
}

export function findNamedTest(
  testConfiguration: { named_tests?: NamedTestDefinition[] } | null | undefined,
  key: string | null | undefined
): NamedTestDefinition | null {
  if (!key || !Array.isArray(testConfiguration?.named_tests)) return null
  return testConfiguration.named_tests.find(test => test.key === key) ?? null
}
