/**
 * Migration — customer-experience features:
 *   · saved_views          — named filter snapshots per user/page
 *   · report_share_links   — public read-only report tokens
 *   · anomaly_status       — investigation workflow for flagged anomalies
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
  console.log('▶ Migrating saved_views…')
  await sql`
    CREATE TABLE IF NOT EXISTS saved_views (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      page TEXT NOT NULL,
      name TEXT NOT NULL,
      filters JSONB NOT NULL,
      is_default BOOLEAN DEFAULT false,
      is_shared BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_saved_views_user_page ON saved_views(user_id, page)`
  await sql`CREATE INDEX IF NOT EXISTS idx_saved_views_org_shared ON saved_views(org_id, is_shared) WHERE is_shared = true`
  console.log('  ✓ saved_views')

  console.log('▶ Migrating report_share_links…')
  await sql`
    CREATE TABLE IF NOT EXISTS report_share_links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      report_id UUID,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ,
      password_hash TEXT,
      view_count INTEGER DEFAULT 0,
      created_by UUID REFERENCES users(id),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_share_links_token ON report_share_links(token)`
  console.log('  ✓ report_share_links')

  console.log('▶ Migrating anomaly_status…')
  await sql`
    CREATE TABLE IF NOT EXISTS anomaly_status (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      anomaly_key TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('open','investigating','resolved','dismissed')),
      note TEXT,
      changed_by UUID REFERENCES users(id),
      changed_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (org_id, anomaly_key)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_anomaly_status_org ON anomaly_status(org_id, status)`
  console.log('  ✓ anomaly_status')

  console.log('\n✓ Migration complete.')
}

main().catch(e => { console.error(e); process.exit(1) })
