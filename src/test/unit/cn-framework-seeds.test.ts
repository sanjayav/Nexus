/**
 * China / Hong Kong framework pack — seed catalogue invariants.
 *
 * Covers the four questionnaire_item seeders (CN-SSE, CN-CSDS, HKEX ESG,
 * CASS-ESG) without touching a database: item-level invariants on the exported
 * catalogues, a fake `sql` tag to check the statements the seeders issue, and
 * source-level checks that they are registered in api/setup.ts and never
 * auto-enable themselves for an org.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CN_SSE_ITEMS, seedCNSSE } from '../../../api/_cnSseSeed'
import { CN_CSDS_ITEMS, seedCNCSDS } from '../../../api/_cnCsdsSeed'
import { HKEX_ESG_ITEMS, seedHKEXESG } from '../../../api/_hkexEsgSeed'
import { CASS_ESG_ITEMS, seedCASSESG } from '../../../api/_cassEsgSeed'
import type { Sql } from '../../../api/_db'
import { getFramework } from '../../lib/frameworks'

interface SeedItem {
  subsection: string
  griCode: string
  lineItem: string
  lineItemZh: string
  unit: string | null
  scopeSplit: string | null
  hasTarget: boolean
  requiresCoverage: boolean
  defaultRole: string
  entryMode: string
}

interface PackEntry {
  id: string
  file: string
  prefix: string
  items: SeedItem[]
  seed: (sql: Sql) => Promise<void>
  seedFn: string
  min: number
  max: number
}

const PACK: PackEntry[] = [
  { id: 'cn-sse', file: 'api/_cnSseSeed.ts', prefix: 'CNSSE-', items: CN_SSE_ITEMS, seed: seedCNSSE, seedFn: 'seedCNSSE', min: 60, max: 90 },
  { id: 'cn-csds', file: 'api/_cnCsdsSeed.ts', prefix: 'CSDS-', items: CN_CSDS_ITEMS, seed: seedCNCSDS, seedFn: 'seedCNCSDS', min: 25, max: 40 },
  { id: 'hkex-esg', file: 'api/_hkexEsgSeed.ts', prefix: 'HKEX-', items: HKEX_ESG_ITEMS, seed: seedHKEXESG, seedFn: 'seedHKEXESG', min: 50, max: 80 },
  { id: 'cass-esg', file: 'api/_cassEsgSeed.ts', prefix: 'CASS-', items: CASS_ESG_ITEMS, seed: seedCASSESG, seedFn: 'seedCASSESG', min: 25, max: 40 },
]

const ROOT = resolve(__dirname, '../../..')
const readSource = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8')
const CJK = /[一-鿿]/

/** Minimal stand-in for the Neon `sql` tag that records every statement. */
function fakeSql() {
  const statements: Array<{ text: string; values: unknown[] }> = []
  const txnStatements: Array<{ text: string; values: unknown[] }> = []
  const tag = (strings: TemplateStringsArray, ...values: unknown[]) => {
    statements.push({ text: strings.join('$?'), values })
    return Promise.resolve([])
  }
  const transaction = async (arg: unknown) => {
    const txn = (strings: TemplateStringsArray, ...values: unknown[]) => {
      const q = { text: strings.join('$?'), values }
      txnStatements.push(q)
      return q
    }
    const queries = typeof arg === 'function' ? (arg as (t: typeof txn) => unknown[])(txn) : (arg as unknown[])
    return queries.map(() => [])
  }
  Object.assign(tag, { transaction })
  return { sql: tag as unknown as Sql, statements, txnStatements }
}

