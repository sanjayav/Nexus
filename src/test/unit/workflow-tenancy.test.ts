/**
 * Cross-tenant access to evidence and data values through /api/workflow.
 *
 * Runs the real handler against a fake, in-memory `sql` (no database). The
 * fake behaves like Postgres would for the queries it recognises: it returns
 * the row for an id unless the query carries the tenancy predicate
 * (DATA_VALUE_OWNER_EXPR in api/_tenancy.ts)
 *   COALESCE((to_jsonb(dv) ->> 'org_id')::uuid, eu.org_id, ry.organisation_id) = <org>
 * in which case it applies it. So an unscoped query (the pre-fix code) leaks
 * the foreign row and these tests fail; the scoped query hides it.
 *
 * Fixture: org A and org B share one reporting year owned by org A — exactly
 * the production shape, because the client posts a single hard-coded
 * reporting_year_id for every tenant. That's why scoping on the reporting
 * year alone would still let org A read org B's evidence.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateHeaderValue } from 'node:http'

type Token = { sub: string; org: string; email: string }
const tokens: Record<'A' | 'B', Token> = {
  A: { sub: 'user-a', org: 'org-a', email: 'a@a.example' },
  B: { sub: 'user-b', org: 'org-b', email: 'b@b.example' },
}
let currentToken: Token = tokens.A

vi.mock('../../../api/_auth', () => ({
  cors: () => {},
  verifyToken: async () => currentToken,
}))
// The role check is org-agnostic (and admins bypass it entirely), so model the
// worst case: the caller passes every role check. Tenancy must still hold.
vi.mock('../../../api/_workflow', () => ({
  canEnter: async () => true,
  canReview: async () => true,
  canApprove: async () => true,
  canPublish: async () => true,
  emitAuditEvent: async () => ({ previousHash: '0x0', newHash: '0xabc' }),
  getPlatformRole: async () => 'admin',
  getWorkflowRolesForItem: async () => [],
}))
vi.mock('../../../api/_notify', () => ({ notify: async () => {} }))
vi.mock('../../../api/_propagate', () => ({ propagateApprovedValue: async () => null }))

// ─── In-memory tenant fixture ─────────────────────────────────────────

interface Dv { id: string; entered_by: string | null; reporting_year_id: string; status: string; questionnaire_item_id: string; org_id?: string | null }
interface Ev { id: string; data_value_id: string; filename: string; file_type: string; file_bytes: Buffer }

let users: Record<string, { org_id: string }>
let years: Record<string, { organisation_id: string }>
let dataValues: Record<string, Dv>
let evidence: Record<string, Ev>
let writes: string[]

function resetDb() {
  users = { 'user-a': { org_id: 'org-a' }, 'user-b': { org_id: 'org-b' } }
  years = { 'ry-shared': { organisation_id: 'org-a' }, 'ry-b': { organisation_id: 'org-b' } }
  dataValues = {
    'dv-a': { id: 'dv-a', entered_by: 'user-a', reporting_year_id: 'ry-shared', status: 'draft', questionnaire_item_id: 'qi-1' },
    'dv-b': { id: 'dv-b', entered_by: 'user-b', reporting_year_id: 'ry-shared', status: 'draft', questionnaire_item_id: 'qi-1' },
    'dv-a-sub': { id: 'dv-a-sub', entered_by: 'user-a', reporting_year_id: 'ry-shared', status: 'submitted', questionnaire_item_id: 'qi-1' },
    'dv-b-sub': { id: 'dv-b-sub', entered_by: 'user-b', reporting_year_id: 'ry-shared', status: 'submitted', questionnaire_item_id: 'qi-1' },
    'dv-a-rev': { id: 'dv-a-rev', entered_by: 'user-a', reporting_year_id: 'ry-shared', status: 'reviewed', questionnaire_item_id: 'qi-1' },
    'dv-b-rev': { id: 'dv-b-rev', entered_by: 'user-b', reporting_year_id: 'ry-shared', status: 'reviewed', questionnaire_item_id: 'qi-1' },
  }
  evidence = {
    'ev-a': { id: 'ev-a', data_value_id: 'dv-a', filename: '国网电费单.pdf', file_type: 'application/pdf', file_bytes: Buffer.from('%PDF-org-a') },
    'ev-b': { id: 'ev-b', data_value_id: 'dv-b', filename: 'org-b-confidential.pdf', file_type: 'application/pdf', file_bytes: Buffer.from('%PDF-org-b') },
  }
  writes = []
}

const ownerOrg = (dv: Dv) => dv.org_id ?? (dv.entered_by ? users[dv.entered_by]?.org_id : undefined) ?? years[dv.reporting_year_id]?.organisation_id

/** Value bound right after the SQL fragment ending in `marker`, if any. */
function param(strings: TemplateStringsArray, values: unknown[], marker: string): unknown {
  for (let i = 0; i < values.length; i++) {
    if (strings[i].replace(/\s+/g, ' ').trimEnd().endsWith(marker)) return values[i]
  }
  return undefined
}

