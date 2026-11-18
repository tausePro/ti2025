// Correos de una empresa cliente que reciben los informes publicados.

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/

/**
 * Separa la lista por comas, punto y coma, espacios o saltos de línea, la
 * pasa a minúsculas y quita repetidos. Devuelve también lo que no es un correo.
 */
export function parseEmailList(text: string | null | undefined): { emails: string[]; invalid: string[] } {
  const emails: string[] = []
  const invalid: string[] = []
  for (const part of String(text ?? '').split(/[\s,;]+/)) {
    const value = part.trim().toLowerCase()
    if (!value) continue
    if (!EMAIL.test(value)) invalid.push(part.trim())
    else if (!emails.includes(value)) emails.push(value)
  }
  return { emails, invalid }
}