describe.each(PACK)('$id seed catalogue', ({ id, file, prefix, items, seed, min, max }) => {
  it(`has between ${min} and ${max} items`, () => {
    expect(items.length).toBeGreaterThanOrEqual(min)
    expect(items.length).toBeLessThanOrEqual(max)
  })

  it('has unique (griCode, lineItem, scopeSplit) combinations', () => {
    const keys = items.map(i => `${i.griCode}|${i.lineItem}|${i.scopeSplit ?? ''}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('every item carries Simplified Chinese wording', () => {
    for (const it of items) {
      expect(it.lineItemZh.trim().length, `${it.griCode} ${it.lineItem}`).toBeGreaterThan(0)
      expect(CJK.test(it.lineItemZh), `${it.griCode} ${it.lineItem}`).toBe(true)
      expect(it.lineItem.trim().length).toBeGreaterThan(0)
    }
  })

  it(`every code is prefixed with ${prefix}`, () => {
    for (const it of items) expect(it.griCode.startsWith(prefix), it.griCode).toBe(true)
  })

  it('uses valid workflow roles and entry modes', () => {
    for (const it of items) {
      expect(['AUTO', 'FM', 'SO', 'TL']).toContain(it.defaultRole)
      expect(['Manual', 'Calculator', 'Connector']).toContain(it.entryMode)
    }
  })

  it('links Scope 1 / 2 / 3 items to the calculator', () => {
    const scoped = items.filter(i => i.scopeSplit?.startsWith('scope_'))
    expect(scoped.some(i => i.scopeSplit === 'scope_1')).toBe(true)
    expect(scoped.some(i => i.scopeSplit?.startsWith('scope_2'))).toBe(true)
    expect(scoped.some(i => i.scopeSplit === 'scope_3')).toBe(true)
    for (const it of scoped) {
      expect(it.unit).toBe('tCO2e')
      expect(it.entryMode).toBe('Calculator')
      expect(it.defaultRole).toBe('AUTO')
      expect(it.requiresCoverage).toBe(true)
    }
  })

  it('matches its catalog entry in src/lib/frameworks.ts', () => {
    const fw = getFramework(id)
    expect(fw).toBeDefined()
    expect(fw!.status).toBe('active')
    expect(fw!.questionCount).toBe(items.length)
    expect(fw!.nameZh && CJK.test(fw!.nameZh)).toBe(true)
    expect(fw!.descriptionZh && CJK.test(fw!.descriptionZh)).toBe(true)
    expect(fw!.bodyZh && CJK.test(fw!.bodyZh)).toBe(true)
    expect(readSource(file)).toContain(`const FRAMEWORK_ID = '${id}'`)
  })

  it('never enables the framework for an org', () => {
    expect(readSource(file)).not.toMatch(/org_framework_enablement/i)
  })

  it('adds line_item_zh and upserts every item in one transaction', async () => {
    const { sql, statements, txnStatements } = fakeSql()
    await seed(sql)

    const ddl = statements.map(s => s.text).join('\n')
    expect(ddl).toMatch(/ADD COLUMN IF NOT EXISTS line_item_zh TEXT/)
    expect(ddl).not.toMatch(/org_framework_enablement/i)

    expect(txnStatements).toHaveLength(items.length)
    for (const [i, q] of txnStatements.entries()) {
      expect(q.text).toMatch(/INSERT INTO questionnaire_item/)
      expect(q.text).toMatch(/ON CONFLICT \(gri_code, line_item, scope_split, reporting_scope\)/)
      expect(q.text).toMatch(/DO UPDATE SET line_item_zh = EXCLUDED\.line_item_zh/)
      expect(q.text).toMatch(/scope_split IS NOT DISTINCT FROM/)
      expect(q.text).not.toMatch(/org_framework_enablement/i)
      expect(q.values).toContain(id)
      expect(q.values).toContain(items[i].lineItemZh)
      expect(q.values).toContain(items[i].lineItem)
    }
  })

  it('is registered in api/setup.ts', () => {
    const setup = readSource('api/setup.ts')
    const { seedFn } = PACK.find(p => p.id === id)!
    expect(setup).toContain(`import { ${seedFn} } from './${file.replace('api/', '').replace('.ts', '.js')}'`)
    expect(setup).toContain(`await ${seedFn}(sql)`)
  })
})

describe('China / Hong Kong framework pack', () => {
  it('codes do not collide across the four catalogues', () => {
    const keys = PACK.flatMap(p => p.items.map(i => `${i.griCode}|${i.lineItem}|${i.scopeSplit ?? ''}`))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('HKEX catalogue covers every environmental and social KPI', () => {
    const codes = new Set(HKEX_ESG_ITEMS.map(i => i.griCode))
    const expected = [
      'A1.1', 'A1.2', 'A1.3', 'A1.4', 'A1.5', 'A1.6',
      'A2.1', 'A2.2', 'A2.3', 'A2.4', 'A2.5', 'A3.1',
      'B1.1', 'B1.2', 'B2.1', 'B2.2', 'B2.3', 'B3.1', 'B3.2', 'B4.1', 'B4.2',
      'B5.1', 'B5.2', 'B5.3', 'B5.4', 'B6.1', 'B6.2', 'B6.3', 'B6.4', 'B6.5',
      'B7.1', 'B7.2', 'B7.3', 'B8.1', 'B8.2',
    ]
    for (const kpi of expected) expect(codes.has(`HKEX-${kpi}`), kpi).toBe(true)
  })
})
