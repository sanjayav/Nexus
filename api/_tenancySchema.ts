/**
 * data_value tenancy schema — additive and idempotent.
 *
 * Wire from api/setup.ts AFTER data_value and organisations exist:
 *
 *     import { ensureTenancySchema } from './_tenancySchema.js'
 *     …
 *     await ensureTenancySchema(sql)
 *
 * Contract:
 *   - Only ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS. Nothing is
 *     altered, dropped or back-filled — existing rows keep org_id = NULL and
 *     are owned through the fallback chain documented in api/_tenancy.ts.
 *   - The back-fill is a separate, manual, dry-run-by-default script:
 *       npx tsx scripts/backfill-data-value-org.ts            (dry run)
 *       npx tsx scripts/backfill-data-value-org.ts --apply    (writes)
 *   - `ALTER TABLE IF EXISTS` so a partial database never fails setup.
 */
import type { Sql } from './_db.js'

export async function ensureTenancySchema(sql: Sql): Promise<void> {
  // Owning org of a data value. Nullable: legacy rows stay NULL until the
  // manual back-fill runs. ON DELETE CASCADE mirrors reporting_year → org.
  await sql`ALTER TABLE IF EXISTS data_value
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisations(id) ON DELETE CASCADE`
  await sql`CREATE INDEX IF NOT EXISTS idx_data_value_org
    ON data_value(org_id) WHERE org_id IS NOT NULL`
}
