// CASS-ESG 5.0 — Chinese Academy of Social Sciences guidelines for Chinese
// enterprise ESG / CSR reporting (中国社会科学院《中国企业社会责任报告指南
// （CASS-ESG 5.0）》).
//
// Organised into four pillars: governance (G), environment (E), social (S) and
// value creation (V). The guideline is widely used by Chinese SOEs and listed
// companies as a reporting reference rather than a regulatory mandate, so this
// catalogue captures the core topics and the indicators most commonly reported
// against it.
//
// Codes are TOPIC-based (CASS-<pillar>-<n>), not the guideline's own indicator
// numbering.
// `lineItem` is canonical English (part of the conflict key); `lineItemZh` is the
// Simplified Chinese wording shown when the UI language is zh.
//
// This seeder does NOT switch the framework on for any organisation: tenants opt
// in from Settings → Frameworks.

export type WorkflowRole = 'AUTO' | 'FM' | 'SO' | 'TL'
export type EntryMode = 'Manual' | 'Calculator' | 'Connector'
export type ReportingScope = 'group' | 'jv'

export interface ItemSpec {
  subsection: string
  griCode: string
  lineItem: string
  lineItemZh: string
  unit: string | null
  scopeSplit: string | null
  hasTarget: boolean
  requiresCoverage: boolean
  defaultRole: WorkflowRole
  entryMode: EntryMode
}

const SECTION = 'CASS-ESG 5.0'
const SECTION_ZH = '中国企业社会责任报告指南（CASS-ESG 5.0）'
/**
 * Simplified Chinese subsection headings, written to questionnaire_item.subsection_zh
 * (section_zh gets SECTION_ZH). Reports and the questionnaire tree show these when
 * the language is zh; NULL falls back to the English heading.
 */
export const CASS_ESG_SUBSECTION_ZH: Record<string, string> = {
  'G — Governance': 'G 治理',
  'E — Environment': 'E 环境',
  'S — Social': 'S 社会',
  'V — Value creation': 'V 价值创造',
}
const FRAMEWORK_ID = 'cass-esg'
const REPORTING_SCOPE: ReportingScope = 'group'

