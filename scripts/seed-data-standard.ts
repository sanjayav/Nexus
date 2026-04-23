/**
 * ESG Data Standard migration + seed.
 *
 * Addresses PTTGC priorities #1 (standardize), #4 (cadence), #6 (ownership):
 *   · canonical definition per disclosure (what counts, what doesn't)
 *   · calc_method (how to compute it, which EF source)
 *   · cadence (collection frequency)
 *   · data_owner_role / reviewer_role / approver_role
 *
 * Idempotent. Seeds ~25 high-traffic GRI + TCFD + CSRD disclosures with
 * real-world text a PTTGC sustainability officer would recognise.
 */
import { neon } from '@neondatabase/serverless'
import { config as loadEnv } from 'dotenv'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
loadEnv({ path: join(ROOT, '.env') })
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1) }
const sql = neon(process.env.DATABASE_URL)

type Cadence = 'daily' | 'monthly' | 'quarterly' | 'annual'

interface StandardEntry {
  gri_code_prefix: string     // matches by startsWith
  definition: string
  calc_method: string
  cadence: Cadence
  owner_role: string
  reviewer_role: string
  approver_role: string
}

const STANDARDS: StandardEntry[] = [
  // ── GHG ───────────────────────────────────────────────────────
  {
    gri_code_prefix: '305-1',
    definition: 'Direct (Scope 1) GHG emissions from sources owned or controlled by the organisation — stationary combustion, mobile combustion, process emissions, fugitive emissions. Excludes biogenic CO₂ (reported separately per GRI 305-1b).',
    calc_method: 'Sum of (activity data × emission factor × GWP) per source, aggregated in tCO₂e. Activity data in operational units (GJ fuel, km, kg refrigerant). Emission factors from IPCC 2019 refinement + TGO (Thailand Greenhouse Gas Management Organization) national factors. GWPs from IPCC AR5 (100-yr).',
    cadence: 'monthly',
    owner_role: 'plant_manager',
    reviewer_role: 'subsidiary_lead',
    approver_role: 'group_sustainability_officer',
  },
  {
    gri_code_prefix: '305-2',
    definition: 'Indirect (Scope 2) GHG emissions from purchased electricity, steam, heat, cooling. Reported in two parallel methods: location-based (grid average EF) and market-based (contractual instruments like PPAs and RECs).',
    calc_method: 'Location-based: kWh purchased × grid EF (EGAT Thailand 2024 = 0.4999 tCO₂e/MWh). Market-based: kWh × supplier-specific or residual-mix EF. Both values disclosed in parallel columns.',
    cadence: 'monthly',
    owner_role: 'plant_manager',
    reviewer_role: 'subsidiary_lead',
    approver_role: 'group_sustainability_officer',
  },
  {
    gri_code_prefix: '305-3',
    definition: 'Other indirect (Scope 3) GHG emissions from the organisation\'s value chain — 15 categories per GHG Protocol Scope 3 Standard. Relevant for PTTGC: Cat-1 purchased goods & services, Cat-4 upstream transport, Cat-11 use of sold products, Cat-12 end-of-life.',
    calc_method: 'Per category: physical flow × category-specific EF (spend-based for Cat-1 upstream, product LCA for Cat-11). Screen 15 categories annually; report material ones (>5% of total Scope 3).',
    cadence: 'annual',
    owner_role: 'group_sustainability_officer',
    reviewer_role: 'group_sustainability_officer',
    approver_role: 'group_sustainability_officer',
  },
  {
    gri_code_prefix: '305-4',
    definition: 'GHG emission intensity — the organisation\'s Scope 1+2 (and optionally Scope 3) emissions normalised per unit of activity (e.g., tonnes of production, revenue, m³ of throughput).',
    calc_method: '(Scope 1 + Scope 2 tCO₂e) ÷ production volume (tonnes of olefins/aromatics/polymers). Disclose the denominator explicitly.',
    cadence: 'quarterly',
    owner_role: 'plant_manager',
    reviewer_role: 'subsidiary_lead',
    approver_role: 'group_sustainability_officer',
  },
  {
    gri_code_prefix: '305-7',
    definition: 'NOx, SOx, and other significant air emissions (PM, VOC, HAPs, POPs). Measured via continuous emissions monitoring systems (CEMS) where available, otherwise engineering estimates.',
    calc_method: 'Per stack: CEMS recorded concentration × stack flow rate, aggregated to daily/monthly totals. Validate against plant mass balance.',
    cadence: 'monthly',
    owner_role: 'plant_manager',
    reviewer_role: 'subsidiary_lead',
    approver_role: 'group_sustainability_officer',
  },

  // ── Energy ────────────────────────────────────────────────────
  {
    gri_code_prefix: '302-1',
    definition: 'Total energy consumption within the organisation — fuel from non-renewable sources (natural gas, LPG, diesel), fuel from renewable sources, purchased electricity/steam/heat/cooling. Reported in GJ (gigajoules).',
    calc_method: 'Σ(fuel quantity × net calorific value) + purchased electricity/heat in GJ. Conversion from MWh to GJ: × 3.6. Report consumption minus any sold energy.',
    cadence: 'monthly',
    owner_role: 'plant_manager',
    reviewer_role: 'subsidiary_lead',
    approver_role: 'group_sustainability_officer',
  },
  {
    gri_code_prefix: '302-3',
    definition: 'Energy intensity ratio — total energy consumption (GRI 302-1) per unit of activity. Must disclose the denominator (production tonnes, revenue, m³, etc.) and whether the ratio uses energy consumed within or outside the organisation.',
    calc_method: 'GRI 302-1 ÷ production volume. Compared annually against SBTi-aligned energy intensity targets.',
    cadence: 'quarterly',
    owner_role: 'plant_manager',
    reviewer_role: 'subsidiary_lead',
    approver_role: 'group_sustainability_officer',
  },
  {
    gri_code_prefix: '302-4',
    definition: 'Reductions in energy consumption achieved through conservation and efficiency initiatives, measured relative to a defined baseline year. Must specify the baseline.',
    calc_method: 'Baseline year consumption − current year consumption, adjusted for production volume change (normalised). Project-by-project attribution recommended.',
    cadence: 'quarterly',
    owner_role: 'plant_manager',
    reviewer_role: 'subsidiary_lead',
    approver_role: 'group_sustainability_officer',
  },

  // ── Water ─────────────────────────────────────────────────────
  {
    gri_code_prefix: '303-3',
    definition: 'Water withdrawal by source — surface water, groundwater, seawater, produced water, third-party water. Reported in megalitres (ML) with freshwater (TDS < 1,000 mg/L) tracked separately. Excludes precipitation captured for non-production use.',
    calc_method: 'Sum of metered withdrawals per source, per plant. Installed flow meters at every intake point. Cross-validate against third-party (PEA/MEA) water invoices.',
    cadence: 'monthly',
    owner_role: 'plant_manager',
    reviewer_role: 'subsidiary_lead',
    approver_role: 'group_sustainability_officer',
  },
  {
    gri_code_prefix: '303-4',
    definition: 'Water discharge by destination — surface water, groundwater, seawater, third-party water (sent for treatment), and by treatment level. Water quality parameters (TDS, BOD, COD) disclosed for sites in water-stressed areas.',
    calc_method: 'Metered discharge volumes × effluent composition from lab analysis. Daily composite samples at major outlets.',
    cadence: 'monthly',
    owner_role: 'plant_manager',
    reviewer_role: 'subsidiary_lead',
    approver_role: 'group_sustainability_officer',
  },
  {
    gri_code_prefix: '303-5',
    definition: 'Water consumption — the difference between withdrawal and discharge that is evaporated, incorporated into products, or otherwise not returned to the same water basin. Reported in megalitres.',
    calc_method: 'GRI 303-3 withdrawal − GRI 303-4 discharge. Reconcile with plant water balance (cooling tower drift, evaporation).',
    cadence: 'monthly',
    owner_role: 'plant_manager',
    reviewer_role: 'subsidiary_lead',
    approver_role: 'group_sustainability_officer',
  },

  // ── Waste ─────────────────────────────────────────────────────
  {
    gri_code_prefix: '306-3',
    definition: 'Waste generated — hazardous + non-hazardous, by composition (chemical sludge, scrap metal, spent catalyst, etc.). Tonnes.',
    calc_method: 'Weighbridge tickets at plant exit gates + manifest records from waste contractors. Hazardous waste tracked per DIW Thailand regulation.',
    cadence: 'monthly',
    owner_role: 'plant_manager',
    reviewer_role: 'subsidiary_lead',
    approver_role: 'group_sustainability_officer',
  },
  {
    gri_code_prefix: '306-4',
    definition: 'Waste diverted from disposal — recycled, reused, or sent for recovery. Recovery operations per country regulation (Thailand DIW waste codes).',
    calc_method: 'Sum of tonnes sent to approved recovery operators. Recycled, reused, and other recovery broken out separately.',
    cadence: 'monthly',
    owner_role: 'plant_manager',
    reviewer_role: 'subsidiary_lead',
    approver_role: 'group_sustainability_officer',
  },
  {
    gri_code_prefix: '306-5',
    definition: 'Waste directed to disposal — incinerated (with/without energy recovery), landfilled, or other disposal. Tonnes.',
    calc_method: 'Waste generated (306-3) − waste diverted (306-4). Cross-check against disposal contractor manifests.',
    cadence: 'monthly',
    owner_role: 'plant_manager',
    reviewer_role: 'subsidiary_lead',
    approver_role: 'group_sustainability_officer',
  },

  // ── Safety ────────────────────────────────────────────────────
  {
    gri_code_prefix: '403-9',
    definition: 'Work-related injuries — fatalities, high-consequence injuries, recordable injuries for employees and workers who are not employees. Rates per 1,000,000 hours worked.',
    calc_method: '(Number of injuries × 1,000,000) ÷ hours worked. Separate numbers for employees and contractors. Align with ISO 45001 and OSHA recordable definitions.',
    cadence: 'monthly',
    owner_role: 'plant_manager',
    reviewer_role: 'subsidiary_lead',
    approver_role: 'group_sustainability_officer',
  },

  // ── Governance (narrative) ─────────────────────────────────────
  {
    gri_code_prefix: '2-9',
    definition: 'Governance structure and composition — the highest governance body, its committees, and their composition by demographic category and independence.',
    calc_method: 'Board records. Narrative disclosure with supporting tables.',
    cadence: 'annual',
    owner_role: 'group_sustainability_officer',
    reviewer_role: 'group_sustainability_officer',
    approver_role: 'group_sustainability_officer',
  },
  {
    gri_code_prefix: '2-11',
    definition: 'Chair of the highest governance body — whether the chair is also a senior executive. If yes, disclose how conflicts of interest are prevented.',
    calc_method: 'Board records. Binary disclosure + narrative.',
    cadence: 'annual',
    owner_role: 'group_sustainability_officer',
    reviewer_role: 'group_sustainability_officer',
    approver_role: 'group_sustainability_officer',
  },
  {
    gri_code_prefix: '2-27',
    definition: 'Compliance with laws and regulations — significant instances of non-compliance with laws and regulations, and the total monetary value of fines.',
    calc_method: 'Legal team records. Disclose both the number of violations and total fines (THB/USD).',
    cadence: 'annual',
    owner_role: 'group_sustainability_officer',
    reviewer_role: 'group_sustainability_officer',
    approver_role: 'group_sustainability_officer',
  },
  {
    gri_code_prefix: '2-29',
    definition: 'Approach to stakeholder engagement — categories of stakeholders, how the organisation engages them, and key topics raised.',
    calc_method: 'Stakeholder engagement log. Narrative with engagement count + topic summary.',
    cadence: 'annual',
    owner_role: 'group_sustainability_officer',
    reviewer_role: 'group_sustainability_officer',
    approver_role: 'group_sustainability_officer',
  },
  {
    gri_code_prefix: '2-30',
    definition: 'Collective bargaining agreements — percentage of total employees covered by collective bargaining agreements.',
    calc_method: '(Covered employees ÷ total employees) × 100. Exclude contractors.',
    cadence: 'annual',
    owner_role: 'group_sustainability_officer',
    reviewer_role: 'subsidiary_lead',
    approver_role: 'group_sustainability_officer',
  },

  // ── CSRD E1 ───────────────────────────────────────────────────
  {
    gri_code_prefix: 'E1-1',
    definition: 'Transition plan for climate change mitigation — targets, actions and resources for mitigation, alignment with the 1.5°C pathway, and locked-in GHG emissions from key assets.',
    calc_method: 'Narrative disclosure + quantitative target set in alignment with SBTi Net-Zero Standard.',
    cadence: 'annual',
    owner_role: 'group_sustainability_officer',
    reviewer_role: 'group_sustainability_officer',
    approver_role: 'group_sustainability_officer',
  },
  {
    gri_code_prefix: 'E1-6',
    definition: 'Gross Scopes 1, 2, 3 and total GHG emissions — same scope as GRI 305 but with mandatory breakdown by sector classification per ESRS.',
    calc_method: 'Identical to GRI 305-1/2/3 methodology. Additional disaggregation: regulated vs unregulated, emissions from equity share vs operational control.',
    cadence: 'quarterly',
    owner_role: 'plant_manager',
    reviewer_role: 'subsidiary_lead',
    approver_role: 'group_sustainability_officer',
  },

  // ── TCFD ──────────────────────────────────────────────────────
  {
    gri_code_prefix: 'Gov-a',
    definition: "Board's oversight of climate-related risks and opportunities — processes, frequency, and the board's role in setting climate strategy and monitoring progress.",
    calc_method: 'Narrative. Disclose: processes by which the board is informed; frequency of consideration; whether/how it monitors and oversees progress against climate goals.',
    cadence: 'annual',
    owner_role: 'group_sustainability_officer',
    reviewer_role: 'group_sustainability_officer',
    approver_role: 'group_sustainability_officer',
  },
  {
    gri_code_prefix: 'Strat-c',
    definition: "Resilience of the organisation's strategy under 2°C and 1.5°C (or lower) climate scenarios and a counterfactual scenario (e.g., 3-4°C). Disclose scenarios used and assumptions.",
    calc_method: 'Scenario analysis (IEA NZE, APS, STEPS). Quantify impact on revenue, capex, stranded assets under each.',
    cadence: 'annual',
    owner_role: 'group_sustainability_officer',
    reviewer_role: 'group_sustainability_officer',
    approver_role: 'group_sustainability_officer',
  },
]

