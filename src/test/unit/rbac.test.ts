import {
  ROLE_CATALOG,
  resolveRole,
  resolvePermissions,
  homeRouteFor,
  hasPermission,
  canAccessRoute,
  type PlatformRole,
} from '../../lib/rbac'
import type { User } from '../../auth/AuthContext'

function userWith(roles: string[], permissions: string[] = []): User {
  return {
    email: 'x@y.com',
    name: 'X',
    // `role` (legacy short code) is consulted by resolveRole AFTER roles[]. Cast
    // to satisfy the Role union — tests deliberately use unknown values too.
    role: 'AUTO',
    tenantId: 't1',
    roles,
    permissions,
  }
}

describe('RBAC — ROLE_CATALOG completeness', () => {
  const expectedRoles: PlatformRole[] = [
    'platform_admin',
    'group_sustainability_officer',
    'subsidiary_lead',
    'plant_manager',
    'data_contributor',
    'narrative_owner',
    'auditor',
  ]

  it('exposes every PlatformRole', () => {
    expectedRoles.forEach(r => {
      expect(ROLE_CATALOG[r]).toBeDefined()
      expect(ROLE_CATALOG[r].slug).toBe(r)
    })
  })

  it('every role has at least one permission', () => {
    expectedRoles.forEach(r => {
      expect(ROLE_CATALOG[r].permissions.length).toBeGreaterThan(0)
    })
  })

  it('platform_admin has admin.org + admin.users', () => {
    expect(ROLE_CATALOG.platform_admin.permissions).toContain('admin.org')
    expect(ROLE_CATALOG.platform_admin.permissions).toContain('admin.users')
  })

  it('auditor has audit.view but not admin.users', () => {
    expect(ROLE_CATALOG.auditor.permissions).toContain('audit.view')
    expect(ROLE_CATALOG.auditor.permissions).not.toContain('admin.users')
  })
})

describe('resolveRole', () => {
  it('returns data_contributor for null user', () => {
    expect(resolveRole(null)).toBe('data_contributor')
    expect(resolveRole(undefined)).toBe('data_contributor')
  })

  it('maps legacy "admin" slug to platform_admin', () => {
    expect(resolveRole(userWith(['admin']))).toBe('platform_admin')
  })

  it('maps legacy short code PA to platform_admin', () => {
    expect(resolveRole(userWith(['PA']))).toBe('platform_admin')
  })

  it('passes through canonical platform_admin slug', () => {
    expect(resolveRole(userWith(['platform_admin']))).toBe('platform_admin')
  })

  it('falls back to data_contributor for unknown slug', () => {
    expect(resolveRole(userWith(['gardener']))).toBe('data_contributor')
  })
})

describe('homeRouteFor', () => {
  it('returns /login for null', () => {
    expect(homeRouteFor(null)).toBe('/login')
  })

  const cases: Array<[PlatformRole, string]> = [
    ['platform_admin', '/'],
    ['group_sustainability_officer', '/workflow/approval'],
    ['subsidiary_lead', '/workflow/review'],
    ['plant_manager', '/my-tasks'],
    ['data_contributor', '/my-tasks'],
    ['narrative_owner', '/my-tasks'],
    ['auditor', '/reports/auditor'],
  ]

  cases.forEach(([role, route]) => {
    it(`${role} → ${route}`, () => {
      expect(homeRouteFor(userWith([role]))).toBe(route)
    })
  })
})

describe('resolvePermissions', () => {
  it('returns user.permissions when present', () => {
    const perms = ['custom.do.x']
    expect(resolvePermissions(userWith(['data_contributor'], perms))).toEqual(perms)
  })

  it('falls back to role catalog when user has no explicit permissions', () => {
    const got = resolvePermissions(userWith(['platform_admin']))
    expect(got).toContain('admin.org')
  })

  it('returns [] for null user', () => {
    expect(resolvePermissions(null)).toEqual([])
  })
})

describe('hasPermission / canAccessRoute', () => {
  it('hasPermission is permissive when permissions are empty (demo mode)', () => {
    expect(hasPermission([], 'anything.you.want')).toBe(true)
  })

  it('hasPermission requires exact match otherwise', () => {
    expect(hasPermission(['dashboard.view'], 'dashboard.view')).toBe(true)
    expect(hasPermission(['dashboard.view'], 'admin.users')).toBe(false)
  })

  it('canAccessRoute uses longest-prefix match', () => {
    const perms = ['workflow.approve']
    expect(canAccessRoute(perms, '/workflow/approval')).toBe(true)
    expect(canAccessRoute(perms, '/workflow/review')).toBe(false)
  })

  it('canAccessRoute allows unmapped routes through', () => {
    expect(canAccessRoute(['only.one'], '/totally/unknown')).toBe(true)
  })
})
