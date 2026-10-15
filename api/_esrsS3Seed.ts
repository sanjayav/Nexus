// CSRD ESRS S3 (Affected Communities) — disclosure datapoint catalogue.
// Source: ESRS S3, articles S3-1 through S3-5.

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

const SECTION = 'Affected Communities (ESRS S3)'
const FRAMEWORK_ID = 'csrd-s3'
const REPORTING_SCOPE: ReportingScope = 'group'

// S3-1 Policies related to affected communities
const S3_1: ItemSpec[] = [
  { subsection: 'S3-1 Policies', griCode: 'ESRS S3-1', lineItem: 'Policies adopted to manage material impacts on affected communities', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S3-1 Policies', griCode: 'ESRS S3-1', lineItem: 'Human rights policy commitments covering affected communities and indigenous peoples', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S3-1 Policies', griCode: 'ESRS S3-1', lineItem: 'Specific policy on free, prior and informed consent (FPIC) of indigenous peoples', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S3-1 Policies', griCode: 'ESRS S3-1', lineItem: 'Policy alignment with UN Guiding Principles and OECD Guidelines', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S3-1 Policies', griCode: 'ESRS S3-1', lineItem: 'Highest senior level accountable for community policies', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// S3-2 Engagement with affected communities
const S3_2: ItemSpec[] = [
  { subsection: 'S3-2 Engagement', griCode: 'ESRS S3-2', lineItem: 'Description of processes for engaging with affected communities', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S3-2 Engagement', griCode: 'ESRS S3-2', lineItem: 'Engagement with vulnerable groups within affected communities', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S3-2 Engagement', griCode: 'ESRS S3-2', lineItem: 'Function or role responsible for ensuring engagement happens', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S3-2 Engagement', griCode: 'ESRS S3-2', lineItem: 'Effectiveness of engagement processes', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// S3-3 Remediation and grievance channels
const S3_3: ItemSpec[] = [
  { subsection: 'S3-3 Grievance mechanisms', griCode: 'ESRS S3-3', lineItem: 'Channels available to affected communities to raise concerns', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S3-3 Grievance mechanisms', griCode: 'ESRS S3-3', lineItem: 'Processes through which the undertaking provides for remedy of negative impacts', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S3-3 Grievance mechanisms', griCode: 'ESRS S3-3', lineItem: 'Assessment of awareness and trust of grievance channels among communities', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S3-3 Grievance mechanisms', griCode: 'ESRS S3-3', lineItem: 'Policies for protection against retaliation of communities raising concerns', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// S3-4 Actions and resources
const S3_4: ItemSpec[] = [
  { subsection: 'S3-4 Actions', griCode: 'ESRS S3-4', lineItem: 'Description of key actions taken to address material impacts on communities', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S3-4 Actions', griCode: 'ESRS S3-4', lineItem: 'Number of sites operating in or near indigenous peoples territories', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S3-4 Actions', griCode: 'ESRS S3-4', lineItem: 'Number of sites with formal community development programmes', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S3-4 Actions', griCode: 'ESRS S3-4', lineItem: 'Number of severe human rights incidents impacting communities', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S3-4 Actions', griCode: 'ESRS S3-4', lineItem: 'Number of community grievances received during the reporting period', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S3-4 Actions', griCode: 'ESRS S3-4', lineItem: 'Number of community grievances closed/resolved during the reporting period', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S3-4 Actions', griCode: 'ESRS S3-4', lineItem: 'Total community investment / philanthropic contributions', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S3-4 Actions', griCode: 'ESRS S3-4', lineItem: 'Number of households or persons resettled (involuntary resettlement)', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S3-4 Actions', griCode: 'ESRS S3-4', lineItem: 'Remediation actions taken in response to identified community impacts', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S3-4 Actions', griCode: 'ESRS S3-4', lineItem: 'Resources allocated to managing material community impacts', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

// S3-5 Targets
const S3_5: ItemSpec[] = [
  { subsection: 'S3-5 Targets', griCode: 'ESRS S3-5', lineItem: 'Time-bound and outcome-oriented targets related to affected communities', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S3-5 Targets', griCode: 'ESRS S3-5', lineItem: 'Target for advancing positive impacts on communities', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S3-5 Targets', griCode: 'ESRS S3-5', lineItem: 'Community involvement in setting targets', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S3-5 Targets', griCode: 'ESRS S3-5', lineItem: 'Progress against targets in the reporting period', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

export const ESRS_S3_ITEMS: ItemSpec[] = [
  ...S3_1, ...S3_2, ...S3_3, ...S3_4, ...S3_5,
]

import type { Sql } from './_db'

export async function seedESRSS3(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  for (const it of ESRS_S3_ITEMS) {
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