async function main() {
  console.log('▶ Migrating questionnaire_item for ESG Data Standard…')
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS definition TEXT`
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS calc_method TEXT`
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS cadence TEXT`
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS data_owner_role TEXT`
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS reviewer_role TEXT`
  await sql`ALTER TABLE questionnaire_item ADD COLUMN IF NOT EXISTS approver_role TEXT`
  console.log('  ✓ columns added')

  let updated = 0
  for (const s of STANDARDS) {
    const r = await sql`
      UPDATE questionnaire_item SET
        definition       = ${s.definition},
        calc_method      = ${s.calc_method},
        cadence          = ${s.cadence},
        data_owner_role  = ${s.owner_role},
        reviewer_role    = ${s.reviewer_role},
        approver_role    = ${s.approver_role}
      WHERE gri_code LIKE ${s.gri_code_prefix + '%'}
    `
    // neon-serverless returns the result object not a rowCount directly; use a separate COUNT
    const c = await sql`SELECT COUNT(*)::int AS n FROM questionnaire_item WHERE gri_code LIKE ${s.gri_code_prefix + '%'}` as Array<{ n: number }>
    console.log(`  ✓ ${s.gri_code_prefix.padEnd(10)} → ${c[0].n} row(s) tagged`)
    updated += c[0].n
  }

  // For everything not explicitly tagged, give a sensible default cadence + ownership.
  await sql`
    UPDATE questionnaire_item SET
      cadence          = COALESCE(cadence, 'annual'),
      data_owner_role  = COALESCE(data_owner_role, 'plant_manager'),
      reviewer_role    = COALESCE(reviewer_role, 'subsidiary_lead'),
      approver_role    = COALESCE(approver_role, 'group_sustainability_officer')
    WHERE cadence IS NULL OR data_owner_role IS NULL
  `
  console.log(`\n  Total questionnaire_item rows with standard applied: ${updated}`)

  // Also surface on the assignment so reviewers can see ownership + cadence inline.
  await sql`ALTER TABLE question_assignments ADD COLUMN IF NOT EXISTS cadence TEXT`
  // Backfill cadence from questionnaire_item
  await sql`
    UPDATE question_assignments qa
    SET cadence = qi.cadence
    FROM questionnaire_item qi
    WHERE qa.questionnaire_item_id = qi.id AND qa.cadence IS NULL
  `
  console.log('  ✓ backfilled cadence on existing assignments')

  console.log('\n✓ Data Standard migration complete.')
}

main().catch(e => { console.error('ERROR:', e); process.exit(1) })
