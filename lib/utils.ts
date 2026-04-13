import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function getCurrentDateInputValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function parseDateValue(value: string | Date) {
  if (value instanceof Date) {
    return value
  }

  if (DATE_ONLY_PATTERN.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  return new Date(value)
}

export function formatDateValue(
  value: string | Date | null | undefined,
  locale = 'es-CO',
  options?: Intl.DateTimeFormatOptions
) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat(locale, options).format(parseDateValue(value))
}

export function getCustomFieldLabelsMap(
  configFields: Array<{ id?: string; label?: string }> = [],
  storedLabels: Record<string, string> = {}
) {
  const configLabels = configFields.reduce<Record<string, string>>((acc, field) => {
    if (field?.id && field?.label) {
      acc[field.id] = field.label
    }

    return acc
  }, {})

  return {
    ...configLabels,
    ...storedLabels
  }
}
