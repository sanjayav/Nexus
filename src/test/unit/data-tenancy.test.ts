/**
 * Cross-tenant access to data values outside /api/workflow:
 *   api/_propagate.ts, api/blockchain (trail / hash / emit),
 *   api/concept-mappings (override), api/footnotes.
 *
 * Same technique as workflow-tenancy.test.ts: the real handlers run against an
 * in-memory fake `sql` that answers like Postgres for the queries it knows. A
 * query only gets tenant-filtered when it carries the ownership predicate
 * (DATA_VALUE_OWNER_EXPR) or — for the pre-fix footnotes code — the
 * reporting-year predicate `ry.organisation_id = <org>`. Unscoped queries see
 * every row, so the pre-fix code leaks / writes across tenants and fails here.
 *
 * Fixture: org A owns the shared reporting year `ry-shared` (the demo year the
 * client used to hard-code for everyone); org B has legacy values in it and
 * its own year `ry-b`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DATA_VALUE_OWNER_EXPR } from '../../../api/_tenancy'

type Token = { sub: string; org: string; email: string }
const tokens: Record<'A' | 'B', Token> = {
  A: { sub: 'user-a', org: 'org-a', email: 'a@a.example' },
  B: { sub: 'user-b', org: 'org-b', email: 'b@b.example' },
}
let currentToken: Token = tokens.A

vi.mock('../../../api/_auth', () => ({
  cors: () => {},
  verifyToken: async () => currentToken,
  // Model the worst case: the caller holds every permission. Tenancy must still hold.
  requirePermission: async () => currentToken,
}))
vi.mock('../../../api/_workflow', () => ({
  emitAuditEvent: async (_sql: unknown, p: { dataValueId: string }) => {
    writes.push(`audit_event:${p.dataValueId}`)
    return { previousHash: '0x0', newHash: '0xabc' }
  },
  getPlatformRole: async () => 'admin',
}))

// ─── In-memory fixture ───────────────────────────────────────────────

interface Dv {
  id: string; entered_by: string | null; reporting_year_id: string; status: string
  questionnaire_item_id: string; value: number; unit: string | null
  facility_id: string | null; scope_key: string | null
  org_id: string | null; derived_from: string | null; is_overridden: boolean; value_hash: string
}
interface Fn { id: string; data_value_id: string; footnote_text: string; created_by: string; created_at: string }

let users: Record<string, { org_id: string }>
let years: Record<string, { organisation_id: string }>
let dvs: Record<string, Dv>
let footnotes: Record<string, Fn>
let auditEvents: Array<{ id: string; data_value_id: string; event_type: string }>
let writes: string[]

const mappings = [
  { questionnaire_item_id: 'qi-src', concept_key: 'ghg', framework_id: 'gri', unit_conversion: 1 },
  { questionnaire_item_id: 'qi-peer', concept_key: 'ghg', framework_id: 'esrs', unit_conversion: 1000 },
]

function dv(id: string, entered_by: string | null, ry: string, qi: string, value: number, extra: Partial<Dv> = {}): Dv {
  return {
    id, entered_by, reporting_year_id: ry, status: 'approved', questionnaire_item_id: qi, value, unit: 't',
    facility_id: null, scope_key: null, org_id: null, derived_from: null, is_overridden: false, value_hash: `0x${id}`,
    ...extra,
  }
}

function resetDb() {
  users = { 'user-a': { org_id: 'org-a' }, 'user-b': { org_id: 'org-b' } }
  years = { 'ry-shared': { organisation_id: 'org-a' }, 'ry-b': { organisation_id: 'org-b' } }
  dvs = Object.fromEntries([
    dv('dv-a', 'user-a', 'ry-shared', 'qi-src', 100),
    dv('dv-b', 'user-b', 'ry-shared', 'qi-src', 200),          // B's legacy value in A's year
    dv('dv-b-peer', 'user-b', 'ry-shared', 'qi-peer', 7),      // B's peer value in A's year
    dv('dv-b2', 'user-b', 'ry-b', 'qi-src', 300),              // B's value in B's own year
    // Entered by A's user in A's year, but stamped for org B → B's (org_id wins).
    dv('dv-stamped', 'user-a', 'ry-shared', 'qi-other', 1, { org_id: 'org-b' }),
  ].map(r => [r.id, r]))
  footnotes = {
    'fn-a': { id: 'fn-a', data_value_id: 'dv-a', footnote_text: 'A note', created_by: 'user-a', created_at: '1' },
    'fn-b': { id: 'fn-b', data_value_id: 'dv-b', footnote_text: 'B confidential', created_by: 'user-b', created_at: '2' },
    // Written by A onto B's value through the pre-fix year-only check.
    'fn-x': { id: 'fn-x', data_value_id: 'dv-b', footnote_text: 'A on B', created_by: 'user-a', created_at: '3' },
  }
  auditEvents = [
    { id: 'ae-a', data_value_id: 'dv-a', event_type: 'approved' },
    { id: 'ae-b', data_value_id: 'dv-b', event_type: 'approved' },
  ]
  writes = []
}

const ownerOrg = (r: Dv) => r.org_id ?? (r.entered_by ? users[r.entered_by]?.org_id : undefined) ?? years[r.reporting_year_id]?.organisation_id

// ─── Fake sql ─────────────────────────────────────────────────────────

const norm = (s: string) => s.replace(/\s+/g, ' ')
const OWNER = norm(`${DATA_VALUE_OWNER_EXPR} =`)

/** Value bound right after the SQL fragment ending in `marker`, if any. */
function param(strings: TemplateStringsArray, values: unknown[], marker: string): unknown {
  for (let i = 0; i < values.length; i++) {
    if (norm(strings[i]).trimEnd().endsWith(marker)) return values[i]
  }
  return undefined
}

