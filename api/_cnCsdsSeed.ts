// CN-CSDS — Ministry of Finance (财政部) Corporate Sustainability Disclosure
// Standards: 《企业可持续披露准则——基本准则》 (December 2024) together with the
// climate standard 《企业可持续披露准则第1号——气候（试行）》.
//
// The basic standard organises disclosure around four core elements — 治理
// (governance), 战略 (strategy), 影响、风险和机遇管理 (IRO management) and 指标和
// 目标 (metrics and targets) — with materiality judged from both the impact and
// financial perspectives. The climate standard applies the same four elements to
// climate, with GHG emissions accounted on an organisational basis consistent
// with GB/T 32150 and applicable sector guidelines.
//
// Codes are TOPIC-based (CSDS-<topic>-<n>), not article numbers.
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

const SECTION = 'CN-CSDS Corporate Sustainability Disclosure Standards'
const FRAMEWORK_ID = 'cn-csds'
const REPORTING_SCOPE: ReportingScope = 'group'

// ── Basic standard — general requirements ───────────────────────────────────
const CSDS_GEN: ItemSpec[] = [
  { subsection: 'Basic standard — General requirements', griCode: 'CSDS-GEN-1', lineItem: 'Reporting entity and reporting period consistent with the financial statements', lineItemZh: '可持续信息的报告主体及报告期间与财务报表的一致性', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Basic standard — General requirements', griCode: 'CSDS-GEN-1', lineItem: 'Materiality assessment from the impact and financial perspectives', lineItemZh: '从影响重要性和财务重要性两个方面开展的重要性评估', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Basic standard — General requirements', griCode: 'CSDS-GEN-1', lineItem: 'Connections between sustainability information and the financial statements', lineItemZh: '可持续信息与财务报表信息之间的关联', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Basic standard — General requirements', griCode: 'CSDS-GEN-1', lineItem: 'Significant judgements, estimates and sources of measurement uncertainty', lineItemZh: '重大判断、估计及计量不确定性的来源', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ── Basic standard — governance ─────────────────────────────────────────────
const CSDS_GOV: ItemSpec[] = [
  { subsection: 'Basic standard — Governance', griCode: 'CSDS-GOV-1', lineItem: 'Governance body or individual responsible for oversight of sustainability-related risks and opportunities', lineItemZh: '负责监督可持续相关风险和机遇的治理机构或个人', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'TL', entryMode: 'Manual' },
  { subsection: 'Basic standard — Governance', griCode: 'CSDS-GOV-1', lineItem: 'How the governance body ensures appropriate skills and competencies', lineItemZh: '治理机构确保具备相应技能和胜任能力的方式', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Basic standard — Governance', griCode: 'CSDS-GOV-1', lineItem: "Management's role in the governance processes, controls and procedures", lineItemZh: '管理层在治理流程、控制和程序中的职责', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Basic standard — Governance', griCode: 'CSDS-GOV-1', lineItem: 'Whether sustainability-related performance is incorporated in remuneration policies', lineItemZh: '可持续相关绩效是否纳入薪酬政策', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ── Basic standard — strategy ───────────────────────────────────────────────
const CSDS_STR: ItemSpec[] = [
  { subsection: 'Basic standard — Strategy', griCode: 'CSDS-STR-1', lineItem: 'Sustainability-related risks and opportunities that could reasonably be expected to affect the entity', lineItemZh: '可合理预期会对企业产生影响的可持续相关风险和机遇', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Basic standard — Strategy', griCode: 'CSDS-STR-1', lineItem: 'Significant impacts of the entity on the economy, society and environment', lineItemZh: '企业对经济、社会和环境产生的重要影响', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Basic standard — Strategy', griCode: 'CSDS-STR-1', lineItem: 'Effects on the business model and value chain', lineItemZh: '对商业模式和价值链的影响', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Basic standard — Strategy', griCode: 'CSDS-STR-1', lineItem: 'Effects on strategy and decision-making', lineItemZh: '对战略和决策的影响', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Basic standard — Strategy', griCode: 'CSDS-STR-1', lineItem: 'Current and anticipated financial effects of sustainability-related risks and opportunities', lineItemZh: '可持续相关风险和机遇当期及预期的财务影响', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Basic standard — Strategy', griCode: 'CSDS-STR-1', lineItem: 'Resilience of the strategy and business model', lineItemZh: '战略和商业模式的韧性', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ── Basic standard — IRO management and metrics & targets ───────────────────
const CSDS_IRO_MT: ItemSpec[] = [
  { subsection: 'Basic standard — Impact, risk and opportunity management', griCode: 'CSDS-IRO-1', lineItem: 'Processes to identify, assess, prioritise and monitor sustainability-related impacts, risks and opportunities', lineItemZh: '识别、评估、排序和监控可持续相关影响、风险和机遇的流程', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Basic standard — Impact, risk and opportunity management', griCode: 'CSDS-IRO-1', lineItem: 'Integration of these processes into the overall risk management process', lineItemZh: '上述流程与整体风险管理流程的融合', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Basic standard — Metrics and targets', griCode: 'CSDS-MT-1', lineItem: 'Metrics used to measure and monitor sustainability-related impacts, risks and opportunities', lineItemZh: '用于计量和监控可持续相关影响、风险和机遇的指标', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Basic standard — Metrics and targets', griCode: 'CSDS-MT-1', lineItem: 'Targets set and progress towards them', lineItemZh: '设定的目标及其进展', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ── Climate standard (trial) — governance, strategy, IRO management ─────────
const CSDS_CLIM: ItemSpec[] = [
  { subsection: 'Climate — Governance', griCode: 'CSDS-CLIM-GOV-1', lineItem: 'Governance body oversight of climate-related risks and opportunities', lineItemZh: '治理机构对气候相关风险和机遇的监督', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'TL', entryMode: 'Manual' },
  { subsection: 'Climate — Governance', griCode: 'CSDS-CLIM-GOV-1', lineItem: "Management's role in managing climate-related risks and opportunities", lineItemZh: '管理层在管理气候相关风险和机遇中的职责', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Strategy', griCode: 'CSDS-CLIM-STR-1', lineItem: 'Climate-related physical and transition risks and climate-related opportunities identified', lineItemZh: '已识别的气候相关物理风险、转型风险及气候相关机遇', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Strategy', griCode: 'CSDS-CLIM-STR-1', lineItem: 'Climate-related transition plan', lineItemZh: '气候相关转型计划', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Strategy', griCode: 'CSDS-CLIM-STR-1', lineItem: 'Climate resilience assessed through climate-related scenario analysis', lineItemZh: '基于气候相关情景分析的气候韧性评估', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Strategy', griCode: 'CSDS-CLIM-STR-1', lineItem: 'Current and anticipated financial effects of climate-related risks and opportunities', lineItemZh: '气候相关风险和机遇当期及预期的财务影响', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Climate — Impact, risk and opportunity management', griCode: 'CSDS-CLIM-IRO-1', lineItem: 'Processes to identify, assess, prioritise and monitor climate-related risks and opportunities', lineItemZh: '识别、评估、排序和监控气候相关风险和机遇的流程', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ── Climate standard — GHG emissions (calculator-linked) ────────────────────
const CSDS_GHG: ItemSpec[] = [
  { subsection: 'Climate — GHG emissions', griCode: 'CSDS-GHG-1', lineItem: 'GHG accounting basis (GB/T 32150 and applicable sector guidelines) and organisational boundary', lineItemZh: '温室气体排放核算依据（GB/T 32150 及适用的行业核算指南）及组织边界', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — GHG emissions', griCode: 'CSDS-GHG-1', lineItem: 'Scope 1 GHG emissions', lineItemZh: '范围一温室气体排放量', unit: 'tCO2e', scopeSplit: 'scope_1', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'Climate — GHG emissions', griCode: 'CSDS-GHG-1', lineItem: 'Scope 2 GHG emissions (location-based)', lineItemZh: '范围二温室气体排放量（基于位置）', unit: 'tCO2e', scopeSplit: 'scope_2_location', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'Climate — GHG emissions', griCode: 'CSDS-GHG-1', lineItem: 'Scope 2 GHG emissions (market-based, where applicable)', lineItemZh: '范围二温室气体排放量（基于市场，如适用）', unit: 'tCO2e', scopeSplit: 'scope_2_market', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'Climate — GHG emissions', griCode: 'CSDS-GHG-1', lineItem: 'Scope 3 GHG emissions', lineItemZh: '范围三温室气体排放量', unit: 'tCO2e', scopeSplit: 'scope_3', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'Climate — GHG emissions', griCode: 'CSDS-GHG-1', lineItem: 'Scope 3 categories included and measurement approach', lineItemZh: '纳入核算的范围三类别及计量方法', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — GHG emissions', griCode: 'CSDS-GHG-1', lineItem: 'GHG emissions intensity per unit of operating revenue', lineItemZh: '单位营业收入温室气体排放强度', unit: 'tCO2e/CNY million', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
]

// ── Climate standard — other metrics and targets ────────────────────────────
const CSDS_CLIM_MT: ItemSpec[] = [
  { subsection: 'Climate — Metrics and targets', griCode: 'CSDS-CLIM-MT-1', lineItem: 'Amount and percentage of assets or business activities vulnerable to physical risks', lineItemZh: '易受物理风险影响的资产或业务活动的金额及比例', unit: 'CNY', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Climate — Metrics and targets', griCode: 'CSDS-CLIM-MT-1', lineItem: 'Amount and percentage of assets or business activities vulnerable to transition risks', lineItemZh: '易受转型风险影响的资产或业务活动的金额及比例', unit: 'CNY', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Climate — Metrics and targets', griCode: 'CSDS-CLIM-MT-1', lineItem: 'Amount and percentage of assets or business activities aligned with climate-related opportunities', lineItemZh: '与气候相关机遇相匹配的资产或业务活动的金额及比例', unit: 'CNY', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Climate — Metrics and targets', griCode: 'CSDS-CLIM-MT-1', lineItem: 'Capital expenditure, financing or investment deployed towards climate-related risks and opportunities', lineItemZh: '用于应对气候相关风险和机遇的资本支出、融资或投资金额', unit: 'CNY', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Climate — Metrics and targets', griCode: 'CSDS-CLIM-MT-1', lineItem: 'Internal carbon price applied', lineItemZh: '采用的内部碳价', unit: 'CNY/tCO2e', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Climate — Metrics and targets', griCode: 'CSDS-CLIM-MT-2', lineItem: 'Climate-related targets, including GHG emission targets, base period and target year', lineItemZh: '气候相关目标（含温室气体排放目标）、基准期及目标年份', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Metrics and targets', griCode: 'CSDS-CLIM-MT-2', lineItem: 'Performance against climate-related targets', lineItemZh: '气候相关目标的完成情况', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Climate — Metrics and targets', griCode: 'CSDS-CLIM-MT-2', lineItem: 'Planned use of carbon credits to achieve net GHG emission targets', lineItemZh: '为实现温室气体净排放目标计划使用的碳信用', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

export const CN_CSDS_ITEMS: ItemSpec[] = [
  ...CSDS_GEN, ...CSDS_GOV, ...CSDS_STR, ...CSDS_IRO_MT,
  ...CSDS_CLIM, ...CSDS_GHG, ...CSDS_CLIM_MT,
]

import type { Sql } from './_db'

/**
 * Idempotent upsert that also backfills `line_item_zh` on re-runs. See the
 * note in _cnSseSeed.ts: the NULL-safe UPDATE-then-INSERT avoids duplicating
 * narrative rows whose scope_split is NULL.
 */
export async function seedCNCSDS(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS line_item_zh TEXT`
  // One HTTP round trip, one transaction: either the whole catalogue lands or none of it.
  await sql.transaction(txn => CN_CSDS_ITEMS.map(it => txn`
      WITH upd AS (
        UPDATE questionnaire_item
           SET line_item_zh = ${it.lineItemZh}::text
         WHERE gri_code = ${it.griCode}::text
           AND line_item = ${it.lineItem}::text
           AND scope_split IS NOT DISTINCT FROM ${it.scopeSplit}::text
           AND reporting_scope = ${REPORTING_SCOPE}::text
        RETURNING id
      )
      INSERT INTO questionnaire_item
        (framework_id, section, subsection, gri_code, line_item, line_item_zh, unit, scope_split,
         has_target, requires_coverage, default_workflow_role, entry_mode_default,
         footnote_refs, reporting_scope)
      SELECT
        ${FRAMEWORK_ID}::text, ${SECTION}::text, ${it.subsection}::text, ${it.griCode}::text,
        ${it.lineItem}::text, ${it.lineItemZh}::text, ${it.unit}::text, ${it.scopeSplit}::text,
        ${it.hasTarget}::boolean, ${it.requiresCoverage}::boolean,
        ${it.defaultRole}::text, ${it.entryMode}::text, '[]'::jsonb, ${REPORTING_SCOPE}::text
      WHERE NOT EXISTS (SELECT 1 FROM upd)
      ON CONFLICT (gri_code, line_item, scope_split, reporting_scope)
        DO UPDATE SET line_item_zh = EXCLUDED.line_item_zh
    `))
  // Intentionally no per-org enablement here: orgs opt in via Settings.
}
