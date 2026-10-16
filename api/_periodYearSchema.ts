/**
 * reporting_periods → reporting_year link — additive and idempotent.
 *
 * Wire from api/setup.ts AFTER both reporting_year and reporting_periods
 * exist (i.e. after `idx_reporting_periods_org` is created):
 *
 *     import { ensurePeriodYearSchema } from './_periodYearSchema.js'
 *     …
 *     await ensurePeriodYearSchema(sql)
 *
 * Shape of the link:
 *   reporting_year is UNIQUE(organisation_id, year); reporting_periods is
 *   UNIQUE(org_id, framework_id, year). So one org-year holds one
 *   reporting_year shared by every framework's period of that year — the link
 *   is many periods → one year, i.e. a nullable FK on reporting_periods
 *   (a reporting_year.period_id column could only name one of them).
 *
 * Contract:
 *   - Only ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS. Nothing is
 *     altered, dropped or back-filled — existing periods keep
 *     reporting_year_id = NULL until they next go through create-period /
 *     transition-period (api/_periodYear.ts), or until the manual script
 *       npx tsx scripts/backfill-period-years.ts            (dry run)
 *       npx tsx scripts/backfill-period-years.ts --apply    (writes)
 *     is applied.
 *   - ON DELETE SET NULL: deleting a year never deletes a period.
 */
import type { Sql } from './_db.js'

export async function ensurePeriodYearSchema(sql: Sql): Promise<void> {
  await sql`ALTER TABLE IF EXISTS reporting_periods
    ADD COLUMN IF NOT EXISTS reporting_year_id UUID REFERENCES reporting_year(id) ON DELETE SET NULL`
  await sql`CREATE INDEX IF NOT EXISTS idx_reporting_periods_year
    ON reporting_periods(reporting_year_id) WHERE reporting_year_id IS NOT NULL`
}
