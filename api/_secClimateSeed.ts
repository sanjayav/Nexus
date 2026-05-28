// SEC Climate Disclosure Rule (Final Rule, March 2024 — Item 1500 series of
// Regulation S-K and Article 14 of Regulation S-X). Notes: Scope 3 disclosure
// was not finalised in the U.S. rule; certain provisions are subject to stay
// pending litigation — marked accordingly.

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

const SECTION = 'SEC Climate Disclosure Rule'
const FRAMEWORK_ID = 'sec-climate'
const REPORTING_SCOPE: ReportingScope = 'group'

// Subpart 1500 — Climate-related Risks
const SEC_RISK: ItemSpec[] = [
  { subsection: 'SEC Item 1502 Strategy / risks', griCode: 'SEC-1502(a)', lineItem: 'Description of climate-related risks that have or are reasonably likely to have a material impact', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SEC Item 1502 Strategy / risks', griCode: 'SEC-1502(a)', lineItem: 'Classification of risks (physical / transition; short-, medium-, long-term)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SEC Item 1502 Strategy / risks', griCode: 'SEC-1502(b)', lineItem: 'Actual and potential material impacts of identified risks on strategy, business model and outlook', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SEC Item 1502 Strategy / risks', griCode: 'SEC-1502(c)', lineItem: 'Mitigation or adaptation activities undertaken, including any quantitative or qualitative metrics', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SEC Item 1502 Strategy / risks', griCode: 'SEC-1502(d)', lineItem: 'Climate-related transition plan, if any, and its financial implications', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SEC Item 1502 Strategy / risks', griCode: 'SEC-1502(e)', lineItem: 'Use of scenario analysis in assessing material climate-related risks', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SEC Item 1502 Strategy / risks', griCode: 'SEC-1502(f)', lineItem: 'Use of an internal carbon price, if any, and the methodology', unit: 'USD/tCO2e', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// Subpart 1501 — Governance
const SEC_GOV: ItemSpec[] = [
  { subsection: 'SEC Item 1501 Governance', griCode: 'SEC-1501(a)', lineItem: 'Description of the board\'s oversight of climate-related risks', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SEC Item 1501 Governance', griCode: 'SEC-1501(b)', lineItem: 'Management\'s role in assessing and managing material climate-related risks', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// Subpart 1503 — Risk management
const SEC_RM: ItemSpec[] = [
  { subsection: 'SEC Item 1503 Risk management', griCode: 'SEC-1503', lineItem: 'Processes for identifying, assessing and managing material climate-related risks', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SEC Item 1503 Risk management', griCode: 'SEC-1503', lineItem: 'Integration of climate-related risk into overall risk management', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// Subpart 1504 — Targets and goals
const SEC_TGT: ItemSpec[] = [
  { subsection: 'SEC Item 1504 Targets and goals', griCode: 'SEC-1504', lineItem: 'Climate-related target or goal that has materially affected or is reasonably likely to materially affect business', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SEC Item 1504 Targets and goals', griCode: 'SEC-1504', lineItem: 'Scope and time horizon of climate-related target', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SEC Item 1504 Targets and goals', griCode: 'SEC-1504', lineItem: 'Material expenditures and impacts on financial estimates resulting from target', unit: 'USD', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'SEC Item 1504 Targets and goals', griCode: 'SEC-1504', lineItem: 'Progress against the climate-related target', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// Subpart 1505 — GHG emissions (stayed pending litigation; included for completeness)
const SEC_GHG: ItemSpec[] = [
  { subsection: 'SEC Item 1505 GHG emissions (stayed)', griCode: 'SEC-1505(a)', lineItem: 'Material Scope 1 GHG emissions (gross)', unit: 'tCO2e', scopeSplit: 'scope_1', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'SEC Item 1505 GHG emissions (stayed)', griCode: 'SEC-1505(a)', lineItem: 'Material Scope 2 GHG emissions (gross, location-based)', unit: 'tCO2e', scopeSplit: 'scope_2', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'SEC Item 1505 GHG emissions (stayed)', griCode: 'SEC-1505(a)', lineItem: 'Scope 3 emissions — optional / not required under final SEC rule', unit: 'tCO2e', scopeSplit: 'scope_3', hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'SEC Item 1505 GHG emissions (stayed)', griCode: 'SEC-1505(b)', lineItem: 'Methodology, significant inputs, and assumptions used to calculate emissions', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'SEC Item 1505 GHG emissions (stayed)', griCode: 'SEC-1506', lineItem: 'Assurance status of GHG emissions disclosure (limited / reasonable / none)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// Article 14 of Regulation S-X — Financial statement disclosures
const SEC_FIN: ItemSpec[] = [
  { subsection: 'Reg S-X Article 14 Financial statements', griCode: 'SEC-S-X-14-02(b)', lineItem: 'Aggregate expenditures expensed as incurred and capitalised costs related to severe weather events and other natural conditions', unit: 'USD', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Reg S-X Article 14 Financial statements', griCode: 'SEC-S-X-14-02(c)', lineItem: 'Aggregate amount of recoveries received related to severe weather events', unit: 'USD', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Reg S-X Article 14 Financial statements', griCode: 'SEC-S-X-14-02(d)', lineItem: 'Capitalised costs, expenditures expensed and losses related to carbon offsets and renewable energy credits', unit: 'USD', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

export const SEC_ITEMS: ItemSpec[] = [
  ...SEC_GOV, ...SEC_RISK, ...SEC_RM, ...SEC_TGT, ...SEC_GHG, ...SEC_FIN,
]

import type { Sql } from './_db'

export async function seedSECClimate(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  for (const it of SEC_ITEMS) {
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
