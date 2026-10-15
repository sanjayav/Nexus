import type { VercelRequest, VercelResponse } from '@vercel/node'
import archiver from 'archiver'
import { getDb } from '../_db.js'
import { cors, requirePermission } from '../_auth.js'

// GET /api/admin/export
// Streams a zip with every org-scoped row a tenant admin is entitled to
// export under GDPR Art. 20 (right of data portability). Sensitive auth
// material is stripped before serialization.
//
// Hard cap: 100,000 rows per table for v1. Production should paginate.

const ROW_CAP = 100_000
const SCHEMA_VERSION = '2026-05-export-v1'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = await requirePermission(req, res, 'admin.org')
  if (!token) return

  const sql = getDb()
  const orgRows = await sql`SELECT id, name, slug, industry, country, region, created_at FROM organisations WHERE id = ${token.org}` as Array<{ id: string; name: string; slug: string; industry: string | null; country: string | null; region: string | null; created_at: string }>
  if (orgRows.length === 0) return res.status(404).json({ error: 'Organisation not found' })
  const org = orgRows[0]
  const generatedAt = new Date().toISOString()
  const filename = `export_${org.slug || org.id}_${generatedAt.replace(/[:.]/g, '-')}.zip`

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Cache-Control', 'no-store')

  const zip = archiver('zip', { zlib: { level: 6 } })
  zip.on('warning', (e) => { if (e.code !== 'ENOENT') console.error('[export] zip warning:', e) })
  zip.on('error', (e) => { console.error('[export] zip error:', e); try { res.end() } catch { /* ignore */ } })
  zip.pipe(res)

  // Helper — push a JSON file directly into the archive with the row payload.
  const append = (name: string, payload: unknown) => {
    zip.append(JSON.stringify(payload, null, 2), { name })
  }

  try {
    // ── manifest ─────────────────────────────────────────────
    append('manifest.json', {
      org: { id: org.id, name: org.name, slug: org.slug, industry: org.industry, country: org.country, region: org.region, created_at: org.created_at },
      generated_at: generatedAt,
      schema_version: SCHEMA_VERSION,
      row_cap_per_table: ROW_CAP,
      notes: 'Excludes password_hash, MFA secrets, SCIM token hashes, API key hashes. See docs/DATA_EXPORT.md.',
    })

    // ── users (NO password_hash, NO MFA secrets) ─────────────
    const users = await sql`
      SELECT u.id, u.email, u.name, u.is_active, u.scim_managed, u.external_id, u.preferred_framework_id, u.created_at
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      WHERE r.org_id = ${token.org}
      GROUP BY u.id
      LIMIT ${ROW_CAP}
    `.catch(() => [])
    append('users.json', users)

    // ── facilities ───────────────────────────────────────────
    const facilities = await sql`
      SELECT id, name, code, location, country, type, latitude, longitude,
             production_volume, is_active, created_at
      FROM facilities WHERE org_id = ${token.org} LIMIT ${ROW_CAP}
    `.catch(() => [])
    append('facilities.json', facilities)

    // ── activity_data ───────────────────────────────────────
    const activity = await sql`
      SELECT id, facility_id, source_id, period_year, period_month, scope, category, subcategory, fuel_type,
             activity_value, activity_unit, emission_factor, ef_source, ef_unit,
             co2e_tonnes, co2, ch4, n2o, status, submitted_by, approved_by,
             submitted_at, approved_at, notes, source_calculator_id, source_method_id, created_at
      FROM activity_data WHERE org_id = ${token.org} LIMIT ${ROW_CAP}
    `.catch(() => [])
    append('activity_data.json', activity)

    // ── question_assignments ────────────────────────────────
    const assignments = await sql`
      SELECT id, framework_id, questionnaire_item_id, gri_code, line_item, unit,
             entity_id, assignee_email, assignee_name, entry_modes, used_mode,
             due_date, status, value, comment, evidence_ids, response_type,
             narrative_body, period_id, disclosure_position, assigned_by,
             assigned_at, last_updated
      FROM question_assignments WHERE org_id = ${token.org} LIMIT ${ROW_CAP}
    `.catch(() => [])
    append('question_assignments.json', assignments)

    // ── data_values ─────────────────────────────────────────
    const dataValues = await sql`
      SELECT id, questionnaire_item_id, value, unit, evidence_ids, source_type,
             created_at, updated_at
      FROM data_value WHERE org_id = ${token.org} LIMIT ${ROW_CAP}
    `.catch(() => [])
    append('data_values.json', dataValues)

    // ── workflow_tasks ──────────────────────────────────────
    const workflowTasks = await sql`
      SELECT id, type, title, description, status, facility_id, data_type, period,
             priority, assigned_to, assigned_by, submitted_by, due_date,
             completed_at, comments, created_at
      FROM workflow_tasks WHERE org_id = ${token.org} LIMIT ${ROW_CAP}
    `.catch(() => [])
    append('workflow_tasks.json', workflowTasks)

    // ── audit_log ───────────────────────────────────────────
    const auditLog = await sql`
      SELECT * FROM audit_log WHERE org_id = ${token.org} LIMIT ${ROW_CAP}
    `.catch(() => [])
    append('audit_log.json', auditLog)

    // ── notifications ───────────────────────────────────────
    const notifications = await sql`
      SELECT id, recipient_user_id, recipient_email, kind, subject, body, route,
             related_assignment_id, read_at, email_sent_at, created_at
      FROM notifications WHERE org_id = ${token.org} LIMIT ${ROW_CAP}
    `.catch(() => [])
    append('notifications.json', notifications)

    // ── reports (report_artifacts metadata, NOT pdf_content) ─
    const reports = await sql`
      SELECT id, period_id, framework_id, version, pdf_sha256, pdf_size, page_count,
             is_draft, assurance_request_id, anchor_tip_hash, anchor_calendar_url,
             anchored_at, verification_token, published_by, published_at, metadata
      FROM report_artifacts WHERE org_id = ${token.org} LIMIT ${ROW_CAP}
    `.catch(() => [])
    append('reports.json', reports)

    // ── emission_factors_used (referenced by activity_data) ─
    const efUsed = await sql`
      SELECT DISTINCT ef.id, ef.scope, ef.category, ef.subcategory,
             ef.fuel_or_activity, ef.region, ef.unit, ef.co2e_per_unit,
             ef.source, ef.source_version, ef.notes
      FROM emission_factors ef
      WHERE ef.fuel_or_activity IN (
        SELECT DISTINCT fuel_type FROM activity_data WHERE org_id = ${token.org} AND fuel_type IS NOT NULL
      )
      LIMIT ${ROW_CAP}
    `.catch(() => [])
    append('emission_factors_used.json', efUsed)

    // ── disclosures (data_value × questionnaire_item join) ──
    const disclosures = await sql`
      SELECT dv.id AS data_value_id, dv.value, dv.unit, dv.source_type,
             qi.id AS questionnaire_item_id, qi.framework_id, qi.gri_code,
             qi.line_item, qi.section, qi.subsection, qi.reporting_scope,
             dv.created_at, dv.updated_at
      FROM data_value dv
      JOIN questionnaire_item qi ON qi.id = dv.questionnaire_item_id
      WHERE dv.org_id = ${token.org}
      LIMIT ${ROW_CAP}
    `.catch(() => [])
    append('disclosures.json', disclosures)

    await zip.finalize()
  } catch (err) {
    console.error('[export] failed:', err instanceof Error ? err.message : err)
    try { zip.abort() } catch { /* ignore */ }
    try { res.end() } catch { /* ignore */ }
  }
}
