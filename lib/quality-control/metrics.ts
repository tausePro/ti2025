export type MetricOperator = '>=' | '<=' | 'range'

export interface MetricCriterion {
  operator: MetricOperator
  value?: number
  value_from?: string
  min?: number
  min_from?: string
  max?: number
  max_from?: string
  when?: Record<string, string[]>
  message?: string | null
}

export interface MetricDefinition {
  key: string
  label: string
  unit?: string | null
  unit_from?: string | null
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
const DIFF_PATTERN = /^diff\s*:\s*([a-z0-9_]+)\s*\/\s*([a-z0-9_]+)$/i

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

function resolveBound(
  fixed: number | undefined,
  fromField: string | undefined,
  customData: Record<string, unknown> | null | undefined
): number | undefined {
  if (fromField) {
    const fromValue = toFiniteNumber(customData?.[fromField])
    return fromValue === null ? undefined : fromValue
  }
  return fixed
}

export function resolveMetricCriterion(
  metric: MetricDefinition,
  customData: Record<string, unknown> | null | undefined
): MetricCriterion | null {
  if (!Array.isArray(metric.criteria)) return null

  for (const criterion of metric.criteria) {
    if (!matchesCondition(criterion.when, customData)) continue

    const value = resolveBound(criterion.value, criterion.value_from, customData)
    const min = resolveBound(criterion.min, criterion.min_from, customData)
    const max = resolveBound(criterion.max, criterion.max_from, customData)

    if (criterion.operator === 'range') {
      if (min === undefined || max === undefined) return null
    } else if (value === undefined) {
      return null
    }

    return { ...criterion, value, min, max }
  }

  return null
}

export function resolveMetricUnit(
  metric: MetricDefinition,
  customData: Record<string, unknown> | null | undefined
): string | null {
  if (metric.unit_from) {
    const value = customData?.[metric.unit_from]
    if (typeof value === 'string' && value.trim() !== '') return value
  }
  return metric.unit ?? null
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

  const ratioMatch = RATIO_PATTERN.exec(metric.computed)
  if (ratioMatch) {
    const numerator = toFiniteNumber(values[ratioMatch[1]])
    const denominator = toFiniteNumber(values[ratioMatch[2]])
    if (numerator === null || denominator === null || denominator === 0) return null

    return roundTo(numerator / denominator, metric.decimals ?? 2)
  }

  // diff:a/b = a - b (ej. caída de presión = inicial - final)
  const diffMatch = DIFF_PATTERN.exec(metric.computed)
  if (diffMatch) {
    const first = toFiniteNumber(values[diffMatch[1]])
    const second = toFiniteNumber(values[diffMatch[2]])
    if (first === null || second === null) return null

    return roundTo(first - second, metric.decimals ?? 2)
  }

  return null
}

export function evaluateSpecimenMetrics(
  specimen: SpecimenMetricValues,
  test: NamedTestDefinition,
  customData: Record<string, unknown> | null | undefined
): SpecimenMetricsEvaluation {
  const metrics: MetricEvaluation[] = test.metrics.map(metric => {
    const value = computeMetricValue(metric, specimen.values)
    const criterion = resolveMetricCriterion(metric, customData)
    const unit = resolveMetricUnit(metric, customData)
    const meets =
      value === null || criterion === null ? null : evaluateMetricValue(value, criterion)

    return {
      key: metric.key,
      label: metric.label,
      unit,
      value,
      computed: Boolean(metric.computed),
      criterion,
      criterionLabel: describeCriterion(criterion, unit),
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
