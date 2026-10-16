/**
 * Back-fill data_value.org_id for legacy rows — MANUAL, DRY-RUN BY DEFAULT.
 *
 * Background (api/_tenancy.ts): data_value had no org_id, and the client
 * posted the demo org's reporting_year_id for every tenant, so several orgs'
 * values share one reporting year. ensureTenancySchema() (wired into
 * /api/setup) adds a nullable org_id column; new writes stamp it. Existing
 * rows stay NULL and are owned through the fallback chain until this script
 * is applied.
 *
 * Owner resolved per NULL row, in order:
 *   1. org of the entering user                         (users.org_id via entered_by)
 *   2. for derived (propagated) rows with no entering user: the org of the
 *      source value's entering user                    (derived_from → entered_by)
 *   3. org of the reporting year                        (reporting_year.organisation_id)
 *
 * (2) differs from the live fallback (which uses the year for derived rows):
 * a value propagated from org B's entry in the shared demo year belongs to
 * org B, not to the demo org that owns the year.
 *
 * Usage (reads DATABASE_URL from the environment or .env):
 *
 *   npx tsx scripts/backfill-data-value-org.ts            # dry run: counts only, no writes
 *   npx tsx scripts/backfill-data-value-org.ts --apply    # perform the UPDATE
 *
 * Recommended: run the dry run, then --apply against a Neon branch first,
 * then against production. Idempotent — only rows with org_id IS NULL are
 * touched, and only when an owner resolves; re-running is a no-op.
 * Requires /api/setup to have run (the column must exist).
 */
import { neon } from '@neondatabase/serverless'
import { config as loadEnv } from 'dotenv'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: join(resolve(__dirname, '..'), '.env') })

const APPLY = process.argv.includes('--apply')

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1) }
const sql = neon(process.env.DATABASE_URL)

// The resolution, shared by the report and the UPDATE.
//   owner      — what the row will be stamped with
//   via        — which rule resolved it
//   conflict   — entering user's org ≠ reporting year's org (cross-tenant row)
async function main() {
  const col = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'data_value' AND column_name = 'org_id'
  `
  if (col.length === 0) {
    console.error('data_value.org_id does not exist yet — run /api/setup (ensureTenancySchema) first.')
    process.exit(1)
  }

  const summary = await sql`
    WITH resolved AS (
      SELECT d.id,
             eu.org_id  AS user_org,
             seu.org_id AS source_user_org,
             ry.organisation_id AS year_org,
             COALESCE(eu.org_id, CASE WHEN d.entered_by IS NULL THEN seu.org_id END, ry.organisation_id) AS owner
      FROM data_value d
      LEFT JOIN users eu ON eu.id = d.entered_by
      LEFT JOIN data_value sdv ON sdv.id = d.derived_from
      LEFT JOIN users seu ON seu.id = sdv.entered_by
      LEFT JOIN reporting_year ry ON ry.id = d.reporting_year_id
      WHERE d.org_id IS NULL
    )
    SELECT
      (SELECT COUNT(*)::int FROM data_value)                                        AS total_rows,
      (SELECT COUNT(*)::int FROM data_value WHERE org_id IS NOT NULL)               AS already_stamped,
      COUNT(*)::int                                                                 AS null_rows,
      COUNT(*) FILTER (WHERE user_org IS NOT NULL)::int                             AS via_entering_user,
      COUNT(*) FILTER (WHERE user_org IS NULL AND source_user_org IS NOT NULL
                         AND owner = source_user_org)::int                          AS via_derived_source,
      COUNT(*) FILTER (WHERE owner IS NOT NULL AND user_org IS NULL
                         AND (source_user_org IS NULL OR owner <> source_user_org))::int AS via_reporting_year,
      COUNT(*) FILTER (WHERE owner IS NULL)::int                                    AS unresolvable,
      COUNT(*) FILTER (WHERE owner IS NOT NULL AND year_org IS NOT NULL
                         AND owner <> year_org)::int                                AS in_foreign_year
    FROM resolved
  ` as Array<Record<string, number>>

  const perOrg = await sql`
    WITH resolved AS (
      SELECT COALESCE(eu.org_id, CASE WHEN d.entered_by IS NULL THEN seu.org_id END, ry.organisation_id) AS owner,
             ry.organisation_id AS year_org
      FROM data_value d
      LEFT JOIN users eu ON eu.id = d.entered_by
      LEFT JOIN data_value sdv ON sdv.id = d.derived_from
      LEFT JOIN users seu ON seu.id = sdv.entered_by
      LEFT JOIN reporting_year ry ON ry.id = d.reporting_year_id
      WHERE d.org_id IS NULL
    )
    SELECT r.owner AS org_id, o.name AS org_name,
           COUNT(*)::int AS rows,
           COUNT(*) FILTER (WHERE r.year_org IS NOT NULL AND r.owner <> r.year_org)::int AS in_foreign_year
    FROM resolved r
    LEFT JOIN organisations o ON o.id = r.owner
    GROUP BY r.owner, o.name
    ORDER BY rows DESC
  ` as Array<{ org_id: string | null; org_name: string | null; rows: number; in_foreign_year: number }>

  console.log(APPLY ? '▶ data_value.org_id back-fill — APPLY' : '▶ data_value.org_id back-fill — DRY RUN (no writes; pass --apply to write)')
  console.table(summary[0])
  console.log('Rows to stamp, by resolved owner (in_foreign_year = value sits in another org\'s reporting year):')
  console.table(perOrg.map(r => ({ ...r, org_id: r.org_id ?? '(unresolvable — left NULL)' })))

  if (!APPLY) {
    console.log('Dry run complete. Nothing was written.')
    return
  }

  const updated = await sql`
    UPDATE data_value dv
    SET org_id = src.owner
    FROM (
      SELECT d.id,
             COALESCE(eu.org_id, CASE WHEN d.entered_by IS NULL THEN seu.org_id END, ry.organisation_id) AS owner
      FROM data_value d
      LEFT JOIN users eu ON eu.id = d.entered_by
      LEFT JOIN data_value sdv ON sdv.id = d.derived_from
      LEFT JOIN users seu ON seu.id = sdv.entered_by
      LEFT JOIN reporting_year ry ON ry.id = d.reporting_year_id
      WHERE d.org_id IS NULL
    ) src
    WHERE dv.id = src.id
      AND dv.org_id IS NULL
      AND src.owner IS NOT NULL
    RETURNING dv.id
  `
  console.log(`✓ Stamped org_id on ${updated.length} row(s).`)
}

main().catch(err => {
  console.error('✗ Back-fill failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
