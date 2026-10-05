import { describe, it, expect } from 'vitest'
import { canEditDailyLog } from '@/lib/daily-log-permissions'

const residente = { id: 'res-1', role: 'residente' }

describe('canEditDailyLog', () => {
  it('el residente edita sus propias bitácoras', () => {
    expect(canEditDailyLog(residente, { created_by: 'res-1' })).toBe(true)
  })

  it('el residente no edita bitácoras de otro residente del proyecto', () => {
    expect(canEditDailyLog(residente, { created_by: 'res-2' })).toBe(false)
  })

  it('el residente no edita bitácoras sin autor', () => {
    expect(canEditDailyLog(residente, { created_by: null })).toBe(false)
  })

  it('los demás roles conservan el comportamiento actual', () => {
    expect(canEditDailyLog({ id: 'sup-1', role: 'supervisor' }, { created_by: 'res-2' })).toBe(true)
    expect(canEditDailyLog({ id: 'adm-1', role: 'admin' }, { created_by: 'res-2' })).toBe(true)
    expect(canEditDailyLog({ id: 'ger-1', role: 'gerente' }, { created_by: 'res-2' })).toBe(true)
  })

  it('sin usuario no permite editar', () => {
    expect(canEditDailyLog(null, { created_by: 'res-1' })).toBe(false)
    expect(canEditDailyLog({ id: null, role: 'residente' }, { created_by: 'res-1' })).toBe(false)
  })
})
