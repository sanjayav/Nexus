// CSRD ESRS G1 (Business Conduct) — disclosure datapoint catalogue.
// Source: ESRS G1, articles G1-1 through G1-6.

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

const SECTION = 'Business Conduct (ESRS G1)'
const FRAMEWORK_ID = 'csrd-g1'
const REPORTING_SCOPE: ReportingScope = 'group'

// G1-1 Business conduct policies and corporate culture
const G1_1: ItemSpec[] = [
  { subsection: 'G1-1 Business conduct policies', griCode: 'ESRS G1-1', lineItem: 'Description of business conduct policies and corporate culture', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'G1-1 Business conduct policies', griCode: 'ESRS G1-1', lineItem: 'Anti-corruption and anti-bribery policy in place', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'G1-1 Business conduct policies', griCode: 'ESRS G1-1', lineItem: 'Policy alignment with UN Convention against Corruption', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'G1-1 Business conduct policies', griCode: 'ESRS G1-1', lineItem: 'Code of conduct distributed to employees and suppliers', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'G1-1 Business conduct policies', griCode: 'ESRS G1-1', lineItem: 'Functions most exposed to corruption risks identified', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'G1-1 Business conduct policies', griCode: 'ESRS G1-1', lineItem: 'Percentage of functions-at-risk covered by training programmes', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
]

// G1-2 Management of relationships with suppliers
const G1_2: ItemSpec[] = [
  { subsection: 'G1-2 Supplier relationships', griCode: 'ESRS G1-2', lineItem: 'Description of the undertakings approach to managing supplier relationships', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'G1-2 Supplier relationships', griCode: 'ESRS G1-2', lineItem: 'Whistleblower / speak-up mechanisms accessible to internal and external parties', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'G1-2 Supplier relationships', griCode: 'ESRS G1-2', lineItem: 'Number of whistleblower reports received in the reporting period', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'G1-2 Supplier relationships', griCode: 'ESRS G1-2', lineItem: 'Number of whistleblower reports investigated', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'G1-2 Supplier relationships', griCode: 'ESRS G1-2', lineItem: 'Number of whistleblower reports substantiated', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
]

// G1-3 Prevention and detection of corruption and bribery
const G1_3: ItemSpec[] = [
  { subsection: 'G1-3 Anti-corruption', griCode: 'ESRS G1-3', lineItem: 'Procedures in place to investigate suspected corruption or bribery incidents', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'G1-3 Anti-corruption', griCode: 'ESRS G1-3', lineItem: 'Percentage of governance body members who received anti-corruption training', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'G1-3 Anti-corruption', griCode: 'ESRS G1-3', lineItem: 'Percentage of employees who received anti-corruption training', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'G1-3 Anti-corruption', griCode: 'ESRS G1-3', lineItem: 'Internal investigators or investigation committee independent of management chain', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// G1-4 Confirmed incidents of corruption or bribery
const G1_4: ItemSpec[] = [
  { subsection: 'G1-4 Confirmed incidents', griCode: 'ESRS G1-4', lineItem: 'Number of confirmed incidents of corruption or bribery', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'G1-4 Confirmed incidents', griCode: 'ESRS G1-4', lineItem: 'Number of convictions for violations of anti-corruption and anti-bribery laws', unit: 'count', scopeSplit: 'convictions', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'G1-4 Confirmed incidents', griCode: 'ESRS G1-4', lineItem: 'Amount of fines for violation of anti-corruption and anti-bribery laws', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'G1-4 Confirmed incidents', griCode: 'ESRS G1-4', lineItem: 'Number of confirmed incidents in which employees were dismissed or disciplined for corruption', unit: 'count', scopeSplit: 'employee_action', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'G1-4 Confirmed incidents', griCode: 'ESRS G1-4', lineItem: 'Number of confirmed incidents in which contracts with business partners were terminated', unit: 'count', scopeSplit: 'partner_termination', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'G1-4 Confirmed incidents', griCode: 'ESRS G1-4', lineItem: 'Disclosure of public legal cases regarding corruption or bribery brought against the undertaking', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// G1-5 Political influence and lobbying activities
const G1_5: ItemSpec[] = [
  { subsection: 'G1-5 Political contributions', griCode: 'ESRS G1-5', lineItem: 'Total monetary value of political contributions made directly or indirectly', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'G1-5 Political contributions', griCode: 'ESRS G1-5', lineItem: 'Breakdown of contributions by country or geography', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'G1-5 Political contributions', griCode: 'ESRS G1-5', lineItem: 'Main topics on which the undertaking engaged in lobbying activities', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'G1-5 Political contributions', griCode: 'ESRS G1-5', lineItem: 'Registration in EU Transparency Register or equivalent', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'G1-5 Political contributions', griCode: 'ESRS G1-5', lineItem: 'Lobbying expenditure declared in transparency register', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

// G1-6 Payment practices
const G1_6: ItemSpec[] = [
  { subsection: 'G1-6 Payment practices', griCode: 'ESRS G1-6', lineItem: 'Average time the undertaking takes to pay invoices from receipt to payment', unit: 'days', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'G1-6 Payment practices', griCode: 'ESRS G1-6', lineItem: 'Standard payment terms in days', unit: 'days', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'G1-6 Payment practices', griCode: 'ESRS G1-6', lineItem: 'Percentage of payments aligned with standard payment terms', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'G1-6 Payment practices', griCode: 'ESRS G1-6', lineItem: 'Number of legal proceedings outstanding for late payments', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'G1-6 Payment practices', griCode: 'ESRS G1-6', lineItem: 'Description of payment practices with respect to SMEs', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

export const ESRS_G1_ITEMS: ItemSpec[] = [
  ...G1_1, ...G1_2, ...G1_3, ...G1_4, ...G1_5, ...G1_6,
]

import type { Sql } from './_db'

export async function seedESRSG1(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  for (const it of ESRS_G1_ITEMS) {
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