const TENANCY = "COALESCE((to_jsonb(dv) ->> 'org_id')::uuid, eu.org_id, ry.organisation_id) ="

function fakeSql(strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]> {
  const text = strings.join('?').replace(/\s+/g, ' ').trim()
  const org = param(strings, values, TENANCY) as string | undefined
  const visible = (dv: Dv | undefined) => !!dv && (org === undefined || ownerOrg(dv) === org)

  if (/^\s*(UPDATE|INSERT|DELETE)/i.test(text)) {
    writes.push(text)
    if (text.startsWith('DELETE FROM evidence')) delete evidence[param(strings, values, 'WHERE id =') as string]
    if (text.includes('INSERT INTO evidence')) return Promise.resolve([{ id: 'ev-new', filename: 'x', file_type: null, file_size: 1, file_hash: '0x', uploaded_at: '' }])
    if (text.includes('INSERT INTO data_value')) {
      // enter-value / connector-pull: (questionnaire_item_id, reporting_year_id, …)
      const row: Dv = { id: `dv-new-${writes.length}`, entered_by: currentToken.sub, reporting_year_id: values[1] as string, status: 'draft', questionnaire_item_id: values[0] as string, org_id: null }
      dataValues[row.id] = row
      return Promise.resolve([{ ...row }])
    }
    if (text.startsWith('UPDATE data_value SET org_id')) {
      const dv = dataValues[param(strings, values, 'WHERE id =') as string]
      if (dv && dv.org_id == null) dv.org_id = values[0] as string
    }
    return Promise.resolve([])
  }
  if (text.includes('FROM evidence')) {
    const byId = (param(strings, values, 'e.id =') ?? param(strings, values, 'FROM evidence WHERE id =')) as string | undefined
    const byDv = param(strings, values, 'e.data_value_id =') as string | undefined
    const rows = Object.values(evidence)
      .filter(e => (byId ? e.id === byId : byDv ? e.data_value_id === byDv : false))
      .filter(e => visible(dataValues[e.data_value_id]))
      .map(e => ({ ...e, status: dataValues[e.data_value_id].status, questionnaire_item_id: dataValues[e.data_value_id].questionnaire_item_id }))
    return Promise.resolve(rows)
  }
  if (text.includes('FROM reporting_year')) {
    const id = param(strings, values, 'WHERE id =') as string
    const yOrg = param(strings, values, 'AND organisation_id =') as string | undefined
    const y = years[id]
    return Promise.resolve(y && (yOrg === undefined || y.organisation_id === yOrg) ? [{ id }] : [])
  }
  if (text.includes('COUNT(*)::int AS cnt')) return Promise.resolve([{ cnt: 0 }])
  if (text.includes('FROM org_members')) return Promise.resolve([]) // no member row → "sees all"
  if (text.includes('FROM data_value')) {
    const id = (param(strings, values, 'dv.id =') ?? param(strings, values, 'FROM data_value WHERE id =')) as string | undefined
    if (id) return Promise.resolve(visible(dataValues[id]) ? [dataValues[id]] : [])
    const status = /dv\.status = '(\w+)'/.exec(text)?.[1]
    if (status) return Promise.resolve(Object.values(dataValues).filter(dv => dv.status === status && visible(dv)))
  }
  return Promise.resolve([])
}

vi.mock('../../../api/_db', () => ({ getDb: () => fakeSql }))

// ─── Request / response doubles ──────────────────────────────────────

