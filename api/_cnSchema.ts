/**
 * Phase 4 (China platform features) schema — additive and idempotent.
 *
 * Wire from api/setup.ts AFTER the core tables exist (organisations, users,
 * notifications, anomalies, ai_gap_analyses):
 *
 *     import { ensureCnSchema } from './_cnSchema.js'
 *     …
 *     await ensureCnSchema(sql)
 *
 * Contract (owner-approved for production):
 *   - Only CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS /
 *     CREATE INDEX IF NOT EXISTS. Nothing is altered, dropped or back-filled.
 *   - No rows are inserted for existing orgs. An org with no `org_settings`
 *     row behaves exactly as before (market 'global', AI on, env-var IM
 *     webhooks) — see ORG_SETTINGS_DEFAULTS in api/_orgSettings.ts.
 *   - ALTERs on pre-existing tables use `ALTER TABLE IF EXISTS` so a partial
 *     database (e.g. a fresh preview branch) never fails setup.
 *   - Actor columns (`updated_by`, `created_by`) are TEXT, not UUID FKs:
 *     API-key callers carry `apikey:<id>` as their subject.
 */
import type { Sql } from './_db.js'

export async function ensureCnSchema(sql: Sql): Promise<void> {
  // ── 1. Org market settings ─────────────────────────────────────────────
  await sql`CREATE TABLE IF NOT EXISTS org_settings (
    org_id UUID PRIMARY KEY REFERENCES organisations(id) ON DELETE CASCADE,
    market TEXT NOT NULL DEFAULT 'global',
    data_residency_region TEXT,
    icp_number TEXT,
    mlps_level SMALLINT,
    cross_border_status TEXT,
    ai_enabled BOOLEAN NOT NULL DEFAULT true,
    ai_provider TEXT,
    timezone TEXT,
    currency TEXT,
    fiscal_year_end TEXT,
    listing_venues TEXT[],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by TEXT
  )`

  // ── 2. Per-org IM group-bot webhooks ───────────────────────────────────
  // One row per (org, channel). URL and signing secret are both stored
  // AES-256-GCM encrypted via api/_crypto.ts — the URL carries the bot's
  // access token, so it is a credential too. `webhook_hint` is a masked form
  // for display ("oapi.dingtalk.com/…a1b2").
  await sql`CREATE TABLE IF NOT EXISTS org_notify_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    label TEXT,
    webhook_url_enc TEXT NOT NULL,
    webhook_hint TEXT,
    secret_enc TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    kinds TEXT[],
    last_test_at TIMESTAMPTZ,
    last_test_ok BOOLEAN,
    last_test_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by TEXT,
    UNIQUE (org_id, channel)
  )`

  // ── 3. User language on the server ─────────────────────────────────────
  await sql`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS locale TEXT`
  // Notification rows keep the rendered subject/body (in the recipient's
  // locale) plus the template key + params so a client can re-render.
  await sql`ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS message_key TEXT`
  await sql`ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS params JSONB`
  await sql`ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS locale TEXT`

  // ── 4. AI caches keyed by locale ───────────────────────────────────────
  // NULL locale on existing rows is read as 'en' (the only language AI
  // answered in before this change).
  await sql`ALTER TABLE IF EXISTS anomalies ADD COLUMN IF NOT EXISTS ai_narrative_locale TEXT`
  await sql`ALTER TABLE IF EXISTS ai_gap_analyses ADD COLUMN IF NOT EXISTS locale TEXT`
  await sql`ALTER TABLE IF EXISTS ai_gap_analyses ADD COLUMN IF NOT EXISTS provider TEXT`

  // ── 5. Green power / energy attribute certificates ─────────────────────
  // 绿证 (GEC), 绿电交易 green-power contracts, I-REC, other. Feeds
  // market-based Scope 2 (certified MWh × 0) and the CN-SSE climate topics.
  await sql`CREATE TABLE IF NOT EXISTS energy_attribute_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    instrument_type TEXT NOT NULL,
    mwh NUMERIC NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    certificate_id TEXT,
    facility_id UUID,
    entity_id UUID,
    supplier TEXT,
    energy_source TEXT,
    province TEXT,
    evidence_id UUID,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by TEXT
  )`
  await sql`CREATE INDEX IF NOT EXISTS idx_eac_org_period
    ON energy_attribute_certificates(org_id, period_start, period_end)`

  // ── 6. Carbon credits retired ──────────────────────────────────────────
  await sql`CREATE TABLE IF NOT EXISTS carbon_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    standard TEXT NOT NULL,
    tco2e NUMERIC NOT NULL,
    vintage INTEGER,
    registry_id TEXT,
    project_name TEXT,
    project_type TEXT,
    retired BOOLEAN NOT NULL DEFAULT true,
    retired_on DATE,
    reporting_year INTEGER,
    purpose TEXT,
    evidence_id UUID,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by TEXT
  )`
  await sql`CREATE INDEX IF NOT EXISTS idx_carbon_credits_org_year
    ON carbon_credits(org_id, reporting_year)`
}
