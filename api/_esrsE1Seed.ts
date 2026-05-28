// CSRD ESRS E1 (Climate Change) — full mandatory disclosure datapoint catalogue.
// Source: ESRS E1 (Commission Delegated Regulation 2023/2772, Annex I), articles
// E1-1 through E1-9. One row per auditable datapoint. Consumed by api/setup.ts
// (and any script that needs CSRD content) to seed the questionnaire_item table
// for the CSRD framework, so a tenant can start a CSRD-compliant report.
//
// The seed is idempotent: INSERT ... ON CONFLICT (gri_code, line_item, scope_split,
// reporting_scope) DO NOTHING. Defensive ALTERs make sure the framework_id column
// exists on questionnaire_item (added in earlier migrations on prod, but not in
// the original CREATE TABLE in setup.ts).
//
// Naming:
//   • framework_id   = 'csrd-e1' — matches src/lib/frameworks.ts and the
//                       org_framework_enablement registry.
//   • gri_code       = the ESRS datapoint code, e.g. 'ESRS E1-6'. The column is
//                       called gri_code for legacy reasons; for non-GRI frameworks
//                       it holds the framework-native code.
//   • section        = 'Climate Change (ESRS E1)' so the ESRS items group
//                       distinctly from GRI rows in any tree view that sorts by
//                       section first.
//   • subsection     = the specific disclosure, e.g. 'E1-6 Gross GHG emissions'.

export type WorkflowRole = 'AUTO' | 'FM' | 'SO' | 'TL'
export type EntryMode = 'Manual' | 'Calculator' | 'Connector'
export type ReportingScope = 'group' | 'jv'

export interface ItemSpec {
  subsection: string
  griCode: string                 // 'ESRS E1-1' … 'ESRS E1-9'
  lineItem: string
  unit: string | null
  scopeSplit: string | null
  hasTarget: boolean
  requiresCoverage: boolean
  defaultRole: WorkflowRole
  entryMode: EntryMode
}

const SECTION = 'Climate Change (ESRS E1)'
const FRAMEWORK_ID = 'csrd-e1'
const REPORTING_SCOPE: ReportingScope = 'group'

