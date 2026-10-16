/**
 * Per-org IM webhooks: /api/org-webhooks CRUD + test-send, and the
 * org-first / env-fallback resolution in api/_notifyChannels.ts.
 * fetch, DB, auth and audit are stubbed — no network, no database.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeFakeSql, mockReq, mockRes, type FakeSql } from './fake-sql'
import { encrypt, decrypt } from '../../../api/_crypto'
import {
  loadOrgImConfig,
  imConfigFromOrgRows,
  maskWebhookUrl,
  rowForwardsKind,
  type OrgChannelRow,
} from '../../../api/_notifyChannels'

let fakeSql: FakeSql
const auditFn = vi.fn()
let deny = false

vi.mock('../../../api/_db', () => ({ getDb: () => fakeSql }))
vi.mock('../../../api/_audit', () => ({ audit: (...a: unknown[]) => auditFn(...a), auditIp: () => null }))
vi.mock('../../../api/_auth', () => ({
  cors: () => {},
  requirePermission: async (_req: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }, ...perms: string[]) => {
    if (deny || !perms.includes('admin.org')) { res.status(403).json({ error: 'Forbidden' }); return null }
    return { sub: '22222222-2222-4222-8222-222222222222', org: 'org-a', email: 'admin@x.test', permissions: new Set(perms), roleSlugs: new Set() }
  },
}))

const DING = 'https://oapi.dingtalk.com/robot/send?access_token=abcdef123456'
const FEISHU = 'https://open.feishu.cn/open-apis/bot/v2/hook/0f0f0f0f-1111-2222-3333-444455556666'

type Row = Record<string, unknown>
let rows: Row[] = []

beforeEach(() => {
  deny = false
  rows = []
  auditFn.mockReset()
  fakeSql = makeFakeSql((q, v) => {
    if (q.startsWith('INSERT INTO org_notify_channels')) {
      const [org_id, channel, label, webhook_url_enc, webhook_hint, secret_enc, enabled, kinds] = v
      const existing = rows.find(r => r.org_id === org_id && r.channel === channel)
      const row = { id: existing?.id ?? `9${rows.length}000000-0000-4000-8000-000000000000`.slice(0, 36), org_id, channel, label, webhook_url_enc, webhook_hint, secret_enc, enabled, kinds, last_test_at: null, last_test_ok: null, last_test_error: null, created_at: 'now', updated_at: 'now' }
      if (existing) Object.assign(existing, row); else rows.push(row)
      return [existing ?? row]
    }
    if (q.startsWith('SELECT id, channel, label, webhook_url_enc') && q.includes('ORDER BY channel')) return rows.filter(r => r.org_id === v[0])
    if (q.startsWith('SELECT id, channel, webhook_url_enc') || q.startsWith('SELECT id, channel, label, webhook_url_enc')) return rows.filter(r => r.id === v[0] && r.org_id === v[1])
    if (q.startsWith('SELECT channel, webhook_url_enc')) return rows.filter(r => r.org_id === v[0])
    if (q.startsWith('SELECT name FROM organisations')) return [{ name: '绿源新材料' }]
    if (q.startsWith('UPDATE org_notify_channels SET last_test_at')) {
      const r = rows.find(x => x.id === v[2])
      if (r) Object.assign(r, { last_test_ok: v[0], last_test_error: v[1] })
      return []
    }
    if (q.startsWith('UPDATE org_notify_channels SET label')) {
      const r = rows.find(x => x.id === v[7])!
      Object.assign(r, { label: v[0], webhook_url_enc: v[1], webhook_hint: v[2], secret_enc: v[3], enabled: v[4], kinds: v[5] })
      return [r]
    }
    if (q.startsWith('DELETE FROM org_notify_channels')) {
      const i = rows.findIndex(r => r.id === v[0] && r.org_id === v[1])
      if (i < 0) return []
      const [r] = rows.splice(i, 1)
      return [{ channel: r.channel }]
    }
    if (q.includes("->> 'locale'")) return [{ locale: null }]
    if (q.startsWith('SELECT org_id, market')) return []
    return []
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function call(init: { method: string; query?: Record<string, string>; body?: unknown; headers?: Record<string, string> }) {
  const { default: handler } = await import('../../../api/org-webhooks')
  const res = mockRes()
  await handler(mockReq(init), res)
  return res
}

describe('/api/org-webhooks', () => {
  it('requires admin.org', async () => {
    deny = true
    expect((await call({ method: 'GET' })).statusCode).toBe(403)
  })

  it('stores URL and secret encrypted and never returns them', async () => {
    const res = await call({ method: 'POST', body: { channel: 'dingtalk', webhook_url: DING, secret: 'SECabc', kinds: ['assignment_created'] } })
    expect(res.statusCode).toBe(201)
    const stored = rows[0]
    expect(stored.webhook_url_enc).not.toContain('abcdef')
    expect(decrypt(stored.webhook_url_enc as string)).toBe(DING)
    expect(decrypt(stored.secret_enc as string)).toBe('SECabc')
    const body = res.body as { channel: Record<string, unknown> }
    expect(JSON.stringify(body)).not.toContain('abcdef123456')
    expect(JSON.stringify(body)).not.toContain('SECabc')
    expect(body.channel).toMatchObject({ channel: 'dingtalk', has_secret: true, webhook_hint: 'oapi.dingtalk.com/…3456', kinds: ['assignment_created'] })
    const list = (await call({ method: 'GET' })).body as { channels: Array<Record<string, unknown>>; env_fallback_active: boolean }
    expect(list.channels).toHaveLength(1)
    expect(Object.keys(list.channels[0])).not.toContain('webhook_url_enc')
    // Audit records the change without the credential.
    expect(JSON.stringify(auditFn.mock.calls)).not.toContain('abcdef123456')
    expect(auditFn.mock.calls[0][0]).toMatchObject({ action: 'org_webhook.upsert', resourceType: 'org_notify_channel' })
  })

  it('rejects non-official hosts, plain http and WeCom secrets', async () => {
    expect((await call({ method: 'POST', body: { channel: 'dingtalk', webhook_url: 'https://evil.example/robot/send?access_token=x' } })).statusCode).toBe(400)
    expect((await call({ method: 'POST', body: { channel: 'feishu', webhook_url: 'http://open.feishu.cn/open-apis/bot/v2/hook/x' } })).statusCode).toBe(400)
    expect((await call({ method: 'POST', body: { channel: 'wecom', webhook_url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=k', secret: 'nope' } })).statusCode).toBe(400)
    expect((await call({ method: 'POST', body: { channel: 'slack', webhook_url: DING } })).statusCode).toBe(400)
    expect(rows).toHaveLength(0)
  })

  it('updates, clears the secret and deletes', async () => {
    await call({ method: 'POST', body: { channel: 'feishu', webhook_url: FEISHU, secret: 's1' } })
    const id = rows[0].id as string
    const upd = await call({ method: 'PUT', query: { id }, body: { secret: null, enabled: false } })
    expect(upd.statusCode).toBe(200)
    expect((upd.body as { channel: { has_secret: boolean; enabled: boolean } }).channel).toMatchObject({ has_secret: false, enabled: false })
    expect((await call({ method: 'DELETE', query: { id } })).statusCode).toBe(200)
    expect(rows).toHaveLength(0)
    expect((await call({ method: 'DELETE', query: { id } })).statusCode).toBe(404)
  })

  it('test-send posts a signed message in the caller language via (stubbed) fetch and records the result', async () => {
    await call({ method: 'POST', body: { channel: 'dingtalk', webhook_url: DING, secret: 'SECabc', enabled: false } })
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ errcode: 0, errmsg: 'ok' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await call({ method: 'POST', query: { action: 'test', id: rows[0].id as string }, headers: { 'accept-language': 'zh-CN' } })
    expect(res.body).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/^https:\/\/oapi\.dingtalk\.com\/robot\/send\?access_token=abcdef123456&timestamp=\d+&sign=/)
    const payload = JSON.parse(String(init.body))
    expect(payload.markdown.title).toBe('Nexus 测试消息')
    expect(payload.markdown.text).toContain('钉钉群机器人已连接到 绿源新材料')
    expect(rows[0].last_test_ok).toBe(true)
  })

  it('test-send records provider errors', async () => {
    await call({ method: 'POST', body: { channel: 'dingtalk', webhook_url: DING } })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ errcode: 310000, errmsg: 'sign not match' }), { status: 200 })))
    const res = await call({ method: 'POST', query: { action: 'test', id: rows[0].id as string } })
    expect((res.body as { ok: boolean; error: string }).ok).toBe(false)
    expect(rows[0].last_test_ok).toBe(false)
    expect(String(rows[0].last_test_error)).toContain('310000')
  })
})

describe('per-org config first, env fallback', () => {
  const env = {
    DINGTALK_WEBHOOK_URL: 'https://oapi.dingtalk.com/robot/send?access_token=ENV',
    NOTIFY_IM_ORG_IDS: 'org-a',
  }
  const row = (over: Partial<OrgChannelRow> = {}): OrgChannelRow => ({
    channel: 'feishu', webhook_url_enc: encrypt(FEISHU), secret_enc: null, enabled: true, kinds: null, ...over,
  })

  it('uses the org rows when present and ignores env', async () => {
    const sql = makeFakeSql(() => [row()])
    const r = await loadOrgImConfig(sql as never, 'org-a', 'comment', env)
    expect(r.source).toBe('org')
    expect(r.config.feishu?.webhookUrl).toBe(FEISHU)
    expect(r.config.dingtalk).toBeUndefined()
  })

  it('a disabled org row is not overridden by env', async () => {
    const sql = makeFakeSql(() => [row({ enabled: false })])
    const r = await loadOrgImConfig(sql as never, 'org-a', 'comment', env)
    expect(r).toEqual({ source: 'none', config: {} })
  })

  it('falls back to env with NOTIFY_IM_ORG_IDS semantics when the org has no rows', async () => {
    const none = makeFakeSql(() => [])
    expect((await loadOrgImConfig(none as never, 'org-a', 'comment', env)).source).toBe('env')
    expect((await loadOrgImConfig(none as never, 'org-b', 'comment', env)).source).toBe('none')
    expect((await loadOrgImConfig(none as never, 'org-a', 'comment', { ...env, NOTIFY_IM_KINDS: 'mention' })).source).toBe('none')
    // Table missing (pre-migration) behaves like "no rows".
    const broken = makeFakeSql(() => { throw new Error('relation does not exist') })
    expect((await loadOrgImConfig(broken as never, 'org-a', 'comment', env)).source).toBe('env')
  })

  it('applies per-row kinds filters and skips undecryptable rows', () => {
    expect(rowForwardsKind(null, 'x')).toBe(true)
    expect(rowForwardsKind(['a'], 'x')).toBe(false)
    const cfg = imConfigFromOrgRows([row({ kinds: ['mention'] }), row({ channel: 'dingtalk', webhook_url_enc: 'garbage' })], 'comment')
    expect(cfg).toEqual({})
    expect(maskWebhookUrl('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=zzzz9876')).toBe('qyapi.weixin.qq.com/…9876')
  })
})
