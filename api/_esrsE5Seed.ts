// CSRD ESRS E5 (Resource Use and Circular Economy) — disclosure datapoint catalogue.
// Source: ESRS E5, articles E5-1 through E5-6.

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

const SECTION = 'Resource Use and Circular Economy (ESRS E5)'
const FRAMEWORK_ID = 'csrd-e5'
const REPORTING_SCOPE: ReportingScope = 'group'

// E5-1 Policies
const E5_1: ItemSpec[] = [
  { subsection: 'E5-1 Circular economy policies', griCode: 'ESRS E5-1', lineItem: 'Policies adopted to manage material resource use and circular economy impacts', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E5-1 Circular economy policies', griCode: 'ESRS E5-1', lineItem: 'Policy addresses resource efficiency in product design', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E5-1 Circular economy policies', griCode: 'ESRS E5-1', lineItem: 'Policy addresses circular product design (durability, reparability, recyclability)', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E5-1 Circular economy policies', griCode: 'ESRS E5-1', lineItem: 'Policy addresses waste hierarchy (prevention, reuse, recycling, recovery, disposal)', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// E5-2 Actions
const E5_2: ItemSpec[] = [
  { subsection: 'E5-2 Circular economy actions', griCode: 'ESRS E5-2', lineItem: 'Description of key actions to increase circularity of materials and products', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E5-2 Circular economy actions', griCode: 'ESRS E5-2', lineItem: 'CapEx allocated to circular economy initiatives', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E5-2 Circular economy actions', griCode: 'ESRS E5-2', lineItem: 'OpEx allocated to circular economy initiatives', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

// E5-3 Targets
const E5_3: ItemSpec[] = [
  { subsection: 'E5-3 Circular economy targets', griCode: 'ESRS E5-3', lineItem: 'Target for increasing share of recycled / secondary materials in product design', unit: '%', scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E5-3 Circular economy targets', griCode: 'ESRS E5-3', lineItem: 'Target for waste reduction', unit: 't', scopeSplit: 'waste_reduction', hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E5-3 Circular economy targets', griCode: 'ESRS E5-3', lineItem: 'Target for waste diversion from landfill', unit: '%', scopeSplit: 'diversion_landfill', hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E5-3 Circular economy targets', griCode: 'ESRS E5-3', lineItem: 'Base year and value used for circular economy targets', unit: 'year', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// E5-4 Resource inflows
const E5_4: ItemSpec[] = [
  { subsection: 'E5-4 Resource inflows', griCode: 'ESRS E5-4', lineItem: 'Total weight of materials used to produce the undertakings primary products', unit: 't', scopeSplit: 'inflow_total', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E5-4 Resource inflows', griCode: 'ESRS E5-4', lineItem: 'Weight of biological materials used', unit: 't', scopeSplit: 'biological', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E5-4 Resource inflows', griCode: 'ESRS E5-4', lineItem: 'Weight of technical (non-biological) materials used', unit: 't', scopeSplit: 'technical', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E5-4 Resource inflows', griCode: 'ESRS E5-4', lineItem: 'Weight of secondary (recycled / reused) materials used', unit: 't', scopeSplit: 'secondary', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E5-4 Resource inflows', griCode: 'ESRS E5-4', lineItem: 'Share of secondary materials in total inflows', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E5-4 Resource inflows', griCode: 'ESRS E5-4', lineItem: 'Weight of sustainably sourced renewable materials', unit: 't', scopeSplit: 'sustainably_sourced', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
]

// E5-5 Resource outflows (products, materials, waste)
const E5_5: ItemSpec[] = [
  { subsection: 'E5-5 Products and materials', griCode: 'ESRS E5-5', lineItem: 'Expected durability of products placed on the market', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E5-5 Products and materials', griCode: 'ESRS E5-5', lineItem: 'Repairability of products placed on the market', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E5-5 Products and materials', griCode: 'ESRS E5-5', lineItem: 'Recyclability rate of products placed on the market', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E5-5 Products and materials', griCode: 'ESRS E5-5', lineItem: 'Recycled content of products placed on the market', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E5-5 Waste', griCode: 'ESRS E5-5', lineItem: 'Total waste generated', unit: 't', scopeSplit: 'waste_total', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E5-5 Waste', griCode: 'ESRS E5-5', lineItem: 'Total hazardous waste generated', unit: 't', scopeSplit: 'hazardous', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E5-5 Waste', griCode: 'ESRS E5-5', lineItem: 'Total non-hazardous waste generated', unit: 't', scopeSplit: 'non_hazardous', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E5-5 Waste', griCode: 'ESRS E5-5', lineItem: 'Total waste diverted from disposal — preparation for reuse', unit: 't', scopeSplit: 'reuse', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E5-5 Waste', griCode: 'ESRS E5-5', lineItem: 'Total waste diverted from disposal — recycling', unit: 't', scopeSplit: 'recycling', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E5-5 Waste', griCode: 'ESRS E5-5', lineItem: 'Total waste diverted from disposal — other recovery operations', unit: 't', scopeSplit: 'other_recovery', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E5-5 Waste', griCode: 'ESRS E5-5', lineItem: 'Total waste directed to disposal — incineration with energy recovery', unit: 't', scopeSplit: 'incineration_recovery', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E5-5 Waste', griCode: 'ESRS E5-5', lineItem: 'Total waste directed to disposal — incineration without energy recovery', unit: 't', scopeSplit: 'incineration_no_recovery', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E5-5 Waste', griCode: 'ESRS E5-5', lineItem: 'Total waste directed to disposal — landfilling', unit: 't', scopeSplit: 'landfill', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E5-5 Waste', griCode: 'ESRS E5-5', lineItem: 'Total waste directed to disposal — other disposal operations', unit: 't', scopeSplit: 'other_disposal', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E5-5 Waste', griCode: 'ESRS E5-5', lineItem: 'Total amount of non-recycled waste', unit: 't', scopeSplit: 'non_recycled', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E5-5 Waste', griCode: 'ESRS E5-5', lineItem: 'Total radioactive waste generated', unit: 't', scopeSplit: 'radioactive', hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

// E5-6 Anticipated financial effects
const E5_6: ItemSpec[] = [
  { subsection: 'E5-6 Financial effects', griCode: 'ESRS E5-6', lineItem: 'Assets at material resource use / circular economy risk — gross book value', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E5-6 Financial effects', griCode: 'ESRS E5-6', lineItem: 'Net revenue from circular products and services', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E5-6 Financial effects', griCode: 'ESRS E5-6', lineItem: 'Anticipated financial effects from material circular economy opportunities', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

export const ESRS_E5_ITEMS: ItemSpec[] = [
  ...E5_1, ...E5_2, ...E5_3, ...E5_4, ...E5_5, ...E5_6,
]

import type { Sql } from './_db'

export async function seedESRSE5(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  for (const it of ESRS_E5_ITEMS) {
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
