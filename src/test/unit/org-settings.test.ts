/**
 * /api/org-settings and api/_orgSettings.ts — defaults for orgs without a
 * row, validation, admin gating and audit logging. DB/auth/audit are stubbed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeSql, mockReq, mockRes, type FakeSql } from './fake-sql'

let fakeSql: FakeSql
let storedRow: Record<string, unknown> | null = null
const requirePermission = vi.fn()
const auditFn = vi.fn()

vi.mock('../../../api/_db', () => ({ getDb: () => fakeSql }))
vi.mock('../../../api/_auth', () => ({
  cors: () => {},
  requirePermission: (...args: unknown[]) => requirePermission(...args),
  verifyToken: async () => ({ sub: '11111111-1111-4111-8111-111111111111', org: 'org-a', email: 'a@x.test' }),
}))
vi.mock('../../../api/_audit', () => ({ audit: (...a: unknown[]) => auditFn(...a), auditIp: () => '127.0.0.1' }))

const TOKEN = { sub: '11111111-1111-4111-8111-111111111111', org: 'org-a', email: 'a@x.test', permissions: new Set(['admin.org']), roleSlugs: new Set(['admin']) }

beforeEach(() => {
  storedRow = null
  requirePermission.mockReset()
  auditFn.mockReset()
  requirePermission.mockImplementation(async (_req: unknown, _res: unknown, ...perms: string[]) => {
    if (perms.includes('admin.org') && process.env.__DENY_ADMIN === '1') {
      ;(_res as { status: (n: number) => { json: (b: unknown) => void } }).status(403).json({ error: 'Forbidden' })
      return null
    }
    return TOKEN
  })
  delete process.env.__DENY_ADMIN
  fakeSql = makeFakeSql((q, values) => {
    if (q.startsWith('SELECT org_id, market')) return storedRow ? [storedRow] : []
    if (q.startsWith('INSERT INTO org_settings')) {
      const [org_id, market, data_residency_region, icp_number, mlps_level, cross_border_status, ai_enabled, ai_provider, timezone, currency, fiscal_year_end, listing_venues, updated_by] = values
      storedRow = { org_id, market, data_residency_region, icp_number, mlps_level, cross_border_status, ai_enabled, ai_provider, timezone, currency, fiscal_year_end, listing_venues, updated_at: '2026-10-16T00:00:00Z', updated_by }
      return [storedRow]
    }
    return []
  })
})

async function call(method: string, body?: unknown) {
  const { default: handler } = await import('../../../api/org-settings')
  const res = mockRes()
  await handler(mockReq({ method, body }), res)
  return res
}

describe('GET /api/org-settings', () => {
  it('returns pre-Phase-4 defaults when the org has no row (nothing auto-enabled)', async () => {
    const res = await call('GET')
    expect(res.statusCode).toBe(200)
    const b = res.body as { settings: Record<string, unknown>; stored: boolean; effective: Record<string, unknown>; ai: Record<string, unknown> }
    expect(b.stored).toBe(false)
    expect(b.settings.market).toBe('global')
    expect(b.settings.ai_enabled).toBe(true)
    expect(b.settings.ai_provider).toBeNull()
    expect(b.effective).toMatchObject({ default_locale: 'en', timezone: 'UTC', fiscal_year_end: '12-31', ai_provider: 'anthropic' })
    expect(b.ai.provider).toBe('anthropic')
    // No write happened on read.
    expect(fakeSql.calls.some(c => /INSERT|UPDATE/.test(c.q))).toBe(false)
  })

  it('derives China defaults for market cn', async () => {
    storedRow = { org_id: 'org-a', market: 'cn', ai_enabled: true, ai_provider: null, mlps_level: '3', listing_venues: ['SSE'] }
    const b = (await call('GET')).body as { settings: Record<string, unknown>; effective: Record<string, unknown> }
    expect(b.settings.mlps_level).toBe(3)
    expect(b.effective).toMatchObject({ default_locale: 'zh', timezone: 'Asia/Shanghai', currency: 'CNY', ai_provider: 'openai_compatible' })
  })
})

describe('PUT /api/org-settings', () => {
  it('requires admin.org', async () => {
    process.env.__DENY_ADMIN = '1'
    const res = await call('PUT', { market: 'cn' })
    expect(res.statusCode).toBe(403)
    expect(requirePermission.mock.calls[0].slice(2)).toEqual(['admin.org'])
    expect(auditFn).not.toHaveBeenCalled()
  })

  it('rejects unknown keys and malformed values', async () => {
    expect((await call('PUT', { market: 'mars' })).statusCode).toBe(400)
    expect((await call('PUT', { surprise: true })).statusCode).toBe(400)
    expect((await call('PUT', { icp_number: 'ABC123' })).statusCode).toBe(400)
    expect((await call('PUT', { mlps_level: 6 })).statusCode).toBe(400)
    expect((await call('PUT', { timezone: 'Mars/Olympus' })).statusCode).toBe(400)
    expect((await call('PUT', { fiscal_year_end: '13-01' })).statusCode).toBe(400)
    expect(auditFn).not.toHaveBeenCalled()
  })

  it('upserts, returns effective values and audit-logs a field diff', async () => {
    const res = await call('PUT', {
      market: 'cn',
      icp_number: '京ICP备12345678号-1',
      mlps_level: 3,
      cross_border_status: 'standard_contract',
      ai_enabled: false,
      timezone: 'Asia/Shanghai',
      currency: 'CNY',
      listing_venues: ['SSE', 'HKEX'],
    })
    expect(res.statusCode).toBe(200)
    const b = res.body as { settings: Record<string, unknown>; ai: { enabled: boolean; disabled_reason: string }; changes: Record<string, unknown> }
    expect(b.settings.market).toBe('cn')
    expect(b.settings.ai_enabled).toBe(false)
    expect(b.ai.enabled).toBe(false)
    expect(b.ai.disabled_reason).toBe('organisation')
    expect(Object.keys(b.changes).sort()).toEqual(
      ['ai_enabled', 'cross_border_status', 'currency', 'icp_number', 'listing_venues', 'market', 'mlps_level', 'timezone'].sort(),
    )
    expect(auditFn).toHaveBeenCalledTimes(1)
    const a = auditFn.mock.calls[0][0] as { action: string; orgId: string; details: { changes: Record<string, { from: unknown; to: unknown }>; created: boolean } }
    expect(a.action).toBe('org_settings.update')
    expect(a.orgId).toBe('org-a')
    expect(a.details.created).toBe(true)
    expect(a.details.changes.market).toEqual({ from: 'global', to: 'cn' })
  })

  it('merges a partial patch over the stored row', async () => {
    storedRow = { org_id: 'org-a', market: 'cn', ai_enabled: true, ai_provider: null, icp_number: '沪ICP证123456号' }
    const res = await call('PUT', { ai_provider: 'anthropic' })
    const b = res.body as { settings: Record<string, unknown>; changes: Record<string, unknown> }
    expect(b.settings.market).toBe('cn')
    expect(b.settings.icp_number).toBe('沪ICP证123456号')
    expect(b.settings.ai_provider).toBe('anthropic')
    expect(Object.keys(b.changes)).toEqual(['ai_provider'])
  })
})

describe('locale resolution helpers', () => {
  it('resolveRequestLocale: user.locale beats header; header beats market default', async () => {
    const { resolveRequestLocale } = await import('../../../api/_orgSettings')
    let userLocale: string | null = 'th'
    fakeSql = makeFakeSql(q => {
      if (q.includes("->> 'locale'")) return [{ locale: userLocale }]
      if (q.startsWith('SELECT org_id, market')) return [{ org_id: 'org-a', market: 'cn', ai_enabled: true }]
      return []
    })
    const req = mockReq({ headers: { 'accept-language': 'en-GB' } })
    expect(await resolveRequestLocale(fakeSql as never, req, TOKEN)).toBe('th')
    userLocale = null
    expect(await resolveRequestLocale(fakeSql as never, req, TOKEN)).toBe('en')
    expect(await resolveRequestLocale(fakeSql as never, mockReq({}), TOKEN)).toBe('zh')
    // API-key actors have no user row.
    expect(await resolveRequestLocale(fakeSql as never, mockReq({}), { sub: 'apikey:abc', org: 'org-a' })).toBe('zh')
  })

  it('falls back to defaults when the table does not exist yet', async () => {
    const { loadOrgSettings } = await import('../../../api/_orgSettings')
    const broken = makeFakeSql(() => { throw new Error('relation "org_settings" does not exist') })
    const s = await loadOrgSettings(broken as never, 'org-z')
    expect(s).toMatchObject({ org_id: 'org-z', market: 'global', ai_enabled: true, stored: false })
  })
})
