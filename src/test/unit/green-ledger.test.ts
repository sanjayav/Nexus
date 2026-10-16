/**
 * Green power / carbon-credit ledger: totals maths, validation and the
 * /api/green-certificates endpoint (DB stubbed).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeSql, mockReq, mockRes, type FakeSql } from './fake-sql'
import {
  mwhInYear,
  computeLedgerTotals,
  creditYear,
  certificateCreateSchema,
  creditCreateSchema,
  CN_RESIDUAL_FACTOR_KG_PER_KWH,
} from '../../../api/_greenLedger'

describe('ledger maths', () => {
  it('pro-rates certificate MWh by days inside the year', () => {
    expect(mwhInYear({ instrument_type: 'gec', mwh: 365, period_start: '2025-01-01', period_end: '2025-12-31' }, 2025)).toBeCloseTo(365)
    expect(mwhInYear({ instrument_type: 'gec', mwh: 100, period_start: '2025-07-01', period_end: '2026-06-30' }, 2025)).toBeCloseTo(100 * 184 / 365)
    expect(mwhInYear({ instrument_type: 'gec', mwh: 100, period_start: '2024-01-01', period_end: '2024-12-31' }, 2025)).toBe(0)
  })

  it('computes market-based Scope 2 and the CN-SSE climate figures', () => {
    const t = computeLedgerTotals({
      year: 2025,
      certificates: [
        { instrument_type: 'gec', mwh: '400', period_start: '2025-01-01', period_end: '2025-12-31' },
        { instrument_type: 'green_power_trade', mwh: 100, period_start: new Date('2025-01-01'), period_end: new Date('2025-12-31') },
      ],
      credits: [
        { standard: 'CCER', tco2e: '120', vintage: 2024, retired: true, retired_on: '2025-06-01', reporting_year: null },
        { standard: 'VCS', tco2e: 30, vintage: 2023, retired: true, retired_on: null, reporting_year: 2025 },
        { standard: 'CCER', tco2e: 999, vintage: 2024, retired: false, retired_on: null, reporting_year: 2025 },
        { standard: 'GS', tco2e: 5, vintage: 2022, retired: true, retired_on: '2024-03-01', reporting_year: null },
      ],
      purchasedMwh: 2000,
      residualFactorKgPerKwh: CN_RESIDUAL_FACTOR_KG_PER_KWH,
    })
    expect(t.certificates).toEqual({ total_mwh: 500, by_type: { gec: 400, green_power_trade: 100 } })
    expect(t.credits).toMatchObject({ retired_tco2e: 150, ccer_retired_tco2e: 120, by_standard: { CCER: 120, VCS: 30 }, by_vintage: { '2024': 120, '2023': 30 } })
    expect(t.market_based_scope2).toMatchObject({ purchased_mwh: 2000, applied_certified_mwh: 500, residual_mwh: 1500, residual_factor_kg_per_kwh: 0.6096, market_based_tco2e: 914.4 })
    expect(t.cn_sse_climate).toEqual({ carbon_credits_retired_tco2e: 150, ccer_retired_tco2e: 120, green_certificate_mwh: 400, green_power_trade_mwh: 100, renewable_share_pct: 25 })
  })

  it('caps certified MWh at purchased MWh and skips tCO2e without a factor', () => {
    const t = computeLedgerTotals({ year: 2025, certificates: [{ instrument_type: 'gec', mwh: 50, period_start: '2025-01-01', period_end: '2025-12-31' }], credits: [], purchasedMwh: 20 })
    expect(t.market_based_scope2).toMatchObject({ applied_certified_mwh: 20, residual_mwh: 0, market_based_tco2e: null })
    expect(t.cn_sse_climate.renewable_share_pct).toBe(100)
    expect(computeLedgerTotals({ year: 2025, certificates: [], credits: [] }).market_based_scope2.purchased_mwh).toBeNull()
    expect(creditYear({ standard: 'CCER', tco2e: 1, vintage: null, retired: true, retired_on: null, reporting_year: null })).toBeNull()
  })

  it('validates inputs', () => {
    expect(certificateCreateSchema.safeParse({ kind: 'eac', instrument_type: 'gec', mwh: 1, period_start: '2025-02-01', period_end: '2025-01-01' }).success).toBe(false)
    expect(certificateCreateSchema.safeParse({ kind: 'eac', instrument_type: 'gec', mwh: -1, period_start: '2025-01-01', period_end: '2025-01-31' }).success).toBe(false)
    expect(certificateCreateSchema.safeParse({ kind: 'eac', instrument_type: 'gec', mwh: 10, period_start: '2025-01-01', period_end: '2025-01-31', certificate_id: 'GEC-1' }).success).toBe(true)
    expect(creditCreateSchema.safeParse({ kind: 'credit', standard: 'CCER', tco2e: 10, vintage: 2024, registry_id: 'CCER-001' }).success).toBe(true)
    expect(creditCreateSchema.safeParse({ kind: 'credit', standard: 'XYZ', tco2e: 10 }).success).toBe(false)
  })
})

let fakeSql: FakeSql
const auditFn = vi.fn()
let perms = ['data.view', 'data.upload']
vi.mock('../../../api/_db', () => ({ getDb: () => fakeSql }))
vi.mock('../../../api/_audit', () => ({ audit: (...a: unknown[]) => auditFn(...a), auditIp: () => null }))
vi.mock('../../../api/_auth', () => ({
  cors: () => {},
  requirePermission: async (_r: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }, ...need: string[]) => {
    if (!need.every(p => perms.includes(p))) { res.status(403).json({ error: 'Forbidden', required: need }); return null }
    return { sub: '66666666-6666-4666-8666-666666666666', org: 'org-a', email: 'a@b.c', permissions: new Set(perms), roleSlugs: new Set() }
  },
}))

describe('/api/green-certificates', () => {
  beforeEach(() => {
    perms = ['data.view', 'data.upload']
    auditFn.mockReset()
    fakeSql = makeFakeSql(q => {
      if (q.startsWith('SELECT id, instrument_type')) return [{ id: 'c1', instrument_type: 'gec', mwh: '400', period_start: new Date('2025-01-01T00:00:00Z'), period_end: new Date('2025-12-31T00:00:00Z') }]
      if (q.startsWith('SELECT id, standard')) return [{ id: 'k1', standard: 'CCER', tco2e: '120', vintage: 2024, retired: true, retired_on: '2025-06-01', reporting_year: null }]
      if (q.startsWith('SELECT org_id, market')) return [{ org_id: 'org-a', market: 'cn', ai_enabled: true }]
      if (q.includes('FROM activity_data')) return [{ mwh: '2000', n: '12' }]
      if (q.startsWith('INSERT INTO energy_attribute_certificates')) return [{ id: 'new-cert', instrument_type: 'gec', mwh: '10', period_start: '2025-01-01', period_end: '2025-01-31' }]
      if (q.startsWith('INSERT INTO carbon_credits')) return [{ id: 'new-credit', standard: 'CCER', tco2e: '10', retired_on: null }]
      if (q.startsWith('UPDATE carbon_credits SET is_active = false')) return [{ id: 'k1' }]
      return []
    })
  })

  async function call(init: { method: string; query?: Record<string, string>; body?: unknown }) {
    const { default: handler } = await import('../../../api/green-certificates')
    const res = mockRes()
    await handler(mockReq(init), res)
    return res
  }

  it('lists the year with totals; cn orgs get the MEE residual factor by default', async () => {
    const res = await call({ method: 'GET', query: { year: '2025' } })
    expect(res.statusCode).toBe(200)
    const b = res.body as { certificates: Array<{ mwh: number; period_start: string }>; totals: { market_based_scope2: Record<string, unknown>; cn_sse_climate: Record<string, unknown> } }
    expect(b.certificates[0]).toMatchObject({ mwh: 400, period_start: '2025-01-01' })
    expect(b.totals.market_based_scope2).toMatchObject({ purchased_mwh: 2000, residual_factor_kg_per_kwh: 0.6096, market_based_tco2e: 975.36 })
    expect(b.totals.cn_sse_climate).toMatchObject({ ccer_retired_tco2e: 120, green_certificate_mwh: 400, renewable_share_pct: 20 })
    const totals = await call({ method: 'GET', query: { year: '2025', view: 'totals', purchased_mwh: '1000', residual_factor: '0.5' } })
    expect((totals.body as { market_based_scope2: Record<string, unknown> }).market_based_scope2).toMatchObject({ purchased_mwh: 1000, market_based_tco2e: 300 })
  })

  it('creates certificates and credits with audit entries', async () => {
    const c = await call({ method: 'POST', body: { kind: 'eac', instrument_type: 'gec', mwh: 10, period_start: '2025-01-01', period_end: '2025-01-31', certificate_id: 'GEC-2025-0001' } })
    expect(c.statusCode).toBe(201)
    const k = await call({ method: 'POST', body: { kind: 'credit', standard: 'CCER', tco2e: 10, vintage: 2024 } })
    expect(k.statusCode).toBe(201)
    expect(auditFn.mock.calls.map(a => (a[0] as { action: string }).action)).toEqual(['green_certificate.create', 'carbon_credit.create'])
    expect((await call({ method: 'POST', body: { kind: 'other' } })).statusCode).toBe(400)
    expect((await call({ method: 'POST', body: { kind: 'eac', instrument_type: 'gec', mwh: 0, period_start: '2025-01-01', period_end: '2025-01-31' } })).statusCode).toBe(400)
  })

  it('soft-deletes and enforces data.upload for writes', async () => {
    expect((await call({ method: 'DELETE', query: { kind: 'credit', id: '77777777-7777-4777-8777-777777777777' } })).statusCode).toBe(200)
    expect(fakeSql.calls.some(c => c.q.startsWith('DELETE'))).toBe(false)
    perms = ['data.view']
    expect((await call({ method: 'POST', body: { kind: 'credit', standard: 'CCER', tco2e: 1 } })).statusCode).toBe(403)
    expect((await call({ method: 'GET', query: { year: '2025' } })).statusCode).toBe(200)
  })
})
