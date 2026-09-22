import { roundTo, toFiniteNumber } from './metrics'

export interface CustomFieldDefinition {
  name: string
  type: string
  label: string
  required?: boolean
  placeholder?: string
  options?: string[]
  unit?: string
  default?: unknown
  min?: number
  max?: number
  decimals?: number
  computed?: string | null
  help?: string | null
}

// cylinder_volume:diametro/profundidad = π · D² / 4 · L (ej. volumen teórico de una pila)
const CYLINDER_VOLUME_PATTERN = /^cylinder_volume\s*:\s*([a-z0-9_]+)\s*\/\s*([a-z0-9_]+)$/i

export function computeCustomFieldValue(
  field: CustomFieldDefinition,
  data: Record<string, unknown> | null | undefined
): number | null {
  if (!field.computed) return null

  const cylinderMatch = CYLINDER_VOLUME_PATTERN.exec(field.computed)
  if (cylinderMatch) {
    const diameter = toFiniteNumber(data?.[cylinderMatch[1]])
    const length = toFiniteNumber(data?.[cylinderMatch[2]])
    if (diameter === null || length === null || diameter <= 0 || length <= 0) return null

    return roundTo(((Math.PI * diameter ** 2) / 4) * length, field.decimals ?? 2)
  }

  return null
}

/**
 * Devuelve una copia de `data` con los campos calculados actualizados.
 * Los campos listados en `overridden` (ajustados a mano por el usuario) se respetan.
 */
export function applyComputedCustomFields(
  fields: CustomFieldDefinition[],
  data: Record<string, unknown>,
  overridden: Iterable<string>
): Record<string, unknown> {
  const skip = new Set(overridden)
  const next = { ...data }

  for (const field of fields) {
    if (!field.computed || skip.has(field.name)) continue
    next[field.name] = computeCustomFieldValue(field, next)
  }

  return next
}
