import { beforeEach, describe, expect, it } from 'vitest'
import { can } from './model'
import { findInvite, getSlice, hashPassword, membershipsOf, useAccessStore } from './store'

const admin = { ws: 'lvyuan', actorId: 'wangmin' }
const contributor = { ws: 'lvyuan', actorId: 'chengang' }
const store = () => useAccessStore.getState()
const slice = (ws = 'lvyuan') => getSlice(store(), ws)
const find = (email: string, ws = 'lvyuan') => slice(ws).members.find(m => m.email === email)

beforeEach(() => useAccessStore.setState({ workspaces: {} }))

describe('directory seed', () => {
  it('has an active administrator, a pending invitation and a suspended account in each workspace', () => {
    for (const ws of ['lvyuan', 'aeiforo']) {
      const members = slice(ws).members
      expect(members.some(m => m.role === 'org_admin' && m.status === 'active')).toBe(true)
      expect(members.some(m => m.status === 'invited' && m.token)).toBe(true)
      expect(members.some(m => m.status === 'suspended')).toBe(true)
      expect(members.every(m => m.email === m.email.toLowerCase())).toBe(true)
    }
  })

  it('keeps the demo admin a member of both workspaces', () => {
    expect(
      membershipsOf(store(), 'User1@Marklytics.co.uk')
        .map(m => m.ws)
        .sort(),
    ).toEqual(['aeiforo', 'lvyuan'])
  })
})

describe('invite → accept', () => {
  it('creates a pending member with a unique link that the invitee accepts', async () => {
    const r = store().invite(admin, [{ email: 'Xu.Lan@lvyuan-demo.example', role: 'reviewer', scope: ['CN-SSE'] }])
    expect(r.ok && r.value.errors).toEqual([null])
    const invited = find('xu.lan@lvyuan-demo.example')!
    expect(invited).toMatchObject({ status: 'invited', role: 'reviewer', scope: ['CN-SSE'], invitedBy: 'wangmin' })
    expect(invited.token).toMatch(/^[0-9a-f]{36}$/)
    expect(can(invited, 'questionnaire.view')).toBe(false)

    expect(findInvite(store(), invited.token!)).toMatchObject({ ws: 'lvyuan', member: { id: invited.id } })
    const hash = await hashPassword('s3cret-pass')
    const accepted = store().acceptInvite(invited.token!, { name: '许岚', passwordHash: hash })
    expect(accepted.ok).toBe(true)
    expect(find('xu.lan@lvyuan-demo.example')).toMatchObject({ status: 'active', name: '许岚', passwordHash: hash, token: undefined })
    expect(findInvite(store(), invited.token!)).toBeNull()
    expect(
      slice()
        .events.slice(0, 2)
        .map(e => e.kind),
    ).toEqual(['invite_accepted', 'invite'])
  })

  it('reports row errors without writing anything', () => {
    const before = slice().members.length
    const r = store().invite(admin, [
      { email: 'ok@lvyuan-demo.example', role: 'reviewer', scope: [] },
      { email: 'li.na@lvyuan-demo.example', role: 'reviewer', scope: [] },
    ])
    expect(r.ok && r.value.errors).toEqual([null, 'member'])
    expect(slice().members).toHaveLength(before)
  })

  it('refuses invitations from people who cannot manage users, or for roles above the inviter', () => {
    expect(store().invite(contributor, [{ email: 'a@b.cn', role: 'reviewer', scope: [] }])).toEqual({ ok: false, error: 'forbidden' })
    expect(store().invite(admin, [{ email: 'a@b.cn', role: 'platform_admin', scope: [] }])).toEqual({ ok: false, error: 'role' })
  })

  it('rejects expired links and lets an admin send a fresh one', () => {
    const pending = find('zhou.zihao@lvyuan-demo.example')!
    useAccessStore.setState({
      workspaces: {
        lvyuan: { ...slice(), members: slice().members.map(m => (m.id === pending.id ? { ...m, expiresAt: '2020-01-01T00:00:00Z' } : m)) },
      },
    })
    expect(store().acceptInvite(pending.token!, { name: '周子豪', passwordHash: 'x' })).toEqual({ ok: false, error: 'expired' })
    const resent = store().resendInvite(admin, pending.id)
    expect(resent.ok && resent.value.token).not.toBe(pending.token)
    expect(findInvite(store(), pending.token!)).toBeNull()
    expect(store().acceptInvite(resent.ok ? resent.value.token! : '', { name: '周子豪', passwordHash: 'x' }).ok).toBe(true)
  })

  it('revoking removes the invitation and kills the link', () => {
    const pending = find('zhou.zihao@lvyuan-demo.example')!
    expect(store().revokeInvite(admin, pending.id).ok).toBe(true)
    expect(find('zhou.zihao@lvyuan-demo.example')).toBeUndefined()
    expect(store().acceptInvite(pending.token!, { name: 'x', passwordHash: 'x' })).toEqual({ ok: false, error: 'notFound' })
  })
})

describe('managing members', () => {
  it('changes roles and logs the before and after', () => {
    expect(store().changeRole(admin, 'lina', 'approver').ok).toBe(true)
    expect(find('li.na@lvyuan-demo.example')?.role).toBe('approver')
    expect(slice().events[0]).toMatchObject({
      kind: 'role_changed',
      actorId: 'wangmin',
      target: 'lina',
      from: 'reviewer',
      role: 'approver',
    })
  })

  it('enforces the guard rails in the store, not just the UI', () => {
    expect(store().changeRole(admin, 'wangmin', 'reviewer')).toEqual({ ok: false, error: 'self' })
    expect(store().changeRole(admin, 'wanglixin', 'reviewer')).toEqual({ ok: false, error: 'outranked' })
    expect(store().setStatus(contributor, 'lina', 'suspended')).toEqual({ ok: false, error: 'forbidden' })
  })

  it('suspends and reactivates; a suspended member can do nothing', () => {
    expect(store().setStatus(admin, 'chengang', 'suspended').ok).toBe(true)
    expect(can(find('chen.gang@lvyuan-demo.example'), 'questionnaire.view')).toBe(false)
    expect(store().setStatus(admin, 'chengang', 'active').ok).toBe(true)
    expect(can(find('chen.gang@lvyuan-demo.example'), 'questionnaire.edit')).toBe(true)
  })

  it('applies permission matrix changes immediately and protects locked grants', () => {
    expect(can(find('li.na@lvyuan-demo.example'), 'evidence.upload', slice().permissions)).toBe(false)
    expect(store().setPermission(admin, 'reviewer', 'evidence.upload', true).ok).toBe(true)
    expect(can(find('li.na@lvyuan-demo.example'), 'evidence.upload', slice().permissions)).toBe(true)
    expect(store().setPermission(admin, 'org_admin', 'admin.users', false)).toEqual({ ok: false, error: 'locked' })
    expect(store().resetPermissions(admin).ok).toBe(true)
    expect(slice().permissions).toEqual({})
  })

  it('keeps workspaces isolated', () => {
    store().changeRole(admin, 'lina', 'approver')
    expect(slice('aeiforo').members.find(m => m.id === 'sana')?.role).toBe('reviewer')
    store().resetWorkspace('lvyuan')
    expect(find('li.na@lvyuan-demo.example')?.role).toBe('reviewer')
  })
})
