// TCFD (Task Force on Climate-related Financial Disclosures) — recommendations
// catalogue. Four pillars: Governance, Strategy, Risk Management, Metrics & Targets.

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

const SECTION = 'TCFD Recommendations'
const FRAMEWORK_ID = 'tcfd'
const REPORTING_SCOPE: ReportingScope = 'group'

// Governance (Pillar 1) — G-a, G-b
const TCFD_GOV: ItemSpec[] = [
  { subsection: 'TCFD-G Governance', griCode: 'TCFD-G-A', lineItem: "Description of the board's oversight of climate-related risks and opportunities", unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'TCFD-G Governance', griCode: 'TCFD-G-A', lineItem: 'Processes and frequency by which the board is informed about climate matters', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'TCFD-G Governance', griCode: 'TCFD-G-B', lineItem: "Description of management's role in assessing and managing climate-related risks and opportunities", unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'TCFD-G Governance', griCode: 'TCFD-G-B', lineItem: 'Climate-related responsibilities assigned to specific management positions or committees', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// Strategy (Pillar 2) — S-a, S-b, S-c (scenario analysis)
const TCFD_STR: ItemSpec[] = [
  { subsection: 'TCFD-S Strategy', griCode: 'TCFD-S-A', lineItem: 'Climate-related risks and opportunities identified over short, medium and long term', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'TCFD-S Strategy', griCode: 'TCFD-S-A', lineItem: 'Classification of risks (acute/chronic physical; policy, legal, market, technology, reputation transition)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'TCFD-S Strategy', griCode: 'TCFD-S-B', lineItem: 'Impact of climate-related risks and opportunities on businesses, strategy and financial planning', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'TCFD-S Strategy', griCode: 'TCFD-S-B', lineItem: 'Description of climate-related transition plan', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'TCFD-S Strategy', griCode: 'TCFD-S-C', lineItem: 'Resilience of strategy under different climate-related scenarios', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'TCFD-S Strategy', griCode: 'TCFD-S-C', lineItem: 'Scenarios considered including a 2°C or lower scenario', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'TCFD-S Strategy', griCode: 'TCFD-S-C', lineItem: 'Time horizons and methodologies used for scenario analysis', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// Risk management (Pillar 3) — R-a, R-b, R-c
const TCFD_RM: ItemSpec[] = [
  { subsection: 'TCFD-R Risk management', griCode: 'TCFD-R-A', lineItem: 'Processes for identifying and assessing climate-related risks', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'TCFD-R Risk management', griCode: 'TCFD-R-B', lineItem: 'Processes for managing climate-related risks', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'TCFD-R Risk management', griCode: 'TCFD-R-B', lineItem: 'Decision-making processes to mitigate, transfer, accept or control climate risks', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'TCFD-R Risk management', griCode: 'TCFD-R-C', lineItem: 'How processes for identifying, assessing and managing climate-related risks are integrated into overall risk management', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// Metrics and Targets (Pillar 4) — M-a, M-b, M-c
const TCFD_MT: ItemSpec[] = [
  { subsection: 'TCFD-M Metrics and targets', griCode: 'TCFD-M-A', lineItem: 'Metrics used to assess climate-related risks and opportunities in line with strategy and risk management processes', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'TCFD-M Metrics and targets', griCode: 'TCFD-M-B', lineItem: 'Scope 1 GHG emissions', unit: 'tCO2e', scopeSplit: 'scope_1', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'TCFD-M Metrics and targets', griCode: 'TCFD-M-B', lineItem: 'Scope 2 GHG emissions', unit: 'tCO2e', scopeSplit: 'scope_2', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'TCFD-M Metrics and targets', griCode: 'TCFD-M-B', lineItem: 'Scope 3 GHG emissions (where appropriate)', unit: 'tCO2e', scopeSplit: 'scope_3', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'TCFD-M Metrics and targets', griCode: 'TCFD-M-B', lineItem: 'GHG emissions intensity per net revenue', unit: 'tCO2e/EUR million', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'TCFD-M Metrics and targets', griCode: 'TCFD-M-B', lineItem: 'Related categories, methodologies and assumptions used to calculate emissions', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'TCFD-M Metrics and targets', griCode: 'TCFD-M-C', lineItem: 'Targets used to manage climate-related risks and opportunities', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'TCFD-M Metrics and targets', griCode: 'TCFD-M-C', lineItem: 'Performance against targets', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'TCFD-M Metrics and targets', griCode: 'TCFD-M-C', lineItem: 'Internal carbon prices used', unit: 'EUR/tCO2e', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'TCFD-M Metrics and targets', griCode: 'TCFD-M-C', lineItem: 'Climate-related percentage of executive remuneration', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'TCFD-M Metrics and targets', griCode: 'TCFD-M-C', lineItem: 'Capital expenditure deployed toward low-carbon and adaptation activities', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

export const TCFD_ITEMS: ItemSpec[] = [
  ...TCFD_GOV, ...TCFD_STR, ...TCFD_RM, ...TCFD_MT,
]

import type { Sql } from './_db'

export async function seedTCFD(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  for (const it of TCFD_ITEMS) {
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
