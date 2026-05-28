// CSRD ESRS S1 (Own Workforce) — disclosure datapoint catalogue.
// Source: ESRS S1 (Commission Delegated Regulation 2023/2772, Annex I), articles
// S1-1 through S1-17. Idempotent insert into questionnaire_item.

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

const SECTION = 'Own Workforce (ESRS S1)'
const FRAMEWORK_ID = 'csrd-s1'
const REPORTING_SCOPE: ReportingScope = 'group'

// S1-1 Policies related to own workforce
const S1_1: ItemSpec[] = [
  { subsection: 'S1-1 Policies', griCode: 'ESRS S1-1', lineItem: 'Policies adopted to manage material impacts on own workforce', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-1 Policies', griCode: 'ESRS S1-1', lineItem: 'Human rights policy commitments covering own workforce', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-1 Policies', griCode: 'ESRS S1-1', lineItem: 'Policy alignment with UN Guiding Principles on Business and Human Rights', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-1 Policies', griCode: 'ESRS S1-1', lineItem: 'Policy alignment with ILO Declaration on Fundamental Principles and Rights at Work', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-1 Policies', griCode: 'ESRS S1-1', lineItem: 'Policy alignment with OECD Guidelines for Multinational Enterprises', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-1 Policies', griCode: 'ESRS S1-1', lineItem: 'Specific policies addressing discrimination, harassment and equal opportunity', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-1 Policies', griCode: 'ESRS S1-1', lineItem: 'Highest senior level accountable for implementation of workforce policies', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-1 Policies', griCode: 'ESRS S1-1', lineItem: 'Mechanism to track effective implementation of workforce policies', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// S1-2 Processes for engaging with own workers
const S1_2: ItemSpec[] = [
  { subsection: 'S1-2 Worker engagement', griCode: 'ESRS S1-2', lineItem: 'Description of processes for engaging with own workforce about impacts', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-2 Worker engagement', griCode: 'ESRS S1-2', lineItem: 'Stage at which engagement with workers occurs (assessment, action, follow-up)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-2 Worker engagement', griCode: 'ESRS S1-2', lineItem: 'Type and frequency of engagement (surveys, councils, dialogue)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-2 Worker engagement', griCode: 'ESRS S1-2', lineItem: 'Function and senior role responsible for ensuring engagement', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-2 Worker engagement', griCode: 'ESRS S1-2', lineItem: 'Engagement effectiveness assessment results', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// S1-3 Processes to remediate negative impacts and channels to raise concerns
const S1_3: ItemSpec[] = [
  { subsection: 'S1-3 Grievance mechanisms', griCode: 'ESRS S1-3', lineItem: 'Channels available for own workforce to raise concerns', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-3 Grievance mechanisms', griCode: 'ESRS S1-3', lineItem: 'Processes through which the undertaking provides for remedy', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-3 Grievance mechanisms', griCode: 'ESRS S1-3', lineItem: 'Awareness and trust of grievance channels among workers', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-3 Grievance mechanisms', griCode: 'ESRS S1-3', lineItem: 'Policies for protection against retaliation of workers raising concerns', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// S1-4 / S1-5 Actions, resources, targets on material impacts
const S1_4_5: ItemSpec[] = [
  { subsection: 'S1-4 Actions on material impacts', griCode: 'ESRS S1-4', lineItem: 'Key actions taken to address material negative impacts on own workforce', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-4 Actions on material impacts', griCode: 'ESRS S1-4', lineItem: 'Actions to manage material risks and opportunities related to workforce', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-4 Actions on material impacts', griCode: 'ESRS S1-4', lineItem: 'Resources allocated to manage workforce impacts (financial)', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-4 Actions on material impacts', griCode: 'ESRS S1-4', lineItem: 'Effectiveness of actions tracked through monitoring indicators', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-5 Targets', griCode: 'ESRS S1-5', lineItem: 'Time-bound and outcome-oriented targets for reducing negative impacts', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-5 Targets', griCode: 'ESRS S1-5', lineItem: 'Target for advancing positive impacts on own workforce', unit: null, scopeSplit: null, hasTarget: true, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-5 Targets', griCode: 'ESRS S1-5', lineItem: 'Workforce involvement in setting targets', unit: 'yes/no', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-5 Targets', griCode: 'ESRS S1-5', lineItem: 'Progress against targets in the reporting period', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// S1-6 Characteristics of the undertaking's employees
const S1_6: ItemSpec[] = [
  { subsection: 'S1-6 Workforce characteristics', griCode: 'ESRS S1-6', lineItem: 'Total number of employees (head count)', unit: 'headcount', scopeSplit: 'total', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-6 Workforce characteristics', griCode: 'ESRS S1-6', lineItem: 'Number of employees — male', unit: 'headcount', scopeSplit: 'male', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-6 Workforce characteristics', griCode: 'ESRS S1-6', lineItem: 'Number of employees — female', unit: 'headcount', scopeSplit: 'female', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-6 Workforce characteristics', griCode: 'ESRS S1-6', lineItem: 'Number of employees — other / not disclosed', unit: 'headcount', scopeSplit: 'other', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-6 Workforce characteristics', griCode: 'ESRS S1-6', lineItem: 'Number of employees — permanent', unit: 'headcount', scopeSplit: 'permanent', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-6 Workforce characteristics', griCode: 'ESRS S1-6', lineItem: 'Number of employees — temporary', unit: 'headcount', scopeSplit: 'temporary', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-6 Workforce characteristics', griCode: 'ESRS S1-6', lineItem: 'Number of employees — full-time', unit: 'headcount', scopeSplit: 'full_time', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-6 Workforce characteristics', griCode: 'ESRS S1-6', lineItem: 'Number of employees — part-time', unit: 'headcount', scopeSplit: 'part_time', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-6 Workforce characteristics', griCode: 'ESRS S1-6', lineItem: 'Number of employees by significant country / region', unit: 'headcount', scopeSplit: 'by_region', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-6 Workforce characteristics', griCode: 'ESRS S1-6', lineItem: 'Total employee turnover rate', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'S1-6 Workforce characteristics', griCode: 'ESRS S1-6', lineItem: 'Number of employee departures during reporting period', unit: 'headcount', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-6 Workforce characteristics', griCode: 'ESRS S1-6', lineItem: 'Methodology used to compile employee data (head count vs FTE; reporting date)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// S1-7 Characteristics of non-employee workers
const S1_7: ItemSpec[] = [
  { subsection: 'S1-7 Non-employee workers', griCode: 'ESRS S1-7', lineItem: 'Total number of non-employees in own workforce (self-employed and agency workers)', unit: 'headcount', scopeSplit: 'total', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-7 Non-employee workers', griCode: 'ESRS S1-7', lineItem: 'Most common types of non-employee workers and relationship to the undertaking', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-7 Non-employee workers', griCode: 'ESRS S1-7', lineItem: 'Methodology used to compile non-employee data', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// S1-8 Collective bargaining coverage and social dialogue
const S1_8: ItemSpec[] = [
  { subsection: 'S1-8 Collective bargaining', griCode: 'ESRS S1-8', lineItem: 'Percentage of employees covered by collective bargaining agreements (EEA)', unit: '%', scopeSplit: 'eea', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-8 Collective bargaining', griCode: 'ESRS S1-8', lineItem: 'Percentage of employees covered by collective bargaining agreements (non-EEA)', unit: '%', scopeSplit: 'non_eea', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-8 Collective bargaining', griCode: 'ESRS S1-8', lineItem: 'Percentage of employees covered by workers representatives (EEA)', unit: '%', scopeSplit: 'workers_rep_eea', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
]

// S1-9 Diversity metrics
const S1_9: ItemSpec[] = [
  { subsection: 'S1-9 Diversity', griCode: 'ESRS S1-9', lineItem: 'Number of top management — male', unit: 'headcount', scopeSplit: 'top_mgmt_male', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-9 Diversity', griCode: 'ESRS S1-9', lineItem: 'Number of top management — female', unit: 'headcount', scopeSplit: 'top_mgmt_female', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-9 Diversity', griCode: 'ESRS S1-9', lineItem: 'Employees by age group — under 30', unit: 'headcount', scopeSplit: 'age_under_30', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-9 Diversity', griCode: 'ESRS S1-9', lineItem: 'Employees by age group — 30 to 50', unit: 'headcount', scopeSplit: 'age_30_50', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-9 Diversity', griCode: 'ESRS S1-9', lineItem: 'Employees by age group — over 50', unit: 'headcount', scopeSplit: 'age_over_50', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
]

// S1-10 Adequate wages
const S1_10: ItemSpec[] = [
  { subsection: 'S1-10 Adequate wages', griCode: 'ESRS S1-10', lineItem: 'Percentage of employees paid an adequate wage as defined by EU benchmarks', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-10 Adequate wages', griCode: 'ESRS S1-10', lineItem: 'Countries where employees are not paid an adequate wage', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-10 Adequate wages', griCode: 'ESRS S1-10', lineItem: 'Reference wage benchmark used (e.g. living wage methodology)', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// S1-11 Social protection
const S1_11: ItemSpec[] = [
  { subsection: 'S1-11 Social protection', griCode: 'ESRS S1-11', lineItem: 'Percentage of employees covered by social protection (sickness, unemployment, disability, parental, retirement)', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-11 Social protection', griCode: 'ESRS S1-11', lineItem: 'Categories of social protection not available to employees by country', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'S1-11 Social protection', griCode: 'ESRS S1-11', lineItem: 'Number of employees not covered by social protection', unit: 'headcount', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

// S1-12 Persons with disabilities
const S1_12: ItemSpec[] = [
  { subsection: 'S1-12 Persons with disabilities', griCode: 'ESRS S1-12', lineItem: 'Percentage of employees with disabilities', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-12 Persons with disabilities', griCode: 'ESRS S1-12', lineItem: 'Number of employees with disabilities by reporting basis', unit: 'headcount', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

// S1-13 Training and skills development
const S1_13: ItemSpec[] = [
  { subsection: 'S1-13 Training and skills', griCode: 'ESRS S1-13', lineItem: 'Percentage of employees who participated in regular performance and career reviews — male', unit: '%', scopeSplit: 'male', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-13 Training and skills', griCode: 'ESRS S1-13', lineItem: 'Percentage of employees who participated in regular performance and career reviews — female', unit: '%', scopeSplit: 'female', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-13 Training and skills', griCode: 'ESRS S1-13', lineItem: 'Average number of training hours per employee — male', unit: 'hours', scopeSplit: 'male', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'S1-13 Training and skills', griCode: 'ESRS S1-13', lineItem: 'Average number of training hours per employee — female', unit: 'hours', scopeSplit: 'female', hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
]

// S1-14 Health and safety
const S1_14: ItemSpec[] = [
  { subsection: 'S1-14 Health and safety', griCode: 'ESRS S1-14', lineItem: 'Percentage of own workforce covered by health and safety management system', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-14 Health and safety', griCode: 'ESRS S1-14', lineItem: 'Number of fatalities due to work-related injuries or ill-health — employees', unit: 'count', scopeSplit: 'employees', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-14 Health and safety', griCode: 'ESRS S1-14', lineItem: 'Number of fatalities due to work-related injuries or ill-health — non-employees', unit: 'count', scopeSplit: 'non_employees', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-14 Health and safety', griCode: 'ESRS S1-14', lineItem: 'Number of recordable work-related accidents', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-14 Health and safety', griCode: 'ESRS S1-14', lineItem: 'Rate of recordable work-related accidents per million hours worked', unit: 'per_mhrs', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'S1-14 Health and safety', griCode: 'ESRS S1-14', lineItem: 'Cases of recordable work-related ill-health', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-14 Health and safety', griCode: 'ESRS S1-14', lineItem: 'Number of days lost due to work-related injuries, fatalities and ill-health', unit: 'days', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-14 Health and safety', griCode: 'ESRS S1-14', lineItem: 'Lost-time injury frequency rate (LTIFR)', unit: 'per_mhrs', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
]

// S1-15 Work-life balance
const S1_15: ItemSpec[] = [
  { subsection: 'S1-15 Work-life balance', griCode: 'ESRS S1-15', lineItem: 'Percentage of employees entitled to family-related leave', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-15 Work-life balance', griCode: 'ESRS S1-15', lineItem: 'Percentage of entitled employees taking family-related leave — male', unit: '%', scopeSplit: 'male', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-15 Work-life balance', griCode: 'ESRS S1-15', lineItem: 'Percentage of entitled employees taking family-related leave — female', unit: '%', scopeSplit: 'female', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
]

// S1-16 Remuneration metrics
const S1_16: ItemSpec[] = [
  { subsection: 'S1-16 Pay metrics', griCode: 'ESRS S1-16', lineItem: 'Gender pay gap (difference between male and female average pay) as a percentage of male average pay', unit: '%', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'S1-16 Pay metrics', griCode: 'ESRS S1-16', lineItem: 'Annual total compensation ratio (highest-paid individual : median employee)', unit: 'ratio', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'AUTO', entryMode: 'Calculator' },
  { subsection: 'S1-16 Pay metrics', griCode: 'ESRS S1-16', lineItem: 'Contextual information for understanding pay gap data', unit: null, scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

// S1-17 Incidents, complaints and severe human rights impacts
const S1_17: ItemSpec[] = [
  { subsection: 'S1-17 Incidents and complaints', griCode: 'ESRS S1-17', lineItem: 'Number of incidents of discrimination including harassment reported', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-17 Incidents and complaints', griCode: 'ESRS S1-17', lineItem: 'Number of complaints filed through grievance channels', unit: 'count', scopeSplit: null, hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'S1-17 Incidents and complaints', griCode: 'ESRS S1-17', lineItem: 'Total amount of fines, penalties and compensation paid for human-rights breaches', unit: 'EUR', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

export const ESRS_S1_ITEMS: ItemSpec[] = [
  ...S1_1, ...S1_2, ...S1_3, ...S1_4_5, ...S1_6, ...S1_7, ...S1_8, ...S1_9,
  ...S1_10, ...S1_11, ...S1_12, ...S1_13, ...S1_14, ...S1_15, ...S1_16, ...S1_17,
]

import type { Sql } from './_db'

export async function seedESRSS1(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  for (const it of ESRS_S1_ITEMS) {
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