/** Tenant filter carried by the query: ownership predicate and/or year-only predicate. */
function scope(strings: TemplateStringsArray, values: unknown[]) {
  const owner = param(strings, values, OWNER) as string | undefined
  const yearOrg = param(strings, values, 'ry.organisation_id =') as string | undefined
  return (r: Dv | undefined) => !!r
    && (owner === undefined || ownerOrg(r) === owner)
    && (yearOrg === undefined || years[r.reporting_year_id]?.organisation_id === yearOrg)
}

function fakeSql(strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]> {
  const text = norm(strings.join('?')).trim()
  const visible = scope(strings, values)
  const p = (m: string) => param(strings, values, m)

  // ── writes ──
  if (/^(UPDATE|INSERT|DELETE)/i.test(text)) {
    if (text.startsWith('UPDATE data_value SET org_id')) {
      const r = dvs[p('WHERE id =') as string]
      if (r && r.org_id == null) { r.org_id = values[0] as string; writes.push(`stamp:${r.id}:${r.org_id}`) }
      return Promise.resolve([])
    }
    if (text.startsWith('UPDATE data_value SET is_overridden = true')) {
      const r = dvs[p('WHERE id =') as string]
      if (!r) return Promise.resolve([])
      r.is_overridden = true
      writes.push(`override:${r.id}`)
      return Promise.resolve([{ id: r.id, is_overridden: true, derived_from: r.derived_from }])
    }
    if (text.startsWith('UPDATE data_value SET value =')) {
      const r = dvs[p('WHERE id =') as string]
      if (r) { r.value = values[0] as number; r.derived_from = values[1] as string; writes.push(`update:${r.id}`) }
      return Promise.resolve([])
    }
    if (text.startsWith('INSERT INTO data_value')) {
      // propagate: (qi, year, facility, scope_key, value, unit, …, derived_from)
      const id = `dv-new-${Object.keys(dvs).length}`
      dvs[id] = dv(id, null, values[1] as string, values[0] as string, values[4] as number, {
        facility_id: values[2] as string | null, scope_key: values[3] as string | null, derived_from: values[6] as string,
      })
      writes.push(`insert:${id}`)
      return Promise.resolve([{ id }])
    }
    if (text.startsWith('INSERT INTO xbrl_footnotes')) {
      const f: Fn = { id: `fn-new-${writes.length}`, data_value_id: values[0] as string, footnote_text: values[1] as string, created_by: values[2] as string, created_at: '9' }
      footnotes[f.id] = f
      writes.push(`footnote:${f.id}`)
      return Promise.resolve([f])
    }
    if (text.startsWith('DELETE FROM xbrl_footnotes')) {
      const f = footnotes[p('f.id =') as string]
      const by = p('f.created_by =') as string | undefined
      if (!f || (by !== undefined && f.created_by !== by) || !visible(dvs[f.data_value_id])) return Promise.resolve([])
      delete footnotes[f.id]
      writes.push(`delete-footnote:${f.id}`)
      return Promise.resolve([{ id: f.id }])
    }
    writes.push(text)
    return Promise.resolve([])
  }

  // ── reads ──
  if (text.includes('FROM concept_mappings')) {
    const qi = p('questionnaire_item_id =') as string | undefined
    const ck = p('concept_key =') as string | undefined
    const not = p('questionnaire_item_id !=') as string | undefined
    return Promise.resolve(mappings.filter(m =>
      (qi === undefined || m.questionnaire_item_id === qi)
      && (ck === undefined || m.concept_key === ck)
      && (not === undefined || m.questionnaire_item_id !== not)))
  }
  if (text.includes('FROM audit_event')) {
    const id = p('ae.data_value_id =') as string
    return Promise.resolve(visible(dvs[id]) ? auditEvents.filter(e => e.data_value_id === id) : [])
  }
  if (text.includes('FROM xbrl_footnotes')) {
    const id = p('f.data_value_id =') as string
    return Promise.resolve(Object.values(footnotes).filter(f => f.data_value_id === id))
  }
  if (text.includes('FROM data_value')) {
    const id = (p('dv.id =') ?? p('WHERE id =')) as string | undefined
    if (id) return Promise.resolve(visible(dvs[id]) ? [{ ...dvs[id] }] : [])
    const qi = (p('questionnaire_item_id =')) as string | undefined
    const ry = (p('reporting_year_id =')) as string | undefined
    if (qi && ry) {
      const fac = p('facility_id IS NOT DISTINCT FROM') ?? null
      const sk = p('scope_key IS NOT DISTINCT FROM') ?? null
      return Promise.resolve(Object.values(dvs)
        .filter(r => r.questionnaire_item_id === qi && r.reporting_year_id === ry && r.facility_id === fac && r.scope_key === sk)
        .filter(visible)
        .slice(0, 1)
        .map(r => ({ id: r.id, is_overridden: r.is_overridden })))
    }
  }
  return Promise.resolve([])
}