function fakeRes() {
  const out = { statusCode: 0, body: undefined as unknown, headers: {} as Record<string, string> }
  const res = {
    // validateHeaderValue throws ERR_INVALID_CHAR exactly like Node's res.setHeader.
    setHeader(k: string, v: string) { validateHeaderValue(k, v); out.headers[k.toLowerCase()] = v; return res },
    status(c: number) { out.statusCode = c; return res },
    json(b: unknown) { out.body = b; return res },
    send(b: unknown) { out.body = b; return res },
    end() { return res },
  }
  return { res, out }
}

async function call(as: 'A' | 'B', req: { method: 'GET' | 'POST'; query?: Record<string, string>; body?: Record<string, unknown> }) {
  currentToken = tokens[as]
  const { default: handler } = await import('../../../api/workflow/index')
  const { res, out } = fakeRes()
  await handler({ headers: {}, query: {}, ...req } as never, res as never)
  return out
}

beforeEach(resetDb)

describe('GET view=evidence-file', () => {
  it('lets the owning org download its evidence, with a safe Chinese filename header', async () => {
    const out = await call('A', { method: 'GET', query: { view: 'evidence-file', evidence_id: 'ev-a' } })
    expect(out.statusCode).toBe(200)
    expect(String(out.body)).toBe('%PDF-org-a')
    expect(out.headers['content-disposition']).toBe(
      `attachment; filename="download.pdf"; filename*=UTF-8''${encodeURIComponent('国网电费单.pdf')}`,
    )
  })

  it('returns 404 (not 403) for another org\'s evidence id', async () => {
    const out = await call('B', { method: 'GET', query: { view: 'evidence-file', evidence_id: 'ev-a' } })
    expect(out.statusCode).toBe(404)
    expect(out.body).toEqual({ error: 'Not found' })
  })

  it('denies the reporting-year owner access to evidence another org entered in that shared year', async () => {
    const out = await call('A', { method: 'GET', query: { view: 'evidence-file', evidence_id: 'ev-b' } })
    expect(out.statusCode).toBe(404)
  })
})

describe('GET view=evidence (list)', () => {
  it('lists own evidence and hides foreign evidence metadata', async () => {
    const own = await call('A', { method: 'GET', query: { view: 'evidence', data_value_id: 'dv-a' } })
    expect((own.body as Ev[]).map(e => e.id)).toEqual(['ev-a'])
    const foreign = await call('B', { method: 'GET', query: { view: 'evidence', data_value_id: 'dv-a' } })
    expect(foreign.statusCode).toBe(200)
    expect(foreign.body).toEqual([])
  })
})

describe('POST evidence mutations', () => {
  it('remove-evidence on a foreign id is a 404 and deletes nothing', async () => {
    const out = await call('B', { method: 'POST', body: { action: 'remove-evidence', evidence_id: 'ev-a' } })
    expect(out.statusCode).toBe(404)
    expect(evidence['ev-a']).toBeDefined()
    expect(writes).toEqual([])
  })

  it('remove-evidence on an own draft value still works', async () => {
    const out = await call('A', { method: 'POST', body: { action: 'remove-evidence', evidence_id: 'ev-a' } })
    expect(out.statusCode).toBe(200)
    expect(evidence['ev-a']).toBeUndefined()
  })

  it('upload-evidence onto a foreign data value is a 404 and inserts nothing', async () => {
    const out = await call('B', {
      method: 'POST',
      body: { action: 'upload-evidence', data_value_id: 'dv-a', filename: 'x.pdf', content_base64: Buffer.from('x').toString('base64') },
    })
    expect(out.statusCode).toBe(404)
    expect(writes).toEqual([])
  })

  it('upload-evidence onto an own data value is accepted', async () => {
    const out = await call('A', {
      method: 'POST',
      body: { action: 'upload-evidence', data_value_id: 'dv-a', filename: '发票.pdf', content_base64: Buffer.from('x').toString('base64') },
    })
    expect(out.statusCode).toBe(201)
  })
})

