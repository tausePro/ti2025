// Etiquetas y fechas de los informes históricos importados de WordPress.

export type LegacyReportKind = 'mensual' | 'quincenal' | 'otro'

export const LEGACY_REPORT_KIND_LABELS: Record<LegacyReportKind, string> = {
  mensual: 'Mensual',
  quincenal: 'Quincenal',
  otro: 'Otro'
}

// Casillas de firma del informe original
export const LEGACY_SIGNATURE_LABELS: Record<string, string> = {
  directora_general: 'Directora general',
  coordinador_de_proyectos: 'Coordinador de proyectos',
  director_interventoria: 'Director de interventoría',
  residente: 'Residente'
}

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

function dateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  const [year, month, day] = match.slice(1).map(Number)
  return month >= 1 && month <= 12 ? { year, month, day } : null
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** "3 de noviembre de 2021". Las fechas AAAA-MM-DD se leen tal cual, sin zona horaria. */
export function formatLegacyDate(value?: string | null): string | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parts = dateParts(value)
    return parts ? `${parts.day} de ${MONTHS[parts.month - 1]} de ${parts.year}` : null
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Período del informe. Si el título solo decía el mes, se muestra el mes;
 * si traía un rango, el rango.
 */
export function formatLegacyPeriod(start?: string | null, end?: string | null, source?: string | null): string | null {
  const a = start ? dateParts(start) : null
  const b = end ? dateParts(end) : null
  if (!a || !b) return null
  const sameMonth = a.year === b.year && a.month === b.month
  if (sameMonth && source?.startsWith('mes_del_titulo')) return capitalize(`${MONTHS[a.month - 1]} de ${a.year}`)
  if (sameMonth) return `${a.day} al ${b.day} de ${MONTHS[a.month - 1]} de ${a.year}`
  if (a.year === b.year) return `${a.day} de ${MONTHS[a.month - 1]} al ${b.day} de ${MONTHS[b.month - 1]} de ${a.year}`
  return `${a.day} de ${MONTHS[a.month - 1]} de ${a.year} al ${b.day} de ${MONTHS[b.month - 1]} de ${b.year}`
}

/** Año con el que se agrupa el informe: el de su período o, si no tiene, el de publicación. */
export function legacyReportYear(report: { period_start?: string | null; wp_created_at?: string | null }): number | null {
  const value = report.period_start ?? report.wp_created_at
  return value ? Number(value.slice(0, 4)) || null : null
}

/** Firmas marcadas en el informe, con su etiqueta. */
export function legacySignatureList(signatures?: Record<string, unknown> | null): string[] {
  return Object.entries(signatures ?? {})
    .filter(([, checked]) => checked === true)
    .map(([key]) => LEGACY_SIGNATURE_LABELS[key] ?? capitalize(key.replace(/_/g, ' ')))
}
