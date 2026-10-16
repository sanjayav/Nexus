/**
 * Reporting period lifecycle → per-org reporting_year.
 *
 * Runs the real /api/org (create-period, transition-period) and
 * /api/reporting-year/active handlers against a fake, in-memory `sql` (no
 * database). The fake models reporting_periods and reporting_year closely
 * enough to behave like Postgres for the statements those paths issue,
 * including UNIQUE(organisation_id, year) with ON CONFLICT DO NOTHING and the
 * caller-org predicates — a statement that drops `organisation_id = …` /
 * `org_id = …` would match every org's rows here and the isolation tests fail.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DEMO_REPORTING_YEAR_ID, impliedYearStatus, nextYearStatus } from '../../../api/_periodYear'

type Token = { sub: string; org: string; email: string }
const tokens = {
  A: { sub: 'user-a', org: 'org-a', email: 'a@a.example' },
  B: { sub: 'user-b', org: 'org-b', email: 'b@b.example' },
  DEMO: { sub: 'user-demo', org: 'org-demo', email: 'admin@demo.example' },
} satisfies Record<string, Token>
type Who = keyof typeof tokens
let currentToken: Token = tokens.A

vi.mock('../../../api/_auth', () => ({
  cors: () => {},
  verifyToken: async () => currentToken,
  requirePermission: async () => currentToken,
}))
vi.mock('../../../api/_hashChain', () => ({ appendChainRecord: async () => ({ data_hash: '0xchain' }) }))
vi.mock('../../../api/_notify', () => ({ notify: async () => {} }))
vi.mock('../../../api/_audit', () => ({ audit: async () => {}, auditIp: () => null }))
vi.mock('../../../api/_orgSettings', () => ({ resolveRequestLocale: async () => 'en' }))

// ─── In-memory tables ─────────────────────────────────────────────────

interface Period {
  id: string; org_id: string; framework_id: string; year: number; label: string; status: string
  publish_hash: string | null; created_at: number
  reporting_year_id?: string | null
}
interface Year {
  id: string; organisation_id: string; year: number; status: string
  published_at: string | null; publish_hash: string | null
}

let periods: Period[]
let years: Year[]
let seq: number
/** Make the link column "not yet added" (pre-/api/setup database). */
let linkColumnMissing: boolean
/** Make the reporting_year INSERT fail. */
let failYearInsert: boolean

function resetDb() {
  seq = 0
  linkColumnMissing = false
  failYearInsert = false
  periods = []
  years = [
    // Demo org's seeded FY2026 year (api/setup.ts) — must never be modified.
    { id: DEMO_REPORTING_YEAR_ID, organisation_id: 'org-demo', year: 2026, status: 'active', published_at: null, publish_hash: null },
    // Org A already has its own years.
    { id: 'ry-a-2026', organisation_id: 'org-a', year: 2026, status: 'setup', published_at: null, publish_hash: null },
  ]
}

