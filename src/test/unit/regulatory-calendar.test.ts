/**
 * Regulatory calendar engine (api/_regCalendar.ts) and endpoint.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeSql, mockReq, mockRes, type FakeSql } from './fake-sql'
import { buildCalendar, dueDateFor, CALENDAR_RULES, daysBetween, todayIn } from '../../../api/_regCalendar'

const rule = (id: string) => CALENDAR_RULES.find(r => r.id === id)!

describe('deadline rules', () => {
  it('CN exchanges: 30 April after the FY; HKEX / CSRD: four months after FY end', () => {
    expect(dueDateFor(rule('cn-exchange-sustainability-report'), 2026, '12-31')).toBe('2027-04-30')
    expect(dueDateFor(rule('hkex-esg-report'), 2026, '12-31')).toBe('2027-04-30')
    expect(dueDateFor(rule('hkex-esg-report'), 2026, '03-31')).toBe('2026-07-31')
    expect(dueDateFor(rule('csrd-sustainability-statement'), 2026, '06-30')).toBe('2026-10-31')
    expect(dueDateFor(rule('cn-env-information-disclosure'), 2025, '12-31')).toBe('2026-03-15')
  })

  it('national carbon market and CDP never get an invented date', () => {
    expect(dueDateFor(rule('cn-national-carbon-market'), 2026, '12-31')).toBeNull()
    expect(dueDateFor(rule('cdp-disclosure-cycle'), 2026, '12-31')).toBeNull()
  })

  it('date helpers', () => {
    expect(daysBetween('2026-10-16', '2027-04-30')).toBe(196)
    expect(todayIn('Asia/Shanghai', new Date('2026-10-16T20:00:00Z'))).toBe('2026-10-17')
  })
})

describe('buildCalendar', () => {
  const base = { today: '2026-10-16', fiscalYearEnd: '12-31', enabledFrameworks: [] as string[] }

  it('picks the next upcoming fiscal year and localises text', () => {
    const items = buildCalendar({ ...base, locale: 'zh' })
    const cn = items.find(i => i.id.startsWith('cn-exchange-sustainability-report'))!
    expect(cn).toMatchObject({ fiscal_year: 2026, due_date: '2027-04-30', status: 'upcoming', days_until: 196 })
    expect(cn.title).toBe('2026 年度可持续发展报告随年报披露（沪深北交易所）')
    expect(cn.detail).toContain('2027 年 4 月 30 日')
    const ets = items.find(i => i.id.startsWith('cn-national-carbon-market'))!
    expect(ets).toMatchObject({ due_date: null, status: 'no_fixed_date', due_note: '以生态环境部年度通知为准' })
  })

  it('English notice wording for the carbon market', () => {
    const ets = buildCalendar({ ...base, locale: 'en' }).find(i => i.id.startsWith('cn-national-carbon-market'))!
    expect(ets.due_note).toBe('Per MEE annual notice')
    expect(ets.title).toMatch(/National carbon market/)
  })

  it('shows a just-missed deadline as overdue for up to 30 days', () => {
    const items = buildCalendar({ ...base, today: '2027-05-10', locale: 'en' })
    const cn = items.find(i => i.id.startsWith('cn-exchange-sustainability-report'))!
    expect(cn).toMatchObject({ fiscal_year: 2026, status: 'overdue', days_until: -10 })
  })

  it('highlights enabled frameworks and listing venues first; filters by region', () => {
    const items = buildCalendar({ ...base, locale: 'en', enabledFrameworks: ['csrd-e1', 'issb-s2'], listingVenues: ['HKEX'] })
    const hi = items.filter(i => i.highlighted).map(i => i.region)
    expect(hi.sort()).toEqual(['EU', 'GLOBAL', 'HK'])
    expect(items[0].highlighted).toBe(true)
    expect(items.findIndex(i => !i.highlighted)).toBe(3)
    const onlyCn = buildCalendar({ ...base, locale: 'en', regions: ['CN'] })
    expect(onlyCn.every(i => i.region === 'CN')).toBe(true)
    expect(buildCalendar({ ...base, locale: 'en', fiscalYear: 2030 })[0].fiscal_year).toBe(2030)
  })
})

let fakeSql: FakeSql
vi.mock('../../../api/_db', () => ({ getDb: () => fakeSql }))
vi.mock('../../../api/_auth', () => ({
  cors: () => {},
  requirePermission: async () => ({ sub: 'apikey:x', org: 'org-a', email: '', permissions: new Set(), roleSlugs: new Set() }),
}))

describe('GET /api/regulatory-calendar', () => {
  beforeEach(() => {
    fakeSql = makeFakeSql(q => {
      if (q.startsWith('SELECT org_id, market')) return [{ org_id: 'org-a', market: 'cn', ai_enabled: true, listing_venues: ['SSE'] }]
      if (q.startsWith('SELECT framework_id FROM org_framework_enablement')) return [{ framework_id: 'cn-sse' }]
      return []
    })
  })

  it('returns zh items for a cn org with the exchange report highlighted', async () => {
    const { default: handler } = await import('../../../api/regulatory-calendar')
    const res = mockRes()
    await handler(mockReq({ method: 'GET', query: { region: 'CN,HK' } }), res)
    const b = res.body as { items: Array<{ id: string; highlighted: boolean; region: string }>; timezone: string; locale: string; enabled_frameworks: string[] }
    expect(res.statusCode).toBe(200)
    expect(b.timezone).toBe('Asia/Shanghai')
    expect(b.locale).toBe('zh')
    expect(b.enabled_frameworks).toEqual(['cn-sse'])
    expect(b.items[0].id).toMatch(/^cn-exchange-sustainability-report/)
    expect(b.items[0].highlighted).toBe(true)
    expect(b.items.every(i => i.region === 'CN' || i.region === 'HK')).toBe(true)
  })
})
