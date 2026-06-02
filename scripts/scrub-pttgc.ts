/**
 * scripts/scrub-pttgc.ts
 *
 * One-shot DB cleanup: removes every trace of PTTGC / PTT Global Chemical / GC Group
 * demo data from a live Neon database. Safe to run multiple times (idempotent).
 *
 * Usage:
 *   DATABASE_URL='postgres://…' npx tsx scripts/scrub-pttgc.ts
 *
 * What it does:
 *   - organisations.name = 'Nexus Demo Workspace' where name matches PTT/PTTGC/GC patterns
 *   - organisations.industry = 'Sustainability' where it was 'PETROCHEMICALS'
 *   - organisations.slug = 'nexus-demo' where slug = 'pttgc' or similar
 *   - org_entities: renames any entity whose name matches PTT* patterns
 *   - facilities: renames Rayong Refinery / Map Ta Phut / HMC Polymers → generic
 *   - material_topics, anomalies, workflow_tasks: scrubs description strings
 *   - workflow_tasks.title: replaces facility names in titles
 *   - reports.title: same
 *
 * What it does NOT touch:
 *   - users (emails like admin@aeiforo.com are seed users, not PTTGC-specific)
 *   - permissions / roles / role_permissions (generic)
 *   - emission_factors (industry-neutral)
 *   - questionnaire_item (framework disclosures, neutral)
 *
 * Prints a per-table summary of rows changed.
 */
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('ERROR: DATABASE_URL env var required')
  console.error('Run with: DATABASE_URL="postgres://…" npx tsx scripts/scrub-pttgc.ts')
  process.exit(1)
}

const sql = neon(url)

// Facility-name remapping: old PTTGC seed → neutral demo names
const FACILITY_REMAP: Record<string, string> = {
  'Rayong Refinery': 'Refinery Alpha',
  'Map Ta Phut Olefins': 'Olefins Plant Beta',
  'Aromatics Complex': 'Aromatics Complex Gamma',
  'HMC Polymers': 'Polymers Plant Delta',
  'GC Logistics Terminal': 'Logistics Terminal Epsilon',
  'Nava Nakorn Plant': 'Green Chem Plant Zeta',
  'Bioplastics Innovation Center': 'Bioplastics R&D Center',
  'GC Utilities & Power': 'Utilities & Power Eta',
}

async function scrubOrganisations(): Promise<number> {
  const res = await sql`
    UPDATE organisations
    SET
      name = CASE
        WHEN name ILIKE '%PTT Global Chemical%' OR name ILIKE 'PTTGC%' OR name ILIKE '%GC Group%' OR name = 'PTT Global Chemical PCL'
          THEN 'Nexus Demo Workspace'
        ELSE name END,
      slug = CASE
        WHEN slug IN ('pttgc', 'ptt-global-chemical', 'gc-group') THEN 'nexus-demo'
        ELSE slug END,
      industry = CASE
        WHEN industry IN ('PETROCHEMICALS', 'Petrochemicals', 'petrochemicals') THEN 'Sustainability'
        ELSE industry END
    WHERE name ILIKE '%PTT%' OR name ILIKE '%PTTGC%' OR name ILIKE '%GC Group%'
       OR slug IN ('pttgc', 'ptt-global-chemical', 'gc-group')
       OR industry ILIKE '%PETROCHEM%'
    RETURNING id
  `
  return res.length
}

async function scrubOrgEntities(): Promise<number> {
  // Common patterns from past seeds
  const res = await sql`
    UPDATE org_entities
    SET name = REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(name, 'PTT Global Chemical PCL', 'Demo Chemicals Group PCL', 'gi'),
        'PTTGC Chemicals Thailand', 'Demo Chemicals Thailand', 'gi'
      ),
      'PTT(GC)?|GC Group', 'Demo', 'gi'
    )
    WHERE name ILIKE '%PTT%' OR name ILIKE '%PTTGC%' OR name ILIKE '%GC Group%'
    RETURNING id
  `
  return res.length
}

async function scrubFacilities(): Promise<number> {
  let total = 0
  for (const [oldName, newName] of Object.entries(FACILITY_REMAP)) {
    const res = await sql`
      UPDATE facilities
      SET name = ${newName}
      WHERE name = ${oldName}
      RETURNING id
    `
    total += res.length
  }
  // Generic catch-all for stragglers
  const tail = await sql`
    UPDATE facilities
    SET name = REGEXP_REPLACE(name, 'PTT(GC)?|GC Group', 'Demo', 'gi')
    WHERE name ILIKE '%PTT%' OR name ILIKE '%PTTGC%' OR name ILIKE '%GC %'
    RETURNING id
  `
  total += tail.length
  return total
}

