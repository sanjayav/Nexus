/**
 * Chinese section / subsection headings in the four China framework seeds.
 */
import { CN_SSE_ITEMS, CN_SSE_SUBSECTION_ZH, seedCNSSE } from '../../../api/_cnSseSeed'
import { CN_CSDS_ITEMS, CN_CSDS_SUBSECTION_ZH, seedCNCSDS } from '../../../api/_cnCsdsSeed'
import { HKEX_ESG_ITEMS, HKEX_ESG_SUBSECTION_ZH, seedHKEXESG } from '../../../api/_hkexEsgSeed'
import { CASS_ESG_ITEMS, CASS_ESG_SUBSECTION_ZH, seedCASSESG } from '../../../api/_cassEsgSeed'
import type { Sql } from '../../../api/_db'

const CJK = /[一-鿿]/

const PACK = [
  { id: 'cn-sse', items: CN_SSE_ITEMS, map: CN_SSE_SUBSECTION_ZH, seed: seedCNSSE },
  { id: 'cn-csds', items: CN_CSDS_ITEMS, map: CN_CSDS_SUBSECTION_ZH, seed: seedCNCSDS },
  { id: 'hkex-esg', items: HKEX_ESG_ITEMS, map: HKEX_ESG_SUBSECTION_ZH, seed: seedHKEXESG },
  { id: 'cass-esg', items: CASS_ESG_ITEMS, map: CASS_ESG_SUBSECTION_ZH, seed: seedCASSESG },
]

function fakeSql() {
  const statements: string[] = []
  const txn: Array<{ text: string; values: unknown[] }> = []
  const tag = (strings: TemplateStringsArray) => { statements.push(strings.join('$?')); return Promise.resolve([]) }
  Object.assign(tag, {
    transaction: async (fn: (t: unknown) => unknown[]) => fn((strings: TemplateStringsArray, ...values: unknown[]) => {
      const q = { text: strings.join('$?'), values }
      txn.push(q)
      return q
    }),
  })
  return { sql: tag as unknown as Sql, statements, txn }
}

describe.each(PACK)('$id zh headings', ({ items, map, seed }) => {
  it('has a Chinese heading for every subsection used, and no stale entries', () => {
    const used = new Set(items.map(i => i.subsection))
    for (const s of used) {
      expect(map[s], s).toBeDefined()
      expect(CJK.test(map[s]), s).toBe(true)
    }
    for (const k of Object.keys(map)) expect(used.has(k), k).toBe(true)
  })

  it('adds the columns and writes section_zh / subsection_zh on insert and conflict', async () => {
    const { sql, statements, txn } = fakeSql()
    await seed(sql)
    const ddl = statements.join('\n')
    expect(ddl).toMatch(/ADD COLUMN IF NOT EXISTS section_zh TEXT/)
    expect(ddl).toMatch(/ADD COLUMN IF NOT EXISTS subsection_zh TEXT/)
    expect(txn).toHaveLength(items.length)
    for (const [i, q] of txn.entries()) {
      expect(q.text).toMatch(/section_zh = \$\?::text/)
      expect(q.text).toMatch(/section_zh = EXCLUDED\.section_zh/)
      expect(q.text).toMatch(/subsection_zh = EXCLUDED\.subsection_zh/)
      expect(q.values).toContain(map[items[i].subsection])
      expect(q.values.some(v => typeof v === 'string' && CJK.test(v) && v !== items[i].lineItemZh && v !== map[items[i].subsection])).toBe(true) // SECTION_ZH
    }
  })
})
