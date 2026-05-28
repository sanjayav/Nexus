// California SB 253 — Climate Corporate Data Accountability Act (CCDAA).
// Requires US-doing-business entities with revenues > $1bn to disclose
// Scope 1, 2 (FY2026) and Scope 3 (FY2027) with phased third-party assurance.

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

const SECTION = 'California SB 253 (CCDAA)'
const FRAMEWORK_ID = 'ca-sb253'
const REPORTING_SCOPE: ReportingScope = 'group'

const SB253: ItemSpec[] = [
  { subsection: 'SB 253 Eligibility', griCode: 'CA-SB253-Eligibility', lineItem: 'Entity meets the $1 billion gross-revenue threshold and does business in California', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SB 253 Scope 1 emissions', griCode: 'CA-SB253-Scope1', lineItem: 'Scope 1 GHG emissions calculated on an operational-control basis', unit: 'tCO2e', scopeSplit: 'scope_1', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'SB 253 Scope 2 emissions', griCode: 'CA-SB253-Scope2', lineItem: 'Scope 2 GHG emissions calculated on an operational-control basis (location-based)', unit: 'tCO2e', scopeSplit: 'scope_2_loc', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'SB 253 Scope 2 emissions', griCode: 'CA-SB253-Scope2', lineItem: 'Scope 2 GHG emissions (market-based, supplementary)', unit: 'tCO2e', scopeSplit: 'scope_2_mkt', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'SB 253 Scope 3 emissions', griCode: 'CA-SB253-Scope3', lineItem: 'Scope 3 GHG emissions disclosure (required from FY2027)', unit: 'tCO2e', scopeSplit: 'scope_3', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'SB 253 Scope 3 emissions', griCode: 'CA-SB253-Scope3', lineItem: 'Categories of Scope 3 included and methodology', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SB 253 Assurance', griCode: 'CA-SB253-Assurance', lineItem: 'Limited assurance status for Scope 1 + 2 (from FY2026)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SB 253 Assurance', griCode: 'CA-SB253-Assurance', lineItem: 'Reasonable assurance status for Scope 1 + 2 (planned from FY2030)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SB 253 Assurance', griCode: 'CA-SB253-Assurance', lineItem: 'Limited assurance status for Scope 3 (planned from FY2030)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SB 253 Methodology', griCode: 'CA-SB253-Methodology', lineItem: 'Conformance with GHG Protocol Corporate Standard', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SB 253 Methodology', griCode: 'CA-SB253-Methodology', lineItem: 'Name of independent third-party assurance provider', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SB 253 Reporting', griCode: 'CA-SB253-Reporting', lineItem: 'Reporting submission via the emissions-reporting platform designated by CARB', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

export const CA_SB253_ITEMS: ItemSpec[] = SB253

import type { Sql } from './_db'

export async function seedCASB253(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  for (const it of CA_SB253_ITEMS) {
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
