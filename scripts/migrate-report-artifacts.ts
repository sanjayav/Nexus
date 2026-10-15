/**
 * Migration — report artifacts + assurance workflow.
 *
 * Adds:
 *   - report_artifacts  — server-generated PDFs, SHA-256 hashes, OpenTimestamps receipts,
 *                         public verification tokens. Every publish creates one row.
 *   - assurance_requests — third-party auditor sign-off workflow. Request → send link →
 *                         auditor uploads signed statement → statement embedded in final report.
 *
 * Idempotent — safe to run multiple times.
 *
 * Usage: npx tsx scripts/migrate-report-artifacts.ts
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
  console.log('▶ Migrating report artifacts + assurance schema…')

  await sql`
    CREATE TABLE IF NOT EXISTS assurance_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID NOT NULL,
      period_id UUID NOT NULL,
      requested_by UUID NOT NULL,
      auditor_name TEXT,
      auditor_email TEXT NOT NULL,
      auditor_firm TEXT,
      opinion_type TEXT,                  -- 'limited' | 'reasonable'
      isae_reference TEXT,                -- e.g. 'ISAE 3000 (Revised)'
      statement_pdf BYTEA,                -- the signed assurance statement itself
      statement_sha256 TEXT,
      signed_by TEXT,                     -- name of signing auditor
      signed_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'pending', -- pending | signed | rejected | withdrawn
      requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      upload_token TEXT UNIQUE,           -- token the auditor uses to upload (without platform auth)
      notes TEXT
    )
  `
  console.log('  ✓ assurance_requests')

  await sql`CREATE INDEX IF NOT EXISTS idx_assurance_period ON assurance_requests(org_id, period_id)`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_assurance_token ON assurance_requests(upload_token) WHERE upload_token IS NOT NULL`

  await sql`
    CREATE TABLE IF NOT EXISTS report_artifacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID NOT NULL,
      period_id UUID NOT NULL,
      framework_id TEXT NOT NULL,
      version INT NOT NULL DEFAULT 1,
      pdf_content BYTEA NOT NULL,
      pdf_sha256 TEXT NOT NULL,
      pdf_size INT NOT NULL,
      page_count INT,
      is_draft BOOLEAN NOT NULL DEFAULT true,  -- lifts to false once assurance signed
      assurance_request_id UUID,
      anchor_receipt BYTEA,                    -- OpenTimestamps .ots receipt (172 bytes partial)
      anchor_tip_hash TEXT,                    -- the SHA-256 submitted to OTS
      anchor_calendar_url TEXT,                -- 'https://a.pool.opentimestamps.org/digest'
      anchored_at TIMESTAMPTZ,
      verification_token TEXT UNIQUE NOT NULL, -- public, shareable (e.g. /verify/abc123)
      published_by UUID NOT NULL,
      published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      metadata JSONB
    )
  `
  console.log('  ✓ report_artifacts')

  await sql`CREATE INDEX IF NOT EXISTS idx_report_period ON report_artifacts(org_id, period_id, version DESC)`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_report_verification ON report_artifacts(verification_token)`

  // Verify
  const a = await sql`SELECT COUNT(*)::int AS n FROM assurance_requests`
  const r = await sql`SELECT COUNT(*)::int AS n FROM report_artifacts`
  console.log(`\n  Existing rows — assurance_requests: ${a[0].n}, report_artifacts: ${r[0].n}`)
  console.log('\n✓ Migration complete.')
}

main().catch(e => { console.error('ERROR:', e); process.exit(1) })