// ── G — Governance ──────────────────────────────────────────────────────────
const CASS_G: ItemSpec[] = [
  { subsection: 'G — Governance', griCode: 'CASS-G-1', lineItem: 'Party building and its integration with corporate governance', lineItemZh: '党建引领及其与公司治理的融合', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'G — Governance', griCode: 'CASS-G-2', lineItem: 'Board structure, independence and diversity', lineItemZh: '董事会结构、独立性及多元化', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'TL', entryMode: 'Manual' },
  { subsection: 'G — Governance', griCode: 'CASS-G-3', lineItem: 'ESG governance structure and board oversight of ESG matters', lineItemZh: 'ESG 治理架构及董事会对 ESG 事项的监督', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'TL', entryMode: 'Manual' },
  { subsection: 'G — Governance', griCode: 'CASS-G-4', lineItem: 'Material topic identification and stakeholder engagement', lineItemZh: '实质性议题识别及利益相关方参与', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'G — Governance', griCode: 'CASS-G-5', lineItem: 'Compliance management and business ethics', lineItemZh: '合规管理与商业道德', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'G — Governance', griCode: 'CASS-G-5', lineItem: 'Anti-corruption training coverage', lineItemZh: '反腐败培训覆盖率', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'G — Governance', griCode: 'CASS-G-6', lineItem: 'Risk management and internal control system', lineItemZh: '风险管理与内部控制体系', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'G — Governance', griCode: 'CASS-G-7', lineItem: 'Information disclosure and investor relations', lineItemZh: '信息披露与投资者关系管理', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ── E — Environment ─────────────────────────────────────────────────────────
const CASS_E: ItemSpec[] = [
  { subsection: 'E — Environment', griCode: 'CASS-E-1', lineItem: 'Environmental management system', lineItemZh: '环境管理体系', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E — Environment', griCode: 'CASS-E-2', lineItem: 'Climate change strategy and carbon peaking / carbon neutrality targets', lineItemZh: '应对气候变化战略及碳达峰、碳中和目标', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E — Environment', griCode: 'CASS-E-3', lineItem: 'Scope 1 GHG emissions', lineItemZh: '范围一温室气体排放量', unit: 'tCO2e', scopeSplit: 'scope_1', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E — Environment', griCode: 'CASS-E-3', lineItem: 'Scope 2 GHG emissions', lineItemZh: '范围二温室气体排放量', unit: 'tCO2e', scopeSplit: 'scope_2_location', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E — Environment', griCode: 'CASS-E-3', lineItem: 'Scope 3 GHG emissions (where available)', lineItemZh: '范围三温室气体排放量（如有）', unit: 'tCO2e', scopeSplit: 'scope_3', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E — Environment', griCode: 'CASS-E-4', lineItem: 'Total energy consumption', lineItemZh: '能源消耗总量', unit: 'tce', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E — Environment', griCode: 'CASS-E-4', lineItem: 'Share of renewable energy used', lineItemZh: '可再生能源使用比例', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E — Environment', griCode: 'CASS-E-5', lineItem: 'Total water consumption', lineItemZh: '用水总量', unit: 'm3', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E — Environment', griCode: 'CASS-E-6', lineItem: 'Pollutant emissions (wastewater and air pollutants) and control measures', lineItemZh: '污染物（废水、废气）排放及治理措施', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E — Environment', griCode: 'CASS-E-7', lineItem: 'Hazardous waste generated', lineItemZh: '危险废物产生量', unit: 't', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E — Environment', griCode: 'CASS-E-7', lineItem: 'General solid waste generated', lineItemZh: '一般固体废物产生量', unit: 't', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E — Environment', griCode: 'CASS-E-8', lineItem: 'Biodiversity protection measures', lineItemZh: '生物多样性保护措施', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E — Environment', griCode: 'CASS-E-9', lineItem: 'Environmental protection investment', lineItemZh: '环保投入总额', unit: 'CNY', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

// ── S — Social ──────────────────────────────────────────────────────────────
const CASS_S: ItemSpec[] = [
  { subsection: 'S — Social', griCode: 'CASS-S-1', lineItem: 'Total number of employees and diversity', lineItemZh: '员工总数及多元化情况', unit: 'headcount', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S — Social', griCode: 'CASS-S-1', lineItem: 'Labour contract signing rate', lineItemZh: '劳动合同签订率', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S — Social', griCode: 'CASS-S-2', lineItem: 'Number of work-related fatalities', lineItemZh: '因工死亡人数', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S — Social', griCode: 'CASS-S-2', lineItem: 'Investment in work safety', lineItemZh: '安全生产投入', unit: 'CNY', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S — Social', griCode: 'CASS-S-3', lineItem: 'Average training hours per employee', lineItemZh: '员工人均培训时长', unit: 'hours', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S — Social', griCode: 'CASS-S-4', lineItem: 'Product quality management and customer satisfaction', lineItemZh: '产品质量管理及客户满意度', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S — Social', griCode: 'CASS-S-5', lineItem: 'Responsible supply chain management, including supplier ESG assessment', lineItemZh: '供应链责任管理（含供应商 ESG 评估）', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S — Social', griCode: 'CASS-S-6', lineItem: 'Data security and privacy protection', lineItemZh: '数据安全与隐私保护', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S — Social', griCode: 'CASS-S-7', lineItem: 'Community engagement and rural revitalisation', lineItemZh: '社区参与及乡村振兴', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S — Social', griCode: 'CASS-S-7', lineItem: 'Total charitable donations', lineItemZh: '对外捐赠总额', unit: 'CNY', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

// ── V — Value creation ──────────────────────────────────────────────────────
const CASS_V: ItemSpec[] = [
  { subsection: 'V — Value creation', griCode: 'CASS-V-1', lineItem: 'Operating revenue', lineItemZh: '营业收入', unit: 'CNY', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'V — Value creation', griCode: 'CASS-V-1', lineItem: 'Total taxes paid', lineItemZh: '纳税总额', unit: 'CNY', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'V — Value creation', griCode: 'CASS-V-1', lineItem: 'Distribution of economic value to employees, shareholders, creditors and government', lineItemZh: '经济价值分配（员工、股东、债权人及政府）', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'V — Value creation', griCode: 'CASS-V-2', lineItem: 'R&D investment', lineItemZh: '研发投入', unit: 'CNY', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'V — Value creation', griCode: 'CASS-V-2', lineItem: 'Patents granted', lineItemZh: '专利授权数量', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'V — Value creation', griCode: 'CASS-V-3', lineItem: 'Revenue from green products and services', lineItemZh: '绿色产品与服务收入', unit: 'CNY', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'V — Value creation', griCode: 'CASS-V-4', lineItem: 'Contribution to national strategies (e.g. regional coordinated development, Belt and Road)', lineItemZh: '服务国家战略情况（如区域协调发展、“一带一路”）', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

export const CASS_ESG_ITEMS: ItemSpec[] = [
  ...CASS_G, ...CASS_E, ...CASS_S, ...CASS_V,
]

import type { Sql } from './_db'

/**
 * Idempotent upsert that also backfills `line_item_zh` on re-runs. See the
 * note in _cnSseSeed.ts: the NULL-safe UPDATE-then-INSERT avoids duplicating
 * narrative rows whose scope_split is NULL.
 */
export async function seedCASSESG(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS line_item_zh TEXT`
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS section_zh TEXT`
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS subsection_zh TEXT`
  // One HTTP round trip, one transaction: either the whole catalogue lands or none of it.
  await sql.transaction(txn => CASS_ESG_ITEMS.map(it => txn`
      WITH upd AS (
        UPDATE questionnaire_item
           SET line_item_zh = ${it.lineItemZh}::text,
               section_zh = ${SECTION_ZH}::text,
               subsection_zh = ${CASS_ESG_SUBSECTION_ZH[it.subsection] ?? null}::text
         WHERE gri_code = ${it.griCode}::text
           AND line_item = ${it.lineItem}::text
           AND scope_split IS NOT DISTINCT FROM ${it.scopeSplit}::text
           AND reporting_scope = ${REPORTING_SCOPE}::text
        RETURNING id
      )
      INSERT INTO questionnaire_item
        (framework_id, section, section_zh, subsection, subsection_zh, gri_code, line_item, line_item_zh, unit, scope_split,
         has_target, requires_coverage, default_workflow_role, entry_mode_default,
         footnote_refs, reporting_scope)
      SELECT
        ${FRAMEWORK_ID}::text, ${SECTION}::text, ${SECTION_ZH}::text, ${it.subsection}::text,
        ${CASS_ESG_SUBSECTION_ZH[it.subsection] ?? null}::text, ${it.griCode}::text,
        ${it.lineItem}::text, ${it.lineItemZh}::text, ${it.unit}::text, ${it.scopeSplit}::text,
        ${it.hasTarget}::boolean, ${it.requiresCoverage}::boolean,
        ${it.defaultRole}::text, ${it.entryMode}::text, '[]'::jsonb, ${REPORTING_SCOPE}::text
      WHERE NOT EXISTS (SELECT 1 FROM upd)
      ON CONFLICT (gri_code, line_item, scope_split, reporting_scope)
        DO UPDATE SET line_item_zh = EXCLUDED.line_item_zh,
                      section_zh = EXCLUDED.section_zh,
                      subsection_zh = EXCLUDED.subsection_zh
    `))
  // Intentionally no per-org enablement here: orgs opt in via Settings.
}
