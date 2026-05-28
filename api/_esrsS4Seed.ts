// CSRD ESRS S4 (Consumers and End-Users) — disclosure datapoint catalogue.
// Source: ESRS S4, articles S4-1 through S4-5.

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

const SECTION = 'Consumers and End-Users (ESRS S4)'
const FRAMEWORK_ID = 'csrd-s4'
const REPORTING_SCOPE: ReportingScope = 'group'

// S4-1 Policies
const S4_1: ItemSpec[] = [
  { subsection: 'S4-1 Policies', griCode: 'ESRS S4-1', lineItem: 'Policies adopted to manage material impacts on consumers and end-users', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S4-1 Policies', griCode: 'ESRS S4-1', lineItem: 'Product safety and quality policy', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S4-1 Policies', griCode: 'ESRS S4-1', lineItem: 'Data privacy and information security policy', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S4-1 Policies', griCode: 'ESRS S4-1', lineItem: 'Responsible marketing and freedom-of-information policy', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S4-1 Policies', griCode: 'ESRS S4-1', lineItem: 'Highest senior level accountable for consumer policies', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// S4-2 Engagement
const S4_2: ItemSpec[] = [
  { subsection: 'S4-2 Engagement', griCode: 'ESRS S4-2', lineItem: 'Processes for engaging with consumers and end-users about impacts', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S4-2 Engagement', griCode: 'ESRS S4-2', lineItem: 'Engagement with vulnerable consumer groups', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S4-2 Engagement', griCode: 'ESRS S4-2', lineItem: 'Role responsible for consumer engagement', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S4-2 Engagement', griCode: 'ESRS S4-2', lineItem: 'Effectiveness of engagement processes', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// S4-3 Grievance mechanisms
const S4_3: ItemSpec[] = [
  { subsection: 'S4-3 Grievance mechanisms', griCode: 'ESRS S4-3', lineItem: 'Channels available to consumers to raise concerns', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S4-3 Grievance mechanisms', griCode: 'ESRS S4-3', lineItem: 'Processes for providing remedy to consumers and end-users', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S4-3 Grievance mechanisms', griCode: 'ESRS S4-3', lineItem: 'Assessment of awareness and trust of grievance channels among consumers', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S4-3 Grievance mechanisms', griCode: 'ESRS S4-3', lineItem: 'Policies for protection against retaliation of consumers raising concerns', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// S4-4 Actions
const S4_4: ItemSpec[] = [
  { subsection: 'S4-4 Actions', griCode: 'ESRS S4-4', lineItem: 'Key actions taken to address material impacts on consumers and end-users', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S4-4 Actions', griCode: 'ESRS S4-4', lineItem: 'Number of product safety incidents in the reporting period', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S4-4 Actions', griCode: 'ESRS S4-4', lineItem: 'Number of product recalls in the reporting period', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S4-4 Actions', griCode: 'ESRS S4-4', lineItem: 'Number of substantiated complaints regarding personal data breaches', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S4-4 Actions', griCode: 'ESRS S4-4', lineItem: 'Number of customer records affected by data breaches', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S4-4 Actions', griCode: 'ESRS S4-4', lineItem: 'Number of incidents of non-compliance with product information and labelling regulations', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S4-4 Actions', griCode: 'ESRS S4-4', lineItem: 'Number of incidents of non-compliance with marketing communications regulations', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S4-4 Actions', griCode: 'ESRS S4-4', lineItem: 'Total monetary value of fines for non-compliance with consumer protection laws', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S4-4 Actions', griCode: 'ESRS S4-4', lineItem: 'Remediation actions taken following identified consumer impacts', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S4-4 Actions', griCode: 'ESRS S4-4', lineItem: 'Resources allocated to managing consumer and end-user impacts', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

// S4-5 Targets
const S4_5: ItemSpec[] = [
  { subsection: 'S4-5 Targets', griCode: 'ESRS S4-5', lineItem: 'Time-bound and outcome-oriented targets related to consumers and end-users', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S4-5 Targets', griCode: 'ESRS S4-5', lineItem: 'Target for advancing positive impacts on consumers', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S4-5 Targets', griCode: 'ESRS S4-5', lineItem: 'Progress against targets in the reporting period', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

export const ESRS_S4_ITEMS: ItemSpec[] = [
  ...S4_1, ...S4_2, ...S4_3, ...S4_4, ...S4_5,
]

import type { Sql } from './_db'

export async function seedESRSS4(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  for (const it of ESRS_S4_ITEMS) {
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
