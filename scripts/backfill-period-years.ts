/**
 * Give existing orgs a reporting_year for their reporting periods —
 * MANUAL, DRY-RUN BY DEFAULT.
 *
 * Background (api/_periodYear.ts): data entry writes into the caller org's
 * reporting_year, which /api/org create-period / transition-period now
 * create-or-link. Orgs whose periods were created before that have periods
 * but no year, so data entry shows "No open reporting year". This script runs
 * the same create-or-link for them (one call per org + year), so the result
 * is exactly what re-saving the period in the product would do.
 *
 * Per org + year that has at least one period:
 *   - no reporting_year and an open period (setup / active / locked)
 *       → create the year (status mirrors the periods) and link the periods
 *   - no reporting_year and only published / archived periods
 *       → skipped (closing a period never creates an empty year)
 *   - a reporting_year exists
 *       → link the periods (reporting_year_id) and move the year's status
 *         forward if the periods imply it (never backwards; published
 *         terminal; the demo org's seeded FY2026 year is never modified)
 *
 * Usage (reads DATABASE_URL from the environment or .env):
 *
 *   npx tsx scripts/backfill-period-years.ts                     # dry run: plan only, no writes
 *   npx tsx scripts/backfill-period-years.ts --org <uuid>        # dry run for one org
 *   npx tsx scripts/backfill-period-years.ts --apply [--org …]   # perform it
 *
 * Recommended: dry run, then --apply against a Neon branch, then production.
 * Idempotent — re-running is a no-op. /api/setup should have run first
 * (ensurePeriodYearSchema adds reporting_periods.reporting_year_id); without
 * the column, years are still created but periods are not linked.
 */
import { neon } from '@neondatabase/serverless'
import { config as loadEnv } from 'dotenv'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEMO_REPORTING_YEAR_ID, impliedYearStatus, nextYearStatus, syncPeriodReportingYear,
} from '../api/_periodYear.js'

if (process.env.CI || process.env.VERCEL) {
  console.error('backfill-period-years is a manual script and refuses to run in CI / Vercel.')
  process.exit(1)
}

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: join(resolve(__dirname, '..'), '.env') })

const APPLY = process.argv.includes('--apply')
const orgArg = process.argv.indexOf('--org')
const ONLY_ORG = orgArg >= 0 ? process.argv[orgArg + 1] : undefined
if (orgArg >= 0 && !/^[0-9a-f-]{36}$/i.test(ONLY_ORG ?? '')) {
  console.error('--org needs an organisation UUID'); process.exit(1)
}

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1) }
const sql = neon(process.env.DATABASE_URL)

const OPEN = new Set(['setup', 'active', 'locked'])

interface Group {
  org_id: string
  org_name: string | null
  year: number
  period_ids: string[]
  statuses: string[]
  unlinked: number
  ry_id: string | null
  ry_status: string | null
}

async function main() {
  console.log(`▶ backfill-period-years — ${APPLY ? 'APPLY (writes)' : 'DRY RUN (no writes)'}${ONLY_ORG ? ` · org ${ONLY_ORG}` : ''}\n`)

  const col = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reporting_periods' AND column_name = 'reporting_year_id'
  ` as unknown[]
  const hasLink = col.length > 0
  if (!hasLink) console.log('⚠ reporting_periods.reporting_year_id missing — run /api/setup first to link periods.\n')

  // One row per org + year that has periods; the org's year for it, if any.
  const groups = await sql`
    SELECT rp.org_id, o.name AS org_name, rp.year,
           array_agg(rp.id ORDER BY (rp.status IN ('setup','active','locked')) DESC, rp.created_at) AS period_ids,
           array_agg(rp.status ORDER BY (rp.status IN ('setup','active','locked')) DESC, rp.created_at) AS statuses,
           COUNT(*) FILTER (WHERE (to_jsonb(rp) ->> 'reporting_year_id') IS DISTINCT FROM ry.id::text)::int AS unlinked,
           ry.id AS ry_id, ry.status AS ry_status
    FROM reporting_periods rp
    LEFT JOIN organisations o ON o.id = rp.org_id
    LEFT JOIN reporting_year ry ON ry.organisation_id = rp.org_id AND ry.year = rp.year
    WHERE rp.org_id IS NOT NULL
      AND (${ONLY_ORG ?? null}::uuid IS NULL OR rp.org_id = ${ONLY_ORG ?? null}::uuid)
    GROUP BY rp.org_id, o.name, rp.year, ry.id, ry.status
    ORDER BY o.name NULLS LAST, rp.year
  ` as Group[]

  let toCreate = 0, toLink = 0, toAdvance = 0, skipped = 0, noop = 0
  const plan: Array<{ g: Group; action: string; create: boolean }> = []

  for (const g of groups) {
    const implied = impliedYearStatus(g.statuses)
    const hasOpen = g.statuses.some(s => OPEN.has(s))
    let action: string
    let create = false
    if (!g.ry_id) {
      if (!hasOpen) { action = `skip — no open period (${g.statuses.join(', ')})`; skipped++ }
      else {
        create = true
        action = `CREATE year (${implied === 'setup' ? 'setup' : 'active'}) + link ${g.period_ids.length}`
        toCreate++
      }
    } else {
      const parts: string[] = []
      if (hasLink && g.unlinked > 0) { parts.push(`link ${g.unlinked}`); toLink++ }
      const next = nextYearStatus(g.ry_status ?? '', implied)
      if (next !== g.ry_status) {
        if (g.ry_id === DEMO_REPORTING_YEAR_ID) parts.push(`(demo year: status ${g.ry_status} kept)`)
        else { parts.push(`status ${g.ry_status} → ${next}`); toAdvance++ }
      }
      action = parts.length ? parts.join(', ') : 'ok'
      if (!parts.length) noop++
    }
    plan.push({ g, action, create })
    console.log(`  ${(g.org_name ?? g.org_id).slice(0, 40).padEnd(40)} FY${g.year}  periods[${g.statuses.join(',')}]  year ${g.ry_status ?? '—'}  → ${action}`)
  }

  console.log(`\n  org-years ${groups.length} · create ${toCreate} · link ${toLink} · advance ${toAdvance} · skip ${skipped} · ok ${noop}`)

  if (!APPLY) {
    console.log('\nDry run — nothing written. Re-run with --apply to perform it.')
    return
  }

  let done = 0, failed = 0
  for (const { g, action, create } of plan) {
    if (action === 'ok' || action.startsWith('skip')) continue
    try {
      const r = await syncPeriodReportingYear(sql, g.org_id, g.period_ids[0], { create })
      done++
      console.log(`  ✓ ${g.org_id} FY${g.year} → year ${r?.reporting_year_id ?? '—'} ${r?.status ?? ''}${r?.created ? ' (created)' : ''}`)
    } catch (err: unknown) {
      failed++
      console.error(`  ✗ ${g.org_id} FY${g.year}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  console.log(`\n▶ applied ${done}, failed ${failed}`)
  if (failed) process.exit(1)
}

main().catch(err => { console.error(err); process.exit(1) })