vi.mock('../../../api/_db', () => ({ getDb: () => fakeSql }))

// ─── Request / response doubles ──────────────────────────────────────

function fakeRes() {
  const out = { statusCode: 0, body: undefined as unknown }
  const res = {
    setHeader() { return res },
    status(c: number) { out.statusCode = c; return res },
    json(b: unknown) { out.body = b; return res },
    send(b: unknown) { out.body = b; return res },
    end() { return res },
  }
  return { res, out }
}

type Req = { method: 'GET' | 'POST' | 'DELETE'; query?: Record<string, string>; body?: Record<string, unknown>; url?: string }
async function call(mod: () => Promise<{ default: (req: never, res: never) => unknown }>, as: 'A' | 'B', req: Req) {
  currentToken = tokens[as]
  const { default: handler } = await mod()
  const { res, out } = fakeRes()
  await handler({ headers: {}, query: {}, ...req } as never, res as never)
  return out
}
const blockchain = () => import('../../../api/blockchain/index')
const conceptMappings = () => import('../../../api/concept-mappings')
const footnotesApi = () => import('../../../api/footnotes')

// Fixed v4 UUIDs: concept-mappings / footnotes validate ids with zod .uuid().
const UUID: Record<string, string> = {
  'dv-a': '00000000-0000-4000-8000-00000000000a',
  'dv-b': '00000000-0000-4000-8000-00000000000b',
}
function withUuids() {
  for (const [name, uuid] of Object.entries(UUID)) {
    dvs[uuid] = { ...dvs[name], id: uuid }
    for (const f of Object.values(footnotes)) if (f.data_value_id === name) f.data_value_id = uuid
    for (const e of auditEvents) if (e.data_value_id === name) e.data_value_id = uuid
    delete dvs[name]
  }
}

beforeEach(resetDb)

// ═════════════════════════════════════════════════════════════════════

describe('propagateApprovedValue', () => {
  const run = async (id: string, org: string) => {
    const { propagateApprovedValue } = await import('../../../api/_propagate')
    return propagateApprovedValue(fakeSql as never, id, org)
  }

  it('never overwrites another org\'s peer value in a shared reporting year', async () => {
    const r = await run('dv-a', 'org-a')
    expect(dvs['dv-b-peer'].value).toBe(7)
    expect(dvs['dv-b-peer'].derived_from).toBeNull()
    expect(writes).not.toContain('update:dv-b-peer')
    // A gets its own derived peer row, stamped for A.
    expect(r).toMatchObject({ inserted: 1, updated: 0 })
    const created = Object.values(dvs).find(d => d.derived_from === 'dv-a')!
    expect(created).toMatchObject({ questionnaire_item_id: 'qi-peer', reporting_year_id: 'ry-shared', value: 100000, org_id: 'org-a' })
  })

  it('does not propagate a legacy value that sits in another org\'s reporting year', async () => {
    const r = await run('dv-b', 'org-b')
    expect(r).toMatchObject({ inserted: 0, updated: 0 })
    expect(writes).toEqual([])
  })

  it('does nothing when the source value belongs to another org', async () => {
    const r = await run('dv-b2', 'org-a')
    expect(r).toMatchObject({ inserted: 0, updated: 0, conceptKey: null })
    expect(writes).toEqual([])
  })

  it('propagates within the caller org\'s own year and stamps org_id', async () => {
    const r = await run('dv-b2', 'org-b')
    expect(r).toMatchObject({ inserted: 1 })
    const created = Object.values(dvs).find(d => d.derived_from === 'dv-b2')!
    expect(created).toMatchObject({ reporting_year_id: 'ry-b', org_id: 'org-b' })
  })
})

