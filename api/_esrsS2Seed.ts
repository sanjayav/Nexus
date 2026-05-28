// CSRD ESRS S2 (Workers in the value chain) — disclosure datapoint catalogue.
// Source: ESRS S2, articles S2-1 through S2-5.

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

const SECTION = 'Workers in the Value Chain (ESRS S2)'
const FRAMEWORK_ID = 'csrd-s2'
const REPORTING_SCOPE: ReportingScope = 'group'

// S2-1 Policies related to value-chain workers
const S2_1: ItemSpec[] = [
  { subsection: 'S2-1 Policies', griCode: 'ESRS S2-1', lineItem: 'Policies adopted to manage material impacts on value-chain workers', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-1 Policies', griCode: 'ESRS S2-1', lineItem: 'Human rights policy commitments covering value-chain workers', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-1 Policies', griCode: 'ESRS S2-1', lineItem: 'Supplier code of conduct covering labour and human rights standards', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-1 Policies', griCode: 'ESRS S2-1', lineItem: 'Policy alignment with UN Guiding Principles and OECD Guidelines', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-1 Policies', griCode: 'ESRS S2-1', lineItem: 'Specific policy addressing trafficking, forced labour and child labour', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-1 Policies', griCode: 'ESRS S2-1', lineItem: 'Highest senior level accountable for value-chain workforce policies', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// S2-2 Processes for engaging with value-chain workers
const S2_2: ItemSpec[] = [
  { subsection: 'S2-2 Engagement', griCode: 'ESRS S2-2', lineItem: 'Description of processes for engaging with value-chain workers', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-2 Engagement', griCode: 'ESRS S2-2', lineItem: 'Engagement carried out directly or via legitimate representatives', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-2 Engagement', griCode: 'ESRS S2-2', lineItem: 'Stages of engagement (impact assessment, action design, follow-up)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-2 Engagement', griCode: 'ESRS S2-2', lineItem: 'Effectiveness of engagement processes', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// S2-3 Processes to remediate and channels to raise concerns
const S2_3: ItemSpec[] = [
  { subsection: 'S2-3 Grievance mechanisms', griCode: 'ESRS S2-3', lineItem: 'Channels available to value-chain workers to raise concerns', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-3 Grievance mechanisms', griCode: 'ESRS S2-3', lineItem: 'Processes through which the undertaking provides for or cooperates in remediation', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-3 Grievance mechanisms', griCode: 'ESRS S2-3', lineItem: 'Assessment of awareness and trust of grievance channels among value-chain workers', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-3 Grievance mechanisms', griCode: 'ESRS S2-3', lineItem: 'Policies for protection against retaliation of workers raising concerns', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// S2-4 Actions and resources
const S2_4: ItemSpec[] = [
  { subsection: 'S2-4 Actions', griCode: 'ESRS S2-4', lineItem: 'Description of key actions taken to address material negative impacts on value-chain workers', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-4 Actions', griCode: 'ESRS S2-4', lineItem: 'Human rights due diligence processes applied across the value chain', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-4 Actions', griCode: 'ESRS S2-4', lineItem: 'Number of suppliers assessed for social or human rights impacts', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2-4 Actions', griCode: 'ESRS S2-4', lineItem: 'Number of suppliers with significant actual or potential negative impacts identified', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2-4 Actions', griCode: 'ESRS S2-4', lineItem: 'Number of severe human rights incidents identified in the value chain', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2-4 Actions', griCode: 'ESRS S2-4', lineItem: 'Number of incidents involving forced labour or trafficking in the value chain', unit: 'count', scopeSplit: 'forced_labour', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2-4 Actions', griCode: 'ESRS S2-4', lineItem: 'Number of incidents involving child labour in the value chain', unit: 'count', scopeSplit: 'child_labour', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2-4 Actions', griCode: 'ESRS S2-4', lineItem: 'Number of suppliers terminated due to social or human rights non-compliance', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S2-4 Actions', griCode: 'ESRS S2-4', lineItem: 'Remediation actions taken in response to identified severe incidents', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-4 Actions', griCode: 'ESRS S2-4', lineItem: 'Resources allocated to managing material value-chain workforce impacts', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

// S2-5 Targets
const S2_5: ItemSpec[] = [
  { subsection: 'S2-5 Targets', griCode: 'ESRS S2-5', lineItem: 'Time-bound and outcome-oriented targets related to value-chain workers', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-5 Targets', griCode: 'ESRS S2-5', lineItem: 'Workforce involvement in setting targets', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-5 Targets', griCode: 'ESRS S2-5', lineItem: 'Progress against targets in the reporting period', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-5 Targets', griCode: 'ESRS S2-5', lineItem: 'Baseline year and value used for targets', unit: 'year', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S2-5 Targets', griCode: 'ESRS S2-5', lineItem: 'Methodologies and significant assumptions used in target setting', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

export const ESRS_S2_ITEMS: ItemSpec[] = [
  ...S2_1, ...S2_2, ...S2_3, ...S2_4, ...S2_5,
]

import type { Sql } from './_db'

export async function seedESRSS2(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  for (const it of ESRS_S2_ITEMS) {
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
