// ISSB IFRS S2 (Climate-related Disclosures) — disclosure datapoint catalogue.
// Source: IFRS S2 (2023). Governance, Strategy (incl. climate resilience and
// scenario analysis), Risk Management, Cross-industry and industry-based metrics.

export type WorkflowRole = 'AUTO' | 'FM' | 'SO' | 'TL'
export type EntryMode = 'Manual' | 'Calculator' | 'Connector'
export type ReportingScope = 'group' | 'jv'

export interface ItemSpec {
  subsection: string
  griCode: string
  lineItem: string
  unit: string | null
  scopeSplit: string | null
  hasTarget: boolean
  requiresCoverage: boolean
  defaultRole: WorkflowRole
  entryMode: EntryMode
}

const SECTION = 'Climate (IFRS S2)'
const FRAMEWORK_ID = 'issb-s2'
const REPORTING_SCOPE: ReportingScope = 'group'

// Governance (S2 paragraphs 5-7)
const S2_GOV: ItemSpec[] = [
  { subsection: 'S2 Governance', griCode: 'IFRS S2-6', lineItem: 'Governance body or individual responsible for oversight of climate-related risks and opportunities', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Governance', griCode: 'IFRS S2-6', lineItem: 'How responsibilities for climate oversight are reflected in terms of reference', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Governance', griCode: 'IFRS S2-6', lineItem: 'How the body ensures appropriate climate-related skills and competencies', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Governance', griCode: 'IFRS S2-6', lineItem: 'Frequency of governance body reporting on climate matters', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Governance', griCode: 'IFRS S2-6', lineItem: 'Whether climate performance is linked to executive remuneration', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Governance', griCode: 'IFRS S2-6', lineItem: 'Role of management in assessment and management of climate risks and opportunities', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// Strategy (S2 paragraphs 8-22) — incl. climate resilience / scenario analysis
const S2_STR: ItemSpec[] = [
  { subsection: 'S2 Strategy', griCode: 'IFRS S2-10', lineItem: 'Description of climate-related risks and opportunities identified', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Strategy', griCode: 'IFRS S2-10', lineItem: 'Classification of physical and transition risks (acute/chronic; policy, legal, market, tech, reputation)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Strategy', griCode: 'IFRS S2-10', lineItem: 'Time horizons used (short, medium, long term) and rationale', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Strategy', griCode: 'IFRS S2-13', lineItem: 'Current and anticipated effects on business model and value chain', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Strategy', griCode: 'IFRS S2-14', lineItem: 'Effects on strategy and decision-making, including transition plans', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Strategy', griCode: 'IFRS S2-14', lineItem: 'Climate-related transition plan disclosure', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Strategy', griCode: 'IFRS S2-14', lineItem: 'Key assumptions used in developing the transition plan', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Strategy', griCode: 'IFRS S2-14', lineItem: 'Dependencies the transition plan relies on (e.g. policy, technology, infrastructure)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Strategy', griCode: 'IFRS S2-15', lineItem: 'Effects on financial position, performance and cash flows in the reporting period', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2 Strategy', griCode: 'IFRS S2-16', lineItem: 'Anticipated effects on financial position, performance and cash flows', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2 Climate resilience', griCode: 'IFRS S2-22', lineItem: 'Climate-related scenario analysis used to assess resilience', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Climate resilience', griCode: 'IFRS S2-22', lineItem: 'Scenarios used (incl. a 1.5°C-aligned scenario)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Climate resilience', griCode: 'IFRS S2-22', lineItem: 'Time horizon over which resilience is assessed', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Climate resilience', griCode: 'IFRS S2-22', lineItem: 'Implications for the business model and strategy from scenario analysis', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// Risk management (S2 paragraphs 25-27)
const S2_RM: ItemSpec[] = [
  { subsection: 'S2 Risk management', griCode: 'IFRS S2-25', lineItem: 'Processes used to identify, assess, prioritise and monitor climate-related risks', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Risk management', griCode: 'IFRS S2-25', lineItem: 'Inputs and parameters used (data sources, scope)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Risk management', griCode: 'IFRS S2-25', lineItem: 'Use of scenario analysis to inform identification of risks', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Risk management', griCode: 'IFRS S2-25', lineItem: 'Processes used to identify and monitor climate-related opportunities', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Risk management', griCode: 'IFRS S2-25', lineItem: 'Integration of climate risk management into overall enterprise risk management', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// Cross-industry metrics (S2 paragraphs 28-29) — GHG emissions, climate-related
// risk, climate-related opportunity, capital deployment, internal carbon prices, etc.
const S2_CROSS: ItemSpec[] = [
  { subsection: 'S2-29 Cross-industry metrics', griCode: 'IFRS S2-29', lineItem: 'Absolute gross Scope 1 GHG emissions', unit: 'tCO2e', scopeSplit: 'scope_1', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'S2-29 Cross-industry metrics', griCode: 'IFRS S2-29', lineItem: 'Absolute gross Scope 2 GHG emissions (location-based)', unit: 'tCO2e', scopeSplit: 'scope_2_loc', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'S2-29 Cross-industry metrics', griCode: 'IFRS S2-29', lineItem: 'Absolute gross Scope 2 GHG emissions (market-based)', unit: 'tCO2e', scopeSplit: 'scope_2_mkt', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'S2-29 Cross-industry metrics', griCode: 'IFRS S2-29', lineItem: 'Absolute gross Scope 3 GHG emissions', unit: 'tCO2e', scopeSplit: 'scope_3', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'S2-29 Cross-industry metrics', griCode: 'IFRS S2-29', lineItem: 'Scope 3 categories included in calculation', unit: null, scopeSplit: 'scope_3_categories', hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-29 Cross-industry metrics', griCode: 'IFRS S2-29', lineItem: 'Measurement approach, inputs and assumptions used for GHG emissions', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-29 Cross-industry metrics', griCode: 'IFRS S2-29', lineItem: 'Reason for any change to measurement approach', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-29(a) Physical risks', griCode: 'IFRS S2-29(a)', lineItem: 'Amount and percentage of assets vulnerable to acute physical risks', unit: 'EUR', scopeSplit: 'acute', hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2-29(a) Physical risks', griCode: 'IFRS S2-29(a)', lineItem: 'Amount and percentage of assets vulnerable to chronic physical risks', unit: 'EUR', scopeSplit: 'chronic', hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2-29(a) Physical risks', griCode: 'IFRS S2-29(a)', lineItem: 'Amount and percentage of business activities vulnerable to physical risks', unit: 'EUR', scopeSplit: 'business_activities', hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2-29(b) Transition risks', griCode: 'IFRS S2-29(b)', lineItem: 'Amount and percentage of assets vulnerable to transition risks', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2-29(b) Transition risks', griCode: 'IFRS S2-29(b)', lineItem: 'Amount and percentage of business activities vulnerable to transition risks', unit: 'EUR', scopeSplit: 'business_activities', hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2-29(c) Opportunities', griCode: 'IFRS S2-29(c)', lineItem: 'Amount and percentage of assets aligned with climate-related opportunities', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2-29(d) Capital deployment', griCode: 'IFRS S2-29(d)', lineItem: 'Amount of capital expenditure deployed toward climate-related risks and opportunities', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2-29(d) Capital deployment', griCode: 'IFRS S2-29(d)', lineItem: 'Amount of financing deployed toward climate-related risks and opportunities', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2-29(e) Internal carbon prices', griCode: 'IFRS S2-29(e)', lineItem: 'Whether internal carbon prices are applied', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-29(e) Internal carbon prices', griCode: 'IFRS S2-29(e)', lineItem: 'Internal carbon price applied (per tCO2e)', unit: 'EUR/tCO2e', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2-29(e) Internal carbon prices', griCode: 'IFRS S2-29(e)', lineItem: 'Scope of application of the internal carbon price', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-29(f) Remuneration', griCode: 'IFRS S2-29(f)', lineItem: 'Percentage of executive remuneration linked to climate-related considerations', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

// Targets (S2 paragraphs 33-37)
const S2_TARG: ItemSpec[] = [
  { subsection: 'S2 Climate targets', griCode: 'IFRS S2-33', lineItem: 'Quantitative or qualitative climate-related target', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Climate targets', griCode: 'IFRS S2-33', lineItem: 'Metric used to set the target', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Climate targets', griCode: 'IFRS S2-33', lineItem: 'Period over which the target applies (target year)', unit: 'year', scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Climate targets', griCode: 'IFRS S2-33', lineItem: 'Base period used to measure progress', unit: 'year', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Climate targets', griCode: 'IFRS S2-33', lineItem: 'Whether the target was informed by latest international agreement on climate change', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Climate targets', griCode: 'IFRS S2-33', lineItem: 'Whether the target has been validated by a third party', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Climate targets', griCode: 'IFRS S2-36', lineItem: 'Performance against each target in the reporting period', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Climate targets', griCode: 'IFRS S2-36', lineItem: 'Planned use of carbon credits to offset GHG emissions to meet net emissions target', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2 Climate targets', griCode: 'IFRS S2-36', lineItem: 'Extent to which carbon credits are based on removals vs reductions', unit: '%', scopeSplit: 'removal_vs_reduction', hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// Industry-based metrics — sample 1-2 industries (Oil & Gas; Electric Utilities)
const S2_IND: ItemSpec[] = [
  { subsection: 'S2 Industry metrics — Oil & Gas', griCode: 'IFRS S2-32', lineItem: 'Methane emissions from operations', unit: 't_CH4', scopeSplit: 'methane', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'S2 Industry metrics — Oil & Gas', griCode: 'IFRS S2-32', lineItem: 'Hydrocarbon reserves and resources by category', unit: 'MMboe', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2 Industry metrics — Electric Utilities', griCode: 'IFRS S2-32', lineItem: 'Electricity generation by primary energy source', unit: 'MWh', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2 Industry metrics — Electric Utilities', griCode: 'IFRS S2-32', lineItem: 'Average GHG emissions intensity of electricity generation', unit: 'tCO2e/MWh', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
]

export const ISSB_S2_ITEMS: ItemSpec[] = [
  ...S2_GOV, ...S2_STR, ...S2_RM, ...S2_CROSS, ...S2_TARG, ...S2_IND,
]

import type { Sql } from './_db'

export async function seedISSBS2(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  for (const it of ISSB_S2_ITEMS) {
    await sql`
      INSERT INTO questionnaire_item
        (framework_id, section, subsection, gri_code, line_item, unit, scope_split,
         has_target, requires_coverage, default_workflow_role, entry_mode_default,
         footnote_refs, reporting_scope)
      VALUES
        (${FRAMEWORK_ID}, ${SECTION}, ${it.subsection}, ${it.griCode}, ${it.lineItem},
         ${it.unit}, ${it.scopeSplit}, ${it.hasTarget}, ${it.requiresCoverage},
         ${it.defaultRole}, ${it.entryMode}, '[]'::jsonb, ${REPORTING_SCOPE})
      ON CONFLICT (gri_code, line_item, scope_split, reporting_scope) DO NOTHING
    `
  }
  await sql`
    INSERT INTO org_framework_enablement (org_id, framework_id, enabled, enabled_by)
    VALUES ('00000000-0000-0000-0000-000000000001', ${FRAMEWORK_ID}, true,
            '00000000-0000-0000-0000-000000000100')
    ON CONFLICT (org_id, framework_id) DO UPDATE SET enabled = true
  `
}
