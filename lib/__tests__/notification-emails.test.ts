import { describe, expect, it } from 'vitest'
import { parseEmailList } from '../companies/notification-emails'

describe('parseEmailList', () => {
  it('acepta correos separados por coma, punto y coma o saltos de línea', () => {
    expect(parseEmailList('gerencia@cliente.com, obras@cliente.com;\ninterventoria@cliente.co')).toEqual({
      emails: ['gerencia@cliente.com', 'obras@cliente.com', 'interventoria@cliente.co'],
      invalid: []
    })
  })

  it('pasa a minúsculas y quita repetidos', () => {
    expect(parseEmailList('Gerencia@Cliente.com\ngerencia@cliente.com').emails).toEqual(['gerencia@cliente.com'])
  })

  it('separa lo que no es un correo', () => {
    expect(parseEmailList('obras@cliente.com, Juan, sin-arroba.com, x@y')).toEqual({
      emails: ['obras@cliente.com'],
      invalid: ['Juan', 'sin-arroba.com', 'x@y']
    })
  })

  it('devuelve listas vacías si no hay texto', () => {
    expect(parseEmailList('')).toEqual({ emails: [], invalid: [] })
    expect(parseEmailList(null)).toEqual({ emails: [], invalid: [] })
  })
})