describe('POST workflow transitions on foreign data values', () => {
  it.each([
    ['submit', 'dv-a', {}],
    ['review', 'dv-a-sub', { decision: 'pass' }],
    ['approve', 'dv-a-rev', { decision: 'approve' }],
  ])('%s → 404 and no write', async (action, id, extra) => {
    const out = await call('B', { method: 'POST', body: { action, data_value_id: id, ...extra } })
    expect(out.statusCode).toBe(404)
    expect(writes).toEqual([])
  })

  it('submit on an own value still works', async () => {
    const out = await call('A', { method: 'POST', body: { action: 'submit', data_value_id: 'dv-a' } })
    expect(out.statusCode).toBe(200)
  })
})

describe('review / approval queues', () => {
  it('review-queue only lists the caller org\'s submissions', async () => {
    const a = await call('A', { method: 'GET', query: { view: 'review-queue' } })
    expect((a.body as Dv[]).map(r => r.id)).toEqual(['dv-a-sub'])
    const b = await call('B', { method: 'GET', query: { view: 'review-queue' } })
    expect((b.body as Dv[]).map(r => r.id)).toEqual(['dv-b-sub'])
  })

  it('approval-queue only lists the caller org\'s reviewed values', async () => {
    const b = await call('B', { method: 'GET', query: { view: 'approval-queue' } })
    expect((b.body as Dv[]).map(r => r.id)).toEqual(['dv-b-rev'])
  })
})

describe('publish', () => {
  it('refuses to publish another org\'s reporting year', async () => {
    const out = await call('B', { method: 'POST', body: { action: 'publish', reporting_year_id: 'ry-shared' } })
    expect(out.statusCode).toBe(404)
    expect(writes).toEqual([])
  })

  it('publishes the caller org\'s own reporting year', async () => {
    const out = await call('B', { method: 'POST', body: { action: 'publish', reporting_year_id: 'ry-b' } })
    expect(out.statusCode).toBe(200)
  })
})

describe('enter-value / connector-pull reporting year', () => {
  // Pre-fix the handler wrote into whatever reporting_year_id the client sent
  // (the demo org's hard-coded year for every tenant).
  it.each([
    ['enter-value', { value: 1 }],
    ['connector-pull', { connector: 'sap' }],
  ])('%s into another org\'s reporting year → 404 and no insert', async (action, extra) => {
    const out = await call('B', { method: 'POST', body: { action, question_id: 'qi-1', reporting_year_id: 'ry-shared', ...extra } })
    expect(out.statusCode).toBe(404)
    expect(out.body).toEqual({ error: 'Reporting year not found' })
    expect(writes).toEqual([])
  })

  it.each([
    ['enter-value', { value: 1 }],
    ['connector-pull', { connector: 'sap' }],
  ])('%s into the caller org\'s own year is accepted and stamps data_value.org_id', async (action, extra) => {
    const out = await call('B', { method: 'POST', body: { action, question_id: 'qi-1', reporting_year_id: 'ry-b', ...extra } })
    expect(out.statusCode).toBe(201)
    const id = (out.body as { id: string }).id
    expect(dataValues[id].reporting_year_id).toBe('ry-b')
    expect(dataValues[id].org_id).toBe('org-b')
  })
})

describe('ownership prefers data_value.org_id', () => {
  it('a value stamped for org B is B\'s even though org A\'s user entered it in A\'s year', async () => {
    dataValues['dv-stamped'] = { id: 'dv-stamped', entered_by: 'user-a', reporting_year_id: 'ry-shared', status: 'draft', questionnaire_item_id: 'qi-1', org_id: 'org-b' }
    const a = await call('A', { method: 'POST', body: { action: 'submit', data_value_id: 'dv-stamped' } })
    expect(a.statusCode).toBe(404)
    const b = await call('B', { method: 'POST', body: { action: 'submit', data_value_id: 'dv-stamped' } })
    expect(b.statusCode).toBe(200)
  })
})

describe('publish only touches the caller org\'s values', () => {
  it('publishing a year counts and flips only owned values', async () => {
    const out = await call('A', { method: 'POST', body: { action: 'publish', reporting_year_id: 'ry-shared' } })
    expect(out.statusCode).toBe(200)
    const flip = writes.find(w => w.startsWith("UPDATE data_value SET status = 'published'"))
    expect(flip).toBeDefined()
    expect(flip).toContain(TENANCY)
  })
})
