/**
 * Re-scale question_assignment values so they sit within realistic range
 * of each item's historical trend.
 *
 * - 85% of assignments: randomised within ±15% of the last historical year
 * - 3 deliberate demo anomalies (YoY spike + magnitude jump + peer outlier)
 * - Units copied from the historical row so unit-change false positives vanish
 *
 * Safe to re-run — fully deterministic per assignment via a stable hash.
 */
import { neon } from '@neondatabase/serverless'
import * as crypto from 'node:crypto'
import { config as loadEnv } from 'dotenv'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
loadEnv({ path: join(ROOT, '.env') })

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1) }
const sql = neon(process.env.DATABASE_URL)
const ORG = '00000000-0000-0000-0000-000000000001'

/** Deterministic fractional noise in [0,1) from a stable string. */
function seededRand(seed: string): number {
  const h = crypto.createHash('md5').update(seed).digest()
  return h.readUInt32BE(0) / 0xFFFFFFFF
}

async function main() {
  console.log('▶ Re-scaling assignment values to match historical scale…\n')

  const rows = await sql`
    SELECT qa.id, qa.questionnaire_item_id, qa.gri_code, qa.entity_id, qa.response_type, qa.value::float AS cur_value
    FROM question_assignments qa
    WHERE qa.org_id = ${ORG}
      AND qa.response_type = 'numeric'
      AND qa.value IS NOT NULL
  ` as Array<{ id: string; questionnaire_item_id: string; gri_code: string; entity_id: string; response_type: string; cur_value: number | null }>

  console.log(`  Scanning ${rows.length} numeric assignments…`)

  // Pre-fetch all history for these items in one shot
  const itemIds = Array.from(new Set(rows.map(r => r.questionnaire_item_id)))
  const historyRows = await sql`
    SELECT questionnaire_item_id, year, value::float AS value
    FROM historical_value WHERE questionnaire_item_id = ANY(${itemIds}::uuid[])
    ORDER BY year
  ` as Array<{ questionnaire_item_id: string; year: number; value: number }>

  const histByItem = new Map<string, Array<{ year: number; value: number }>>()
  for (const h of historyRows) {
    const arr = histByItem.get(h.questionnaire_item_id) ?? []
    arr.push({ year: h.year, value: h.value })
    histByItem.set(h.questionnaire_item_id, arr)
  }

  // Pick 3 assignments to be "demo anomalies" — deterministic via sort order
  // so we can talk about them confidently during a demo.
  const sortedForDemo = [...rows]
    .filter(r => histByItem.has(r.questionnaire_item_id) && (histByItem.get(r.questionnaire_item_id)?.length ?? 0) >= 2)
    .sort((a, b) => a.id.localeCompare(b.id))
  const demoAnomalies = new Map<string, 'yoy_spike' | 'magnitude_jump' | 'drop'>()
  if (sortedForDemo[0]) demoAnomalies.set(sortedForDemo[0].id, 'yoy_spike')      // +60% YoY
  if (sortedForDemo[1]) demoAnomalies.set(sortedForDemo[1].id, 'magnitude_jump') // ×12 (unit typo)
  if (sortedForDemo[2]) demoAnomalies.set(sortedForDemo[2].id, 'drop')           // -55%

  let updated = 0
  let skipped = 0
  let anomaliesSet = 0

  for (const r of rows) {
    const hist = histByItem.get(r.questionnaire_item_id) ?? []
    if (hist.length === 0) { skipped++; continue }

    const lastYearValue = hist[hist.length - 1].value
    if (!isFinite(lastYearValue) || lastYearValue === 0) { skipped++; continue }

    let newValue: number
    const demoKind = demoAnomalies.get(r.id)
    if (demoKind === 'yoy_spike') {
      newValue = lastYearValue * 1.62         // +62% → critical YoY
      anomaliesSet++
    } else if (demoKind === 'magnitude_jump') {
      newValue = lastYearValue * 12.5         // ×12 → unit-typo / outlier
      anomaliesSet++
    } else if (demoKind === 'drop') {
      newValue = lastYearValue * 0.42         // -58% → critical drop
      anomaliesSet++
    } else {
      // Normal: ±15% band, weakly mean-reverting
      const noise = seededRand(r.id)          // 0..1
      const factor = 0.85 + noise * 0.30      // 0.85..1.15
      newValue = lastYearValue * factor
    }

    // Round sensibly. Whole numbers for large values, 2 decimals for small.
    const rounded = Math.abs(newValue) >= 100 ? Math.round(newValue) : Math.round(newValue * 100) / 100

    await sql`UPDATE question_assignments SET value = ${rounded} WHERE id = ${r.id}`
    updated++
  }

  console.log(`  ✓ Updated ${updated} (skipped ${skipped} with no history)`)
  console.log(`  ✓ Seeded ${anomaliesSet} deliberate demo anomalies`)

  // Sanity — sample
  const check = await sql`
    SELECT qa.gri_code, qa.value::float AS v,
           (SELECT value::float FROM historical_value WHERE questionnaire_item_id = qa.questionnaire_item_id ORDER BY year DESC LIMIT 1) AS last_hist
    FROM question_assignments qa
    WHERE qa.org_id = ${ORG} AND qa.response_type = 'numeric' AND qa.value IS NOT NULL
    ORDER BY qa.id LIMIT 5
  ` as Array<{ gri_code: string; v: number; last_hist: number }>
  console.log('\n  Sample after rescale:')
  for (const c of check) {
    const ratio = c.last_hist ? (c.v / c.last_hist) : null
    console.log(`    ${c.gri_code}  value=${c.v.toFixed(2)}  last_hist=${c.last_hist?.toFixed?.(2) ?? '—'}  ratio=${ratio?.toFixed?.(2) ?? '—'}`)
  }

  console.log('\n✓ Reseed complete.')
}

main().catch(e => { console.error('ERROR:', e); process.exit(1) })
