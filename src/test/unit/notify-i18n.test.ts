/**
 * notify(): recipient-locale rendering, users without email, legacy-phrase
 * translation, per-org IM delivery and pre-migration insert fallback.
 * Email sender and fetch are stubbed; the DB is a fake.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeFakeSql, type FakeSql } from './fake-sql'
import { encrypt } from '../../../api/_crypto'

const sendEmail = vi.fn(async (_p: { to: string; subject: string; html: string; text?: string }) => ({ ok: true }))
vi.mock('../../../api/_email', () => ({ sendEmail: (p: { to: string; subject: string; html: string; text?: string }) => sendEmail(p) }))

import { notify, renderNotification, renderNotificationEmail } from '../../../api/_notify'

let userLocale: string | null = null
let market: 'global' | 'cn' = 'global'
let imRows: unknown[] = []
let insertMode: 'ok' | 'old-schema' = 'ok'

function sql(): FakeSql {
  return makeFakeSql(q => {
    if (q.includes("->> 'locale'")) return [{ locale: userLocale }]
    if (q.startsWith('SELECT org_id, market')) return [{ org_id: 'org-a', market, ai_enabled: true }]
    if (q.startsWith('SELECT channel, webhook_url_enc')) return imRows
    if (q.startsWith('INSERT INTO notifications') && q.includes('message_key') && insertMode === 'old-schema') {
      throw new Error('column "message_key" of relation "notifications" does not exist')
    }
    return []
  })
}

beforeEach(() => {
  userLocale = null
  market = 'global'
  imRows = []
  insertMode = 'ok'
  sendEmail.mockClear()
  delete process.env.NOTIFY_IM_ORG_IDS
  delete process.env.DINGTALK_WEBHOOK_URL
})
afterEach(() => vi.unstubAllGlobals())

describe('renderNotification', () => {
  it('renders keyed messages per locale with $t refs and per-locale params', () => {
    const msg = {
      key: 'notify.assignment_created',
      params: { code: 'GRI 305-1', item: 'Direct emissions', due: '$t:common.tbd' },
      paramsByLocale: { zh: { item: '直接排放' } },
    }
    expect(renderNotification({ subject: 'x', message: msg }, 'en')).toEqual({ subject: 'New assignment · GRI 305-1', body: 'Direct emissions — due TBD', messageKey: 'notify.assignment_created' })
    expect(renderNotification({ subject: 'x', message: msg }, 'zh')).toEqual({ subject: '新任务 · GRI 305-1', body: '直接排放 — 截止日期 待定', messageKey: 'notify.assignment_created' })
  })

  it('English output for existing callers is unchanged', () => {
    const r = renderNotification({
      subject: 'ignored',
      message: { key: 'notify.assignment_bulk_created', params: { count: 1, framework: 'GRI', due: null }, bodyVariant: 'body' },
    }, 'en')
    expect(r.subject).toBe('1 GRI item assigned to you')
    expect(r.body).toBe("You've been assigned 1 disclosures. Open My Tasks to start entering data.")
    const s = renderNotification({ subject: 'x', message: { key: 'notify.status.rejected', params: { ref: 'A · B', comment: '$t:notify.status.rejected.body_default' } } }, 'en')
    expect(s).toMatchObject({ subject: 'Sent back · A · B', body: 'Please review and resubmit.' })
  })

  it('translates legacy fixed phrases and passes custom text through', () => {
    expect(renderNotification({ subject: 'Approval needed', body: 'A reviewed submission is ready for approval.' }, 'zh'))
      .toEqual({ subject: '待审批', body: '一项已审核的提交正在等待审批。', messageKey: null })
    expect(renderNotification({ subject: 'Custom', body: 'free text' }, 'zh')).toEqual({ subject: 'Custom', body: 'free text', messageKey: null })
  })

  it('email chrome follows the locale and escapes content', () => {
    const { html } = renderNotificationEmail({ subject: '<b>x</b>', body: 'y' }, 'https://n.example/my-tasks', 'zh')
    expect(html).toContain('lang="zh-CN"')
    expect(html).toContain('打开 Nexus')
    expect(html).toContain('可持续发展智能平台')
    expect(html).not.toContain('<b>x</b>')
  })
})

describe('notify()', () => {
  it('renders in the recipient locale (user.locale) and stores key + params', async () => {
    userLocale = 'zh'
    const s = sql()
    await notify({
      orgId: 'org-a', userId: '33333333-3333-4333-8333-333333333333', toEmail: 'Li@Example.cn', kind: 'approved',
      subject: 'Approved · X', body: 'fallback', route: '/my-tasks',
      message: { key: 'notify.status.approved', params: { ref: 'GRI 302-1' } },
    }, { sql: s as never })
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail.mock.calls[0][0].subject).toBe('已批准 · GRI 302-1')
    expect(sendEmail.mock.calls[0][0].html).toContain('打开 Nexus')
    const ins = s.calls.find(c => c.q.startsWith('INSERT INTO notifications'))!
    expect(ins.values).toContain('已批准 · GRI 302-1')
    expect(ins.values).toContain('notify.status.approved')
    expect(ins.values).toContain('zh')
    expect(ins.values).toContain('li@example.cn')
  })

  it('org market cn defaults recipients without a preference to Chinese', async () => {
    market = 'cn'
    const s = sql()
    await notify({ orgId: 'org-a', toEmail: 'a@b.cn', kind: 'review_requested', subject: 'Review requested', body: 'A submission is waiting on you.' }, { sql: s as never })
    expect(sendEmail.mock.calls[0][0].subject).toBe('待审核')
  })

  it('users without email still get the in-app row (no email attempt)', async () => {
    const s = sql()
    await notify({ orgId: 'org-a', userId: '44444444-4444-4444-8444-444444444444', toEmail: null, kind: 'mention', subject: 'S' }, { sql: s as never })
    expect(sendEmail).not.toHaveBeenCalled()
    const ins = s.calls.find(c => c.q.startsWith('INSERT INTO notifications'))!
    expect(ins.values[1]).toBe('44444444-4444-4444-8444-444444444444')
    expect(ins.values[2]).toBe('')
  })

  it('returns early only when there is neither an email nor a user id', async () => {
    const s = sql()
    await notify({ orgId: 'org-a', toEmail: '', kind: 'x', subject: 'S' }, { sql: s as never })
    expect(s.calls).toHaveLength(0)
  })

  it('falls back to the legacy insert before the schema migration', async () => {
    insertMode = 'old-schema'
    const s = sql()
    await notify({ orgId: 'org-a', toEmail: 'a@b.c', kind: 'x', subject: 'S' }, { sql: s as never })
    const inserts = s.calls.filter(c => c.q.startsWith('INSERT INTO notifications'))
    expect(inserts).toHaveLength(2)
    expect(inserts[1].q).not.toContain('message_key')
  })

  it('delivers to the org webhook with a localised link label', async () => {
    userLocale = 'en'
    imRows = [{ channel: 'wecom', webhook_url_enc: encrypt('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=k1'), secret_enc: null, enabled: true, kinds: null }]
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ errcode: 0 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await notify({ orgId: 'org-a', toEmail: 'a@b.c', kind: 'comment', subject: 'Hello', route: '/my-tasks' }, { sql: sql() as never })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body))
    expect(payload.markdown.content).toContain('[View in Nexus]')
  })
})
