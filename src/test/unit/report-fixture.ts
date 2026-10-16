/**
 * Fixture for the report generator: a fake Neon `sql` tag that answers the
 * queries in api/_reportGenerator.ts with a CN-SSE dataset for a mainland
 * group (绿源控股集团). No database involved.
 *
 * Rows carry the raw English + `*_zh` columns exactly as the SQL returns them,
 * so the generator's language selection and fallback are exercised for real.
 * One metric deliberately has no `line_item_zh` / `subsection_zh` to cover the
 * English fallback.
 */
import { CN_SSE_ITEMS, CN_SSE_SUBSECTION_ZH } from '../../../api/_cnSseSeed'

export type FakeSql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>

export const CN_ORG = {
  name: '绿源控股集团',
  legal_name: '绿源控股集团有限公司 (Lvyuan Holdings Group Co., Ltd.)',
  thai_name: null,
  country: 'CN',
  primary_color: '#1B6B7B',
  secondary_color: '#134E5A',
  logo_mark: null,
  industry: '新能源与材料',
  headquarters: '上海市浦东新区',
  website: 'www.lvyuan-holdings.example.cn',
  name_zh: null,
  legal_name_zh: '绿源控股集团有限公司',
}

const SECTION_EN = 'CN-SSE Sustainability Reporting Guidelines'
const SECTION_ZH = '上市公司可持续发展报告指引'

const VALUES: Record<string, number> = {
  scope_1: 182_450.6,
  scope_2_location: 96_310.2,
  scope_2_market: 88_904.75,
  scope_3: 1_204_330,
}

/** Numeric CN-SSE items with plausible group totals. */
export function cnMetricRows(): Array<Record<string, unknown>> {
  const numeric = CN_SSE_ITEMS.filter(i => i.unit && i.unit !== 'yes/no').slice(0, 18)
  return numeric.map((it, idx) => ({
    gri_code: it.griCode,
    line_item: it.lineItem,
    // idx 3 deliberately has no translation → English fallback
    line_item_zh: idx === 3 ? null : it.lineItemZh,
    section: SECTION_EN,
    section_zh: SECTION_ZH,
    subsection: it.subsection,
    subsection_zh: idx === 3 ? null : CN_SSE_SUBSECTION_ZH[it.subsection],
    unit: it.unit,
    value: VALUES[it.scopeSplit ?? ''] ?? Math.round(1000 + idx * 7371.37 * (idx % 3 + 1)) / (idx % 4 === 0 ? 100 : 1),
    entity_count: 3 + (idx % 5),
  }))
}

const BODIES: Record<string, string> = {
  'CNSSE-GOV-1': '公司董事会下设战略与可持续发展委员会，负责审议可持续发展战略、目标及年度报告，每年至少召开两次会议。管理层设立可持续发展工作小组，由总裁担任组长，统筹推进环境、社会及治理（ESG）相关工作，并定期向董事会汇报进展。2025年，委员会共召开3次会议，审议通过了《碳达峰行动方案》及《供应商行为准则（修订版）》。',
  'CNSSE-DM-1': '报告期内，公司参照《上市公司自律监管指引——可持续发展报告（试行）》开展双重重要性评估：通过问卷调查、访谈等方式收集了投资者、客户、员工、供应商及社区等利益相关方的意见（共回收有效问卷1,268份），结合行业对标和专家研判，从财务重要性和影响重要性两个维度识别出应对气候变化、污染防治、员工权益、数据安全与客户隐私保护等12项重要议题。',
  'CNSSE-CLIM-1': '公司将气候相关风险纳入全面风险管理体系，由风险管理委员会每季度评估物理风险（如极端高温、洪涝）和转型风险（如全国碳排放权交易市场配额收紧、绿电价格波动）。我们设定了2030年前实现运营层面碳达峰、2050年前实现碳中和的目标，并以2023年为基准年，计划到2028年将范围1和范围2温室气体排放强度（tCO2e/万元营业收入）降低25%。',
  'CNSSE-ABC-1': '公司坚持“零容忍”原则，建立了覆盖董事、高级管理人员及全体员工的反商业贿赂及反贪污制度体系。报告期内，开展廉洁合规培训42场，覆盖员工9,316人次，培训覆盖率达100%；设立举报热线及电子邮箱，对举报人信息严格保密，全年未发生已审结的贪污诉讼案件。',
}

export function cnNarrativeRows(): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = []
  for (const [code, body] of Object.entries(BODIES)) {
    const it = CN_SSE_ITEMS.find(i => i.griCode === code)!
    out.push({
      gri_code: it.griCode,
      line_item: it.lineItem,
      line_item_zh: it.lineItemZh,
      section: SECTION_EN,
      section_zh: SECTION_ZH,
      subsection: it.subsection,
      subsection_zh: CN_SSE_SUBSECTION_ZH[it.subsection],
      body,
    })
  }
  return out
}

export function cnContentIndexRows(): Array<Record<string, unknown>> {
  return CN_SSE_ITEMS.slice(0, 40).map((it, idx) => {
    const total = idx % 7 === 6 ? 0 : 4
    const approved = total === 0 ? 0 : idx % 3 === 0 ? 2 : 4
    return {
      gri_code: it.griCode,
      line_item: it.lineItem,
      line_item_zh: it.lineItemZh,
      section: SECTION_EN,
      section_zh: SECTION_ZH,
      subsection: it.subsection,
      subsection_zh: CN_SSE_SUBSECTION_ZH[it.subsection],
      total,
      approved,
      status: total === 0 ? 'omitted' : approved === total ? 'fully' : 'partially',
    }
  })
}

export interface FakeSqlOptions {
  org?: Record<string, unknown>
  metrics?: Array<Record<string, unknown>>
  narratives?: Array<Record<string, unknown>>
  contentIndex?: Array<Record<string, unknown>>
  assurance?: Array<Record<string, unknown>>
}

/** Fake Neon tag. Records every query; routes on distinctive SQL fragments. */
export function makeReportSql(opts: FakeSqlOptions = {}): { sql: FakeSql; queries: string[] } {
  const queries: string[] = []
  const sql: FakeSql = async (strings) => {
    const text = strings.join('$?')
    queries.push(text)
    if (/FROM organisations/.test(text)) return [opts.org ?? CN_ORG]
    if (/FROM reporting_periods/.test(text)) {
      return [{ label: '2025年度', year: 2025, start_date: '2025-01-01', end_date: new Date('2025-12-31T00:00:00Z') }]
    }
    if (/response_type != 'narrative'/.test(text)) return opts.metrics ?? cnMetricRows()
    if (/narrative_body IS NOT NULL/.test(text)) return opts.narratives ?? cnNarrativeRows()
    if (/WITH scope AS/.test(text)) return opts.contentIndex ?? cnContentIndexRows()
    if (/FROM assurance_requests/.test(text)) return opts.assurance ?? []
    return []
  }
  return { sql, queries }
}

export const REPORT_ARGS = {
  orgId: '00000000-0000-0000-0000-0000000000c1',
  periodId: '00000000-0000-0000-0000-0000000000p1',
  frameworkId: 'cn-sse',
  publishedBy: '王晓明',
  publishedAt: '2026-03-28T08:30:00.000Z',
  verificationToken: 'c0ffee00-1234-4abc-9def-0123456789ab',
  baseUrl: 'https://app.aeiforo.com',
  assuranceRequestId: null as string | null,
}
