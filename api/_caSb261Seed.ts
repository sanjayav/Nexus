// California SB 261 — Climate-Related Financial Risk Act. Requires entities
// with revenues > $500m to publish a biennial climate-related financial risk
// report aligned with TCFD or equivalent.

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

const SECTION = 'California SB 261 (Climate Risk)'
const FRAMEWORK_ID = 'ca-sb261'
const REPORTING_SCOPE: ReportingScope = 'group'

const SB261: ItemSpec[] = [
  { subsection: 'SB 261 Eligibility', griCode: 'CA-SB261-Eligibility', lineItem: 'Entity meets the $500 million gross-revenue threshold and does business in California', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SB 261 Risk disclosure', griCode: 'CA-SB261-Risk', lineItem: 'Disclosure of climate-related financial risk in accordance with TCFD framework', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SB 261 Risk disclosure', griCode: 'CA-SB261-Risk', lineItem: 'Description of physical and transition risks expected to affect the entity', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SB 261 Risk disclosure', griCode: 'CA-SB261-Risk', lineItem: 'Measures adopted to reduce and adapt to disclosed climate-related financial risk', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SB 261 Risk disclosure', griCode: 'CA-SB261-Risk', lineItem: 'Quantification of material financial impact, where reasonably estimable', unit: 'USD', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'SB 261 Risk disclosure', griCode: 'CA-SB261-Risk', lineItem: 'Description of governance and oversight of climate-related financial risk', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SB 261 Risk disclosure', griCode: 'CA-SB261-Risk', lineItem: 'Description of strategy and risk management processes covering climate risk', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SB 261 Risk disclosure', griCode: 'CA-SB261-Risk', lineItem: 'Metrics and targets used to assess and manage climate-related financial risk', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SB 261 Publication', griCode: 'CA-SB261-Publication', lineItem: 'Report publicly available on company website', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SB 261 Publication', griCode: 'CA-SB261-Publication', lineItem: 'Date of publication of the biennial climate risk report', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SB 261 Publication', griCode: 'CA-SB261-Publication', lineItem: 'Statement of any gaps relative to TCFD recommended disclosures', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SB 261 Publication', griCode: 'CA-SB261-Publication', lineItem: 'Plan and timetable to close identified gaps', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

export const CA_SB261_ITEMS: ItemSpec[] = SB261

import type { Sql } from './_db'

export async function seedCASB261(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  for (const it of CA_SB261_ITEMS) {
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
