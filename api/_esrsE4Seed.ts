// CSRD ESRS E4 (Biodiversity and Ecosystems) — disclosure datapoint catalogue.
// Source: ESRS E4, articles E4-1 through E4-6.

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

const SECTION = 'Biodiversity and Ecosystems (ESRS E4)'
const FRAMEWORK_ID = 'csrd-e4'
const REPORTING_SCOPE: ReportingScope = 'group'

// E4-1 Transition plan and consideration of biodiversity and ecosystems in strategy
const E4_1: ItemSpec[] = [
  { subsection: 'E4-1 Biodiversity transition plan', griCode: 'ESRS E4-1', lineItem: 'Biodiversity transition plan in place', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E4-1 Biodiversity transition plan', griCode: 'ESRS E4-1', lineItem: 'Plan aligned with the Kunming-Montreal Global Biodiversity Framework', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E4-1 Biodiversity transition plan', griCode: 'ESRS E4-1', lineItem: 'Approach to align with no net loss / net positive impact ambition', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E4-1 Biodiversity transition plan', griCode: 'ESRS E4-1', lineItem: 'Consideration of biodiversity and ecosystems in business strategy', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// E4-2 Policies
const E4_2: ItemSpec[] = [
  { subsection: 'E4-2 Biodiversity policies', griCode: 'ESRS E4-2', lineItem: 'Policies adopted to manage material impacts on biodiversity and ecosystems', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E4-2 Biodiversity policies', griCode: 'ESRS E4-2', lineItem: 'Policy addresses sustainable sourcing and use of bio-based products', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E4-2 Biodiversity policies', griCode: 'ESRS E4-2', lineItem: 'Policy addresses zero-deforestation commitment', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E4-2 Biodiversity policies', griCode: 'ESRS E4-2', lineItem: 'Policy addresses areas of high biodiversity value', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// E4-3 Actions and resources
const E4_3: ItemSpec[] = [
  { subsection: 'E4-3 Biodiversity actions', griCode: 'ESRS E4-3', lineItem: 'Description of key actions to address material biodiversity impacts', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E4-3 Biodiversity actions', griCode: 'ESRS E4-3', lineItem: 'Application of the mitigation hierarchy (avoid, minimise, restore, offset)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E4-3 Biodiversity actions', griCode: 'ESRS E4-3', lineItem: 'Number of restoration or rehabilitation projects undertaken', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E4-3 Biodiversity actions', griCode: 'ESRS E4-3', lineItem: 'Area restored or rehabilitated during the reporting period', unit: 'ha', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E4-3 Biodiversity actions', griCode: 'ESRS E4-3', lineItem: 'CapEx allocated to biodiversity actions', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E4-3 Biodiversity actions', griCode: 'ESRS E4-3', lineItem: 'OpEx allocated to biodiversity actions', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

// E4-4 Targets
const E4_4: ItemSpec[] = [
  { subsection: 'E4-4 Biodiversity targets', griCode: 'ESRS E4-4', lineItem: 'Targets for biodiversity and ecosystem impact reduction', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E4-4 Biodiversity targets', griCode: 'ESRS E4-4', lineItem: 'Net-positive impact target (yes/no and timeline)', unit: 'yes/no', scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E4-4 Biodiversity targets', griCode: 'ESRS E4-4', lineItem: 'Base year and value used for biodiversity targets', unit: 'year', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// E4-5 Impact metrics related to biodiversity and ecosystems change
const E4_5: ItemSpec[] = [
  { subsection: 'E4-5 Biodiversity impact metrics', griCode: 'ESRS E4-5', lineItem: 'Number of sites in or near biodiversity-sensitive areas', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E4-5 Biodiversity impact metrics', griCode: 'ESRS E4-5', lineItem: 'Area of sites within or adjacent to protected areas (Natura 2000, KBAs)', unit: 'ha', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E4-5 Biodiversity impact metrics', griCode: 'ESRS E4-5', lineItem: 'Total use of land by the undertaking', unit: 'ha', scopeSplit: 'land_use_total', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E4-5 Biodiversity impact metrics', griCode: 'ESRS E4-5', lineItem: 'Total sealed (impervious) area', unit: 'ha', scopeSplit: 'sealed_area', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E4-5 Biodiversity impact metrics', griCode: 'ESRS E4-5', lineItem: 'Total nature-oriented area on site and off site', unit: 'ha', scopeSplit: 'nature_oriented', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E4-5 Biodiversity impact metrics', griCode: 'ESRS E4-5', lineItem: 'Number of IUCN Red List species affected by operations', unit: 'count', scopeSplit: 'iucn_species', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E4-5 Biodiversity impact metrics', griCode: 'ESRS E4-5', lineItem: 'Number of national conservation list species affected', unit: 'count', scopeSplit: 'national_species', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E4-5 Biodiversity impact metrics', griCode: 'ESRS E4-5', lineItem: 'Description of pressures on biodiversity (land use change, water use, climate change, pollution, invasive species)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E4-5 Biodiversity impact metrics', griCode: 'ESRS E4-5', lineItem: 'Ecosystem condition assessment of sites of operation', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// E4-6 Anticipated financial effects
const E4_6: ItemSpec[] = [
  { subsection: 'E4-6 Financial effects', griCode: 'ESRS E4-6', lineItem: 'Assets at material biodiversity-related risk — gross book value', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E4-6 Financial effects', griCode: 'ESRS E4-6', lineItem: 'Net revenue from products and services associated with biodiversity risks', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E4-6 Financial effects', griCode: 'ESRS E4-6', lineItem: 'Anticipated financial effects from biodiversity-related opportunities', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

export const ESRS_E4_ITEMS: ItemSpec[] = [
  ...E4_1, ...E4_2, ...E4_3, ...E4_4, ...E4_5, ...E4_6,
]

import type { Sql } from './_db'

export async function seedESRSE4(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  for (const it of ESRS_E4_ITEMS) {
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
