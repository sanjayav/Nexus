// CSRD ESRS E2 (Pollution) — disclosure datapoint catalogue.
// Source: ESRS E2, articles E2-1 through E2-6.

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

const SECTION = 'Pollution (ESRS E2)'
const FRAMEWORK_ID = 'csrd-e2'
const REPORTING_SCOPE: ReportingScope = 'group'

// E2-1 Policies related to pollution
const E2_1: ItemSpec[] = [
  { subsection: 'E2-1 Pollution policies', griCode: 'ESRS E2-1', lineItem: 'Policies adopted to manage material pollution impacts, risks and opportunities', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E2-1 Pollution policies', griCode: 'ESRS E2-1', lineItem: 'Policy addresses pollution prevention and control', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E2-1 Pollution policies', griCode: 'ESRS E2-1', lineItem: 'Policy addresses substances of concern and substances of very high concern', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E2-1 Pollution policies', griCode: 'ESRS E2-1', lineItem: 'Highest senior management level accountable for pollution policies', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// E2-2 Actions and resources
const E2_2: ItemSpec[] = [
  { subsection: 'E2-2 Pollution actions', griCode: 'ESRS E2-2', lineItem: 'Description of key actions taken to prevent or reduce pollution', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E2-2 Pollution actions', griCode: 'ESRS E2-2', lineItem: 'CapEx allocated to pollution prevention and control actions', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E2-2 Pollution actions', griCode: 'ESRS E2-2', lineItem: 'OpEx allocated to pollution prevention and control actions', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

// E2-3 Targets
const E2_3: ItemSpec[] = [
  { subsection: 'E2-3 Pollution targets', griCode: 'ESRS E2-3', lineItem: 'Emission reduction targets for air pollutants', unit: 't', scopeSplit: 'air', hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E2-3 Pollution targets', griCode: 'ESRS E2-3', lineItem: 'Emission reduction targets for water pollutants', unit: 't', scopeSplit: 'water', hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E2-3 Pollution targets', griCode: 'ESRS E2-3', lineItem: 'Targets for substances of concern phase-out', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E2-3 Pollution targets', griCode: 'ESRS E2-3', lineItem: 'Base year used for pollution targets', unit: 'year', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// E2-4 Pollution of air, water and soil
const E2_4: ItemSpec[] = [
  { subsection: 'E2-4 Emissions to air', griCode: 'ESRS E2-4', lineItem: 'Nitrogen oxides (NOx) emissions to air', unit: 't', scopeSplit: 'nox', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E2-4 Emissions to air', griCode: 'ESRS E2-4', lineItem: 'Sulphur oxides (SOx) emissions to air', unit: 't', scopeSplit: 'sox', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E2-4 Emissions to air', griCode: 'ESRS E2-4', lineItem: 'Particulate matter (PM10) emissions to air', unit: 't', scopeSplit: 'pm10', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E2-4 Emissions to air', griCode: 'ESRS E2-4', lineItem: 'Particulate matter (PM2.5) emissions to air', unit: 't', scopeSplit: 'pm2_5', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E2-4 Emissions to air', griCode: 'ESRS E2-4', lineItem: 'Volatile organic compounds (VOCs) emissions to air', unit: 't', scopeSplit: 'vocs', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E2-4 Emissions to air', griCode: 'ESRS E2-4', lineItem: 'Heavy metals emissions to air (mercury, cadmium, lead aggregated)', unit: 't', scopeSplit: 'heavy_metals_air', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E2-4 Emissions to water', griCode: 'ESRS E2-4', lineItem: 'Total nitrogen emissions to water', unit: 't', scopeSplit: 'water_nitrogen', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E2-4 Emissions to water', griCode: 'ESRS E2-4', lineItem: 'Total phosphorus emissions to water', unit: 't', scopeSplit: 'water_phosphorus', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E2-4 Emissions to water', griCode: 'ESRS E2-4', lineItem: 'Heavy metals emissions to water', unit: 't', scopeSplit: 'heavy_metals_water', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E2-4 Emissions to water', griCode: 'ESRS E2-4', lineItem: 'Chemical oxygen demand (COD) emissions to water', unit: 't', scopeSplit: 'cod', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E2-4 Emissions to soil', griCode: 'ESRS E2-4', lineItem: 'Total quantity of substances emitted to soil', unit: 't', scopeSplit: 'soil_total', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E2-4 Emissions to soil', griCode: 'ESRS E2-4', lineItem: 'Microplastics generated and released', unit: 't', scopeSplit: 'microplastics', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
]

// E2-5 Substances of concern and substances of very high concern
const E2_5: ItemSpec[] = [
  { subsection: 'E2-5 Substances of concern', griCode: 'ESRS E2-5', lineItem: 'Total quantity of substances of concern produced, used or sold', unit: 't', scopeSplit: 'soc_total', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E2-5 Substances of concern', griCode: 'ESRS E2-5', lineItem: 'Total quantity of substances of very high concern produced, used or sold', unit: 't', scopeSplit: 'svhc_total', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E2-5 Substances of concern', griCode: 'ESRS E2-5', lineItem: 'Breakdown of substances of concern by hazard class', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E2-5 Substances of concern', griCode: 'ESRS E2-5', lineItem: 'Substances of concern leaving facilities as emissions, products or waste', unit: 't', scopeSplit: 'soc_leaving', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
]

// E2-6 Anticipated financial effects from pollution risks
const E2_6: ItemSpec[] = [
  { subsection: 'E2-6 Financial effects', griCode: 'ESRS E2-6', lineItem: 'Operating expenditure for prevention and environmental protection (Pollution)', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E2-6 Financial effects', griCode: 'ESRS E2-6', lineItem: 'Provisions for environmental remediation related to pollution', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E2-6 Financial effects', griCode: 'ESRS E2-6', lineItem: 'Fines and penalties paid for non-compliance with pollution regulations', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

export const ESRS_E2_ITEMS: ItemSpec[] = [
  ...E2_1, ...E2_2, ...E2_3, ...E2_4, ...E2_5, ...E2_6,
]

import type { Sql } from './_db'

export async function seedESRSE2(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  for (const it of ESRS_E2_ITEMS) {
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