/** Value bound right after the SQL fragment ending in `marker`, if any. */
function param(strings: TemplateStringsArray, values: unknown[], marker: string): unknown {
  for (let i = 0; i < values.length; i++) {
    if (strings[i].replace(/\s+/g, ' ').trimEnd().endsWith(marker)) return values[i]
  }
  return undefined
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
/** Period ids must be UUIDs — transition-period validates them. */
const uuidOf = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function fakeSql(strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]> {
  const text = strings.join('?').replace(/\s+/g, ' ').trim()
  const p = (m: string) => param(strings, values, m)
  const run = (): unknown[] => {
    // ── reporting_periods ──
    if (text.startsWith('INSERT INTO reporting_periods')) {
      const [org_id, framework_id, year, label] = values as [string, string, number, string]
      let row = periods.find(r => r.org_id === org_id && r.framework_id === framework_id && r.year === Number(year))
      if (row) row.label = label
      else {
        row = { id: uuidOf(++seq), org_id, framework_id, year: Number(year), label, status: 'setup', publish_hash: null, created_at: seq }
        periods.push(row)
      }
      return [{ id: row.id }]
    }
    if (text.startsWith('UPDATE reporting_periods SET reporting_year_id')) {
      if (linkColumnMissing) throw Object.assign(new Error('column "reporting_year_id" does not exist'), { code: '42703' })
      const yid = values[0] as string
      for (const r of periods) {
        if (r.org_id === p('WHERE org_id =') && r.year === Number(p('AND year =')) && r.reporting_year_id !== yid) r.reporting_year_id = yid
      }
      return []
    }
    if (text.startsWith('UPDATE reporting_periods SET status')) {
      const r = periods.find(x => x.id === p('WHERE id =') && x.org_id === p('AND org_id ='))
      if (r) {
        if (text.includes("status = 'locked'")) r.status = 'locked'
        else if (text.includes("status = 'published'")) { r.status = 'published'; r.publish_hash = p('publish_hash =') as string }
        else r.status = values[0] as string
      }
      return []
    }
    if (text.startsWith('SELECT status FROM reporting_periods')) {
      return periods.filter(r => r.org_id === p('WHERE org_id =') && r.year === Number(p('AND year ='))).map(r => ({ status: r.status }))
    }
    if (/^SELECT .* FROM reporting_periods WHERE id = \? AND org_id = \?$/.test(text)) {
      return periods.filter(r => r.id === p('WHERE id =') && r.org_id === p('AND org_id =')).map(clone)
    }

    // ── reporting_year ──
    if (text.startsWith('INSERT INTO reporting_year')) {
      if (failYearInsert) throw new Error('boom')
      const [organisation_id, year, status] = values as [string, number, string]
      if (years.some(y => y.organisation_id === organisation_id && y.year === Number(year))) return [] // ON CONFLICT DO NOTHING
      const row: Year = { id: `ry-${++seq}`, organisation_id, year: Number(year), status, published_at: null, publish_hash: null }
      years.push(row)
      return [{ id: row.id, status: row.status }]
    }
    if (text.startsWith('UPDATE reporting_year')) {
      const y = years.find(r => r.id === p('WHERE id =') && r.organisation_id === p('AND organisation_id =') && r.status === p('AND status ='))
      if (!y) return []
      if (text.includes("SET status = 'published'")) {
        y.status = 'published'; y.published_at = 'now'; y.publish_hash = p('publish_hash =') as string | null
      } else {
        y.status = p('SET status =') as string
      }
      return [{ status: y.status }]
    }
    if (text.startsWith('SELECT id, status FROM reporting_year')) {
      return years.filter(y => y.organisation_id === p('WHERE organisation_id =') && y.year === Number(p('AND year ='))).slice(0, 1).map(y => ({ id: y.id, status: y.status }))
    }
    // /api/reporting-year/active
    if (text.startsWith('SELECT ry.id, ry.year, ry.status, rp.id AS period_id FROM reporting_year ry')) {
      const org = p('WHERE ry.organisation_id =') as string
      const rows: Array<{ id: string; year: number; status: string; period_id: string | null; pyear: number | null }> = []
      for (const y of years.filter(r => r.organisation_id === org && (r.status === 'active' || r.status === 'setup'))) {
        const matches = periods.filter(r => r.org_id === y.organisation_id && r.status === 'active'
          && (r.reporting_year_id != null && !linkColumnMissing ? r.reporting_year_id === y.id : r.year === y.year))
        if (matches.length === 0) rows.push({ id: y.id, year: y.year, status: y.status, period_id: null, pyear: null })
        for (const m of matches) rows.push({ id: y.id, year: y.year, status: y.status, period_id: m.id, pyear: m.year })
      }
      rows.sort((a, b) =>
        Number(b.period_id !== null) - Number(a.period_id !== null)
        || (b.pyear ?? -1) - (a.pyear ?? -1)
        || Number(b.status === 'active') - Number(a.status === 'active')
        || b.year - a.year)
      return rows.slice(0, 1).map(({ pyear: _pyear, ...r }) => r)
    }
    throw new Error(`fake sql: unhandled statement: ${text}`)
  }
  try { return Promise.resolve(run()) } catch (e) { return Promise.reject(e) }
}

vi.mock('../../../api/_db', () => ({ getDb: () => fakeSql }))

// ─── Request / response doubles ──────────────────────────────────────

function fakeRes() {
  const out = { statusCode: 0, body: undefined as unknown, headers: {} as Record<string, string> }
  const res = {
    setHeader(k: string, v: string) { out.headers[k.toLowerCase()] = v; return res },
    status(c: number) { out.statusCode = c; return res },
    json(b: unknown) { out.body = b; return res },
    send(b: unknown) { out.body = b; return res },
    end() { return res },
  }
  return { res, out }
}

type Out = { statusCode: number; body: any } // eslint-disable-line @typescript-eslint/no-explicit-any

async function org(as: Who, body: Record<string, unknown>): Promise<Out> {
  currentToken = tokens[as]
  const { default: handler } = await import('../../../api/org')
  const { res, out } = fakeRes()
  await handler({ method: 'POST', headers: {}, query: {}, body } as never, res as never)
  return out
}

async function active(as: Who): Promise<Out> {
  currentToken = tokens[as]
  const { default: handler } = await import('../../../api/reporting-year/active')
  const { res, out } = fakeRes()
  await handler({ method: 'GET', headers: {}, query: {} } as never, res as never)
  return out
}

const createPeriod = (as: Who, framework_id = 'gri', year = 2026) =>
  org(as, { action: 'create-period', framework_id, year, label: `FY${year}` })
const transition = (as: Who, id: string, status: string) =>
  org(as, { action: 'transition-period', id, status })
const yearsOf = (orgId: string) => years.filter(y => y.organisation_id === orgId)

beforeEach(resetDb)

// ─────────────────────────────────────────────────────────────────────

describe('create-period', () => {
  it('creates exactly one reporting_year for the caller org, linked to the period', async () => {
    const out = await createPeriod('B')
    expect(out.statusCode).toBe(201)
    expect(yearsOf('org-b')).toHaveLength(1)
    const [ry] = yearsOf('org-b')
    expect(ry).toMatchObject({ organisation_id: 'org-b', year: 2026, status: 'setup' })
    expect(periods.find(r => r.id === out.body.id)?.reporting_year_id).toBe(ry.id)
    expect(out.body.reporting_year).toEqual({ reporting_year_id: ry.id, year: 2026, status: 'setup', created: true, linked: true })
  })

  it('is idempotent: repeating it, or adding another framework for the same year, reuses the one year', async () => {
    const first = await createPeriod('B')
    const again = await createPeriod('B')
    const issb = await createPeriod('B', 'issb')
    expect(again.body.id).toBe(first.body.id)
    expect(yearsOf('org-b')).toHaveLength(1)
    expect(again.body.reporting_year.created).toBe(false)
    expect(issb.body.reporting_year.created).toBe(false)
    const ryId = yearsOf('org-b')[0].id
    expect(periods.filter(r => r.org_id === 'org-b').map(r => r.reporting_year_id)).toEqual([ryId, ryId])
  })

  it('a different year gets its own reporting_year', async () => {
    await createPeriod('B', 'gri', 2026)
    await createPeriod('B', 'gri', 2027)
    expect(yearsOf('org-b').map(y => y.year).sort()).toEqual([2026, 2027])
  })

  it('links to the org\'s existing year instead of creating one', async () => {
    const out = await createPeriod('A')
    expect(yearsOf('org-a')).toHaveLength(1)
    expect(out.body.reporting_year).toMatchObject({ reporting_year_id: 'ry-a-2026', created: false })
  })

  it('leaves other orgs\' years and periods untouched', async () => {
    await createPeriod('A', 'gri', 2025)
    const before = clone({ years: years.filter(y => y.organisation_id !== 'org-b'), periods: periods.filter(r => r.org_id !== 'org-b') })
    const out = await createPeriod('B')
    await transition('B', out.body.id, 'active')
    await transition('B', out.body.id, 'published')
    expect({ years: years.filter(y => y.organisation_id !== 'org-b'), periods: periods.filter(r => r.org_id !== 'org-b') }).toEqual(before)
  })

  it('still creates the year before /api/setup has added the link column', async () => {
    linkColumnMissing = true
    const out = await createPeriod('B')
    expect(out.statusCode).toBe(201)
    expect(yearsOf('org-b')).toHaveLength(1)
    expect(out.body.reporting_year).toMatchObject({ created: true, linked: false })
  })

  it('a failed year sync does not fail the (already written) period', async () => {
    failYearInsert = true
    const out = await createPeriod('B')
    expect(out.statusCode).toBe(201)
    expect(out.body).toMatchObject({ ok: true, reporting_year: null, reporting_year_error: 'boom' })
  })
})

describe('transition-period', () => {
  it('activating a period creates (once) and activates the org\'s year', async () => {
    const { body } = await createPeriod('B')
    years = years.filter(y => y.organisation_id !== 'org-b') // a period created before this change
    periods[0].reporting_year_id = null
    const a1 = await transition('B', body.id, 'active')
    const a2 = await transition('B', body.id, 'active')
    expect(yearsOf('org-b')).toHaveLength(1)
    expect(yearsOf('org-b')[0].status).toBe('active')
    expect(a1.body.reporting_year).toMatchObject({ status: 'active', created: true, linked: true })
    expect(a2.body.reporting_year).toMatchObject({ status: 'active', created: false })
  })

  it('locking keeps the year active; publishing the last open period publishes it', async () => {
    const gri = (await createPeriod('B', 'gri')).body.id
    const issb = (await createPeriod('B', 'issb')).body.id
    await transition('B', gri, 'active')
    await transition('B', issb, 'active')
    await transition('B', gri, 'locked')
    expect(yearsOf('org-b')[0].status).toBe('active')

    await transition('B', gri, 'published')
    expect(yearsOf('org-b')[0].status).toBe('active') // ISSB still open

    await transition('B', issb, 'published')
    expect(yearsOf('org-b')[0]).toMatchObject({ status: 'published', publish_hash: '0xchain', published_at: 'now' })
    expect(yearsOf('org-b')).toHaveLength(1)
  })

  it('never moves a year backwards and never reopens a published year', async () => {
    const id = (await createPeriod('B')).body.id
    await transition('B', id, 'active')
    await transition('B', id, 'setup')
    expect(yearsOf('org-b')[0].status).toBe('active')
    yearsOf('org-b')[0].status = 'published' // e.g. published through /api/workflow
    await transition('B', id, 'active')
    expect(yearsOf('org-b')[0].status).toBe('published')
  })

  it('closing a period never creates a year', async () => {
    const id = (await createPeriod('B')).body.id
    years = years.filter(y => y.organisation_id !== 'org-b')
    for (const status of ['published', 'archived']) {
      const out = await transition('B', id, status)
      expect(out.statusCode).toBe(200)
      expect(out.body.reporting_year).toBeNull()
    }
    expect(yearsOf('org-b')).toHaveLength(0)
  })

  it('cannot reach another org\'s period: no year is created or changed', async () => {
    const id = (await createPeriod('B')).body.id
    const before = clone(years)
    const out = await transition('A', id, 'active')
    expect(out.body.reporting_year).toBeNull()
    expect(years).toEqual(before)
    expect(periods[0].status).toBe('setup')
  })

  it('never modifies the demo org\'s seeded year (only links the period to it)', async () => {
    const demoBefore = clone(years.find(y => y.id === DEMO_REPORTING_YEAR_ID))
    const id = (await createPeriod('DEMO')).body.id
    await transition('DEMO', id, 'active')
    await transition('DEMO', id, 'published')
    expect(years.find(y => y.id === DEMO_REPORTING_YEAR_ID)).toEqual(demoBefore)
    expect(yearsOf('org-demo')).toHaveLength(1)
    expect(periods.find(r => r.id === id)?.reporting_year_id).toBe(DEMO_REPORTING_YEAR_ID)
  })
})

describe('GET /api/reporting-year/active', () => {
  it('404s for an org with no year, then returns the year created by activating a period', async () => {
    expect((await active('B')).statusCode).toBe(404)
    const id = (await createPeriod('B')).body.id
    await transition('B', id, 'active')
    const out = await active('B')
    expect(out.statusCode).toBe(200)
    expect(out.body).toEqual({ id: yearsOf('org-b')[0].id, year: 2026, status: 'active', period_id: id })
  })

  it('a setup period\'s year is already enough for data entry', async () => {
    await createPeriod('B')
    const out = await active('B')
    expect(out.body).toMatchObject({ id: yearsOf('org-b')[0].id, status: 'setup' })
  })

  it('prefers the active period\'s year over a newer open year', async () => {
    const p26 = (await createPeriod('B', 'gri', 2026)).body.id
    await createPeriod('B', 'gri', 2027)
    await transition('B', p26, 'active')
    expect((await active('B')).body).toMatchObject({ year: 2026, period_id: p26 })
  })

  it('only ever returns the caller org\'s year', async () => {
    const id = (await createPeriod('B')).body.id
    await transition('B', id, 'active')
    const a = await active('A')
    expect(a.body).toMatchObject({ id: 'ry-a-2026', period_id: null })
  })

  it('a published year is not a data-entry target', async () => {
    const id = (await createPeriod('B')).body.id
    await transition('B', id, 'active')
    await transition('B', id, 'published')
    expect((await active('B')).statusCode).toBe(404)
  })
})

describe('status mapping', () => {
  it('impliedYearStatus', () => {
    expect(impliedYearStatus([])).toBeNull()
    expect(impliedYearStatus(['archived'])).toBeNull()
    expect(impliedYearStatus(['setup'])).toBe('setup')
    expect(impliedYearStatus(['setup', 'active'])).toBe('active')
    expect(impliedYearStatus(['locked'])).toBe('active')
    expect(impliedYearStatus(['published', 'setup'])).toBe('active')
    expect(impliedYearStatus(['published', 'archived'])).toBe('published')
  })
  it('nextYearStatus is monotonic', () => {
    expect(nextYearStatus('setup', 'active')).toBe('active')
    expect(nextYearStatus('active', 'setup')).toBe('active')
    expect(nextYearStatus('published', 'active')).toBe('published')
    expect(nextYearStatus('active', null)).toBe('active')
  })
})
