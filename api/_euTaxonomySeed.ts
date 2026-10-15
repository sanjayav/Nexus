// EU Taxonomy (Regulation (EU) 2020/852) — alignment disclosures for KPIs on
// Turnover, CapEx and OpEx across the six environmental objectives, plus DNSH
// and minimum safeguards.

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

const SECTION = 'EU Taxonomy Alignment'
const FRAMEWORK_ID = 'eu-taxonomy'
const REPORTING_SCOPE: ReportingScope = 'group'

// Six environmental objectives:
//   1. Climate change mitigation (CCM)
//   2. Climate change adaptation (CCA)
//   3. Sustainable use & protection of water and marine resources (WTR)
//   4. Transition to a circular economy (CE)
//   5. Pollution prevention and control (PPC)
//   6. Protection and restoration of biodiversity and ecosystems (BIO)

const TAX_TURNOVER: ItemSpec[] = [
  { subsection: 'Turnover KPI', griCode: 'EU-TAX-TO-Total', lineItem: 'Total Turnover (denominator)', unit: 'EUR', scopeSplit: 'total', hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Turnover KPI', griCode: 'EU-TAX-TO-CCM', lineItem: 'Turnover — Climate change mitigation — eligible %', unit: '%', scopeSplit: 'ccm_eligible', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Turnover KPI', griCode: 'EU-TAX-TO-CCM', lineItem: 'Turnover — Climate change mitigation — aligned %', unit: '%', scopeSplit: 'ccm_aligned', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Turnover KPI', griCode: 'EU-TAX-TO-CCA', lineItem: 'Turnover — Climate change adaptation — eligible %', unit: '%', scopeSplit: 'cca_eligible', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Turnover KPI', griCode: 'EU-TAX-TO-CCA', lineItem: 'Turnover — Climate change adaptation — aligned %', unit: '%', scopeSplit: 'cca_aligned', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Turnover KPI', griCode: 'EU-TAX-TO-WTR', lineItem: 'Turnover — Water and marine resources — aligned %', unit: '%', scopeSplit: 'wtr_aligned', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Turnover KPI', griCode: 'EU-TAX-TO-CE', lineItem: 'Turnover — Circular economy — aligned %', unit: '%', scopeSplit: 'ce_aligned', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Turnover KPI', griCode: 'EU-TAX-TO-PPC', lineItem: 'Turnover — Pollution prevention and control — aligned %', unit: '%', scopeSplit: 'ppc_aligned', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'Turnover KPI', griCode: 'EU-TAX-TO-BIO', lineItem: 'Turnover — Biodiversity and ecosystems — aligned %', unit: '%', scopeSplit: 'bio_aligned', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
]

const TAX_CAPEX: ItemSpec[] = [
  { subsection: 'CapEx KPI', griCode: 'EU-TAX-CAPEX-Total', lineItem: 'Total CapEx (denominator)', unit: 'EUR', scopeSplit: 'total', hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'CapEx KPI', griCode: 'EU-TAX-CAPEX-CCM', lineItem: 'CapEx — Climate change mitigation — aligned %', unit: '%', scopeSplit: 'ccm_aligned', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'CapEx KPI', griCode: 'EU-TAX-CAPEX-CCA', lineItem: 'CapEx — Climate change adaptation — aligned %', unit: '%', scopeSplit: 'cca_aligned', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'CapEx KPI', griCode: 'EU-TAX-CAPEX-Plan', lineItem: 'CapEx plan to extend or expand environmentally sustainable activities (next 5-10 years)', unit: 'EUR', scopeSplit: 'capex_plan', hasTarget: true, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
]

const TAX_OPEX: ItemSpec[] = [
  { subsection: 'OpEx KPI', griCode: 'EU-TAX-OPEX-Total', lineItem: 'Total eligible OpEx (denominator)', unit: 'EUR', scopeSplit: 'total', hasTarget: false, requiresCoverage: false, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'OpEx KPI', griCode: 'EU-TAX-OPEX-CCM', lineItem: 'OpEx — Climate change mitigation — aligned %', unit: '%', scopeSplit: 'ccm_aligned', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
  { subsection: 'OpEx KPI', griCode: 'EU-TAX-OPEX-CCA', lineItem: 'OpEx — Climate change adaptation — aligned %', unit: '%', scopeSplit: 'cca_aligned', hasTarget: false, requiresCoverage: true, defaultRole: 'FM', entryMode: 'Manual' },
]

const TAX_DNSH: ItemSpec[] = [
  { subsection: 'DNSH assessment', griCode: 'EU-TAX-DNSH', lineItem: 'Do-no-significant-harm (DNSH) assessment — Climate change mitigation', unit: 'pass/fail', scopeSplit: 'ccm', hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'DNSH assessment', griCode: 'EU-TAX-DNSH', lineItem: 'DNSH — Climate change adaptation', unit: 'pass/fail', scopeSplit: 'cca', hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'DNSH assessment', griCode: 'EU-TAX-DNSH', lineItem: 'DNSH — Water and marine resources', unit: 'pass/fail', scopeSplit: 'wtr', hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'DNSH assessment', griCode: 'EU-TAX-DNSH', lineItem: 'DNSH — Circular economy', unit: 'pass/fail', scopeSplit: 'ce', hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'DNSH assessment', griCode: 'EU-TAX-DNSH', lineItem: 'DNSH — Pollution prevention and control', unit: 'pass/fail', scopeSplit: 'ppc', hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'DNSH assessment', griCode: 'EU-TAX-DNSH', lineItem: 'DNSH — Biodiversity and ecosystems', unit: 'pass/fail', scopeSplit: 'bio', hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

const TAX_SAFE: ItemSpec[] = [
  { subsection: 'Minimum safeguards', griCode: 'EU-TAX-Safeguards', lineItem: 'Alignment with OECD Guidelines for Multinational Enterprises', unit: 'pass/fail', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Minimum safeguards', griCode: 'EU-TAX-Safeguards', lineItem: 'Alignment with UN Guiding Principles on Business and Human Rights', unit: 'pass/fail', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Minimum safeguards', griCode: 'EU-TAX-Safeguards', lineItem: 'Alignment with ILO Declaration on Fundamental Principles and Rights at Work', unit: 'pass/fail', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
  { subsection: 'Minimum safeguards', griCode: 'EU-TAX-Safeguards', lineItem: 'Alignment with International Bill of Human Rights', unit: 'pass/fail', scopeSplit: null, hasTarget: false, requiresCoverage: false, defaultRole: 'SO', entryMode: 'Manual' },
]

export const EU_TAXONOMY_ITEMS: ItemSpec[] = [
  ...TAX_TURNOVER, ...TAX_CAPEX, ...TAX_OPEX, ...TAX_DNSH, ...TAX_SAFE,
]

import type { Sql } from './_db'

export async function seedEUTaxonomy(sql: Sql): Promise<void> {
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS framework_id TEXT`
  for (const it of EU_TAXONOMY_ITEMS) {
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
