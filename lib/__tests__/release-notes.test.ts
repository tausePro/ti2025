import { describe, expect, it } from 'vitest'
import {
  CURRENT_RELEASE,
  CURRENT_RELEASE_VERSION,
  getReleaseStorageKey,
  getReleaseToastDismissedKey,
  getTourStepsForRole
} from '../release-notes'

describe('release-notes', () => {
  it('returns steps tailored for residente without admin-only steps', () => {
    const steps = getTourStepsForRole('residente')
    expect(steps.length).toBe(3)
    expect(steps.map((s) => s.id)).toEqual([
      'shared-daily-logs',
      'biweekly-report-stage1',
      'quality-control-formats'
    ])
  })

  it('includes admin quality templates step for admin and super_admin', () => {
    const adminSteps = getTourStepsForRole('admin')
    expect(adminSteps.map((s) => s.id)).toContain('quality-templates-admin')

    const superAdminSteps = getTourStepsForRole('super_admin')
    expect(superAdminSteps.map((s) => s.id)).toContain('quality-templates-admin')
  })

  it('returns client-specific step for cliente role', () => {
    const clientSteps = getTourStepsForRole('cliente')
    expect(clientSteps.map((s) => s.id)).toEqual(['client-published-reports'])
  })

  it('falls back gracefully when role is unknown or null', () => {
    const fallbackSteps = getTourStepsForRole(null)
    expect(fallbackSteps.length).toBeGreaterThan(0)
  })

  it('builds user-scoped storage keys for tour and toast state', () => {
    expect(getReleaseStorageKey(CURRENT_RELEASE_VERSION, 'user-123')).toBe(
      `ti_release_tour_seen_${CURRENT_RELEASE_VERSION}_user-123`
    )
    expect(getReleaseToastDismissedKey(CURRENT_RELEASE_VERSION, null)).toBe(
      `ti_release_toast_dismissed_${CURRENT_RELEASE_VERSION}_anon`
    )
    expect(CURRENT_RELEASE.version).toBe(CURRENT_RELEASE_VERSION)
  })
})