// ───────────────────────────────────────────────────────────────────────────────
// E1-1 — Transition plan for climate change mitigation
// ───────────────────────────────────────────────────────────────────────────────
const E1_1: ItemSpec[] = [
  { subsection: 'E1-1 Transition plan', griCode: 'ESRS E1-1', lineItem: 'Transition plan for climate change mitigation published', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-1 Transition plan', griCode: 'ESRS E1-1', lineItem: 'Narrative description of the transition plan', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-1 Transition plan', griCode: 'ESRS E1-1', lineItem: 'Plan compatible with limiting global warming to 1.5°C in line with the Paris Agreement', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-1 Transition plan', griCode: 'ESRS E1-1', lineItem: 'Transition plan approved by administrative, management and supervisory bodies', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-1 Transition plan', griCode: 'ESRS E1-1', lineItem: 'Decarbonisation levers and key actions identified in the transition plan', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-1 Transition plan', griCode: 'ESRS E1-1', lineItem: 'Investment and funding (CapEx) supporting the transition plan', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E1-1 Transition plan', griCode: 'ESRS E1-1', lineItem: 'Locked-in GHG emissions from key assets and products', unit: 'tCO2e', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-1 Transition plan', griCode: 'ESRS E1-1', lineItem: 'Undertaking excluded from EU Paris-aligned Benchmarks (with reasoning)', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ───────────────────────────────────────────────────────────────────────────────
// E1-2 — Policies related to climate change mitigation and adaptation
// ───────────────────────────────────────────────────────────────────────────────
const E1_2: ItemSpec[] = [
  { subsection: 'E1-2 Climate policies', griCode: 'ESRS E1-2', lineItem: 'Policies adopted to manage material climate-related impacts, risks and opportunities', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-2 Climate policies', griCode: 'ESRS E1-2', lineItem: 'Description and scope of climate policies', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-2 Climate policies', griCode: 'ESRS E1-2', lineItem: 'Policy addresses climate change mitigation', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-2 Climate policies', griCode: 'ESRS E1-2', lineItem: 'Policy addresses climate change adaptation', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-2 Climate policies', griCode: 'ESRS E1-2', lineItem: 'Policy addresses renewable energy deployment', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-2 Climate policies', griCode: 'ESRS E1-2', lineItem: 'Policy addresses energy efficiency', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-2 Climate policies', griCode: 'ESRS E1-2', lineItem: 'Highest senior management level accountable for the implementation of the policy', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ───────────────────────────────────────────────────────────────────────────────
// E1-3 — Actions and resources in relation to climate change policies
// ───────────────────────────────────────────────────────────────────────────────
const E1_3: ItemSpec[] = [
  { subsection: 'E1-3 Climate actions', griCode: 'ESRS E1-3', lineItem: 'Description of key actions taken in the reporting year and planned for the future', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-3 Climate actions', griCode: 'ESRS E1-3', lineItem: 'Expected GHG emission reductions from key actions', unit: 'tCO2e', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-3 Climate actions', griCode: 'ESRS E1-3', lineItem: 'CapEx allocated to climate-related actions', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E1-3 Climate actions', griCode: 'ESRS E1-3', lineItem: 'OpEx allocated to climate-related actions', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E1-3 Climate actions', griCode: 'ESRS E1-3', lineItem: 'Time horizons over which key actions are expected to deliver outcomes', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ───────────────────────────────────────────────────────────────────────────────
// E1-4 — Targets related to climate change mitigation and adaptation
// ───────────────────────────────────────────────────────────────────────────────
const E1_4: ItemSpec[] = [
  { subsection: 'E1-4 Climate targets', griCode: 'ESRS E1-4', lineItem: 'Absolute GHG emission reduction target — Scope 1+2 (target value)', unit: 'tCO2e', scopeSplit: 'scope_1_2', hasTarget: true, requiresCoverage: true, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-4 Climate targets', griCode: 'ESRS E1-4', lineItem: 'Absolute GHG emission reduction target — Scope 1+2 (target year)', unit: 'year', scopeSplit: 'scope_1_2', hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-4 Climate targets', griCode: 'ESRS E1-4', lineItem: 'Absolute GHG emission reduction target — Scope 3 (target value)', unit: 'tCO2e', scopeSplit: 'scope_3', hasTarget: true, requiresCoverage: true, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-4 Climate targets', griCode: 'ESRS E1-4', lineItem: 'Absolute GHG emission reduction target — Scope 3 (target year)', unit: 'year', scopeSplit: 'scope_3', hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-4 Climate targets', griCode: 'ESRS E1-4', lineItem: 'Intensity-based GHG emission reduction target (per unit of output)', unit: 'tCO2e/unit', scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-4 Climate targets', griCode: 'ESRS E1-4', lineItem: 'Base year used for target setting', unit: 'year', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-4 Climate targets', griCode: 'ESRS E1-4', lineItem: 'Base year GHG emissions (Scope 1+2+3)', unit: 'tCO2e', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-4 Climate targets', griCode: 'ESRS E1-4', lineItem: 'Target validated by SBTi (yes/no and validation date)', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-4 Climate targets', griCode: 'ESRS E1-4', lineItem: 'Net-zero target year', unit: 'year', scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-4 Climate targets', griCode: 'ESRS E1-4', lineItem: 'Use of carbon credits in target attainment (yes/no and planned share)', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ───────────────────────────────────────────────────────────────────────────────
// E1-5 — Energy consumption and mix
// ───────────────────────────────────────────────────────────────────────────────
const E1_5: ItemSpec[] = [
  { subsection: 'E1-5 Energy consumption and mix', griCode: 'ESRS E1-5', lineItem: 'Total energy consumption from own operations', unit: 'MWh', scopeSplit: 'total', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Calculator' },
  { subsection: 'E1-5 Energy consumption and mix', griCode: 'ESRS E1-5', lineItem: 'Energy consumption from fossil sources', unit: 'MWh', scopeSplit: 'fossil', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Calculator' },
  { subsection: 'E1-5 Energy consumption and mix', griCode: 'ESRS E1-5', lineItem: 'Energy consumption from nuclear sources', unit: 'MWh', scopeSplit: 'nuclear', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Calculator' },
  { subsection: 'E1-5 Energy consumption and mix', griCode: 'ESRS E1-5', lineItem: 'Energy consumption from renewable sources', unit: 'MWh', scopeSplit: 'renewable', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Calculator' },
  { subsection: 'E1-5 Energy consumption and mix', griCode: 'ESRS E1-5', lineItem: 'Of which self-generated renewable energy', unit: 'MWh', scopeSplit: 'renewable_self_generated', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Calculator' },
  { subsection: 'E1-5 Energy consumption and mix', griCode: 'ESRS E1-5', lineItem: 'Energy intensity per net revenue', unit: 'MWh/EUR million', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-5 Energy consumption and mix', griCode: 'ESRS E1-5', lineItem: 'Operations in high climate impact sectors', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-5 Energy consumption and mix', griCode: 'ESRS E1-5', lineItem: 'Description of high climate impact sectors covered', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ───────────────────────────────────────────────────────────────────────────────
// E1-6 — Gross Scopes 1, 2, 3 and Total GHG emissions
// ───────────────────────────────────────────────────────────────────────────────
const E1_6: ItemSpec[] = [
  // Scope 1
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Gross Scope 1 GHG emissions', unit: 'tCO2e', scopeSplit: 'scope_1', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Of which from regulated emission trading schemes', unit: 'tCO2e', scopeSplit: 'scope_1_ets', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Biogenic Scope 1 CO2 emissions (reported separately)', unit: 'tCO2e', scopeSplit: 'scope_1_biogenic', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  // Scope 2
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Gross Scope 2 GHG emissions — location-based', unit: 'tCO2e', scopeSplit: 'scope_2_location', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Gross Scope 2 GHG emissions — market-based', unit: 'tCO2e', scopeSplit: 'scope_2_market', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Biogenic Scope 2 CO2 emissions (reported separately)', unit: 'tCO2e', scopeSplit: 'scope_2_biogenic', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  // Scope 3 categories 1-15
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Scope 3 Cat 1 — Purchased goods and services', unit: 'tCO2e', scopeSplit: 'scope_3_c1', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Scope 3 Cat 2 — Capital goods', unit: 'tCO2e', scopeSplit: 'scope_3_c2', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Scope 3 Cat 3 — Fuel- and energy-related activities', unit: 'tCO2e', scopeSplit: 'scope_3_c3', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Scope 3 Cat 4 — Upstream transportation and distribution', unit: 'tCO2e', scopeSplit: 'scope_3_c4', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Scope 3 Cat 5 — Waste generated in operations', unit: 'tCO2e', scopeSplit: 'scope_3_c5', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Scope 3 Cat 6 — Business travel', unit: 'tCO2e', scopeSplit: 'scope_3_c6', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Scope 3 Cat 7 — Employee commuting', unit: 'tCO2e', scopeSplit: 'scope_3_c7', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Scope 3 Cat 8 — Upstream leased assets', unit: 'tCO2e', scopeSplit: 'scope_3_c8', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Scope 3 Cat 9 — Downstream transportation and distribution', unit: 'tCO2e', scopeSplit: 'scope_3_c9', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Scope 3 Cat 10 — Processing of sold products', unit: 'tCO2e', scopeSplit: 'scope_3_c10', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Scope 3 Cat 11 — Use of sold products', unit: 'tCO2e', scopeSplit: 'scope_3_c11', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Scope 3 Cat 12 — End-of-life treatment of sold products', unit: 'tCO2e', scopeSplit: 'scope_3_c12', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Scope 3 Cat 13 — Downstream leased assets', unit: 'tCO2e', scopeSplit: 'scope_3_c13', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Scope 3 Cat 14 — Franchises', unit: 'tCO2e', scopeSplit: 'scope_3_c14', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Scope 3 Cat 15 — Investments', unit: 'tCO2e', scopeSplit: 'scope_3_c15', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Total Gross Scope 3 GHG emissions', unit: 'tCO2e', scopeSplit: 'scope_3_total', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Biogenic Scope 3 CO2 emissions (reported separately)', unit: 'tCO2e', scopeSplit: 'scope_3_biogenic', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Materiality rationale for inclusion or exclusion of each Scope 3 category', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  // Totals + intensity
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Total GHG emissions — location-based (Scope 1 + 2 location + 3)', unit: 'tCO2e', scopeSplit: 'total_location', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'Total GHG emissions — market-based (Scope 1 + 2 market + 3)', unit: 'tCO2e', scopeSplit: 'total_market', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-6 Gross GHG emissions', griCode: 'ESRS E1-6', lineItem: 'GHG emissions intensity per net revenue', unit: 'tCO2e/EUR million', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
]

// ───────────────────────────────────────────────────────────────────────────────
// E1-7 — GHG removals and GHG mitigation projects financed through carbon credits
// ───────────────────────────────────────────────────────────────────────────────
const E1_7: ItemSpec[] = [
  { subsection: 'E1-7 GHG removals and carbon credits', griCode: 'ESRS E1-7', lineItem: 'GHG removals from own operations', unit: 'tCO2e', scopeSplit: 'removals_own', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-7 GHG removals and carbon credits', griCode: 'ESRS E1-7', lineItem: 'GHG removals from the value chain', unit: 'tCO2e', scopeSplit: 'removals_value_chain', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'E1-7 GHG removals and carbon credits', griCode: 'ESRS E1-7', lineItem: 'Total carbon credits cancelled in the reporting year', unit: 'tCO2e', scopeSplit: 'credits_total', hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-7 GHG removals and carbon credits', griCode: 'ESRS E1-7', lineItem: 'Carbon credits cancelled — from projects within the EU', unit: 'tCO2e', scopeSplit: 'credits_eu', hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-7 GHG removals and carbon credits', griCode: 'ESRS E1-7', lineItem: 'Carbon credits cancelled — from projects outside the EU', unit: 'tCO2e', scopeSplit: 'credits_non_eu', hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-7 GHG removals and carbon credits', griCode: 'ESRS E1-7', lineItem: 'Carbon credits classified as removals (vs. reductions)', unit: 'tCO2e', scopeSplit: 'credits_removals', hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-7 GHG removals and carbon credits', griCode: 'ESRS E1-7', lineItem: 'Carbon credits classified as reductions (vs. removals)', unit: 'tCO2e', scopeSplit: 'credits_reductions', hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-7 GHG removals and carbon credits', griCode: 'ESRS E1-7', lineItem: 'Recognised standards used to verify credits (Verra, Gold Standard, ART TREES, etc.)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// ───────────────────────────────────────────────────────────────────────────────
// E1-8 — Internal carbon pricing
// ───────────────────────────────────────────────────────────────────────────────
const E1_8: ItemSpec[] = [
  { subsection: 'E1-8 Internal carbon pricing', griCode: 'ESRS E1-8', lineItem: 'Internal carbon pricing scheme in place', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-8 Internal carbon pricing', griCode: 'ESRS E1-8', lineItem: 'Description of the internal carbon pricing scheme', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-8 Internal carbon pricing', griCode: 'ESRS E1-8', lineItem: 'Internal carbon price applied', unit: 'EUR/tCO2e', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E1-8 Internal carbon pricing', griCode: 'ESRS E1-8', lineItem: 'Scope of application of the internal carbon price', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'E1-8 Internal carbon pricing', griCode: 'ESRS E1-8', lineItem: 'Volume of GHG emissions covered by the internal carbon price', unit: 'tCO2e', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
]

// ───────────────────────────────────────────────────────────────────────────────
// E1-9 — Anticipated financial effects from material physical and transition
//         risks and potential climate-related opportunities
// ───────────────────────────────────────────────────────────────────────────────
const E1_9: ItemSpec[] = [
  { subsection: 'E1-9 Financial effects of climate risk', griCode: 'ESRS E1-9', lineItem: 'Assets at material physical risk — gross book value', unit: 'EUR', scopeSplit: 'assets_physical_risk', hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E1-9 Financial effects of climate risk', griCode: 'ESRS E1-9', lineItem: 'Assets at material transition risk — gross book value', unit: 'EUR', scopeSplit: 'assets_transition_risk', hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E1-9 Financial effects of climate risk', griCode: 'ESRS E1-9', lineItem: 'Liabilities recognised related to climate-related matters', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E1-9 Financial effects of climate risk', griCode: 'ESRS E1-9', lineItem: 'Revenue from products and services aligned with the EU Taxonomy', unit: 'EUR', scopeSplit: 'taxonomy_revenue', hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E1-9 Financial effects of climate risk', griCode: 'ESRS E1-9', lineItem: 'CapEx aligned with the EU Taxonomy', unit: 'EUR', scopeSplit: 'taxonomy_capex', hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E1-9 Financial effects of climate risk', griCode: 'ESRS E1-9', lineItem: 'OpEx aligned with the EU Taxonomy', unit: 'EUR', scopeSplit: 'taxonomy_opex', hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'E1-9 Financial effects of climate risk', griCode: 'ESRS E1-9', lineItem: 'Anticipated financial effects from material climate-related opportunities', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

export const ESRS_E1_ITEMS: ItemSpec[] = [
  ...E1_1, ...E1_2, ...E1_3, ...E1_4, ...E1_5, ...E1_6, ...E1_7, ...E1_8, ...E1_9,
]

/**
 * Seed the ESRS E1 datapoint catalogue into questionnaire_item, plus enable the
 * `csrd-e1` framework on the demo organisation. Idempotent — running twice is a
 * no-op thanks to the (gri_code, line_item, scope_split, reporting_scope) UNIQUE.
 *
 * Caller passes the Neon sql tagged-template client from `getDb()`.
 */
import type { Sql } from './_db'

export async function seedESRSE1(sql: Sql): Promise<void> {
  // Defensive: the framework_id column was added in an earlier migration on
  // production but isn't in the original CREATE TABLE in api/setup.ts. Same for
  // the org_framework_enablement registry. Make sure both exist before writing.
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  await sql`CREATE INDEX IF NOT EXISTS idx_qi_framework ON questionnaire_item(framework_id)`
  await sql`CREATE TABLE IF NOT EXISTS org_framework_enablement (
    org_id UUID NOT NULL,
    framework_id TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    enabled_by UUID,
    enabled_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (org_id, framework_id)
  )`

  for (const it of ESRS_E1_ITEMS) {
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

  // Turn the framework on for the demo organisation so the FrameworkSelector
  // surfaces CSRD E1 without an extra admin step.
  await sql`
    INSERT INTO org_framework_enablement (org_id, framework_id, enabled, enabled_by)
    VALUES ('00000000-0000-0000-0000-000000000001', ${FRAMEWORK_ID}, true,
            '00000000-0000-0000-0000-000000000100')
    ON CONFLICT (org_id, framework_id) DO UPDATE SET enabled = true
  `
}
