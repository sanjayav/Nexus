// CSRD ESRS E3 (Water and Marine Resources) — disclosure datapoint catalogue.
// Source: ESRS E3, articles E3-1 through E3-5.

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

const SECTION = 'Water and Marine Resources (ESRS E3)'
const FRAMEWORK_ID = 'csrd-e3'
const REPORTING_SCOPE: ReportingScope = 'group'

// E3-1 Policies
const E3_1: ItemSpec[] = [
  { subsection: 'E3-1 Water policies', griCode: 'ESRS E3-1', lineItem: 'Policies adopted to manage material water and marine resource impacts', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E3-1 Water policies', griCode: 'ESRS E3-1', lineItem: 'Policy addresses water consumption and withdrawal', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E3-1 Water policies', griCode: 'ESRS E3-1', lineItem: 'Policy addresses operations in water-stressed areas', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E3-1 Water policies', griCode: 'ESRS E3-1', lineItem: 'Highest senior management level accountable for water policies', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// E3-2 Actions and resources
const E3_2: ItemSpec[] = [
  { subsection: 'E3-2 Water actions', griCode: 'ESRS E3-2', lineItem: 'Description of key actions to reduce water consumption and improve water efficiency', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E3-2 Water actions', griCode: 'ESRS E3-2', lineItem: 'CapEx allocated to water-related actions', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E3-2 Water actions', griCode: 'ESRS E3-2', lineItem: 'OpEx allocated to water-related actions', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

// E3-3 Targets
const E3_3: ItemSpec[] = [
  { subsection: 'E3-3 Water targets', griCode: 'ESRS E3-3', lineItem: 'Water withdrawal reduction target — total operations', unit: 'm3', scopeSplit: 'withdrawal_target', hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E3-3 Water targets', griCode: 'ESRS E3-3', lineItem: 'Water withdrawal reduction target — water-stressed areas', unit: 'm3', scopeSplit: 'withdrawal_stressed', hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E3-3 Water targets', griCode: 'ESRS E3-3', lineItem: 'Water consumption reduction target', unit: 'm3', scopeSplit: 'consumption_target', hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E3-3 Water targets', griCode: 'ESRS E3-3', lineItem: 'Base year used for water targets', unit: 'year', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// E3-4 Water consumption
const E3_4: ItemSpec[] = [
  { subsection: 'E3-4 Water consumption', griCode: 'ESRS E3-4', lineItem: 'Total water withdrawal from all sources', unit: 'm3', scopeSplit: 'withdrawal_total', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E3-4 Water consumption', griCode: 'ESRS E3-4', lineItem: 'Water withdrawal from surface water (rivers, lakes)', unit: 'm3', scopeSplit: 'surface_water', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E3-4 Water consumption', griCode: 'ESRS E3-4', lineItem: 'Water withdrawal from groundwater', unit: 'm3', scopeSplit: 'groundwater', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E3-4 Water consumption', griCode: 'ESRS E3-4', lineItem: 'Water withdrawal from seawater', unit: 'm3', scopeSplit: 'seawater', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E3-4 Water consumption', griCode: 'ESRS E3-4', lineItem: 'Water withdrawal from third-party / municipal water supplies', unit: 'm3', scopeSplit: 'third_party', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E3-4 Water consumption', griCode: 'ESRS E3-4', lineItem: 'Water withdrawal in areas of high water stress', unit: 'm3', scopeSplit: 'withdrawal_stress', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E3-4 Water consumption', griCode: 'ESRS E3-4', lineItem: 'Total water discharge', unit: 'm3', scopeSplit: 'discharge_total', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E3-4 Water consumption', griCode: 'ESRS E3-4', lineItem: 'Water discharge in areas of high water stress', unit: 'm3', scopeSplit: 'discharge_stress', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E3-4 Water consumption', griCode: 'ESRS E3-4', lineItem: 'Total water consumption (withdrawal minus discharge)', unit: 'm3', scopeSplit: 'consumption_total', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E3-4 Water consumption', griCode: 'ESRS E3-4', lineItem: 'Water consumption in areas of high water stress', unit: 'm3', scopeSplit: 'consumption_stress', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E3-4 Water consumption', griCode: 'ESRS E3-4', lineItem: 'Total water recycled and reused', unit: 'm3', scopeSplit: 'recycled', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E3-4 Water consumption', griCode: 'ESRS E3-4', lineItem: 'Total water stored at start of reporting period', unit: 'm3', scopeSplit: 'storage_start', hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E3-4 Water consumption', griCode: 'ESRS E3-4', lineItem: 'Total water stored at end of reporting period', unit: 'm3', scopeSplit: 'storage_end', hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E3-4 Water consumption', griCode: 'ESRS E3-4', lineItem: 'Water intensity per net revenue', unit: 'm3/EUR million', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
]

// E3-5 Anticipated financial effects
const E3_5: ItemSpec[] = [
  { subsection: 'E3-5 Financial effects', griCode: 'ESRS E3-5', lineItem: 'Assets at material water-related risk — gross book value', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E3-5 Financial effects', griCode: 'ESRS E3-5', lineItem: 'Net revenue from products and services in water-stressed areas', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E3-5 Financial effects', griCode: 'ESRS E3-5', lineItem: 'Anticipated financial effects from material water-related opportunities', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

export const ESRS_E3_ITEMS: ItemSpec[] = [
  ...E3_1, ...E3_2, ...E3_3, ...E3_4, ...E3_5,
]

import type { Sql } from './_db'

export async function seedESRSE3(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  for (const it of ESRS_E3_ITEMS) {
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
