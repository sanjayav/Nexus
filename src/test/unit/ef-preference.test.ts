/**
 * China grid factors (2023 MEE/NBS values) and the org-market preference
 * rule used by GET /api/emission-factors.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeSql, mockReq, mockRes, type FakeSql } from './fake-sql'
import {
  CN_EMISSION_FACTORS,
  CN_GRID_MARKET_BASED,
  CN_GRID_FOSSIL_ONLY,
  sortFactorsByPreference,
  isOfficialCnSource,
  isUnverifiedFactor,
  type RankableFactor,
} from '../../../api/_efCnFactors'

const IEA: RankableFactor = { scope: 2, category: 'purchased_electricity', fuel_or_activity: 'Grid electricity', region: 'CN', source: 'IEA Emissions Factors 2024', valid_from: '2024-01-01', notes: 'China grid average' }
const MEE_2022: RankableFactor = { ...IEA, source: 'MEE 环办气候函〔2023〕43号 — national grid average emission factor', valid_from: '2022-01-01', notes: '0.5703' }
const MEE_2023: RankableFactor = { ...IEA, source: 'MEE/NBS 关于发布2023年电力二氧化碳排放因子的公告', valid_from: '2023-01-01', notes: '0.5306' }
const UK: RankableFactor = { ...IEA, region: 'UK', source: 'DESNZ 2024', valid_from: '2024-01-01', notes: null }

describe('CN factor seed rows', () => {
  it('adds the verified 2023 national, residual and fossil-only factors with the MEE source URL', () => {
    const pick = (fa: string, region = 'CN') => CN_EMISSION_FACTORS.find(r => r[3] === fa && r[4] === region && r[11] === '2023')!
    expect(pick('Grid electricity')[6]).toBe(0.5306)
    expect(pick(CN_GRID_MARKET_BASED)[6]).toBe(0.6096)
    expect(pick(CN_GRID_FOSSIL_ONLY)[6]).toBe(0.8273)
    for (const fa of ['Grid electricity', CN_GRID_MARKET_BASED, CN_GRID_FOSSIL_ONLY]) {
      expect(pick(fa)[13]).toContain('https://www.mee.gov.cn/ywdt/zbft/202601/t20260105_1139911.shtml')
      expect(pick(fa)[13]).not.toContain('[unverified]')
    }
    expect(pick('Grid electricity', 'CN-SOUTHWEST')[6]).toBe(0.2472)
    expect(pick('Grid electricity', 'CN-NORTH')[6]).toBe(0.6361)
  })

  it('keeps the existing 0.5703 MEE row and has unique conflict keys', () => {
    expect(CN_EMISSION_FACTORS.some(r => r[6] === 0.5703 && r[11] === '2022')).toBe(true)
    const keys = CN_EMISSION_FACTORS.map(r => [r[0], r[1], r[3], r[4], r[10], r[11], r[12]].join('|'))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('market-based and fossil-only rows sort after the location-based row', () => {
    expect(['Grid electricity', CN_GRID_FOSSIL_ONLY, CN_GRID_MARKET_BASED].sort()[0]).toBe('Grid electricity')
  })
})

describe('sortFactorsByPreference', () => {
  it('China-market orgs prefer the newest official MEE factor over IEA for CN', () => {
    const out = sortFactorsByPreference([IEA, MEE_2023, MEE_2022, UK], 'cn')
    expect(out.map(r => r.source)).toEqual([MEE_2023.source, MEE_2022.source, IEA.source, UK.source])
    expect(out.filter(r => r.preferred).map(r => r.source)).toEqual([MEE_2023.source, UK.source])
  })

  it('global orgs keep the previous ordering (newest first)', () => {
    const out = sortFactorsByPreference([IEA, MEE_2023, MEE_2022], 'global')
    expect(out[0].source).toBe(IEA.source)
    expect(out[0].preferred).toBe(true)
  })

  it('never prefers an [unverified] row', () => {
    const unv = { ...MEE_2023, valid_from: '2025-01-01', notes: '[unverified] draft value' }
    const out = sortFactorsByPreference([unv, MEE_2023], 'cn')
    expect(out[0]).toMatchObject({ source: MEE_2023.source, preferred: true })
    expect(out[1].preferred).toBe(false)
    expect(isUnverifiedFactor(unv)).toBe(true)
    const only = sortFactorsByPreference([unv], 'cn')
    expect(only[0].preferred).toBe(false)
  })

  it('recognises official China sources', () => {
    expect(isOfficialCnSource('MEE/NBS 关于发布2023年电力二氧化碳排放因子的公告')).toBe(true)
    expect(isOfficialCnSource('GB/T 32150-2015 / MEE industry GHG accounting guidelines')).toBe(true)
    expect(isOfficialCnSource('IEA Emissions Factors 2024')).toBe(false)
  })
})

let fakeSql: FakeSql
let market = 'global'
vi.mock('../../../api/_db', () => ({ getDb: () => fakeSql }))
vi.mock('../../../api/_auth', () => ({
  cors: () => {},
  verifyToken: async () => ({ sub: 'u', org: 'org-a', email: 'a@b.c' }),
  requirePermission: async () => null,
}))

describe('GET /api/emission-factors', () => {
  beforeEach(() => {
    fakeSql = makeFakeSql(q => {
      if (q.startsWith('SELECT id, scope, category')) return [IEA, MEE_2023, MEE_2022].map((r, i) => ({ id: `ef${i}`, ...r }))
      if (q.startsWith('SELECT org_id, market')) return [{ org_id: 'org-a', market, ai_enabled: true }]
      return []
    })
  })

  async function get(query: Record<string, string> = {}) {
    const { default: handler } = await import('../../../api/emission-factors')
    const res = mockRes()
    await handler(mockReq({ method: 'GET', query }), res)
    return res.body as Array<{ id: string; preferred: boolean }>
  }

  it('flags and orders the preferred row for the org market', async () => {
    market = 'cn'
    const rows = await get({ region: 'CN' })
    expect(rows[0]).toMatchObject({ id: 'ef1', preferred: true })
    market = 'global'
    expect((await get())[0]).toMatchObject({ id: 'ef0', preferred: true })
    market = 'cn'
    expect((await get({ preferred_only: '1' })).map(r => r.id)).toEqual(['ef1'])
  })
})