async function scrubWorkflowTasks(): Promise<number> {
  let total = 0
  for (const [oldName, newName] of Object.entries(FACILITY_REMAP)) {
    const res = await sql`
      UPDATE workflow_tasks
      SET
        title = REPLACE(title, ${oldName}, ${newName}),
        description = REPLACE(COALESCE(description, ''), ${oldName}, ${newName})
      WHERE title LIKE ${'%' + oldName + '%'} OR description LIKE ${'%' + oldName + '%'}
      RETURNING id
    `
    total += res.length
  }
  return total
}

async function scrubBlockchainRecords(): Promise<number> {
  let total = 0
  for (const [oldName, newName] of Object.entries(FACILITY_REMAP)) {
    const res = await sql`
      UPDATE blockchain_records
      SET facility_name = ${newName}
      WHERE facility_name = ${oldName}
      RETURNING id
    `
    total += res.length
  }
  return total
}

async function scrubAnomalies(): Promise<number> {
  const res = await sql`
    UPDATE anomalies
    SET
      title = REGEXP_REPLACE(title, 'PTT(GC)?|GC Group', 'Demo', 'gi'),
      description = REGEXP_REPLACE(COALESCE(description, ''), 'PTT(GC)?|GC Group', 'Demo', 'gi')
    WHERE title ILIKE '%PTT%' OR description ILIKE '%PTT%'
    RETURNING id
  `
  return res.length
}

async function scrubMaterialTopics(): Promise<number> {
  const res = await sql`
    UPDATE material_topics
    SET
      topic_name = REGEXP_REPLACE(topic_name, 'PTT(GC)?|GC Group', 'Demo', 'gi'),
      rationale = REGEXP_REPLACE(COALESCE(rationale, ''), 'PTT(GC)?|GC Group', 'Demo', 'gi')
    WHERE topic_name ILIKE '%PTT%' OR rationale ILIKE '%PTT%'
    RETURNING id
  `
  return res.length
}

async function scrubReports(): Promise<number> {
  let total = 0
  const t = await sql`
    UPDATE reports
    SET title = REGEXP_REPLACE(title, 'PTT(GC)?|GC Group', 'Demo', 'gi')
    WHERE title ILIKE '%PTT%'
    RETURNING id
  `
  total += t.length
  return total
}

async function tableExists(name: string): Promise<boolean> {
  const res = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = ${name}) AS exists
  `
  return res[0]?.exists ?? false
}

async function safeRun(label: string, fn: () => Promise<number>, table: string): Promise<void> {
  if (!(await tableExists(table))) {
    console.log(`  ${label.padEnd(28)} skipped (table ${table} missing)`)
    return
  }
  try {
    const n = await fn()
    console.log(`  ${label.padEnd(28)} ${n} row${n === 1 ? '' : 's'} updated`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`  ${label.padEnd(28)} ERROR: ${msg.slice(0, 100)}`)
  }
}

async function main(): Promise<void> {
  console.log('\nScrubbing PTTGC residue from database...')
  console.log('─'.repeat(60))
  await safeRun('organisations', scrubOrganisations, 'organisations')
  await safeRun('org_entities', scrubOrgEntities, 'org_entities')
  await safeRun('facilities', scrubFacilities, 'facilities')
  await safeRun('workflow_tasks', scrubWorkflowTasks, 'workflow_tasks')
  await safeRun('blockchain_records', scrubBlockchainRecords, 'blockchain_records')
  await safeRun('anomalies', scrubAnomalies, 'anomalies')
  await safeRun('material_topics', scrubMaterialTopics, 'material_topics')
  await safeRun('reports', scrubReports, 'reports')
  console.log('─'.repeat(60))

  // Verification: count any remaining matches
  console.log('\nVerification — remaining PTT/PTTGC matches:')
  for (const t of ['organisations', 'org_entities', 'facilities', 'workflow_tasks']) {
    if (!(await tableExists(t))) continue
    try {
      const col = t === 'organisations' || t === 'org_entities' || t === 'facilities' ? 'name' : 'title'
      const res = await sql.query(
        `SELECT COUNT(*)::int AS c FROM ${t} WHERE ${col} ILIKE '%PTT%' OR ${col} ILIKE '%PTTGC%'`
      ) as { c: number }[]
      const c = res[0]?.c ?? 0
      console.log(`  ${t.padEnd(28)} ${c} remaining`)
    } catch {
      // ignore
    }
  }

  console.log('\nDone. Refresh your browser (localStorage cache is auto-invalidated by the v2 key bump).')
  console.log('If the sidebar still shows the old name, open DevTools → Application → Local Storage → delete `aeiforo_org_brand`.')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
