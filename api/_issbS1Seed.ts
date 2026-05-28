// ISSB IFRS S1 (General Requirements for Disclosure of Sustainability-related
// Financial Information) — disclosure datapoint catalogue.
// Source: IFRS S1 (2023), sections on Governance, Strategy, Risk Management,
// Metrics & Targets across all sustainability-related topics.

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

const SECTION = 'General Sustainability Disclosures (IFRS S1)'
const FRAMEWORK_ID = 'issb-s1'
const REPORTING_SCOPE: ReportingScope = 'group'

// Governance (S1 paragraphs 27-29)
const S1_GOV: ItemSpec[] = [
  { subsection: 'S1 Governance', griCode: 'IFRS S1-27', lineItem: 'Identification of governance body or individual responsible for oversight of sustainability-related risks and opportunities', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Governance', griCode: 'IFRS S1-27', lineItem: 'How responsibilities for sustainability oversight are reflected in terms of reference', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Governance', griCode: 'IFRS S1-27', lineItem: 'How the governance body ensures appropriate skills and competencies are available', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Governance', griCode: 'IFRS S1-27', lineItem: 'Frequency of governance body reporting on sustainability', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Governance', griCode: 'IFRS S1-27', lineItem: 'Whether sustainability performance metrics are linked to remuneration policies', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Governance', griCode: 'IFRS S1-27', lineItem: 'Role of management in assessment and management of sustainability risks and opportunities', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// Strategy (S1 paragraphs 30-42)
const S1_STR: ItemSpec[] = [
  { subsection: 'S1 Strategy', griCode: 'IFRS S1-30', lineItem: 'Sustainability-related risks and opportunities that could reasonably be expected to affect prospects', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Strategy', griCode: 'IFRS S1-30', lineItem: 'Time horizons over which risks and opportunities could be expected to occur (short, medium, long term)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Strategy', griCode: 'IFRS S1-32', lineItem: 'Effects of risks and opportunities on business model and value chain', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Strategy', griCode: 'IFRS S1-33', lineItem: 'Effects on strategy and decision-making', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Strategy', griCode: 'IFRS S1-34', lineItem: 'Effects on financial position, performance and cash flows in the reporting period', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1 Strategy', griCode: 'IFRS S1-35', lineItem: 'Anticipated effects on financial position, performance and cash flows over short, medium and long term', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1 Strategy', griCode: 'IFRS S1-41', lineItem: 'Resilience of strategy and business model to sustainability-related risks', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// Risk management (S1 paragraphs 43-44)
const S1_RM: ItemSpec[] = [
  { subsection: 'S1 Risk management', griCode: 'IFRS S1-44', lineItem: 'Processes used to identify, assess, prioritise and monitor sustainability-related risks', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Risk management', griCode: 'IFRS S1-44', lineItem: 'Inputs and parameters used (e.g. data sources, scope of operations)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Risk management', griCode: 'IFRS S1-44', lineItem: 'Use of scenario analysis to inform identification of risks', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Risk management', griCode: 'IFRS S1-44', lineItem: 'How the nature, likelihood and magnitude of risk effects are assessed', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Risk management', griCode: 'IFRS S1-44', lineItem: 'How sustainability-related risks are prioritised relative to other risks', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Risk management', griCode: 'IFRS S1-44', lineItem: 'Processes used to identify and monitor sustainability-related opportunities', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Risk management', griCode: 'IFRS S1-44', lineItem: 'Integration of sustainability risk management into overall enterprise risk management', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// Metrics and targets (S1 paragraphs 45-50)
const S1_MT: ItemSpec[] = [
  { subsection: 'S1 Metrics and targets', griCode: 'IFRS S1-46', lineItem: 'Metrics used to measure and monitor sustainability-related risk', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Metrics and targets', griCode: 'IFRS S1-46', lineItem: 'Metrics used to measure and monitor sustainability-related opportunity performance', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Metrics and targets', griCode: 'IFRS S1-47', lineItem: 'Targets used to monitor progress and any required regulatory targets', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Metrics and targets', griCode: 'IFRS S1-47', lineItem: 'Target metric and time horizon', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Metrics and targets', griCode: 'IFRS S1-47', lineItem: 'Base period or baseline against which progress is measured', unit: 'year', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 Metrics and targets', griCode: 'IFRS S1-47', lineItem: 'Performance against each target in the reporting period', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// Sources of guidance & general reporting principles
const S1_REP: ItemSpec[] = [
  { subsection: 'S1 Sources of guidance', griCode: 'IFRS S1-58', lineItem: 'Sources of guidance considered when identifying material sustainability information (SASB Standards)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 General requirements', griCode: 'IFRS S1-72', lineItem: 'Statement of compliance with ISSB Standards', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 General requirements', griCode: 'IFRS S1-78', lineItem: 'Reporting entity and boundaries (consolidation with financial statements)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 General requirements', griCode: 'IFRS S1-78', lineItem: 'Connected information across sustainability disclosures and with financial statements', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 General requirements', griCode: 'IFRS S1-87', lineItem: 'Comparative information for the prior period', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1 General requirements', griCode: 'IFRS S1-88', lineItem: 'Frequency of reporting (aligned with financial reporting cycle)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

export const ISSB_S1_ITEMS: ItemSpec[] = [
  ...S1_GOV, ...S1_STR, ...S1_RM, ...S1_MT, ...S1_REP,
]

import type { Sql } from './_db'

export async function seedISSBS1(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  for (const it of ISSB_S1_ITEMS) {
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
