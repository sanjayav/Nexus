import { describe, expect, it } from 'vitest'
import {
  ALL_PERMISSIONS,
  assignableRoles,
  blockedByFourEyes,
  can,
  canEditModule,
  checkMemberChange,
  DEFAULT_ROLE_PERMISSIONS,
  isExpired,
  requiredPermission,
  splitEmails,
  validateInvites,
  type Member,
  type RoleId,
} from './model'

const person = (id: string, role: RoleId, extra: Partial<Member> = {}): Member => ({
  id,
  email: `${id}@x.example`,
  name: id,
  role,
  scope: [],
  status: 'active',
  ...extra,
})

describe('permissions', () => {
  it('grants by role and denies anyone not active', () => {
    expect(can(person('a', 'approver'), 'approval.approve')).toBe(true)
    expect(can(person('r', 'reviewer'), 'approval.approve')).toBe(false)
    expect(can(person('s', 'approver', { status: 'suspended' }), 'approval.view')).toBe(false)
    expect(can(person('i', 'approver', { status: 'invited' }), 'approval.view')).toBe(false)
    expect(can(null, 'dashboard.view')).toBe(false)
  })

  it('applies role overrides from the matrix', () => {
    expect(can(person('r', 'reviewer'), 'evidence.upload', { reviewer: ['evidence.upload'] })).toBe(true)
    expect(can(person('r', 'reviewer'), 'approval.review', { reviewer: ['evidence.upload'] })).toBe(false)
  })

  it('limits editing to the frameworks in scope', () => {
    const c = person('c', 'data_contributor', { scope: ['CN-SSE'] })
    expect(canEditModule(c, 'CN-SSE')).toBe(true)
    expect(canEditModule(c, 'HKEX-ESG')).toBe(false)
    expect(canEditModule(person('all', 'data_contributor'), 'HKEX-ESG')).toBe(true)
    expect(canEditModule(person('rev', 'reviewer'), 'CN-SSE')).toBe(false)
  })

  it('keeps the role catalogue consistent', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.platform_admin).toEqual(ALL_PERMISSIONS)
    for (const perms of Object.values(DEFAULT_ROLE_PERMISSIONS)) for (const p of perms) expect(ALL_PERMISSIONS).toContain(p)
    expect(DEFAULT_ROLE_PERMISSIONS.external_auditor.some(p => /edit|submit|approve|publish|admin/.test(p))).toBe(false)
  })
})

describe('route policy', () => {
  it.each([
    ['/iam', 'admin.users'],
    ['/admin/organization', 'admin.org'],
    ['/connectors', 'admin.org'],
    ['/modules/CN-SSE/review', 'approval.view'],
    ['/modules/CN-SSE/questionnaire', 'questionnaire.view'],
    ['/import', 'questionnaire.edit'],
    ['/period/create', 'report.build'],
    ['/publish/index', 'report.view'],
    ['/carbon/assets', 'analytics.view'],
    ['/executive', null],
  ])('%s needs %s', (path, perm) => expect(requiredPermission(path)).toBe(perm))

  it('keeps the executive overview open to a viewer and admin pages closed', () => {
    const viewer = person('v', 'read_only')
    expect(requiredPermission('/executive')).toBeNull()
    expect(can(viewer, requiredPermission('/iam')!)).toBe(false)
    expect(can(viewer, requiredPermission('/publish')!)).toBe(true)
  })
})

describe('invitations', () => {
  const now = new Date('2026-11-02T10:00:00Z')
  const members = [
    person('m', 'reviewer', { email: 'member@x.example' }),
    person('p', 'reviewer', { email: 'pending@x.example', status: 'invited', expiresAt: '2026-11-05T00:00:00Z' }),
    person('e', 'reviewer', { email: 'expired@x.example', status: 'invited', expiresAt: '2026-10-01T00:00:00Z' }),
  ]

  it('validates each row against the directory and the batch', () => {
    expect(
      validateInvites(
        ['new@x.example', 'not-an-email', 'MEMBER@x.example', 'pending@x.example', 'new@x.example', 'expired@x.example'],
        members,
        now,
      ),
    ).toEqual([null, 'invalid', 'member', 'invited', 'duplicate', null])
  })

  it('splits pasted lists, including Chinese punctuation', () => {
    expect(splitEmails('a@x.cn， b@y.cn；c@z.cn\nD@w.cn')).toEqual(['a@x.cn', 'b@y.cn', 'c@z.cn', 'd@w.cn'])
  })

  it('expires only invited members past their deadline', () => {
    expect(isExpired(members[1], now)).toBe(false)
    expect(isExpired(members[2], now)).toBe(true)
    expect(isExpired(members[0], now)).toBe(false)
  })
})

describe('administrator guard rails', () => {
  const owner = person('owner', 'platform_admin')
  const admin = person('admin', 'org_admin')
  const reviewer = person('rev', 'reviewer')
  const team = [owner, admin, reviewer]

  it('stops people changing themselves or anyone above them', () => {
    expect(checkMemberChange(admin, admin, team, undefined, 'reviewer')).toBe('self')
    expect(checkMemberChange(admin, owner, team, undefined, 'reviewer')).toBe('outranked')
    expect(checkMemberChange(admin, reviewer, team, undefined, 'platform_admin')).toBe('outranked')
    expect(checkMemberChange(admin, reviewer, team, undefined, 'approver')).toBeNull()
    expect(checkMemberChange(reviewer, admin, team, undefined)).toBe('forbidden')
  })

  it('always keeps one active administrator', () => {
    const solo = [admin, person('other', 'org_admin', { status: 'suspended' }), reviewer]
    const actor = person('owner2', 'platform_admin')
    expect(checkMemberChange(actor, admin, [...solo], undefined, 'reviewer')).toBe('lastAdmin')
    expect(checkMemberChange(actor, admin, [...solo, actor], undefined, 'reviewer')).toBeNull()
  })

  it('offers only roles at or below your own', () => {
    expect(assignableRoles(admin)).not.toContain('platform_admin')
    expect(assignableRoles(admin)).toContain('org_admin')
    expect(assignableRoles(owner)).toContain('platform_admin')
  })
})

describe('four-eyes rule', () => {
  it('blocks only the submitter, and only when enabled', () => {
    expect(blockedByFourEyes('u1', 'u1', true)).toBe(true)
    expect(blockedByFourEyes('u1', 'u2', true)).toBe(false)
    expect(blockedByFourEyes('u1', 'u1', false)).toBe(false)
    expect(blockedByFourEyes(undefined, 'u1', true)).toBe(false)
  })
})
