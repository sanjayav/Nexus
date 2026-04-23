/**
 * Seed representative TCFD + CSRD E1 disclosures so the framework picker
 * isn't empty during the PTTGC POC. These are the exact disclosure IDs and
 * line-items a PTTGC sustainability officer would expect to see.
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

const ORG = '00000000-0000-0000-0000-000000000001'

type Disc = {
  framework: string
  code: string
  line_item: string
  section: string
  subsection: string
  unit: string | null
  default_role: string
  reporting_scope: 'group' | 'jv'
  response_type: 'numeric' | 'narrative'
  entry_mode_default: 'Manual' | 'Calculator' | 'Connector'
}

const TCFD: Disc[] = [
  { framework: 'tcfd', code: 'Gov-a',    line_item: "Board's oversight of climate-related risks and opportunities",   section: 'Governance',       subsection: 'Board',       unit: null, default_role: 'SO', reporting_scope: 'group', response_type: 'narrative', entry_mode_default: 'Manual' },
  { framework: 'tcfd', code: 'Gov-b',    line_item: "Management's role in assessing and managing climate risks",      section: 'Governance',       subsection: 'Management',  unit: null, default_role: 'SO', reporting_scope: 'group', response_type: 'narrative', entry_mode_default: 'Manual' },
  { framework: 'tcfd', code: 'Strat-a',  line_item: "Material climate-related risks and opportunities",               section: 'Strategy',         subsection: 'Risks',       unit: null, default_role: 'SO',              reporting_scope: 'group', response_type: 'narrative', entry_mode_default: 'Manual' },
  { framework: 'tcfd', code: 'Strat-b',  line_item: "Impact of climate risks on business, strategy, financial planning", section: 'Strategy',      subsection: 'Impact',      unit: null, default_role: 'SO',              reporting_scope: 'group', response_type: 'narrative', entry_mode_default: 'Manual' },
  { framework: 'tcfd', code: 'Strat-c',  line_item: "Resilience of strategy under 2°C and 1.5°C scenarios",           section: 'Strategy',         subsection: 'Scenarios',   unit: null, default_role: 'SO',              reporting_scope: 'group', response_type: 'narrative', entry_mode_default: 'Manual' },
  { framework: 'tcfd', code: 'RiskMgmt-a', line_item: "Process for identifying and assessing climate-related risks", section: 'Risk management',  subsection: 'Process',     unit: null, default_role: 'SO', reporting_scope: 'group', response_type: 'narrative', entry_mode_default: 'Manual' },
  { framework: 'tcfd', code: 'Metrics-a', line_item: "Metrics used to assess climate-related risks and opportunities",section: 'Metrics & targets',subsection: 'Metrics',     unit: null, default_role: 'SO',              reporting_scope: 'group', response_type: 'narrative', entry_mode_default: 'Manual' },
  { framework: 'tcfd', code: 'Metrics-b-s1', line_item: "Scope 1 GHG emissions",                                       section: 'Metrics & targets',subsection: 'Emissions',   unit: 'tCO2e', default_role: 'SO', reporting_scope: 'group', response_type: 'numeric',   entry_mode_default: 'Calculator' },
  { framework: 'tcfd', code: 'Metrics-b-s2', line_item: "Scope 2 GHG emissions (location-based)",                      section: 'Metrics & targets',subsection: 'Emissions',   unit: 'tCO2e', default_role: 'SO', reporting_scope: 'group', response_type: 'numeric',   entry_mode_default: 'Calculator' },
  { framework: 'tcfd', code: 'Metrics-b-s3', line_item: "Scope 3 GHG emissions",                                       section: 'Metrics & targets',subsection: 'Emissions',   unit: 'tCO2e', default_role: 'SO', reporting_scope: 'group', response_type: 'numeric',   entry_mode_default: 'Calculator' },
  { framework: 'tcfd', code: 'Metrics-c-target', line_item: "Climate-related targets and performance against them",   section: 'Metrics & targets',subsection: 'Targets',     unit: '%',     default_role: 'SO', reporting_scope: 'group', response_type: 'numeric',   entry_mode_default: 'Manual'     },
  { framework: 'tcfd', code: 'Metrics-c-intern-carbon', line_item: "Internal carbon price used",                       section: 'Metrics & targets',subsection: 'Targets',     unit: 'USD/tCO2e', default_role: 'SO', reporting_scope: 'group', response_type: 'numeric', entry_mode_default: 'Manual' },
]

const CSRD: Disc[] = [
  { framework: 'csrd-e1', code: 'E1-1',  line_item: "Transition plan for climate change mitigation",                   section: 'Strategy',   subsection: 'Transition', unit: null, default_role: 'SO',              reporting_scope: 'group', response_type: 'narrative', entry_mode_default: 'Manual' },
  { framework: 'csrd-e1', code: 'E1-2',  line_item: "Policies related to climate change mitigation and adaptation",    section: 'Policies',   subsection: 'Climate',    unit: null, default_role: 'SO',              reporting_scope: 'group', response_type: 'narrative', entry_mode_default: 'Manual' },
  { framework: 'csrd-e1', code: 'E1-3',  line_item: "Actions and resources in relation to climate change policies",   section: 'Actions',    subsection: 'Resources',  unit: 'M EUR', default_role: 'SO', reporting_scope: 'group', response_type: 'numeric',   entry_mode_default: 'Manual' },
  { framework: 'csrd-e1', code: 'E1-4',  line_item: "Targets related to climate change mitigation and adaptation",     section: 'Targets',    subsection: 'Climate',    unit: '%',     default_role: 'SO', reporting_scope: 'group', response_type: 'numeric',   entry_mode_default: 'Manual' },
  { framework: 'csrd-e1', code: 'E1-5-1', line_item: "Energy consumption from fossil sources",                          section: 'Metrics',    subsection: 'Energy',     unit: 'MWh',   default_role: 'FM',                reporting_scope: 'group', response_type: 'numeric',   entry_mode_default: 'Calculator' },
  { framework: 'csrd-e1', code: 'E1-5-2', line_item: "Energy consumption from renewable sources",                       section: 'Metrics',    subsection: 'Energy',     unit: 'MWh',   default_role: 'FM',                reporting_scope: 'group', response_type: 'numeric',   entry_mode_default: 'Calculator' },
  { framework: 'csrd-e1', code: 'E1-6-s1', line_item: "Gross Scope 1 GHG emissions",                                     section: 'Metrics',    subsection: 'GHG',        unit: 'tCO2e', default_role: 'SO', reporting_scope: 'group', response_type: 'numeric',   entry_mode_default: 'Calculator' },
  { framework: 'csrd-e1', code: 'E1-6-s2m', line_item: "Gross Scope 2 GHG emissions (market-based)",                    section: 'Metrics',    subsection: 'GHG',        unit: 'tCO2e', default_role: 'SO', reporting_scope: 'group', response_type: 'numeric',   entry_mode_default: 'Calculator' },
  { framework: 'csrd-e1', code: 'E1-6-s2l', line_item: "Gross Scope 2 GHG emissions (location-based)",                  section: 'Metrics',    subsection: 'GHG',        unit: 'tCO2e', default_role: 'SO', reporting_scope: 'group', response_type: 'numeric',   entry_mode_default: 'Calculator' },
  { framework: 'csrd-e1', code: 'E1-6-s3', line_item: "Gross Scope 3 GHG emissions",                                    section: 'Metrics',    subsection: 'GHG',        unit: 'tCO2e', default_role: 'SO', reporting_scope: 'group', response_type: 'numeric',   entry_mode_default: 'Calculator' },
  { framework: 'csrd-e1', code: 'E1-7',  line_item: "GHG removals and GHG mitigation projects financed via carbon credits", section: 'Metrics', subsection: 'Credits',   unit: 'tCO2e', default_role: 'SO', reporting_scope: 'group', response_type: 'numeric',   entry_mode_default: 'Manual' },
  { framework: 'csrd-e1', code: 'E1-8',  line_item: "Internal carbon pricing schemes",                                  section: 'Metrics',    subsection: 'Pricing',    unit: 'USD/tCO2e', default_role: 'SO', reporting_scope: 'group', response_type: 'numeric', entry_mode_default: 'Manual' },
  { framework: 'csrd-e1', code: 'E1-9',  line_item: "Anticipated financial effects from material physical and transition risks", section: 'Metrics', subsection: 'Finance',   unit: 'M EUR', default_role: 'SO',              reporting_scope: 'group', response_type: 'narrative', entry_mode_default: 'Manual' },
]

async function main() {
  console.log('▶ Seeding TCFD + CSRD E1 disclosures…')
  const all = [...TCFD, ...CSRD]
  let inserted = 0, skipped = 0
  for (const d of all) {
    const existing = await sql`
      SELECT id FROM questionnaire_item
      WHERE framework_id = ${d.framework} AND gri_code = ${d.code} AND line_item = ${d.line_item}
      LIMIT 1
    ` as Array<{ id: string }>
    if (existing.length > 0) { skipped++; continue }
    await sql`
      INSERT INTO questionnaire_item
        (framework_id, gri_code, line_item, section, subsection, unit, default_workflow_role, reporting_scope, entry_mode_default, footnote_refs)
      VALUES
        (${d.framework}, ${d.code}, ${d.line_item}, ${d.section}, ${d.subsection}, ${d.unit},
         ${d.default_role}, ${d.reporting_scope}, ${d.entry_mode_default}, '[]'::jsonb)
    `
    inserted++
  }
  console.log(`  ✓ TCFD + CSRD E1 → inserted ${inserted}, skipped ${skipped} (already present)`)

  // Enable frameworks for the PTTGC tenant
  for (const fw of ['tcfd', 'csrd-e1']) {
    await sql`
      INSERT INTO org_framework_enablement (org_id, framework_id, enabled, enabled_by)
      VALUES (${ORG}, ${fw}, true, '00000000-0000-0000-0000-000000000100')
      ON CONFLICT (org_id, framework_id) DO UPDATE SET enabled = true
    `
    console.log(`  ✓ framework ${fw} enabled for PTTGC tenant`)
  }

  // Summary
  const s = await sql`SELECT framework_id, COUNT(*)::int AS n FROM questionnaire_item GROUP BY framework_id ORDER BY framework_id` as Array<{ framework_id: string; n: number }>
  console.log('\n  Disclosure counts per framework:')
  for (const r of s) console.log(`    ${r.framework_id.padEnd(12)} ${r.n}`)
}

main().catch(e => { console.error('ERROR:', e); process.exit(1) })
