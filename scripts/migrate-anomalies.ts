/**
 * Migration — anomaly suppression table.
 *
 * Lets any authorised user dismiss a flagged anomaly with a reason. The raw
 * anomaly is still *computed* every time, but if a suppression exists for
 * (assignment_id, anomaly_type) it's filtered out of the feed. This gives
 * auditors a provable trail: nothing is hidden, merely explained away.
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

async function main() {
  console.log('▶ Migrating anomaly_suppressions…')

  await sql`
    CREATE TABLE IF NOT EXISTS anomaly_suppressions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID NOT NULL,
      assignment_id UUID NOT NULL,
      anomaly_type TEXT NOT NULL,   -- 'yoy_spike' | 'z_score_outlier' | 'unit_change' | etc.
      reason TEXT NOT NULL,
      suppressed_by UUID NOT NULL,
      suppressed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (assignment_id, anomaly_type)
    )
  `
  console.log('  ✓ anomaly_suppressions')
  await sql`CREATE INDEX IF NOT EXISTS idx_anomaly_supp_org ON anomaly_suppressions(org_id, assignment_id)`
  const n = await sql`SELECT COUNT(*)::int AS n FROM anomaly_suppressions`
  console.log(`\n  Existing suppressions: ${n[0].n}`)
  console.log('\n✓ Migration complete.')
}

main().catch(e => { console.error('ERROR:', e); process.exit(1) })