describe('GET /api/blockchain view=trail / view=hash', () => {
  it('trail of another org\'s value is empty; own trail is returned', async () => {
    const foreign = await call(blockchain, 'B', { method: 'GET', query: { view: 'trail', data_value_id: 'dv-a' } })
    expect(foreign.statusCode).toBe(200)
    expect(foreign.body).toEqual([])
    const own = await call(blockchain, 'A', { method: 'GET', query: { view: 'trail', data_value_id: 'dv-a' } })
    expect((own.body as Array<{ id: string }>).map(e => e.id)).toEqual(['ae-a'])
  })

  it('hash of another org\'s value is a 404', async () => {
    const foreign = await call(blockchain, 'B', { method: 'GET', query: { view: 'hash', data_value_id: 'dv-a' } })
    expect(foreign.statusCode).toBe(404)
    const own = await call(blockchain, 'A', { method: 'GET', query: { view: 'hash', data_value_id: 'dv-a' } })
    expect(own.statusCode).toBe(200)
    expect(own.body).toMatchObject({ value_hash: '0xdv-a' })
  })

  it('the reporting-year owner cannot read the trail of another org\'s value in that year', async () => {
    const out = await call(blockchain, 'A', { method: 'GET', query: { view: 'trail', data_value_id: 'dv-b' } })
    expect(out.body).toEqual([])
  })

  it('data_value.org_id takes precedence over the entering user and the year', async () => {
    const a = await call(blockchain, 'A', { method: 'GET', query: { view: 'hash', data_value_id: 'dv-stamped' } })
    expect(a.statusCode).toBe(404)
    const b = await call(blockchain, 'B', { method: 'GET', query: { view: 'hash', data_value_id: 'dv-stamped' } })
    expect(b.statusCode).toBe(200)
  })

  it('action=emit on another org\'s value is a 404 and appends nothing', async () => {
    const out = await call(blockchain, 'B', { method: 'POST', body: { action: 'emit', data_value_id: 'dv-a', event_type: 'approved' } })
    expect(out.statusCode).toBe(404)
    expect(writes).toEqual([])
  })
})

describe('POST /api/concept-mappings override', () => {
  beforeEach(withUuids)

  it('cannot lock another org\'s value', async () => {
    const out = await call(conceptMappings, 'B', { method: 'POST', body: { action: 'override', data_value_id: UUID['dv-a'] } })
    expect(out.statusCode).toBe(404)
    expect(dvs[UUID['dv-a']].is_overridden).toBe(false)
    expect(writes).toEqual([])
  })

  it('cannot lock another org\'s value in the caller\'s own reporting year', async () => {
    const out = await call(conceptMappings, 'A', { method: 'POST', body: { action: 'override', data_value_id: UUID['dv-b'] } })
    expect(out.statusCode).toBe(404)
    expect(dvs[UUID['dv-b']].is_overridden).toBe(false)
  })

  it('locks the caller org\'s own value', async () => {
    const out = await call(conceptMappings, 'A', { method: 'POST', body: { action: 'override', data_value_id: UUID['dv-a'] } })
    expect(out.statusCode).toBe(200)
    expect(dvs[UUID['dv-a']].is_overridden).toBe(true)
  })
})

describe('/api/footnotes', () => {
  beforeEach(withUuids)

  it('GET: the reporting-year owner cannot read footnotes on another org\'s value', async () => {
    const out = await call(footnotesApi, 'A', { method: 'GET', query: { data_value_id: UUID['dv-b'] } })
    expect(out.statusCode).toBe(404)
  })

  it('GET: the value\'s owner can read its footnotes even in another org\'s year', async () => {
    const out = await call(footnotesApi, 'B', { method: 'GET', query: { data_value_id: UUID['dv-b'] } })
    expect(out.statusCode).toBe(200)
    expect((out.body as { footnotes: Fn[] }).footnotes.map(f => f.id)).toContain('fn-b')
  })

  it('POST: cannot annotate another org\'s value', async () => {
    const out = await call(footnotesApi, 'A', { method: 'POST', body: { data_value_id: UUID['dv-b'], footnote_text: 'x' } })
    expect(out.statusCode).toBe(404)
    expect(writes).toEqual([])
  })

  it('DELETE: a footnote on another org\'s value cannot be deleted, even by its author', async () => {
    const out = await call(footnotesApi, 'A', { method: 'DELETE', query: { id: 'fn-x' } })
    expect(out.statusCode).toBe(404)
    expect(footnotes['fn-x']).toBeDefined()
  })

  it('DELETE: the owner deletes its own footnote on a value in another org\'s year', async () => {
    const out = await call(footnotesApi, 'B', { method: 'DELETE', query: { id: 'fn-b' } })
    expect(out.statusCode).toBe(200)
    expect(footnotes['fn-b']).toBeUndefined()
  })
})
