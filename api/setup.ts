import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './_db.js'
import { cors } from './_auth.js'
import * as bcrypt from 'bcryptjs'
import { seedESRSE1 } from './_esrsE1Seed.js'
import { seedESRSE2 } from './_esrsE2Seed.js'
import { seedESRSE3 } from './_esrsE3Seed.js'
import { seedESRSE4 } from './_esrsE4Seed.js'
import { seedESRSE5 } from './_esrsE5Seed.js'
import { seedESRSS1 } from './_esrsS1Seed.js'
import { seedESRSS2 } from './_esrsS2Seed.js'
import { seedESRSS3 } from './_esrsS3Seed.js'
import { seedESRSS4 } from './_esrsS4Seed.js'
import { seedESRSG1 } from './_esrsG1Seed.js'
import { seedISSBS1 } from './_issbS1Seed.js'
import { seedISSBS2 } from './_issbS2Seed.js'
import { seedTCFD } from './_tcfdSeed.js'
import { seedCDP } from './_cdpSeed.js'
import { seedSECClimate } from './_secClimateSeed.js'
import { seedCASB253 } from './_caSb253Seed.js'
import { seedCASB261 } from './_caSb261Seed.js'
import { seedEUTaxonomy } from './_euTaxonomySeed.js'
import { seedConnectorTemplates } from './_connectorSeed.js'
import { seedConceptMappings } from './_conceptSeed.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Setup is destructive-ish (63 CREATE TABLEs + seed inserts). Although the
  // seed is idempotent, we don't want the endpoint to be publicly callable.
  // Operators must set SETUP_TOKEN in env and pass it via header or query.
  const provided = req.headers['x-setup-token'] || req.query.token
  const expected = process.env.SETUP_TOKEN
  if (!expected) {
    return res.status(503).json({ error: 'Setup is disabled — set SETUP_TOKEN env var to enable' })
  }
  if (provided !== expected) {
    return res.status(401).json({ error: 'Invalid setup token' })
  }

  const sql = getDb()

  try {
    // Create tables
    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`

    await sql`CREATE TABLE IF NOT EXISTS organisations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
      industry TEXT, country TEXT, logo_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`
    // Data residency — additive column for region-routed Neon connections.
    // See docs/REGIONS.md for env var setup (DATABASE_URL_EU / DATABASE_URL_APAC).
    await sql`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'us' CHECK (region IN ('us','eu','apac'))`

    await sql`CREATE TABLE IF NOT EXISTS permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      resource TEXT NOT NULL, action TEXT NOT NULL, description TEXT,
      UNIQUE(resource, action)
    )`

    await sql`CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      name TEXT NOT NULL, slug TEXT NOT NULL, description TEXT,
      is_system BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(org_id, slug)
    )`

    await sql`CREATE TABLE IF NOT EXISTS role_permissions (
      role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
      permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    )`

    await sql`CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      password_hash TEXT NOT NULL, avatar_url TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(), last_login TIMESTAMPTZ
    )`

    await sql`CREATE TABLE IF NOT EXISTS user_roles (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
      assigned_at TIMESTAMPTZ DEFAULT now(),
      assigned_by UUID REFERENCES users(id),
      PRIMARY KEY (user_id, role_id)
    )`

    await sql`CREATE TABLE IF NOT EXISTS invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      role_id UUID REFERENCES roles(id),
      invited_by UUID REFERENCES users(id),
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    // ═══════════════════════════════════════════
    // Password reset — single-use hashed tokens, 30-min expiry.
    // ═══════════════════════════════════════════
    await sql`CREATE TABLE IF NOT EXISTS password_resets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )`
    await sql`CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id, used_at)`

    // ═══════════════════════════════════════════
    // TOTP MFA — RFC 6238. secret_enc is AES-256-GCM ciphertext of the base32
    // secret; enabled flips true after the first successful code verification.
    // Recovery codes are stored as JSON array of {hash, used} objects then
    // encrypted whole. See api/_crypto.ts for the cipher.
    // ═══════════════════════════════════════════
    await sql`CREATE TABLE IF NOT EXISTS user_mfa (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      secret_enc TEXT NOT NULL,
      enabled BOOLEAN DEFAULT false,
      recovery_codes_enc TEXT,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    // --- New tables ---

    await sql`CREATE TABLE IF NOT EXISTS facilities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code TEXT,
      location TEXT,
      country TEXT DEFAULT 'TH',
      type TEXT,
      latitude NUMERIC,
      longitude NUMERIC,
      production_volume NUMERIC DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    await sql`CREATE TABLE IF NOT EXISTS emission_sources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      scope INTEGER NOT NULL CHECK (scope IN (1,2,3)),
      category TEXT,
      fuel_type TEXT,
      unit TEXT DEFAULT 'tCO2e',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    await sql`CREATE TABLE IF NOT EXISTS activity_data (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      facility_id UUID REFERENCES facilities(id),
      source_id UUID REFERENCES emission_sources(id),
      period_year INTEGER NOT NULL,
      period_month INTEGER CHECK (period_month BETWEEN 1 AND 12),
      scope INTEGER NOT NULL,
      category TEXT,
      subcategory TEXT,
      fuel_type TEXT,
      activity_value NUMERIC NOT NULL DEFAULT 0,
      activity_unit TEXT,
      emission_factor NUMERIC,
      ef_source TEXT,
      ef_unit TEXT,
      co2e_tonnes NUMERIC NOT NULL DEFAULT 0,
      co2 NUMERIC DEFAULT 0,
      ch4 NUMERIC DEFAULT 0,
      n2o NUMERIC DEFAULT 0,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','anchored')),
      submitted_by UUID REFERENCES users(id),
      approved_by UUID REFERENCES users(id),
      submitted_at TIMESTAMPTZ,
      approved_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`
    // Additive — calculator provenance columns for rows persisted from /api/activity-data
    // when the Scope 3 calculator UI runs a method.
    await sql`ALTER TABLE activity_data ADD COLUMN IF NOT EXISTS source_calculator_id TEXT`
    await sql`ALTER TABLE activity_data ADD COLUMN IF NOT EXISTS source_method_id TEXT`

    await sql`CREATE TABLE IF NOT EXISTS workflow_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_review','approved','rejected','anchored')),
      facility_id UUID REFERENCES facilities(id),
      data_type TEXT,
      period TEXT,
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
      assigned_to UUID REFERENCES users(id),
      assigned_by UUID REFERENCES users(id),
      submitted_by UUID REFERENCES users(id),
      due_date DATE,
      completed_at TIMESTAMPTZ,
      comments JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    await sql`CREATE TABLE IF NOT EXISTS blockchain_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      record_type TEXT NOT NULL,
      reference_id UUID,
      data_hash TEXT NOT NULL,
      previous_hash TEXT,
      block_number INTEGER NOT NULL,
      transaction_hash TEXT NOT NULL,
      verifier_did TEXT,
      facility_name TEXT,
      event_type TEXT,
      status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted','confirmed','anchored')),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    await sql`CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      framework_id TEXT,
      framework_name TEXT,
      title TEXT NOT NULL,
      period TEXT,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft','in_review','published','archived')),
      format TEXT DEFAULT 'PDF',
      pages INTEGER DEFAULT 0,
      assurance_status TEXT DEFAULT 'not_started',
      generated_by UUID REFERENCES users(id),
      published_at TIMESTAMPTZ,
      file_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    await sql`CREATE TABLE IF NOT EXISTS disclosure_responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      framework_code TEXT NOT NULL,
      disclosure_code TEXT NOT NULL,
      period_year INTEGER NOT NULL,
      response_data JSONB DEFAULT '{}'::jsonb,
      status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','complete','approved')),
      updated_by UUID REFERENCES users(id),
      updated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(org_id, framework_code, disclosure_code, period_year)
    )`

    await sql`CREATE TABLE IF NOT EXISTS anomalies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      facility_id UUID REFERENCES facilities(id),
      type TEXT NOT NULL,
      severity TEXT DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
      title TEXT NOT NULL,
      description TEXT,
      scope INTEGER,
      metric TEXT,
      expected_value NUMERIC,
      actual_value NUMERIC,
      deviation_pct NUMERIC,
      status TEXT DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','dismissed')),
      detected_at TIMESTAMPTZ DEFAULT now(),
      resolved_at TIMESTAMPTZ,
      resolved_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    await sql`CREATE TABLE IF NOT EXISTS audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id),
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id UUID,
      details JSONB DEFAULT '{}'::jsonb,
      ip_address TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    // ═══════════════════════════════════════════
    // Nexus SRD v2.0 — §17 schema additions (additive only)
    // Coexists with existing activity_data / workflow_tasks / blockchain_records
    // so current APIs keep working. New workflow uses these tables.
    // ═══════════════════════════════════════════

    await sql`CREATE TABLE IF NOT EXISTS questionnaire_item (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      section TEXT NOT NULL,
      subsection TEXT NOT NULL,
      gri_code TEXT NOT NULL,
      line_item TEXT NOT NULL,
      unit TEXT,
      scope_split TEXT,
      has_target BOOLEAN DEFAULT false,
      requires_coverage BOOLEAN DEFAULT false,
      default_workflow_role TEXT CHECK (default_workflow_role IN ('AUTO','FM','SO','TL')),
      entry_mode_default TEXT CHECK (entry_mode_default IN ('Manual','Calculator','Connector')),
      target_fy2026 NUMERIC,
      footnote_refs JSONB DEFAULT '[]'::jsonb,
      reporting_scope TEXT DEFAULT 'group' CHECK (reporting_scope IN ('group','jv')),
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(gri_code, line_item, scope_split, reporting_scope)
    )`

    await sql`CREATE TABLE IF NOT EXISTS reporting_year (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      status TEXT DEFAULT 'setup' CHECK (status IN ('setup','active','published')),
      published_at TIMESTAMPTZ,
      publish_hash TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(organisation_id, year)
    )`

    await sql`CREATE TABLE IF NOT EXISTS data_value (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      questionnaire_item_id UUID REFERENCES questionnaire_item(id) ON DELETE CASCADE,
      reporting_year_id UUID REFERENCES reporting_year(id) ON DELETE CASCADE,
      facility_id UUID REFERENCES facilities(id),
      scope_key TEXT,
      value NUMERIC,
      unit TEXT,
      entry_mode TEXT CHECK (entry_mode IN ('Manual','Calculator','Connector')),
      status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started','draft','submitted','reviewed','approved','rejected','published')),
      entered_by UUID REFERENCES users(id),
      entered_at TIMESTAMPTZ,
      submitted_at TIMESTAMPTZ,
      reviewed_by UUID REFERENCES users(id),
      reviewed_at TIMESTAMPTZ,
      approved_by UUID REFERENCES users(id),
      approved_at TIMESTAMPTZ,
      value_hash TEXT,
      comment TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    await sql`CREATE INDEX IF NOT EXISTS idx_data_value_year_item
      ON data_value(reporting_year_id, questionnaire_item_id)`

    await sql`CREATE TABLE IF NOT EXISTS historical_value (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      questionnaire_item_id UUID REFERENCES questionnaire_item(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      scope_key TEXT,
      value NUMERIC,
      source_report TEXT,
      confidence_score NUMERIC DEFAULT 1.0,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(questionnaire_item_id, year, scope_key)
    )`

    await sql`CREATE INDEX IF NOT EXISTS idx_historical_year
      ON historical_value(questionnaire_item_id, year)`

    await sql`CREATE TABLE IF NOT EXISTS evidence (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      data_value_id UUID REFERENCES data_value(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      file_bytes BYTEA,
      uploaded_by UUID REFERENCES users(id),
      uploaded_at TIMESTAMPTZ DEFAULT now(),
      file_hash TEXT,
      storage_uri TEXT
    )`
    // Additively make sure file_bytes exists on pre-existing DBs.
    await sql`ALTER TABLE evidence ADD COLUMN IF NOT EXISTS file_bytes BYTEA`
    await sql`CREATE INDEX IF NOT EXISTS idx_evidence_data_value ON evidence(data_value_id)`

    await sql`CREATE TABLE IF NOT EXISTS connector_receipt (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      data_value_id UUID REFERENCES data_value(id) ON DELETE CASCADE,
      connector_name TEXT NOT NULL,
      source_record_id TEXT,
      fetched_at TIMESTAMPTZ DEFAULT now(),
      payload_json JSONB DEFAULT '{}'::jsonb,
      receipt_hash TEXT
    )`

    await sql`CREATE TABLE IF NOT EXISTS audit_event (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      data_value_id UUID REFERENCES data_value(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL CHECK (event_type IN ('entered','submitted','reviewed','approved','rejected','published','assigned','overridden')),
      actor_user_id UUID REFERENCES users(id),
      actor_platform_role TEXT,
      actor_workflow_role TEXT,
      timestamp TIMESTAMPTZ DEFAULT now(),
      previous_hash TEXT,
      new_hash TEXT,
      comment TEXT
    )`

    await sql`CREATE INDEX IF NOT EXISTS idx_audit_event_value
      ON audit_event(data_value_id, timestamp DESC)`

    await sql`CREATE TABLE IF NOT EXISTS calculator_input (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      data_value_id UUID REFERENCES data_value(id) ON DELETE CASCADE,
      input_key TEXT NOT NULL,
      value NUMERIC,
      unit TEXT,
      source TEXT CHECK (source IN ('manual','connector','prior_year')),
      emission_factor_used NUMERIC,
      gwp_used NUMERIC,
      created_at TIMESTAMPTZ DEFAULT now()
    )`

    // ═══════════════════════════════════════════
    // Org structure + questionnaire assignment (frontend-facing)
    // These are the tables the /api/org handler owns. Separate from the
    // Nexus SRD data_value chain so admins can build an org tree and assign
    // questionnaire items without touching workflow tables.
    // ═══════════════════════════════════════════

    await sql`CREATE TABLE IF NOT EXISTS org_entities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      parent_id UUID REFERENCES org_entities(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('group','business_unit','subsidiary','plant','office')),
      name TEXT NOT NULL,
      code TEXT,
      country TEXT,
      equity NUMERIC,
      industry TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`
    await sql`CREATE INDEX IF NOT EXISTS idx_org_entities_parent ON org_entities(parent_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_org_entities_org ON org_entities(org_id)`

    await sql`CREATE TABLE IF NOT EXISTS org_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      entity_id UUID REFERENCES org_entities(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('platform_admin','group_sustainability_officer','subsidiary_lead','plant_manager','data_contributor','auditor')),
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(org_id, email, entity_id)
    )`
    await sql`CREATE INDEX IF NOT EXISTS idx_org_members_entity ON org_members(entity_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_org_members_email ON org_members(email)`

    await sql`CREATE TABLE IF NOT EXISTS question_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      framework_id TEXT NOT NULL DEFAULT 'gri',
      questionnaire_item_id UUID REFERENCES questionnaire_item(id) ON DELETE CASCADE,
      gri_code TEXT NOT NULL,
      line_item TEXT NOT NULL,
      unit TEXT,
      entity_id UUID REFERENCES org_entities(id) ON DELETE CASCADE,
      assignee_email TEXT NOT NULL,
      assignee_name TEXT NOT NULL,
      assignee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      entry_modes JSONB NOT NULL DEFAULT '["Manual"]'::jsonb,
      used_mode TEXT,
      due_date DATE,
      status TEXT NOT NULL DEFAULT 'not_started'
        CHECK (status IN ('not_started','in_progress','submitted','reviewed','approved','rejected')),
      value NUMERIC,
      comment TEXT,
      evidence_ids JSONB DEFAULT '[]'::jsonb,
      assigned_by TEXT,
      assigned_at TIMESTAMPTZ DEFAULT now(),
      last_updated TIMESTAMPTZ DEFAULT now()
    )`
    await sql`CREATE INDEX IF NOT EXISTS idx_qa_assignee ON question_assignments(assignee_email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_qa_entity ON question_assignments(entity_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_qa_status ON question_assignments(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_qa_framework ON question_assignments(framework_id)`

    await sql`CREATE TABLE IF NOT EXISTS workflow_role_assignment (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      questionnaire_item_id UUID REFERENCES questionnaire_item(id) ON DELETE CASCADE,
      section TEXT,
      workflow_role TEXT NOT NULL CHECK (workflow_role IN ('AUTO','FM','SO','TL')),
      assigned_by UUID REFERENCES users(id),
      assigned_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, questionnaire_item_id, workflow_role)
    )`

    await sql`CREATE INDEX IF NOT EXISTS idx_wra_item
      ON workflow_role_assignment(questionnaire_item_id, workflow_role)`

    await sql`CREATE INDEX IF NOT EXISTS idx_wra_user
      ON workflow_role_assignment(user_id)`

    // ═══════════════════════════════════════════
    // Notifications — used by /api/org notification endpoints + email delivery
    // Schema matches existing INSERT shape (recipient_user_id, recipient_email,
    // kind, subject, body, route, related_assignment_id) with additional
    // email_sent_at / email_error columns for delivery tracking.
    // ═══════════════════════════════════════════
    await sql`CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      recipient_email TEXT NOT NULL,
      kind TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT,
      route TEXT,
      related_assignment_id UUID,
      read_at TIMESTAMPTZ,
      email_sent_at TIMESTAMPTZ,
      email_error TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`
    // Additive columns for pre-existing DBs.
    await sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ`
    await sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS email_error TEXT`
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_read
      ON notifications(recipient_user_id, read_at)`
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_org_created
      ON notifications(org_id, created_at DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_email_read
      ON notifications(recipient_email, read_at)`

    // ═══════════════════════════════════════════
    // Emission factors — DB-backed library replacing the static mock.
    // ═══════════════════════════════════════════
    await sql`CREATE TABLE IF NOT EXISTS emission_factors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scope INTEGER NOT NULL CHECK (scope IN (1,2,3)),
      category TEXT NOT NULL,
      subcategory TEXT,
      fuel_or_activity TEXT NOT NULL,
      region TEXT NOT NULL DEFAULT 'GLOBAL',
      unit TEXT NOT NULL,
      co2e_per_unit NUMERIC NOT NULL,
      co2_per_unit NUMERIC,
      ch4_per_unit NUMERIC,
      n2o_per_unit NUMERIC,
      source TEXT NOT NULL,
      source_version TEXT,
      valid_from DATE NOT NULL,
      valid_to DATE,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(scope, category, fuel_or_activity, region, source, source_version, valid_from)
    )`
    await sql`CREATE INDEX IF NOT EXISTS idx_ef_scope_category ON emission_factors(scope, category)`
    await sql`CREATE INDEX IF NOT EXISTS idx_ef_region ON emission_factors(region)`

    // ═══════════════════════════════════════════
    // SAML SSO via WorkOS — per-org connection mapping.
    // One row per org (UNIQUE on org_id). domain lets the discover endpoint
    // resolve a connection from an inbound email's domain.
    // ═══════════════════════════════════════════
    await sql`CREATE TABLE IF NOT EXISTS sso_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE UNIQUE,
      provider TEXT NOT NULL DEFAULT 'workos',
      connection_id TEXT NOT NULL,
      domain TEXT,
      is_active BOOLEAN DEFAULT true,
      auto_provision BOOLEAN DEFAULT true,
      default_role_slug TEXT DEFAULT 'viewer',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`
    await sql`CREATE INDEX IF NOT EXISTS idx_sso_connections_domain ON sso_connections(domain)`
    await sql`CREATE INDEX IF NOT EXISTS idx_sso_connections_connection_id ON sso_connections(connection_id)`

    // ═══════════════════════════════════════════
    // SCIM 2.0 — IdP-driven user provisioning per org.
    // ═══════════════════════════════════════════
    await sql`CREATE TABLE IF NOT EXISTS scim_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      prefix TEXT NOT NULL,
      default_role_slug TEXT DEFAULT 'viewer',
      is_active BOOLEAN DEFAULT true,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT now(),
      last_used_at TIMESTAMPTZ
    )`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id TEXT`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS scim_managed BOOLEAN DEFAULT false`
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_external_id_per_org ON users(org_id, external_id) WHERE external_id IS NOT NULL`

    // ═══════════════════════════════════════════
    // ERP Connector framework — CSV-driven imports with mapping templates.
    // ═══════════════════════════════════════════
    await sql`CREATE TABLE IF NOT EXISTS connector_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      description TEXT,
      scope INTEGER,
      category TEXT,
      mapping JSONB NOT NULL,
      required_columns JSONB NOT NULL DEFAULT '[]'::jsonb,
      optional_columns JSONB NOT NULL DEFAULT '[]'::jsonb,
      emission_factor_lookup JSONB,
      is_system BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(source, name)
    )`
    await sql`CREATE TABLE IF NOT EXISTS connector_imports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      template_id UUID REFERENCES connector_templates(id),
      file_name TEXT NOT NULL,
      rows_total INTEGER DEFAULT 0,
      rows_imported INTEGER DEFAULT 0,
      rows_failed INTEGER DEFAULT 0,
      status TEXT CHECK (status IN ('pending','processing','complete','failed')) DEFAULT 'pending',
      errors JSONB DEFAULT '[]'::jsonb,
      imported_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT now()
    )`
    await sql`CREATE INDEX IF NOT EXISTS idx_connector_imports_org ON connector_imports(org_id, created_at DESC)`

    // ===== SEED DATA =====

    // Seed permissions
    const perms = [
      ['dashboard','view','View executive dashboard'],
      ['calculators','view','View GHG calculators'],
      ['calculators','edit','Run calculations and save results'],
      ['data','view','View data ingestion modules'],
      ['data','upload','Upload emission data'],
      ['data','approve','Approve submitted data'],
      ['reports','view','View published reports'],
      ['reports','create','Create and edit reports'],
      ['reports','publish','Publish reports externally'],
      ['analytics','view','View analytics and anomaly detection'],
      ['workflow','view','View workflow tasks'],
      ['workflow','approve','Approve workflow steps'],
      ['audit','view','View audit trail'],
      ['admin','users','Manage users and invitations'],
      ['admin','roles','Manage roles and permissions'],
      ['admin','org','Manage organisation settings'],
      ['admin','settings','Manage system settings'],
    ]
    for (const [resource, action, description] of perms) {
      await sql`INSERT INTO permissions (resource, action, description) VALUES (${resource}, ${action}, ${description}) ON CONFLICT DO NOTHING`
    }

    // Seed org
    await sql`INSERT INTO organisations (id, name, slug, industry, country) VALUES ('00000000-0000-0000-0000-000000000001', 'Aeiforo Demo', 'aeiforo-demo', 'Technology', 'GB') ON CONFLICT DO NOTHING`

    // Seed roles
    const roles = [
      ['00000000-0000-0000-0000-000000000010','Platform Admin','admin','Full system access',true],
      ['00000000-0000-0000-0000-000000000011','Team Lead','team-lead','Manage team, approve submissions',true],
      ['00000000-0000-0000-0000-000000000012','Analyst','analyst','Run calculators, upload data, create reports',true],
      ['00000000-0000-0000-0000-000000000013','Viewer','viewer','Read-only access to dashboards and reports',true],
      ['00000000-0000-0000-0000-000000000014','Auditor','auditor','Read-only plus audit trail access',true],
    ] as const
    for (const [id, name, slug, desc, sys] of roles) {
      await sql`INSERT INTO roles (id, org_id, name, slug, description, is_system) VALUES (${id}, '00000000-0000-0000-0000-000000000001', ${name}, ${slug}, ${desc}, ${sys}) ON CONFLICT DO NOTHING`
    }

    // Seed all permissions for admin
    await sql`INSERT INTO role_permissions (role_id, permission_id) SELECT '00000000-0000-0000-0000-000000000010', id FROM permissions ON CONFLICT DO NOTHING`

    // Team Lead permissions
    const tlPerms = [['dashboard','view'],['calculators','view'],['calculators','edit'],['data','view'],['data','upload'],['data','approve'],['reports','view'],['reports','create'],['analytics','view'],['workflow','view'],['workflow','approve'],['audit','view'],['admin','users']]
    for (const [r, a] of tlPerms) {
      await sql`INSERT INTO role_permissions (role_id, permission_id) SELECT '00000000-0000-0000-0000-000000000011', id FROM permissions WHERE resource=${r} AND action=${a} ON CONFLICT DO NOTHING`
    }

    // Analyst permissions
    const anPerms = [['dashboard','view'],['calculators','view'],['calculators','edit'],['data','view'],['data','upload'],['reports','view'],['reports','create'],['analytics','view'],['workflow','view']]
    for (const [r, a] of anPerms) {
      await sql`INSERT INTO role_permissions (role_id, permission_id) SELECT '00000000-0000-0000-0000-000000000012', id FROM permissions WHERE resource=${r} AND action=${a} ON CONFLICT DO NOTHING`
    }

    // Viewer permissions
    const vwPerms = [['dashboard','view'],['calculators','view'],['data','view'],['reports','view'],['analytics','view'],['workflow','view']]
    for (const [r, a] of vwPerms) {
      await sql`INSERT INTO role_permissions (role_id, permission_id) SELECT '00000000-0000-0000-0000-000000000013', id FROM permissions WHERE resource=${r} AND action=${a} ON CONFLICT DO NOTHING`
    }

    // Auditor permissions
    const auPerms = [['dashboard','view'],['calculators','view'],['data','view'],['reports','view'],['analytics','view'],['workflow','view'],['audit','view']]
    for (const [r, a] of auPerms) {
      await sql`INSERT INTO role_permissions (role_id, permission_id) SELECT '00000000-0000-0000-0000-000000000014', id FROM permissions WHERE resource=${r} AND action=${a} ON CONFLICT DO NOTHING`
    }

    // Seed admin user
    const hash = bcrypt.hashSync('demo2026', 10)
    await sql`INSERT INTO users (id, org_id, email, name, password_hash) VALUES ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', 'admin@aeiforo.com', 'Jane Mitchell', ${hash}) ON CONFLICT DO NOTHING`
    await sql`INSERT INTO user_roles (user_id, role_id) VALUES ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000010') ON CONFLICT DO NOTHING`

    // --- Seed additional demo users ---
    await sql`INSERT INTO users (id, org_id, email, name, password_hash) VALUES ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'tl@aeiforo.com', 'David Chen', ${hash}) ON CONFLICT DO NOTHING`
    await sql`INSERT INTO user_roles (user_id, role_id) VALUES ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000011') ON CONFLICT DO NOTHING`

    await sql`INSERT INTO users (id, org_id, email, name, password_hash) VALUES ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'fm@aeiforo.com', 'Maria Santos', ${hash}) ON CONFLICT DO NOTHING`
    await sql`INSERT INTO user_roles (user_id, role_id) VALUES ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000012') ON CONFLICT DO NOTHING`

    await sql`INSERT INTO users (id, org_id, email, name, password_hash) VALUES ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'so@aeiforo.com', 'Priya Sharma', ${hash}) ON CONFLICT DO NOTHING`
    await sql`INSERT INTO user_roles (user_id, role_id) VALUES ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000013') ON CONFLICT DO NOTHING`

    // --- Seed facilities ---
    const ORG = '00000000-0000-0000-0000-000000000001'
    const facilities = [
      ['00000000-0000-0000-0000-f00000000001','Refinery Alpha','F-ALPHA','Industrial Zone A','GB','refinery',12.6814,101.2778,185000],
      ['00000000-0000-0000-0000-f00000000002','Olefins Plant Beta','F-BETA','Industrial Zone B','GB','olefins',12.7105,101.1548,320000],
      ['00000000-0000-0000-0000-f00000000003','Aromatics Complex Gamma','F-GAMMA','Industrial Zone B','GB','aromatics',12.7082,101.1601,210000],
      ['00000000-0000-0000-0000-f00000000004','Polymers Plant Delta','F-DELTA','Industrial Zone B','GB','polymers',12.6950,101.1680,160000],
      ['00000000-0000-0000-0000-f00000000005','Logistics Terminal Epsilon','F-EPSILON','Industrial Zone C','GB','logistics',13.3611,100.9847,0],
      ['00000000-0000-0000-0000-f00000000006','Green Chem Plant Zeta','F-ZETA','Industrial Zone D','GB','green_chem',14.1200,100.6250,45000],
      ['00000000-0000-0000-0000-f00000000007','Bioplastics R&D Center','F-BIO','Industrial Zone B','GB','green_chem',12.6880,101.2500,12000],
      ['00000000-0000-0000-0000-f00000000008','Utilities & Power Eta','F-ETA','Industrial Zone B','GB','utilities',12.7000,101.1700,0],
    ] as const
    for (const [id, name, code, location, country, type, lat, lng, vol] of facilities) {
      await sql`INSERT INTO facilities (id, org_id, name, code, location, country, type, latitude, longitude, production_volume) VALUES (${id}, ${ORG}, ${name}, ${code}, ${location}, ${country}, ${type}, ${lat}, ${lng}, ${vol}) ON CONFLICT DO NOTHING`
    }

    // --- Seed activity data (Q1 2026 for facilities 1-4, Scope 1/2/3) ---
    // Totals target: S1 ~2.12M, S2 ~945K, S3 ~2.51M tCO2e for the quarter
    const ADMIN = '00000000-0000-0000-0000-000000000100'
    const TL    = '00000000-0000-0000-0000-000000000101'
    const AN    = '00000000-0000-0000-0000-000000000102'
    const F1 = '00000000-0000-0000-0000-f00000000001'
    const F2 = '00000000-0000-0000-0000-f00000000002'
    const F3 = '00000000-0000-0000-0000-f00000000003'
    const F4 = '00000000-0000-0000-0000-f00000000004'

    // Each row: [id, facility_id, month, scope, category, fuel_type, activity_value, activity_unit, ef, ef_source, co2e, co2, ch4, n2o, status, submitted_by, approved_by]
    const activityRows: [string,string,number,number,string,string,number,string,number,string,number,number,number,number,string,string,string|null][] = [
      // --- Facility 1: Refinery Alpha ---
      // Scope 1
      ['a0000000-0000-0000-0000-000000000001',F1,1,1,'Stationary combustion','Natural gas',  48200,'TJ',56.1,'IPCC 2006',  195200, 194100,  820,  280,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000002',F1,2,1,'Stationary combustion','Natural gas',  46800,'TJ',56.1,'IPCC 2006',  189500, 188400,  810,  290,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000003',F1,3,1,'Stationary combustion','Natural gas',  49100,'TJ',56.1,'IPCC 2006',  198800, 197700,  830,  270,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000004',F1,1,1,'Process emissions','Crude oil',       12400,'kL',2.68,'API Compendium',33300, 33100,   150,   50,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000005',F1,2,1,'Process emissions','Crude oil',       11800,'kL',2.68,'API Compendium',31700, 31500,   140,   60,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000006',F1,3,1,'Process emissions','Crude oil',       12700,'kL',2.68,'API Compendium',34100, 33900,   150,   50,'submitted',AN,null],
      // Scope 2
      ['a0000000-0000-0000-0000-000000000007',F1,1,2,'Purchased electricity','Grid',        280000,'MWh',0.4987,'DEFRA 2024',  82100,  81800,  210,   90,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000008',F1,2,2,'Purchased electricity','Grid',        272000,'MWh',0.4987,'DEFRA 2024',  79700,  79400,  200,  100,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000009',F1,3,2,'Purchased electricity','Grid',        285000,'MWh',0.4987,'DEFRA 2024',  83600,  83300,  210,   90,'submitted',AN,null],
      // Scope 3
      ['a0000000-0000-0000-0000-000000000010',F1,1,3,'Cat 1 - Purchased goods','Feedstock', 450000,'t',1.82,'ecoinvent 3.10', 210000,208000, 1500,  500,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000011',F1,2,3,'Cat 1 - Purchased goods','Feedstock', 438000,'t',1.82,'ecoinvent 3.10', 204500,202500, 1500,  500,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000012',F1,3,3,'Cat 1 - Purchased goods','Feedstock', 462000,'t',1.82,'ecoinvent 3.10', 215800,213800, 1500,  500,'draft',AN,null],

      // --- Facility 2: Olefins Plant Beta ---
      // Scope 1
      ['a0000000-0000-0000-0000-000000000013',F2,1,1,'Stationary combustion','Natural gas',  62000,'TJ',56.1,'IPCC 2006',  251200, 249800, 1050,  350,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000014',F2,2,1,'Stationary combustion','Natural gas',  60500,'TJ',56.1,'IPCC 2006',  245100, 243700, 1040,  360,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000015',F2,3,1,'Stationary combustion','Natural gas',  63200,'TJ',56.1,'IPCC 2006',  256000, 254600, 1050,  350,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000016',F2,1,1,'Fugitive emissions','Methane',         8400,'t',25.0,'IPCC AR5',      18500,  4200, 14100,  200,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000017',F2,2,1,'Fugitive emissions','Methane',         8200,'t',25.0,'IPCC AR5',      18100,  4100, 13800,  200,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000018',F2,3,1,'Fugitive emissions','Methane',         9100,'t',25.0,'IPCC AR5',      20100,  4600, 15300,  200,'submitted',AN,null],
      // Scope 2
      ['a0000000-0000-0000-0000-000000000019',F2,1,2,'Purchased electricity','Grid',        195000,'MWh',0.4987,'DEFRA 2024',  57200,  56900,  200,  100,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000020',F2,2,2,'Purchased electricity','Grid',        188000,'MWh',0.4987,'DEFRA 2024',  55100,  54800,  200,  100,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000021',F2,3,2,'Purchased electricity','Grid',        200000,'MWh',0.4987,'DEFRA 2024',  58700,  58400,  200,  100,'approved',AN,TL],
      // Scope 3
      ['a0000000-0000-0000-0000-000000000022',F2,1,3,'Cat 1 - Purchased goods','Naphtha',  310000,'t',2.41,'IPCC 2006', 247000,244800, 1600,  600,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000023',F2,2,3,'Cat 1 - Purchased goods','Naphtha',  302000,'t',2.41,'IPCC 2006', 240600,238400, 1600,  600,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000024',F2,3,3,'Cat 1 - Purchased goods','Naphtha',  318000,'t',2.41,'IPCC 2006', 253200,251000, 1600,  600,'submitted',AN,null],

      // --- Facility 3: Aromatics Complex Gamma ---
      // Scope 1
      ['a0000000-0000-0000-0000-000000000025',F3,1,1,'Stationary combustion','Fuel oil',    28500,'TJ',77.4,'IPCC 2006',  68400,  67800,  420,  180,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000026',F3,2,1,'Stationary combustion','Fuel oil',    27800,'TJ',77.4,'IPCC 2006',  66700,  66100,  420,  180,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000027',F3,3,1,'Stationary combustion','Fuel oil',    29200,'TJ',77.4,'IPCC 2006',  70100,  69500,  420,  180,'approved',AN,TL],
      // Scope 2
      ['a0000000-0000-0000-0000-000000000028',F3,1,2,'Purchased electricity','Grid',        165000,'MWh',0.4987,'DEFRA 2024',  48400,  48100,  200,  100,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000029',F3,2,2,'Purchased electricity','Grid',        160000,'MWh',0.4987,'DEFRA 2024',  46900,  46600,  200,  100,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000030',F3,3,2,'Purchased electricity','Grid',        168000,'MWh',0.4987,'DEFRA 2024',  49300,  49000,  200,  100,'draft',AN,null],
      // Scope 3
      ['a0000000-0000-0000-0000-000000000031',F3,1,3,'Cat 4 - Transportation','Diesel',     84000,'t',3.17,'IPCC 2006', 110500,109500,  700,  300,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000032',F3,2,3,'Cat 4 - Transportation','Diesel',     81000,'t',3.17,'IPCC 2006', 106600,105600,  700,  300,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000033',F3,3,3,'Cat 4 - Transportation','Diesel',     86000,'t',3.17,'IPCC 2006', 113100,112100,  700,  300,'approved',AN,TL],

      // --- Facility 4: Polymers Plant Delta ---
      // Scope 1
      ['a0000000-0000-0000-0000-000000000034',F4,1,1,'Stationary combustion','Natural gas',  18500,'TJ',56.1,'IPCC 2006',   74900,  74400,  370,  130,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000035',F4,2,1,'Stationary combustion','Natural gas',  18000,'TJ',56.1,'IPCC 2006',   72900,  72400,  370,  130,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000036',F4,3,1,'Stationary combustion','Natural gas',  18800,'TJ',56.1,'IPCC 2006',   76100,  75600,  370,  130,'submitted',AN,null],
      // Scope 2
      ['a0000000-0000-0000-0000-000000000037',F4,1,2,'Purchased electricity','Grid',        145000,'MWh',0.4987,'DEFRA 2024',  42500,  42200,  200,  100,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000038',F4,2,2,'Purchased electricity','Grid',        140000,'MWh',0.4987,'DEFRA 2024',  41100,  40800,  200,  100,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000039',F4,3,2,'Purchased electricity','Grid',        148000,'MWh',0.4987,'DEFRA 2024',  43400,  43100,  200,  100,'approved',AN,TL],
      // Scope 3
      ['a0000000-0000-0000-0000-000000000040',F4,1,3,'Cat 10 - End-of-life','Plastic waste',125000,'t',2.53,'ecoinvent 3.10', 176800,175000, 1300,  500,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000041',F4,2,3,'Cat 10 - End-of-life','Plastic waste',121000,'t',2.53,'ecoinvent 3.10', 171100,169300, 1300,  500,'approved',AN,TL],
      ['a0000000-0000-0000-0000-000000000042',F4,3,3,'Cat 10 - End-of-life','Plastic waste',128000,'t',2.53,'ecoinvent 3.10', 181000,179200, 1300,  500,'approved',AN,TL],
    ]

    for (const [id,fac,month,scope,cat,fuel,val,unit,ef,efSrc,co2e,co2,ch4,n2o,status,subBy,appBy] of activityRows) {
      await sql`INSERT INTO activity_data
        (id, org_id, facility_id, period_year, period_month, scope, category, fuel_type,
         activity_value, activity_unit, emission_factor, ef_source, co2e_tonnes, co2, ch4, n2o,
         status, submitted_by, approved_by,
         submitted_at, approved_at)
        VALUES
        (${id}, ${ORG}, ${fac}, 2026, ${month}, ${scope}, ${cat}, ${fuel},
         ${val}, ${unit}, ${ef}, ${efSrc}, ${co2e}, ${co2}, ${ch4}, ${n2o},
         ${status}, ${subBy}, ${appBy},
         ${status !== 'draft' ? '2026-03-15T10:00:00Z' : null},
         ${status === 'approved' || status === 'anchored' ? '2026-03-20T14:00:00Z' : null})
        ON CONFLICT DO NOTHING`
    }

    // --- Seed workflow tasks ---
    const workflowTasks: [string,string,string,string,string,string,string,string,string|null,string|null,string|null][] = [
      // [id, type, title, description, status, facility_id, priority, assigned_to, assigned_by, submitted_by, due_date]
      ['e0000000-0000-0000-0000-000000000001','data_approval','Approve Q1 Scope 1 — Refinery Alpha','Review and approve stationary combustion data for Jan-Mar 2026','pending',F1,'high',TL,ADMIN,AN,'2026-04-15'],
      ['e0000000-0000-0000-0000-000000000002','data_approval','Approve Q1 Scope 2 — Olefins Plant Beta','Review purchased electricity data for Q1','pending',F2,'medium',TL,ADMIN,AN,'2026-04-18'],
      ['e0000000-0000-0000-0000-000000000003','data_submission','Submit Mar fugitive emissions — Olefins Beta','Complete fugitive emission data entry for March 2026','pending',F2,'high',AN,TL,null,'2026-04-10'],
      ['e0000000-0000-0000-0000-000000000004','calculation_review','Review EF update — Aromatics Gamma Scope 1','Verify updated fuel oil emission factors from IPCC 2006','in_review',F3,'medium',TL,ADMIN,AN,null],
      ['e0000000-0000-0000-0000-000000000005','report_review','Review CDP Climate Change 2026 draft','Final review of CDP questionnaire responses before submission','in_review',F1,'critical',ADMIN,TL,AN,'2026-04-30'],
      ['e0000000-0000-0000-0000-000000000006','data_approval','Approve Q1 Scope 3 — Polymers Plant Delta','Review end-of-life processing data for Q1','in_review',F4,'medium',TL,ADMIN,AN,'2026-04-20'],
      ['e0000000-0000-0000-0000-000000000007','data_approval','Approve Jan Scope 1 — Polymers Plant Delta','Stationary combustion data for January','approved',F4,'medium',TL,ADMIN,AN,null],
      ['e0000000-0000-0000-0000-000000000008','data_submission','Submit Q1 electricity — Aromatics Gamma','Electricity consumption data for Q1 2026','approved',F3,'low',AN,TL,null,null],
      ['e0000000-0000-0000-0000-000000000009','calculation_review','Verify Scope 2 market-based EFs','Check market-based emission factor calculations','approved',F1,'medium',TL,ADMIN,AN,null],
      ['e0000000-0000-0000-0000-000000000010','data_approval','Approve Feb process emissions — Refinery','Process emissions data rejected due to missing supporting docs','rejected',F1,'high',TL,ADMIN,AN,null],
      ['e0000000-0000-0000-0000-000000000011','report_review','Review CSRD ESRS E1 draft report','ESRS E1 climate disclosures need methodology updates','rejected',F2,'critical',ADMIN,TL,AN,'2026-05-15'],
      ['e0000000-0000-0000-0000-000000000012','data_approval','Anchor Q4 2025 Scope 1 — All Facilities','Blockchain-anchored quarterly Scope 1 dataset','anchored',F1,'high',ADMIN,TL,AN,null],
    ]

    for (const [id,type,title,desc,status,facId,priority,assignTo,assignBy,subBy,due] of workflowTasks) {
      await sql`INSERT INTO workflow_tasks
        (id, org_id, type, title, description, status, facility_id, period, priority,
         assigned_to, assigned_by, submitted_by, due_date,
         completed_at)
        VALUES
        (${id}, ${ORG}, ${type}, ${title}, ${desc}, ${status}, ${facId}, 'Q1 2026', ${priority},
         ${assignTo}, ${assignBy}, ${subBy}, ${due},
         ${status === 'approved' || status === 'rejected' || status === 'anchored' ? '2026-03-25T16:00:00Z' : null})
        ON CONFLICT DO NOTHING`
    }

    // --- Seed blockchain records ---
    const blockchainRecords: [string,string,string|null,string,string,number,string,string,string,string,string][] = [
      // [id, record_type, reference_id, data_hash, previous_hash, block_number, tx_hash, verifier_did, facility_name, event_type, status]
      ['b0000000-0000-0000-0000-000000000001','activity_data','a0000000-0000-0000-0000-000000000001',
        '0x7a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b','0x0000000000000000000000000000000000000000000000000000000000000000',
        21300001,'0xabc123def456789012345678901234567890abcdef1234567890abcdef123456','did:ethr:0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18','Refinery Alpha','submitted','confirmed'],
      ['b0000000-0000-0000-0000-000000000002','activity_data','a0000000-0000-0000-0000-000000000013',
        '0x8b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c','0x7a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b',
        21300042,'0xbcd234ef5678901234567890abcdef1234567890abcdef1234567890abcdef12','did:ethr:0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18','Olefins Plant Beta','submitted','confirmed'],
      ['b0000000-0000-0000-0000-000000000003','approval','a0000000-0000-0000-0000-000000000001',
        '0x9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d','0x8b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
        21310015,'0xcde345f6789012345678901234567890abcdef1234567890abcdef1234567890','did:ethr:0x892e45Dd7745D1643a4c945Cd0e8605g3cE19','Refinery Alpha','approved','confirmed'],
      ['b0000000-0000-0000-0000-000000000004','activity_data','a0000000-0000-0000-0000-000000000025',
        '0xad4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e','0x9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d',
        21320108,'0xdef456a789012345678901234567890abcdef1234567890abcdef12345678901','did:ethr:0x953f56Ee8856E2754b5d056De1f9716h4dF20','Aromatics Complex Gamma','submitted','submitted'],
      ['b0000000-0000-0000-0000-000000000005','calculation','a0000000-0000-0000-0000-000000000034',
        '0xbe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f','0xad4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e',
        21330055,'0xef5678b890123456789012345678901234567890abcdef1234567890abcdef12','did:ethr:0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18','Polymers Plant Delta','submitted','confirmed'],
      ['b0000000-0000-0000-0000-000000000006','approval','a0000000-0000-0000-0000-000000000013',
        '0xcf6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a','0xbe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f',
        21340022,'0xfa6789c901234567890123456789012345678901234567890abcdef12345678','did:ethr:0x892e45Dd7745D1643a4c945Cd0e8605g3cE19','Olefins Plant Beta','approved','confirmed'],
      ['b0000000-0000-0000-0000-000000000007','activity_data','a0000000-0000-0000-0000-000000000040',
        '0xd07b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b','0xcf6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a',
        21350010,'0x0b789ad012345678901234567890123456789012345678901234567890abcdef','did:ethr:0x953f56Ee8856E2754b5d056De1f9716h4dF20','Polymers Plant Delta','submitted','submitted'],
      ['b0000000-0000-0000-0000-000000000008','report',null,
        '0xe18c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c','0xd07b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b',
        21360033,'0x1c890be123456789012345678901234567890123456789012345678901234567','did:ethr:0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18','Refinery Alpha','anchored','anchored'],
      ['b0000000-0000-0000-0000-000000000009','activity_data','a0000000-0000-0000-0000-000000000007',
        '0xf29d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d','0xe18c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c',
        21370066,'0x2d901cf234567890123456789012345678901234567890123456789012345678','did:ethr:0x892e45Dd7745D1643a4c945Cd0e8605g3cE19','Refinery Alpha','verified','anchored'],
      ['b0000000-0000-0000-0000-000000000010','approval','a0000000-0000-0000-0000-000000000025',
        '0x03ae1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e','0xf29d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d',
        21380019,'0x3ea12d0345678901234567890123456789012345678901234567890123456789','did:ethr:0x953f56Ee8856E2754b5d056De1f9716h4dF20','Aromatics Complex Gamma','approved','confirmed'],
      ['b0000000-0000-0000-0000-000000000011','calculation','a0000000-0000-0000-0000-000000000019',
        '0x14bf2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f','0x03ae1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e',
        21385042,'0x4fb23e1456789012345678901234567890123456789012345678901234567890','did:ethr:0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18','Olefins Plant Beta','verified','anchored'],
      ['b0000000-0000-0000-0000-000000000012','activity_data','a0000000-0000-0000-0000-000000000037',
        '0x25c03b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a','0x14bf2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f',
        21390005,'0x50c34f2567890123456789012345678901234567890123456789012345678901','did:ethr:0x892e45Dd7745D1643a4c945Cd0e8605g3cE19','Polymers Plant Delta','submitted','confirmed'],
      ['b0000000-0000-0000-0000-000000000013','report',null,
        '0x36d14c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b','0x25c03b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a',
        21395018,'0x61d450367890123456789012345678901234567890123456789012345678901a','did:ethr:0x953f56Ee8856E2754b5d056De1f9716h4dF20','Olefins Plant Beta','anchored','anchored'],
      ['b0000000-0000-0000-0000-000000000014','approval','a0000000-0000-0000-0000-000000000034',
        '0x47e25d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c','0x36d14c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b',
        21398007,'0x72e561478901234567890123456789012345678901234567890123456789012b','did:ethr:0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18','Polymers Plant Delta','approved','confirmed'],
      ['b0000000-0000-0000-0000-000000000015','activity_data','a0000000-0000-0000-0000-000000000010',
        '0x58f36e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d','0x47e25d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c',
        21399012,'0x83f672589012345678901234567890123456789012345678901234567890123c','did:ethr:0x892e45Dd7745D1643a4c945Cd0e8605g3cE19','Refinery Alpha','verified','anchored'],
    ]

    for (const [id,recType,refId,dataHash,prevHash,blockNum,txHash,verDid,facName,evtType,status] of blockchainRecords) {
      await sql`INSERT INTO blockchain_records
        (id, org_id, record_type, reference_id, data_hash, previous_hash, block_number,
         transaction_hash, verifier_did, facility_name, event_type, status)
        VALUES
        (${id}, ${ORG}, ${recType}, ${refId}, ${dataHash}, ${prevHash}, ${blockNum},
         ${txHash}, ${verDid}, ${facName}, ${evtType}, ${status})
        ON CONFLICT DO NOTHING`
    }

    // --- Seed reports ---
    const reportRows: [string,string,string,string,string,string,string,number,string,string|null,string|null][] = [
      // [id, framework_id, framework_name, title, period, status, format, pages, assurance_status, generated_by, published_at]
      ['d0000000-0000-0000-0000-000000000001','CDP-CC','CDP','CDP Climate Change 2026','FY2026','in_review','PDF',127,'in_progress',ADMIN,null],
      ['d0000000-0000-0000-0000-000000000002','TCFD','TCFD','TCFD Alignment Report','FY2026','draft','PDF',84,'not_started',AN,null],
      ['d0000000-0000-0000-0000-000000000003','GRI-305','GRI','GRI 305 Emissions Disclosure','FY2026','in_review','PDF',156,'in_progress',AN,null],
      ['d0000000-0000-0000-0000-000000000004','CSRD-E1','CSRD','CSRD ESRS E1 Report','FY2026','draft','PDF',203,'not_started',ADMIN,null],
      ['d0000000-0000-0000-0000-000000000005','CDP-CC','CDP','CDP Climate Change 2025','FY2025','published','PDF',118,'completed',ADMIN,'2025-12-15T09:00:00Z'],
      ['d0000000-0000-0000-0000-000000000006','GRI','GRI','GRI Sustainability Report 2025','FY2025','published','PDF',142,'completed',AN,'2025-11-30T09:00:00Z'],
    ]

    for (const [id,fwId,fwName,title,period,status,format,pages,assurance,genBy,pubAt] of reportRows) {
      await sql`INSERT INTO reports
        (id, org_id, framework_id, framework_name, title, period, status, format, pages,
         assurance_status, generated_by, published_at)
        VALUES
        (${id}, ${ORG}, ${fwId}, ${fwName}, ${title}, ${period}, ${status}, ${format}, ${pages},
         ${assurance}, ${genBy}, ${pubAt})
        ON CONFLICT DO NOTHING`
    }

    // --- Seed anomalies ---
    const anomalyRows: [string,string,string,string,string,string,number,string,number,number,number,string][] = [
      // [id, facility_id, type, severity, title, description, scope, metric, expected, actual, deviation_pct, status]
      ['f0000000-0000-0000-0000-000000000001',F2,'spike','critical',
        'Fugitive emissions spike at Olefins Plant Beta',
        'March 2026 fugitive CH4 emissions 11% above 12-month rolling average. Possible valve leak in cracker unit C-401.',
        1,'fugitive_ch4_tonnes',8300,9100,9.6,'open'],
      ['f0000000-0000-0000-0000-000000000002',F1,'trend','warning',
        'Scope 1 intensity at Refinery Alpha above trend',
        'tCO2e per barrel of crude processed has increased 4.2% vs. prior 6-month baseline. Check furnace efficiency.',
        1,'co2e_per_barrel',0.285,0.297,4.2,'investigating'],
      ['f0000000-0000-0000-0000-000000000003',F1,'gap','warning',
        'Scope 2 market/location gap widening',
        'Market-based Scope 2 exceeds location-based by 18%, up from 12% last quarter. Review REC procurement strategy.',
        2,'market_location_ratio',1.12,1.18,5.4,'open'],
      ['f0000000-0000-0000-0000-000000000004',F4,'completeness','warning',
        'Supplier data completeness below threshold',
        'Only 67% of Tier 1 suppliers have submitted FY2026 emission factors. Target is 85% by Q2.',
        3,'supplier_coverage_pct',85,67,-21.2,'open'],
      ['f0000000-0000-0000-0000-000000000005',F3,'consumption','info',
        'Unusual electricity consumption at Aromatics Gamma',
        'March electricity draw 5% above seasonal forecast. Correlates with extended turnaround maintenance window.',
        2,'electricity_mwh',160000,168000,5.0,'resolved'],
    ]

    for (const [id,facId,type,severity,title,desc,scope,metric,expected,actual,dev,status] of anomalyRows) {
      await sql`INSERT INTO anomalies
        (id, org_id, facility_id, type, severity, title, description, scope, metric,
         expected_value, actual_value, deviation_pct, status,
         resolved_at, resolved_by)
        VALUES
        (${id}, ${ORG}, ${facId}, ${type}, ${severity}, ${title}, ${desc}, ${scope}, ${metric},
         ${expected}, ${actual}, ${dev}, ${status},
         ${status === 'resolved' ? '2026-04-02T11:30:00Z' : null},
         ${status === 'resolved' ? TL : null})
        ON CONFLICT DO NOTHING`
    }

    // ═══════════════════════════════════════════
    // Nexus SRD v2.0 — §17 seed data
    // Source: Demo Co FY2025 Sustainability Performance Data (published Feb 2026)
    // ═══════════════════════════════════════════

    // --- Seed reporting_year (FY2026 active) ---
    await sql`INSERT INTO reporting_year (id, organisation_id, year, status)
      VALUES ('11000000-0000-0000-0000-000000000026', ${ORG}, 2026, 'active')
      ON CONFLICT DO NOTHING`

    // --- Seed default workflow_role_assignment for seeded users ---
    // Admin (SO) across all Natural Capital, FM on Financial/Manufacture, etc.
    // Per SRD §9.2 default role mapping. Scope-level assignment (no specific item_id) via section column.
    // SRD-style section-scoped bindings — cascades at query time via rbac helper.
    const sectionAssignments: Array<[userId: string, section: string, role: 'AUTO'|'FM'|'SO'|'TL']> = [
      // ADMIN — Platform Admin (cross-cutting SO on all Natural Capital + governance)
      [ADMIN, 'Natural Capital', 'SO'],
      [ADMIN, 'Social & Relationship Capital', 'SO'],
      // TL — Team Lead for HR/HSE/Supply Chain
      [TL, 'Human Capital', 'TL'],
      [TL, 'Natural Capital', 'TL'],
      // FM on Financial / Manufacture
      ['00000000-0000-0000-0000-000000000102', 'Financial Capital', 'FM'],
      ['00000000-0000-0000-0000-000000000102', 'Manufacture Capital', 'FM'],
    ]

    for (const [userId, section, role] of sectionAssignments) {
      // Assign to all items in the section that match the user's scope
      const items = await sql`SELECT id FROM questionnaire_item WHERE section = ${section}`
      for (const it of items) {
        await sql`INSERT INTO workflow_role_assignment
          (user_id, questionnaire_item_id, section, workflow_role, assigned_by)
          VALUES
          (${userId}, ${it.id}, ${section}, ${role}, ${ADMIN})
          ON CONFLICT DO NOTHING`
      }
    }

    // ═══════════════════════════════════════════
    // Emission factors seed — DEFRA 2024, EPA 2024, IPCC 2006, IEA 2024.
    // Values are commonly-published; see per-row `source` for attribution.
    // ═══════════════════════════════════════════
    type EFRow = [
      scope: 1 | 2 | 3,
      category: string,
      subcategory: string | null,
      fuel_or_activity: string,
      region: string,
      unit: string,
      co2e_per_unit: number,
      co2_per_unit: number | null,
      ch4_per_unit: number | null,
      n2o_per_unit: number | null,
      source: string,
      source_version: string | null,
      valid_from: string,
      notes: string | null,
    ]
    const efRows: EFRow[] = [
      // ── Scope 1 stationary combustion (kgCO2e per GJ HHV — IPCC 2006 Vol 2 Ch 1 Table 1.4) ──
      [1, 'stationary_combustion', 'gaseous_fuel', 'Natural gas',     'GLOBAL', 'kgCO2e/GJ', 56.10, 56.10, 0.001, 0.0001, 'IPCC 2006 Vol 2 Ch 1', '2006', '2006-01-01', 'Default factor for natural gas (HHV basis)'],
      [1, 'stationary_combustion', 'liquid_fuel',  'Diesel oil',      'GLOBAL', 'kgCO2e/GJ', 74.10, 74.10, 0.003, 0.0006, 'IPCC 2006 Vol 2 Ch 1', '2006', '2006-01-01', null],
      [1, 'stationary_combustion', 'liquid_fuel',  'Residual fuel oil','GLOBAL','kgCO2e/GJ', 77.40, 77.40, 0.003, 0.0006, 'IPCC 2006 Vol 2 Ch 1', '2006', '2006-01-01', null],
      [1, 'stationary_combustion', 'liquid_fuel',  'LPG',             'GLOBAL', 'kgCO2e/GJ', 63.10, 63.10, 0.001, 0.0001, 'IPCC 2006 Vol 2 Ch 1', '2006', '2006-01-01', null],
      [1, 'stationary_combustion', 'solid_fuel',   'Bituminous coal', 'GLOBAL', 'kgCO2e/GJ', 94.60, 94.60, 0.001, 0.0015, 'IPCC 2006 Vol 2 Ch 1', '2006', '2006-01-01', null],
      [1, 'stationary_combustion', 'solid_fuel',   'Sub-bituminous coal','GLOBAL','kgCO2e/GJ', 96.10, 96.10, 0.001, 0.0015, 'IPCC 2006 Vol 2 Ch 1', '2006', '2006-01-01', null],
      [1, 'stationary_combustion', 'solid_fuel',   'Lignite',         'GLOBAL', 'kgCO2e/GJ', 101.0, 101.0, 0.001, 0.0015, 'IPCC 2006 Vol 2 Ch 1', '2006', '2006-01-01', null],
      // ── DEFRA 2024 UK conversion factors (kgCO2e per kWh net) ──
      [1, 'stationary_combustion', 'gaseous_fuel', 'Natural gas',     'UK',     'kgCO2e/kWh', 0.18293, 0.18290, 0.00001, 0.00002, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', 'UK gross CV basis'],
      [1, 'stationary_combustion', 'liquid_fuel',  'Gas oil / diesel','UK',     'kgCO2e/litre', 2.66036, 2.65754, 0.00121, 0.00161, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', null],
      [1, 'stationary_combustion', 'liquid_fuel',  'LPG',             'UK',     'kgCO2e/litre', 1.55713, 1.55408, 0.00149, 0.00156, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', null],
      // ── EPA 2024 US (kgCO2 per mmBtu HHV — Tables C-1 and C-2) ──
      [1, 'stationary_combustion', 'gaseous_fuel', 'Natural gas',     'US',     'kgCO2e/mmBtu', 53.06, 53.06, 0.001, 0.0001, 'EPA Emission Factors Hub Apr 2024', '2024', '2024-04-01', null],
      [1, 'stationary_combustion', 'liquid_fuel',  'Distillate fuel oil','US',  'kgCO2e/mmBtu', 73.96, 73.96, 0.003, 0.0006, 'EPA Emission Factors Hub Apr 2024', '2024', '2024-04-01', null],
      [1, 'stationary_combustion', 'solid_fuel',   'Bituminous coal', 'US',     'kgCO2e/mmBtu', 93.40, 93.40, 0.011, 0.0016, 'EPA Emission Factors Hub Apr 2024', '2024', '2024-04-01', null],

      // ── Scope 1 mobile combustion (DEFRA 2024 UK — kgCO2e per litre) ──
      [1, 'mobile_combustion', 'road', 'Petrol (gasoline)', 'UK', 'kgCO2e/litre', 2.16802, 2.13041, 0.00064, 0.03698, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', 'Average petrol car blend'],
      [1, 'mobile_combustion', 'road', 'Diesel (avg biofuel)', 'UK', 'kgCO2e/litre', 2.51233, 2.47604, 0.00064, 0.03565, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', null],
      [1, 'mobile_combustion', 'aviation', 'Aviation kerosene (Jet A-1)', 'GLOBAL', 'kgCO2e/litre', 2.54400, 2.54400, 0, 0, 'IPCC 2006 / DEFRA 2024', '2024', '2024-06-01', 'Per ICAO methodology'],
      [1, 'mobile_combustion', 'marine', 'Marine gas oil (MGO)', 'GLOBAL', 'kgCO2e/litre', 2.77600, 2.77600, 0, 0, 'IMO 4th GHG Study 2020', '2020', '2020-01-01', null],
      [1, 'mobile_combustion', 'marine', 'Heavy fuel oil (HFO)', 'GLOBAL', 'kgCO2e/litre', 3.11400, 3.11400, 0, 0, 'IMO 4th GHG Study 2020', '2020', '2020-01-01', null],

      // ── Scope 1 fugitive — refrigerants (kgCO2e per kg refrigerant, GWP-100 per IPCC AR5) ──
      [1, 'fugitive', 'refrigerant', 'Methane (CH4) GWP-100', 'GLOBAL', 'kgCO2e/kg', 28.00, 0, 28.00, 0, 'IPCC AR5 WG1 Ch 8', 'AR5', '2014-01-01', 'GWP100 only — for refrigerant leak / fugitive accounting'],
      [1, 'fugitive', 'refrigerant', 'Nitrous oxide (N2O) GWP-100', 'GLOBAL', 'kgCO2e/kg', 265.00, 0, 0, 265.00, 'IPCC AR5 WG1 Ch 8', 'AR5', '2014-01-01', null],
      [1, 'fugitive', 'refrigerant', 'HFC-134a', 'GLOBAL', 'kgCO2e/kg', 1300.00, 0, 0, 0, 'IPCC AR5 WG1 Ch 8', 'AR5', '2014-01-01', 'Vehicle A/C and industrial chillers'],
      [1, 'fugitive', 'refrigerant', 'R-410A', 'GLOBAL', 'kgCO2e/kg', 1924.00, 0, 0, 0, 'IPCC AR5 WG1 Ch 8', 'AR5', '2014-01-01', '50/50 blend HFC-32 / HFC-125'],
      [1, 'fugitive', 'refrigerant', 'R-404A', 'GLOBAL', 'kgCO2e/kg', 3922.00, 0, 0, 0, 'IPCC AR5 WG1 Ch 8', 'AR5', '2014-01-01', null],
      [1, 'fugitive', 'refrigerant', 'HFC-32', 'GLOBAL', 'kgCO2e/kg', 677.00, 0, 0, 0, 'IPCC AR5 WG1 Ch 8', 'AR5', '2014-01-01', null],

      // ── Scope 2 purchased electricity grid mix (kgCO2e per kWh — IEA 2024 / DEFRA 2024) ──
      [2, 'purchased_electricity', 'grid', 'Grid electricity', 'UK',     'kgCO2e/kWh', 0.20705, 0.20496, 0.00050, 0.00159, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', 'Location-based 2023 UK grid average'],
      [2, 'purchased_electricity', 'grid', 'Grid electricity', 'US',     'kgCO2e/kWh', 0.38570, 0.38570, 0, 0, 'EPA eGRID 2022 (pub 2024)', '2024', '2024-01-01', 'US national average'],
      [2, 'purchased_electricity', 'grid', 'Grid electricity', 'EU',     'kgCO2e/kWh', 0.23000, 0.23000, 0, 0, 'EEA / IEA 2024', '2024', '2024-01-01', 'EU-27 average'],
      [2, 'purchased_electricity', 'grid', 'Grid electricity', 'IN',     'kgCO2e/kWh', 0.71300, 0.71300, 0, 0, 'IEA Emissions Factors 2024', '2024', '2024-01-01', 'India grid average'],
      [2, 'purchased_electricity', 'grid', 'Grid electricity', 'CN',     'kgCO2e/kWh', 0.55600, 0.55600, 0, 0, 'IEA Emissions Factors 2024', '2024', '2024-01-01', 'China grid average'],
      [2, 'purchased_electricity', 'grid', 'Grid electricity', 'JP',     'kgCO2e/kWh', 0.47300, 0.47300, 0, 0, 'IEA Emissions Factors 2024', '2024', '2024-01-01', null],
      [2, 'purchased_electricity', 'grid', 'Grid electricity', 'AU',     'kgCO2e/kWh', 0.63400, 0.63400, 0, 0, 'IEA Emissions Factors 2024', '2024', '2024-01-01', null],
      [2, 'purchased_electricity', 'grid', 'Grid electricity', 'CA',     'kgCO2e/kWh', 0.12000, 0.12000, 0, 0, 'IEA Emissions Factors 2024', '2024', '2024-01-01', 'High hydro share'],
      [2, 'purchased_electricity', 'grid', 'Grid electricity', 'DE',     'kgCO2e/kWh', 0.38000, 0.38000, 0, 0, 'IEA Emissions Factors 2024', '2024', '2024-01-01', null],
      [2, 'purchased_electricity', 'grid', 'Grid electricity', 'FR',     'kgCO2e/kWh', 0.05300, 0.05300, 0, 0, 'IEA Emissions Factors 2024', '2024', '2024-01-01', 'High nuclear share'],
      [2, 'purchased_electricity', 'grid', 'Grid electricity', 'GLOBAL', 'kgCO2e/kWh', 0.47500, 0.47500, 0, 0, 'IEA Emissions Factors 2024', '2024', '2024-01-01', 'World average'],
      [2, 'purchased_electricity', 'renewable', 'I-REC / EAC backed renewable', 'GLOBAL', 'kgCO2e/kWh', 0.00000, 0, 0, 0, 'GHG Protocol Scope 2 Guidance', '2015', '2015-01-01', 'Market-based zero with valid contractual instrument'],

      // ── Scope 2 purchased steam / district heating ──
      [2, 'purchased_heat', 'steam',     'District steam',  'UK', 'kgCO2e/kWh', 0.17081, 0.17081, 0, 0, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', null],
      [2, 'purchased_heat', 'hot_water', 'District heating','UK', 'kgCO2e/kWh', 0.16952, 0.16952, 0, 0, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', null],

      // ── Scope 3 Cat 4 transportation (kgCO2e per tonne-km, DEFRA 2024) ──
      [3, 'cat4_upstream_transport', 'road',     'HGV (avg laden)',          'UK', 'kgCO2e/tonne.km', 0.10713, 0.10619, 0.00006, 0.00088, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', 'Articulated >33t average'],
      [3, 'cat4_upstream_transport', 'road',     'Van (Class III, diesel)',  'UK', 'kgCO2e/tonne.km', 0.59538, 0.58867, 0.00018, 0.00653, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', null],
      [3, 'cat4_upstream_transport', 'rail',     'Freight rail',             'UK', 'kgCO2e/tonne.km', 0.02732, 0.02711, 0.00002, 0.00019, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', null],
      [3, 'cat4_upstream_transport', 'sea',      'Container ship',           'GLOBAL', 'kgCO2e/tonne.km', 0.01614, 0.01614, 0, 0, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', null],
      [3, 'cat4_upstream_transport', 'air',      'Air freight long-haul',    'GLOBAL', 'kgCO2e/tonne.km', 0.83336, 0.83336, 0, 0, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', 'Includes RFI 1.9 multiplier'],

      // ── Scope 3 Cat 6 business travel (kgCO2e per passenger-km, DEFRA 2024) ──
      [3, 'cat6_business_travel', 'air_short_haul',  'Flight short-haul (economy)', 'GLOBAL', 'kgCO2e/passenger.km', 0.15102, 0.15102, 0, 0, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', '<3700km, with RFI'],
      [3, 'cat6_business_travel', 'air_medium_haul', 'Flight medium-haul (economy)','GLOBAL', 'kgCO2e/passenger.km', 0.13386, 0.13386, 0, 0, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', null],
      [3, 'cat6_business_travel', 'air_long_haul',   'Flight long-haul (economy)',  'GLOBAL', 'kgCO2e/passenger.km', 0.14787, 0.14787, 0, 0, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', '>3700km, with RFI'],
      [3, 'cat6_business_travel', 'air_long_haul',   'Flight long-haul (business)', 'GLOBAL', 'kgCO2e/passenger.km', 0.42884, 0.42884, 0, 0, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', null],
      [3, 'cat6_business_travel', 'rail',            'National rail',               'UK', 'kgCO2e/passenger.km', 0.03546, 0.03543, 0.00001, 0.00002, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', null],
      [3, 'cat6_business_travel', 'hotel',           'Hotel night',                 'UK', 'kgCO2e/room.night', 8.860, 8.860, 0, 0, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', 'Per room per night'],

      // ── Scope 3 Cat 7 employee commute (kgCO2e per passenger-km, DEFRA 2024) ──
      [3, 'cat7_employee_commute', 'car',  'Car (avg, all fuels)', 'UK', 'kgCO2e/passenger.km', 0.16983, 0.16802, 0.00006, 0.00175, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', null],
      [3, 'cat7_employee_commute', 'bus',  'Local bus',            'UK', 'kgCO2e/passenger.km', 0.11774, 0.11710, 0.00005, 0.00059, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', null],
      [3, 'cat7_employee_commute', 'rail', 'National rail',        'UK', 'kgCO2e/passenger.km', 0.03546, 0.03543, 0.00001, 0.00002, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', null],
      [3, 'cat7_employee_commute', 'underground', 'London Underground','UK','kgCO2e/passenger.km', 0.02781, 0.02781, 0, 0, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', null],

      // ── Scope 3 Cat 10 end-of-life treatment (kgCO2e per tonne, DEFRA 2024) ──
      [3, 'cat10_eol_treatment', 'landfill',     'Plastic to landfill',     'UK', 'kgCO2e/tonne', 8.948,   8.948, 0, 0, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', 'Inert in landfill'],
      [3, 'cat10_eol_treatment', 'incineration', 'Plastic incineration',    'UK', 'kgCO2e/tonne', 21.281, 21.281, 0, 0, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', null],
      [3, 'cat10_eol_treatment', 'recycling',    'Paper / cardboard recycling','UK','kgCO2e/tonne', 21.358, 21.358, 0, 0, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', null],
      [3, 'cat10_eol_treatment', 'landfill',     'Paper / cardboard landfill', 'UK','kgCO2e/tonne', 1041.79, 1041.79, 0, 0, 'DEFRA UK GHG Conversion Factors 2024', '2024', '2024-06-01', 'Large methane component included'],
    ]

    for (const [scope, cat, sub, fa, region, unit, co2e, co2, ch4, n2o, source, sver, vfrom, notes] of efRows) {
      await sql`
        INSERT INTO emission_factors
          (scope, category, subcategory, fuel_or_activity, region, unit,
           co2e_per_unit, co2_per_unit, ch4_per_unit, n2o_per_unit,
           source, source_version, valid_from, notes)
        VALUES
          (${scope}, ${cat}, ${sub}, ${fa}, ${region}, ${unit},
           ${co2e}, ${co2}, ${ch4}, ${n2o},
           ${source}, ${sver}, ${vfrom}, ${notes})
        ON CONFLICT DO NOTHING
      `
    }

    // ═══════════════════════════════════════════
    // CSRD ESRS E1 — climate-change disclosure datapoint catalogue.
    // Idempotent; adds the framework to the catalogue and enables it on the
    // demo org so a customer can start a CSRD report from the framework picker.
    // ═══════════════════════════════════════════
    // ═══════════════════════════════════════════
    // Full sustainability framework catalogue. Each seeder writes its
    // questionnaire_item rows and flips the framework on for the demo org.
    // All are idempotent (UNIQUE constraint on gri_code, line_item, scope_split,
    // reporting_scope) so re-running setup is safe.
    // ═══════════════════════════════════════════
    await seedESRSE1(sql)
    await seedESRSE2(sql)
    await seedESRSE3(sql)
    await seedESRSE4(sql)
    await seedESRSE5(sql)
    await seedESRSS1(sql)
    await seedESRSS2(sql)
    await seedESRSS3(sql)
    await seedESRSS4(sql)
    await seedESRSG1(sql)
    await seedISSBS1(sql)
    await seedISSBS2(sql)
    await seedTCFD(sql)
    await seedCDP(sql)
    await seedSECClimate(sql)
    await seedCASB253(sql)
    await seedCASB261(sql)
    await seedEUTaxonomy(sql)
    await seedConnectorTemplates(sql)

    // ═══════════════════════════════════════════
    // Linked-data propagation — Workiva-style flagship feature.
    // concept_mappings maps a single conceptual data point (e.g.
    // 'ghg.scope1.total') onto its representation in every framework, so
    // when a data_value is approved we can auto-fill peer disclosures.
    // ═══════════════════════════════════════════
    await sql`CREATE TABLE IF NOT EXISTS concept_mappings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      concept_key TEXT NOT NULL,
      framework_id TEXT NOT NULL,
      questionnaire_item_id UUID REFERENCES questionnaire_item(id) ON DELETE CASCADE,
      unit_conversion NUMERIC DEFAULT 1.0,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(concept_key, framework_id, questionnaire_item_id)
    )`
    await sql`CREATE INDEX IF NOT EXISTS idx_concept_mappings_concept ON concept_mappings(concept_key)`
    await sql`CREATE INDEX IF NOT EXISTS idx_concept_mappings_qi ON concept_mappings(questionnaire_item_id)`
    // Track auto-fill provenance on data_value. derived_from points at the
    // source row; is_overridden lets users lock a peer so future propagation skips it.
    await sql`ALTER TABLE data_value ADD COLUMN IF NOT EXISTS derived_from UUID REFERENCES data_value(id)`
    await sql`ALTER TABLE data_value ADD COLUMN IF NOT EXISTS is_overridden BOOLEAN DEFAULT false`

    await seedConceptMappings(sql)

    // ═══════════════════════════════════════════
    // Rate-limit buckets — DB-backed token bucket shared across serverless
    // instances. One row per (key, current window). Idempotent.
    // ═══════════════════════════════════════════
    await sql`CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      key TEXT PRIMARY KEY,
      window_start TIMESTAMPTZ NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT now()
    )`
    await sql`CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_buckets(window_start)`

    // ═══════════════════════════════════════════
    // Programmatic API keys — for customers pushing data via CI / BI tools.
    // Distinct from scim_tokens (which are for IdP user sync). Scopes are the
    // standard permission strings (data.upload, reports.view, …).
    // ═══════════════════════════════════════════
    await sql`CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      prefix TEXT NOT NULL,
      scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_by UUID REFERENCES users(id),
      is_active BOOLEAN DEFAULT true,
      expires_at TIMESTAMPTZ,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )`
    await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(org_id, is_active)`

    return res.status(200).json({ ok: true, message: 'Database setup complete — tables created and seeded' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
