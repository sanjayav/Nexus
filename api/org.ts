import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as crypto from 'crypto'
import { getDb } from './_db.js'
import { verifyToken, cors, requirePermission } from './_auth.js'
import { z } from 'zod'

// ── Per-action input schemas. Catch obviously malformed bodies before they
//    reach SQL. We only validate field shape — semantic checks remain inline.
const uuid = z.string().uuid()
const emailStr = z.string().email().max(320)
const entityActionSchema = z.object({
  id: uuid.optional(),
  parent_id: uuid.nullable().optional(),
  type: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(300).optional(),
  code: z.string().max(100).nullable().optional(),
  country: z.string().max(120).nullable().optional(),
  equity: z.number().nullable().optional(),
  industry: z.string().max(200).nullable().optional(),
})
const memberActionSchema = z.object({
  id: uuid.optional(),
  entity_id: uuid.optional(),
  email: emailStr.optional(),
  name: z.string().min(1).max(200).optional(),
  role: z.string().min(1).max(80).optional(),
  user_id: uuid.nullable().optional(),
})
import { appendChainRecord } from './_hashChain.js'
import { notify } from './_notify.js'
import { audit, auditIp } from './_audit.js'
import type { AssignmentLike, HistoricalPoint, Anomaly } from './_anomalies.js'

/**
 * The PDF renderer (`@react-pdf/renderer` via _reportGenerator) and the
 * anomaly engine are heavy. Static-importing them at the top of this file
 * causes Vercel cold-starts to occasionally crash with FUNCTION_INVOCATION_FAILED
 * — the imports are loaded eagerly even on lightweight GET ?view=entities
 * requests that don't need them. We dynamic-import on demand instead.
 */
async function loadReportGen() {
  return import('./_reportGenerator.js')
}
async function loadAnomalies() {
  return import('./_anomalies.js')
}

/** Light-weight uuid v4 — replicates _reportGenerator.generateVerificationToken
 *  without dragging in the @react-pdf/renderer dependency. */
function generateVerificationToken(): string {
  return crypto.randomUUID()
}

/**
 * /api/org — single dispatcher for the org tree, membership, and question
 * assignments. Kept as one handler to stay under the Vercel Hobby 12-function
 * limit; internal routing is by ?view= (GET) or body.action (POST).
 *
 * Views (GET):
 *   ?view=entities          → all org entities in the caller's org
 *   ?view=members           → all members
 *   ?view=assignments       → all question_assignments in the caller's org
 *   ?view=my-assignments    → assignments where assignee_email = caller
 *   ?view=questions         → GRI questionnaire items (from Nexus table)
 *
 * Actions (POST):
 *   { action: 'add-entity',     ... }
 *   { action: 'update-entity',  id, patch }
 *   { action: 'remove-entity',  id }
 *   { action: 'add-member',     ... }
 *   { action: 'remove-member',  id }
 *   { action: 'add-assignment', ... }
 *   { action: 'update-assignment', id, patch }
 *   { action: 'remove-assignment', id }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const sql = getDb()

  // ─── Public (unauthenticated) endpoints ──────────────────────
  // Verify-report: anyone with the token can verify. This is the whole point
  // of the cover QR — a third party receives a PDF and can confirm its hash
  // was published by this platform at the stated time.
  const publicView = req.method === 'GET' ? String(req.query.view || '') : ''
  if (publicView === 'verify-report') {
    try {
      const token = String(req.query.token || '')
      if (!token) return res.status(400).json({ error: 'token required' })
      const rows = await sql`
        SELECT ra.pdf_sha256, ra.pdf_size, ra.page_count, ra.version, ra.is_draft,
               ra.anchor_tip_hash, ra.anchor_calendar_url, ra.anchored_at,
               ra.published_at, ra.framework_id, ra.period_id,
               rp.label AS period_label, rp.year AS period_year,
               o.name AS org_name,
               u.name AS published_by_name,
               ar.auditor_firm, ar.signed_by, ar.signed_at, ar.opinion_type, ar.isae_reference
        FROM report_artifacts ra
        LEFT JOIN reporting_periods rp ON rp.id = ra.period_id
        LEFT JOIN organisations o ON o.id = ra.org_id
        LEFT JOIN users u ON u.id = ra.published_by
        LEFT JOIN assurance_requests ar ON ar.id = ra.assurance_request_id AND ar.status = 'signed'
        WHERE ra.verification_token = ${token}
        LIMIT 1
      ` as Array<{
        pdf_sha256: string; pdf_size: number; page_count: number | null; version: number; is_draft: boolean
        anchor_tip_hash: string | null; anchor_calendar_url: string | null; anchored_at: string | null
        published_at: string; framework_id: string; period_id: string
        period_label: string; period_year: number; org_name: string; published_by_name: string
        auditor_firm: string | null; signed_by: string | null; signed_at: string | null; opinion_type: string | null; isae_reference: string | null
      }>
      if (rows.length === 0) return res.status(404).json({ error: 'Unknown verification token' })
      const r = rows[0]
      return res.status(200).json({
        verified: true,
        organisation: r.org_name,
        framework: r.framework_id,
        period: { label: r.period_label, year: r.period_year },
        published: { at: r.published_at, by: r.published_by_name, version: r.version, is_draft: r.is_draft },
        pdf: { sha256: r.pdf_sha256, size: r.pdf_size, pages: r.page_count },
        anchor: r.anchor_tip_hash ? {
          tip_hash: r.anchor_tip_hash,
          calendar: r.anchor_calendar_url,
          anchored_at: r.anchored_at,
          note: 'Partial OpenTimestamps receipt stored. Public Bitcoin confirmation typically 1–6 hours after anchoring.',
        } : null,
        assurance: r.signed_at ? {
          firm: r.auditor_firm,
          signed_by: r.signed_by,
          signed_at: r.signed_at,
          opinion: r.opinion_type,
          standard: r.isae_reference,
        } : null,
      })
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'Verification failed' })
    }
  }

  // Auditor assurance-upload path uses a one-shot upload_token, not a JWT.
  // Keeps the external auditor out of our user table.
  const publicAction = req.method === 'POST' ? String(req.body?.action || '') : ''
  if (publicAction === 'submit-assurance-statement') {
    try {
      const { upload_token, auditor_firm, signed_by, opinion_type, isae_reference, notes, statement_pdf_b64 } = req.body ?? {}
      if (!upload_token) return res.status(400).json({ error: 'upload_token required' })
      if (!signed_by) return res.status(400).json({ error: 'signed_by required' })
      const validOpinion = opinion_type === 'reasonable' || opinion_type === 'limited'
      if (!validOpinion) return res.status(400).json({ error: 'opinion_type must be "limited" or "reasonable"' })
      const arRows = await sql`
        SELECT id, org_id, period_id, status FROM assurance_requests WHERE upload_token = ${upload_token}
      ` as Array<{ id: string; org_id: string; period_id: string; status: string }>
      if (arRows.length === 0) return res.status(404).json({ error: 'Invalid or expired upload token' })
      const ar = arRows[0]
      if (ar.status === 'signed') return res.status(409).json({ error: 'This assurance request has already been signed' })
      if (ar.status === 'withdrawn') return res.status(409).json({ error: 'This assurance request was withdrawn' })

      let pdfBytes: Buffer | null = null
      let pdfSha: string | null = null
      if (statement_pdf_b64) {
        pdfBytes = Buffer.from(statement_pdf_b64, 'base64')
        pdfSha = crypto.createHash('sha256').update(pdfBytes).digest('hex')
      }

      await sql`
        UPDATE assurance_requests SET
          auditor_firm = COALESCE(${auditor_firm || null}, auditor_firm),
          signed_by = ${signed_by},
          signed_at = now(),
          opinion_type = ${opinion_type},
          isae_reference = COALESCE(${isae_reference || null}, 'ISAE 3000 (Revised)'),
          notes = ${notes || null},
          statement_pdf = ${pdfBytes},
          statement_sha256 = ${pdfSha},
          status = 'signed',
          upload_token = NULL
        WHERE id = ${ar.id}
      `

      // Update any non-draft artifact pointing at this request to clear is_draft.
      await sql`
        UPDATE report_artifacts SET is_draft = false
        WHERE assurance_request_id = ${ar.id} AND org_id = ${ar.org_id}
      `

      await appendChainRecord(sql, ar.org_id, {
        record_type: 'assurance_signed',
        reference_id: ar.id,
        event_type: 'Anchored',
        facility_name: auditor_firm ?? 'assurance provider',
        metadata: { signed_by, opinion_type, isae_reference: isae_reference ?? 'ISAE 3000 (Revised)' },
      })

      return res.status(200).json({ ok: true })
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'Upload failed' })
    }
  }

  // Public read-only report — token-gated, optional password, returns only
  // published-report shape (no draft values, no internal comments).
  if (publicView === 'public-report') {
    try {
      const tokenStr = String(req.query.token || '')
      if (!tokenStr) return res.status(400).json({ error: 'token required' })
      const linkRows = await sql`
        SELECT id, org_id, report_id, expires_at, password_hash, is_active, view_count
        FROM report_share_links WHERE token = ${tokenStr}
        LIMIT 1
      ` as Array<{ id: string; org_id: string; report_id: string | null; expires_at: string | null; password_hash: string | null; is_active: boolean; view_count: number }>
      if (linkRows.length === 0) return res.status(404).json({ error: 'Invalid link' })
      const link = linkRows[0]
      if (!link.is_active) return res.status(410).json({ error: 'This link has been revoked' })
      if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
        return res.status(410).json({ error: 'This link has expired' })
      }
      if (link.password_hash) {
        const provided = String(req.query.p || '')
        if (!provided) return res.status(401).json({ error: 'Password required', password_required: true })
        const bcrypt = await import('bcryptjs')
        const ok = await bcrypt.default.compare(provided, link.password_hash)
        if (!ok) return res.status(401).json({ error: 'Invalid password', password_required: true })
      }
      // Load the published report — pull only the fields safe to disclose.
      // (No internal comments, no draft values.)
      let report: Record<string, unknown> | null = null
      if (link.report_id) {
        const rows = await sql`
          SELECT ra.id, ra.framework_id, ra.version, ra.published_at, ra.is_draft,
                 ra.pdf_sha256, ra.page_count, ra.anchor_tip_hash, ra.anchored_at,
                 ra.verification_token,
                 rp.label AS period_label, rp.year AS period_year,
                 o.name AS org_name,
                 u.name AS published_by_name,
                 ar.auditor_firm, ar.signed_by, ar.signed_at, ar.opinion_type, ar.isae_reference
          FROM report_artifacts ra
          LEFT JOIN reporting_periods rp ON rp.id = ra.period_id
          LEFT JOIN organisations o ON o.id = ra.org_id
          LEFT JOIN users u ON u.id = ra.published_by
          LEFT JOIN assurance_requests ar ON ar.id = ra.assurance_request_id AND ar.status = 'signed'
          WHERE ra.id = ${link.report_id} AND ra.org_id = ${link.org_id} AND ra.is_draft = false
          LIMIT 1
        ` as Array<Record<string, unknown>>
        if (rows.length === 0) return res.status(404).json({ error: 'Report no longer published' })
        report = rows[0]
        // Pull approved (non-draft) disclosure values for this period+framework.
        const sections = await sql`
          SELECT gri_code, line_item, value, unit, narrative_body, response_type
          FROM question_assignments
          WHERE org_id = ${link.org_id}
            AND framework_id = ${report.framework_id as string}
            AND period_id = (SELECT period_id FROM report_artifacts WHERE id = ${link.report_id})
            AND status = 'approved'
          ORDER BY gri_code, line_item
        ` as Array<{ gri_code: string; line_item: string; value: number | null; unit: string | null; narrative_body: string | null; response_type: string }>
        report.sections = sections
      }
      // Bump view counter (best-effort).
      await sql`UPDATE report_share_links SET view_count = view_count + 1 WHERE id = ${link.id}`.catch(() => {})
      return res.status(200).json({
        ok: true,
        view_count: link.view_count + 1,
        password_protected: !!link.password_hash,
        report,
      })
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'Load failed' })
    }
  }

  // ─── Authenticated endpoints ─────────────────────────────────
  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const orgId = token.org

  try {
    if (req.method === 'GET') {
      const view = String(req.query.view || '')
      if (view === 'disclosure-standard') {
        // One row per disclosure (gri_code, line_item) with its canonical definition,
        // calc method, cadence, and ownership chain. Used by the Data Standard page.
        const frameworkId = req.query.framework_id ? String(req.query.framework_id) : null
        const rows = frameworkId
          ? await sql`
              SELECT gri_code, line_item,
                MIN(section) AS section,
                MIN(subsection) AS subsection,
                MIN(unit) AS unit,
                MIN(framework_id) AS framework_id,
                MIN(definition) AS definition,
                MIN(calc_method) AS calc_method,
                MIN(cadence) AS cadence,
                MIN(data_owner_role) AS data_owner_role,
                MIN(reviewer_role) AS reviewer_role,
                MIN(approver_role) AS approver_role,
                COUNT(*)::int AS cells
              FROM questionnaire_item
              WHERE framework_id = ${frameworkId}
              GROUP BY gri_code, line_item
              ORDER BY MIN(section), gri_code, line_item
            `
          : await sql`
              SELECT gri_code, line_item,
                MIN(section) AS section,
                MIN(subsection) AS subsection,
                MIN(unit) AS unit,
                MIN(framework_id) AS framework_id,
                MIN(definition) AS definition,
                MIN(calc_method) AS calc_method,
                MIN(cadence) AS cadence,
                MIN(data_owner_role) AS data_owner_role,
                MIN(reviewer_role) AS reviewer_role,
                MIN(approver_role) AS approver_role,
                COUNT(*)::int AS cells
              FROM questionnaire_item
              GROUP BY gri_code, line_item
              ORDER BY MIN(framework_id), MIN(section), gri_code, line_item
            `
        return res.status(200).json(rows)
      }
      if (view === 'saved-views') {
        // List the user's private saved views + any org-shared views for this page.
        const page = String(req.query.page || '')
        if (!page) return res.status(400).json({ error: 'page required' })
        const rows = await sql`
          SELECT id, page, name, filters, is_default, is_shared, user_id, created_at, updated_at
          FROM saved_views
          WHERE org_id = ${orgId}
            AND page = ${page}
            AND (user_id = ${token.sub} OR is_shared = true)
          ORDER BY is_default DESC, name ASC
        ` as Array<{ id: string; page: string; name: string; filters: unknown; is_default: boolean; is_shared: boolean; user_id: string; created_at: string; updated_at: string }>
        return res.status(200).json(rows.map(r => ({
          ...r,
          owned_by_me: r.user_id === token.sub,
        })))
      }
      if (view === 'tenant-brand') {
        const rows = await sql`
          SELECT name, legal_name, thai_name, country, primary_color, secondary_color,
                 logo_mark, industry, headquarters, website
          FROM organisations WHERE id = ${orgId}
        `
        return res.status(200).json(rows[0] ?? null)
      }
      if (view === 'entities') {
        const rows = await sql`
          SELECT id, parent_id, type, name, code, country, equity, industry, created_at
          FROM org_entities WHERE org_id = ${orgId}
          ORDER BY created_at ASC
        `
        return res.status(200).json(rows)
      }
      if (view === 'members') {
        const rows = await sql`
          SELECT id, user_id, entity_id, email, name, role, created_at
          FROM org_members WHERE org_id = ${orgId}
          ORDER BY created_at ASC
        `
        return res.status(200).json(rows)
      }
      if (view === 'assignments') {
        const rows = await sql`
          SELECT id, framework_id, questionnaire_item_id AS question_id, gri_code, line_item,
                 unit, entity_id, assignee_email, assignee_name, assignee_user_id,
                 entry_modes, used_mode, due_date, status, value, comment, evidence_ids,
                 response_type, narrative_body, period_id, disclosure_position,
                 formula,
                 assigned_by, assigned_at, last_updated
          FROM question_assignments WHERE org_id = ${orgId}
          ORDER BY assigned_at DESC
        `
        return res.status(200).json(rows)
      }
      if (view === 'my-assignments') {
        const overdueOnly = String(req.query.overdue ?? '') === '1'
        const today = new Date().toISOString().slice(0, 10)
        // Overdue = due_date < today AND status not yet through pipeline.
        // We compute is_overdue server-side so the UI can sort/filter without
        // re-deriving the rule client-side.
        const rows = overdueOnly
          ? await sql`
              SELECT id, framework_id, questionnaire_item_id AS question_id, gri_code, line_item,
                     unit, entity_id, assignee_email, assignee_name, assignee_user_id,
                     entry_modes, used_mode, due_date, status, value, comment, evidence_ids,
                     response_type, narrative_body, period_id, disclosure_position,
                     formula,
                     assigned_by, assigned_at, last_updated,
                     (due_date IS NOT NULL AND due_date < ${today}::date
                       AND status NOT IN ('approved','reviewed','submitted')) AS is_overdue
              FROM question_assignments
              WHERE org_id = ${orgId}
                AND lower(assignee_email) = ${token.email.toLowerCase()}
                AND due_date IS NOT NULL AND due_date < ${today}::date
                AND status NOT IN ('approved','reviewed','submitted')
              ORDER BY due_date ASC
            `
          : await sql`
              SELECT id, framework_id, questionnaire_item_id AS question_id, gri_code, line_item,
                     unit, entity_id, assignee_email, assignee_name, assignee_user_id,
                     entry_modes, used_mode, due_date, status, value, comment, evidence_ids,
                     response_type, narrative_body, period_id, disclosure_position,
                     formula,
                     assigned_by, assigned_at, last_updated,
                     (due_date IS NOT NULL AND due_date < ${today}::date
                       AND status NOT IN ('approved','reviewed','submitted')) AS is_overdue
              FROM question_assignments
              WHERE org_id = ${orgId}
                AND lower(assignee_email) = ${token.email.toLowerCase()}
              ORDER BY
                (due_date IS NOT NULL AND due_date < ${today}::date
                  AND status NOT IN ('approved','reviewed','submitted')) DESC,
                due_date ASC NULLS LAST,
                assigned_at DESC
            `
        return res.status(200).json(rows)
      }
      if (view === 'questions') {
        // The `questionnaire_item` table keeps one row per
        // (year × entity × breakdown) cell, so a naive SELECT returns
        // thousands of dupes. For anyone building a *picker* (assignments,
        // content index), we want one row per distinct (gri_code, line_item).
        // DISTINCT ON keeps the first UUID per pair so the frontend still has
        // a stable `id` to pass to add-assignment.
        const frameworkId = String(req.query.framework_id || 'gri')
        const rows = await sql`
          SELECT DISTINCT ON (gri_code, line_item)
                 id, section, subsection, gri_code, line_item, unit, scope_split,
                 default_workflow_role, entry_mode_default, target_fy2026, footnote_refs, reporting_scope, framework_id
          FROM questionnaire_item
          WHERE framework_id = ${frameworkId}
          ORDER BY gri_code, line_item, id
        `
        return res.status(200).json(rows)
      }
      if (view === 'enabled-frameworks') {
        // Returns the framework_ids this org has turned on. Source of truth for
        // which frameworks the FrameworkSelector offers.
        const rows = await sql`
          SELECT framework_id, enabled, enabled_at
          FROM org_framework_enablement
          WHERE org_id = ${orgId} AND enabled = true
          ORDER BY enabled_at ASC
        ` as Array<{ framework_id: string; enabled: boolean; enabled_at: string }>
        return res.status(200).json(rows)
      }
      if (view === 'targets') {
        const rows = await sql`
          SELECT id, framework_id, kind, label, scope_coverage,
                 baseline_year, baseline_value, baseline_unit,
                 target_year, target_reduction_pct, status, validated_by, notes,
                 created_at, updated_at
          FROM org_targets WHERE org_id = ${orgId}
          ORDER BY target_year ASC
        `
        return res.status(200).json(rows)
      }
      if (view === 'material-topics') {
        const rows = await sql`
          SELECT id, framework_id, topic_name, topic_category, linked_gri_codes,
                 impact_score, financial_score, dma_status, rationale, owner_email,
                 assessed_at, created_at
          FROM material_topics WHERE org_id = ${orgId}
          ORDER BY
            (COALESCE(impact_score,0) + COALESCE(financial_score,0)) DESC,
            topic_name ASC
        `
        return res.status(200).json(rows)
      }
      if (view === 'periods') {
        const rows = await sql`
          SELECT id, framework_id, year, label, status, start_date, end_date, submission_deadline,
                 locked_at, locked_by, published_at, published_by, publish_hash, notes, created_at
          FROM reporting_periods WHERE org_id = ${orgId}
          ORDER BY year DESC
        `
        return res.status(200).json(rows)
      }
      if (view === 'comments') {
        const { assignment_id } = req.query as Record<string, string | undefined>
        if (!assignment_id) return res.status(400).json({ error: 'assignment_id required' })
        // Flat list — client builds the tree. Threaded replies are capped at
        // one level by the writer; reading is purely structural.
        const rows = await sql`
          SELECT id, assignment_id, author_user_id, author_name, author_email, body, kind,
                 parent_comment_id, mentioned_user_ids, is_request_for_review,
                 resolved_at, resolved_by, created_at
          FROM assignment_comments WHERE assignment_id = ${assignment_id}
          ORDER BY created_at ASC
        `
        return res.status(200).json(rows)
      }
      if (view === 'notifications') {
        const rows = await sql`
          SELECT id, kind, subject, body, route, related_assignment_id, read_at, created_at
          FROM notifications
          WHERE org_id = ${orgId}
            AND lower(recipient_email) = ${token.email.toLowerCase()}
          ORDER BY created_at DESC
          LIMIT 50
        `
        return res.status(200).json(rows)
      }
      if (view === 'notification-count') {
        const rows = await sql`
          SELECT COUNT(*)::int AS n FROM notifications
          WHERE org_id = ${orgId}
            AND lower(recipient_email) = ${token.email.toLowerCase()}
            AND read_at IS NULL
        ` as Array<{ n: number }>
        return res.status(200).json({ unread: rows[0]?.n ?? 0 })
      }
      if (view === 'content-index') {
        // Auto-generated GRI Content Index — one row per disclosure (gri_code, line_item).
        // The `questionnaire_item` table holds one row per cell (entity × year × breakdown),
        // so we aggregate it to a single row per disclosure before joining assignments.
        const frameworkId = String(req.query.framework_id || 'gri')
        const rows = await sql`
          WITH scope AS (
            SELECT
              gri_code,
              line_item,
              MIN(section)         AS section,
              MIN(subsection)      AS subsection,
              MIN(unit)            AS unit,
              MIN(reporting_scope) AS reporting_scope,
              array_agg(id)        AS item_ids
            FROM questionnaire_item
            WHERE framework_id = ${frameworkId}
            GROUP BY gri_code, line_item
          ),
          agg AS (
            SELECT qi.gri_code, qi.line_item,
                   COUNT(qa.id)::int AS total,
                   COUNT(qa.id) FILTER (WHERE qa.status = 'approved')::int AS approved,
                   COUNT(qa.id) FILTER (WHERE qa.status IN ('submitted','reviewed'))::int AS in_review,
                   MAX(qa.response_type) AS any_response_type
            FROM question_assignments qa
            JOIN questionnaire_item qi ON qi.id = qa.questionnaire_item_id
            WHERE qa.org_id = ${orgId} AND qa.framework_id = ${frameworkId}
            GROUP BY qi.gri_code, qi.line_item
          )
          SELECT
            (s.gri_code || '|' || s.line_item) AS id,
            s.gri_code, s.line_item, s.section, s.subsection, s.unit, s.reporting_scope,
            COALESCE(a.total, 0)     AS total,
            COALESCE(a.approved, 0)  AS approved,
            COALESCE(a.in_review, 0) AS in_review,
            CASE
              WHEN a.total IS NULL OR a.total = 0                     THEN 'omitted'
              WHEN a.approved = a.total AND a.total > 0               THEN 'fully'
              WHEN a.approved > 0 OR a.in_review > 0                  THEN 'partially'
              ELSE 'omitted'
            END AS status,
            a.any_response_type AS response_type
          FROM scope s
          LEFT JOIN agg a ON a.gri_code = s.gri_code AND a.line_item = s.line_item
          ORDER BY s.gri_code, s.line_item
        `
        return res.status(200).json(rows)
      }
      if (view === 'materiality-assessments') {
        const rows = await sql`
          SELECT id, framework_id, label, kind, status, methodology, conducted_by, conducted_on,
                 stakeholders_engaged, created_at, updated_at
          FROM materiality_assessments WHERE org_id = ${orgId}
          ORDER BY created_at DESC
        `
        return res.status(200).json(rows)
      }
      if (view === 'framework-progress') {
        // Per-framework coverage summary for dashboards.
        const rows = await sql`
          SELECT
            framework_id,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
            COUNT(*) FILTER (WHERE status IN ('submitted','reviewed'))::int AS in_review,
            COUNT(*) FILTER (WHERE status IN ('not_started','in_progress','rejected'))::int AS open
          FROM question_assignments
          WHERE org_id = ${orgId}
          GROUP BY framework_id
        `
        return res.status(200).json(rows)
      }
      // ─── Report artifacts + assurance ──────────────────
      if (view === 'published-reports') {
        const rows = await sql`
          SELECT ra.id, ra.period_id, ra.framework_id, ra.version, ra.pdf_sha256, ra.pdf_size, ra.page_count,
                 ra.is_draft, ra.verification_token, ra.published_at,
                 ra.anchor_tip_hash, ra.anchored_at,
                 ra.assurance_request_id,
                 u.name AS published_by_name,
                 rp.label AS period_label, rp.year AS period_year,
                 ar.status AS assurance_status, ar.auditor_firm, ar.signed_at
          FROM report_artifacts ra
          LEFT JOIN users u ON u.id = ra.published_by
          LEFT JOIN reporting_periods rp ON rp.id = ra.period_id
          LEFT JOIN assurance_requests ar ON ar.id = ra.assurance_request_id
          WHERE ra.org_id = ${orgId}
          ORDER BY ra.published_at DESC
          LIMIT 50
        `
        return res.status(200).json(rows)
      }

      if (view === 'report-pdf') {
        const id = String(req.query.id || '')
        if (!id) return res.status(400).json({ error: 'id required' })
        const rows = await sql`
          SELECT pdf_content, pdf_sha256, verification_token, period_id, framework_id
          FROM report_artifacts
          WHERE id = ${id} AND org_id = ${orgId}
        ` as Array<{ pdf_content: Buffer; pdf_sha256: string; verification_token: string; period_id: string; framework_id: string }>
        if (rows.length === 0) return res.status(404).json({ error: 'Report not found' })
        const { pdf_content } = rows[0]
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `inline; filename="report-${rows[0].framework_id}-${rows[0].verification_token}.pdf"`)
        res.setHeader('X-Report-Sha256', rows[0].pdf_sha256)
        res.setHeader('X-Verification-Token', rows[0].verification_token)
        res.status(200).end(Buffer.from(pdf_content))
        return
      }

      if (view === 'report-docx') {
        // DOCX renderer — gated reports.view, mirrors the PDF data path.
        const gate = await requirePermission(req, res, 'reports.view')
        if (!gate) return
        const id = String(req.query.id || '')
        if (!id) return res.status(400).json({ error: 'id required' })
        try {
          const { generateDocx } = await import('./_reportDocx.js')
          const out = await generateDocx({ orgId, reportArtifactId: id })
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
          res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`)
          res.setHeader('X-Report-Sha256', out.sha256)
          res.status(200).end(out.bytes)
          return
        } catch (e) {
          return res.status(500).json({ error: e instanceof Error ? e.message : 'DOCX render failed' })
        }
      }

      if (view === 'assurance-requests') {
        const period_id = req.query.period_id ? String(req.query.period_id) : null
        const rows = period_id
          ? await sql`
              SELECT id, period_id, auditor_name, auditor_email, auditor_firm,
                     opinion_type, isae_reference, signed_by, signed_at, status,
                     requested_at, upload_token IS NOT NULL AS has_upload_link,
                     statement_sha256, notes
              FROM assurance_requests WHERE org_id = ${orgId} AND period_id = ${period_id}
              ORDER BY requested_at DESC
            `
          : await sql`
              SELECT id, period_id, auditor_name, auditor_email, auditor_firm,
                     opinion_type, isae_reference, signed_by, signed_at, status,
                     requested_at, upload_token IS NOT NULL AS has_upload_link,
                     statement_sha256, notes
              FROM assurance_requests WHERE org_id = ${orgId}
              ORDER BY requested_at DESC
            `
        return res.status(200).json(rows)
      }

      // ─── Historical reference panel (for data-entry sidebar) ─────
      if (view === 'historical-reference') {
        const questionnaire_item_id = String(req.query.questionnaire_item_id || '')
        const entity_id = req.query.entity_id ? String(req.query.entity_id) : null
        if (!questionnaire_item_id) return res.status(400).json({ error: 'questionnaire_item_id required' })

        // Resolve the scope item (for the unit + line_item meta) and all siblings that share the code.
        // Historical values are per-item and may be seeded across subsidiaries; we return the row set.
        const qiMeta = await sql`
          SELECT id, gri_code, line_item, unit, section, subsection, reporting_scope, target_fy2026,
                 definition, calc_method, cadence, data_owner_role, reviewer_role, approver_role
          FROM questionnaire_item WHERE id = ${questionnaire_item_id}
        ` as Array<{
          id: string; gri_code: string; line_item: string; unit: string | null;
          section: string | null; subsection: string | null; reporting_scope: string | null;
          target_fy2026: number | null;
          definition: string | null; calc_method: string | null; cadence: string | null;
          data_owner_role: string | null; reviewer_role: string | null; approver_role: string | null;
        }>
        if (qiMeta.length === 0) return res.status(404).json({ error: 'questionnaire_item not found' })
        const meta = qiMeta[0]

        const history = await sql`
          SELECT year, value, source_report, confidence_score
          FROM historical_value
          WHERE questionnaire_item_id = ${questionnaire_item_id}
          ORDER BY year ASC
        ` as Array<{ year: number; value: string; source_report: string | null; confidence_score: string | null }>

        // Peer intensities — if an entity_id was supplied, look up approved values from sibling entities for the same gri_code.
        let peers: Array<{ entity_id: string; entity_name: string; value: number }> = []
        if (entity_id) {
          const peerRows = await sql`
            SELECT qa.entity_id, oe.name AS entity_name, qa.value::float AS value
            FROM question_assignments qa
            JOIN org_entities oe ON oe.id = qa.entity_id
            WHERE qa.org_id = ${orgId}
              AND qa.gri_code = ${meta.gri_code}
              AND qa.status IN ('approved','reviewed','submitted')
              AND qa.entity_id != ${entity_id}
              AND qa.value IS NOT NULL
              AND qa.response_type != 'narrative'
          ` as Array<{ entity_id: string; entity_name: string; value: number }>
          peers = peerRows
        }

        return res.status(200).json({
          meta,
          history: history.map(h => ({ year: h.year, value: Number(h.value), source_report: h.source_report, confidence_score: h.confidence_score ? Number(h.confidence_score) : null })),
          peers,
        })
      }

      // ─── Live anomaly scan — scoped to role ────────────────────────
      if (view === 'anomaly-scan') {
        const scope = String(req.query.scope || 'role')  // 'role' | 'all' | 'mine' | 'entity:<id>'
        const includeSuppressed = String(req.query.include_suppressed || '0') === '1'
        const limit = Math.min(Number(req.query.limit ?? 100), 500)

        // Resolve caller's role + accessible entities
        const meRows = await sql`SELECT email, preferred_framework_id FROM users WHERE id = ${token.sub}` as Array<{ email: string; preferred_framework_id: string | null }>
        const callerEmail = (meRows[0]?.email ?? token.email ?? '').toLowerCase()

        // Pull assignments (always scope by org). 'mine' narrows to my email.
        const assignments = scope === 'mine'
          ? await sql`
              SELECT qa.id, qa.questionnaire_item_id, qa.entity_id, oe.name AS entity_name,
                     qa.gri_code, qa.line_item, qa.unit, qa.value::float AS value,
                     qa.response_type, qa.narrative_body, qa.status, qa.evidence_ids,
                     qa.due_date, qa.last_updated
              FROM question_assignments qa
              JOIN org_entities oe ON oe.id = qa.entity_id
              WHERE qa.org_id = ${orgId}
                AND lower(qa.assignee_email) = ${callerEmail}
                AND qa.status IN ('in_progress','submitted','reviewed','approved')
              ORDER BY qa.last_updated DESC NULLS LAST
              LIMIT 400
            `
          : await sql`
              SELECT qa.id, qa.questionnaire_item_id, qa.entity_id, oe.name AS entity_name,
                     qa.gri_code, qa.line_item, qa.unit, qa.value::float AS value,
                     qa.response_type, qa.narrative_body, qa.status, qa.evidence_ids,
                     qa.due_date, qa.last_updated
              FROM question_assignments qa
              JOIN org_entities oe ON oe.id = qa.entity_id
              WHERE qa.org_id = ${orgId}
                AND qa.status IN ('submitted','reviewed','approved')
              ORDER BY qa.last_updated DESC NULLS LAST
              LIMIT 600
            ` as Array<{
              id: string; questionnaire_item_id: string; entity_id: string; entity_name: string
              gri_code: string; line_item: string; unit: string | null; value: number | null
              response_type: string | null; narrative_body: string | null; status: string
              evidence_ids: string[] | null; due_date: string | null; last_updated: string | null
            }>

        if (assignments.length === 0) {
          // Always return the full AnomalyScanResult shape so the client
          // doesn't have to defend against missing keys.
          return res.status(200).json({
            anomalies: [],
            total: 0,
            summary: {
              total: 0, critical: 0, warn: 0, info: 0,
              suppressed_total: 0,
              by_type: {},
            },
          })
        }

        // Historical values for the relevant items (one query).
        const itemIds = Array.from(new Set((assignments as AssignmentLike[]).map(a => a.questionnaire_item_id)))
        const historyRows = itemIds.length > 0
          ? await sql`
              SELECT questionnaire_item_id, year, value::float AS value
              FROM historical_value
              WHERE questionnaire_item_id = ANY(${itemIds}::uuid[])
            ` as Array<{ questionnaire_item_id: string; year: number; value: number }>
          : []
        const historyByItem = new Map<string, HistoricalPoint[]>()
        for (const h of historyRows) {
          const arr = historyByItem.get(h.questionnaire_item_id) ?? []
          arr.push({ questionnaire_item_id: h.questionnaire_item_id, year: h.year, value: Number(h.value) })
          historyByItem.set(h.questionnaire_item_id, arr)
        }

        // Peer intensity map — per gri_code, collect all approved values across entities.
        const peerByCode = new Map<string, number[]>()
        for (const a of assignments as AssignmentLike[]) {
          if (a.value == null || a.status !== 'approved') continue
          const arr = peerByCode.get(a.gri_code) ?? []
          arr.push(Number(a.value))
          peerByCode.set(a.gri_code, arr)
        }

        // Run rules — dynamic-import the engine so the cold-start cost only
        // hits the anomaly-scan view, not every plain GET to /api/org.
        const { detectAnomaliesForAssignment } = await loadAnomalies()
        const detected: Anomaly[] = []
        for (const a of assignments as AssignmentLike[]) {
          const history = historyByItem.get(a.questionnaire_item_id) ?? []
          const peers = (peerByCode.get(a.gri_code) ?? []).filter(v => v !== Number(a.value ?? NaN))
          detected.push(...detectAnomaliesForAssignment(a, history, peers))
        }

        // Attach suppressions
        const suppressions = await sql`
          SELECT asg.assignment_id, asg.anomaly_type, asg.reason, asg.suppressed_at, u.name AS suppressed_by_name
          FROM anomaly_suppressions asg
          LEFT JOIN users u ON u.id = asg.suppressed_by
          WHERE asg.org_id = ${orgId}
        ` as Array<{ assignment_id: string; anomaly_type: string; reason: string; suppressed_at: string; suppressed_by_name: string }>
        const supMap = new Map<string, { by: string; reason: string; at: string }>()
        for (const s of suppressions) supMap.set(`${s.assignment_id}|${s.anomaly_type}`, { by: s.suppressed_by_name, reason: s.reason, at: s.suppressed_at })

        let results = detected.map(d => ({ ...d, suppressed: supMap.get(d.id) }))
        if (!includeSuppressed) results = results.filter(d => !d.suppressed)

        // Sort: critical > warn > info, newest first (coerce dates to ISO strings)
        const sev = { critical: 0, warn: 1, info: 2 } as const
        const toIso = (v: unknown): string => {
          if (!v) return ''
          if (typeof v === 'string') return v
          if (v instanceof Date) return v.toISOString()
          return String(v)
        }
        for (const r of results) {
          r.last_updated = toIso(r.last_updated)
          r.due_date = toIso(r.due_date)
        }
        results.sort((a, b) => {
          if (sev[a.severity] !== sev[b.severity]) return sev[a.severity] - sev[b.severity]
          return (b.last_updated ?? '').localeCompare(a.last_updated ?? '')
        })

        // Summary counts for the feed header
        const summary = {
          total: results.length,
          critical: results.filter(r => r.severity === 'critical').length,
          warn: results.filter(r => r.severity === 'warn').length,
          info: results.filter(r => r.severity === 'info').length,
          suppressed_total: suppressions.length,
          by_type: results.reduce<Record<string, number>>((acc, r) => { acc[r.anomaly_type] = (acc[r.anomaly_type] ?? 0) + 1; return acc }, {}),
        }

        return res.status(200).json({ anomalies: results.slice(0, limit), total: results.length, summary })
      }

      if (view === 'assurance-upload-link') {
        const id = String(req.query.id || '')
        if (!id) return res.status(400).json({ error: 'id required' })
        const rows = await sql`
          SELECT upload_token FROM assurance_requests WHERE id = ${id} AND org_id = ${orgId}
        ` as Array<{ upload_token: string | null }>
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
        if (!rows[0].upload_token) return res.status(409).json({ error: 'Upload link is no longer active (statement already signed or request withdrawn)' })
        return res.status(200).json({ upload_token: rows[0].upload_token })
      }

      return res.status(400).json({ error: `Unknown view: ${view}` })
    }

    if (req.method === 'POST') {
      const action = String(req.body?.action || '')

      // ─── Workspace reset ──────────────────────────────────
      // DESTRUCTIVE: wipes the workspace's onboarding data so it can be
      // re-seeded for a fresh demo. Preserves the org row, users, roles,
      // questionnaire catalogue, and audit trail. Admin-only.
      if (action === 'reset-workspace') {
        // Destructive workspace wipe → admin-only.
        const gate = await requirePermission(req, res, 'admin.org')
        if (!gate) return
        const confirm = String(req.body?.confirm ?? '')
        if (confirm !== 'RESET') {
          return res.status(400).json({ error: 'Confirmation required (send confirm: "RESET").' })
        }
        // Best-effort cascade. Most child tables FK to org_entities with
        // ON DELETE CASCADE, but we delete explicitly so the result is
        // predictable across schema versions.
        await sql`DELETE FROM assurance_requests       WHERE org_id = ${orgId}`.catch(() => {})
        await sql`DELETE FROM published_reports        WHERE org_id = ${orgId}`.catch(() => {})
        await sql`DELETE FROM question_assignments     WHERE org_id = ${orgId}`.catch(() => {})
        await sql`DELETE FROM reporting_periods        WHERE org_id = ${orgId}`.catch(() => {})
        await sql`DELETE FROM material_topics          WHERE org_id = ${orgId}`.catch(() => {})
        await sql`DELETE FROM org_targets              WHERE org_id = ${orgId}`.catch(() => {})
        await sql`DELETE FROM org_members              WHERE org_id = ${orgId}`.catch(() => {})
        await sql`DELETE FROM org_entities             WHERE org_id = ${orgId}`.catch(() => {})
        return res.status(200).json({ ok: true })
      }

      // ─── Saved views ──────────────────────────────────────
      if (action === 'save-view') {
        const page = String(req.body?.page ?? '').slice(0, 100)
        const name = String(req.body?.name ?? '').trim().slice(0, 200)
        const filters = req.body?.filters
        const isShared = Boolean(req.body?.is_shared)
        const isDefault = Boolean(req.body?.is_default)
        if (!page || !name) return res.status(400).json({ error: 'page and name required' })
        if (filters === undefined || filters === null) return res.status(400).json({ error: 'filters required' })
        // If user sets a new default, clear other defaults for (user, page).
        if (isDefault) {
          await sql`UPDATE saved_views SET is_default = false WHERE user_id = ${token.sub} AND page = ${page}`
        }
        const rows = await sql`
          INSERT INTO saved_views (org_id, user_id, page, name, filters, is_shared, is_default)
          VALUES (${orgId}, ${token.sub}, ${page}, ${name}, ${JSON.stringify(filters)}::jsonb, ${isShared}, ${isDefault})
          RETURNING id, page, name, filters, is_default, is_shared, user_id, created_at, updated_at
        ` as Array<Record<string, unknown>>
        const r = rows[0]
        return res.status(201).json({ ...r, owned_by_me: true })
      }
      if (action === 'delete-saved-view') {
        const id = String(req.body?.id ?? '')
        if (!id) return res.status(400).json({ error: 'id required' })
        // Only the owner can delete. Shared views remain visible to others.
        const del = await sql`
          DELETE FROM saved_views WHERE id = ${id} AND user_id = ${token.sub} AND org_id = ${orgId}
          RETURNING id
        ` as Array<{ id: string }>
        if (del.length === 0) return res.status(404).json({ error: 'Not found' })
        return res.status(200).json({ ok: true })
      }

      // ─── Anomaly status ───────────────────────────────────
      if (action === 'update-anomaly-status') {
        const gate = await requirePermission(req, res, 'analytics.view')
        if (!gate) return
        const key = String(req.body?.anomaly_key ?? '').slice(0, 400)
        const status = String(req.body?.status ?? '')
        const note = req.body?.note ? String(req.body.note).slice(0, 2000) : null
        const allowed = ['open', 'investigating', 'resolved', 'dismissed']
        if (!key) return res.status(400).json({ error: 'anomaly_key required' })
        if (!allowed.includes(status)) return res.status(400).json({ error: 'status must be one of ' + allowed.join(', ') })
        const rows = await sql`
          INSERT INTO anomaly_status (org_id, anomaly_key, status, note, changed_by)
          VALUES (${orgId}, ${key}, ${status}, ${note}, ${token.sub})
          ON CONFLICT (org_id, anomaly_key) DO UPDATE
            SET status = EXCLUDED.status, note = EXCLUDED.note,
                changed_by = EXCLUDED.changed_by, changed_at = now()
          RETURNING id, anomaly_key, status, note, changed_at
        ` as Array<Record<string, unknown>>
        await audit({
          orgId, userId: token.sub, action: 'anomaly.status_change',
          resourceType: 'anomaly', resourceId: key,
          details: { status, note }, ip: auditIp(req),
        })
        return res.status(200).json(rows[0])
      }

      // ─── Public report share links ────────────────────────
      if (action === 'create-share-link') {
        const gate = await requirePermission(req, res, 'reports.publish')
        if (!gate) return
        const reportId = req.body?.reportId ? String(req.body.reportId) : null
        const expiresInDays = Number(req.body?.expiresInDays ?? 0)
        const password = req.body?.password ? String(req.body.password) : null
        const token_str = crypto.randomBytes(24).toString('base64url')
        let passwordHash: string | null = null
        if (password) {
          const bcrypt = await import('bcryptjs')
          passwordHash = await bcrypt.default.hash(password, 10)
        }
        const expiresAt = expiresInDays > 0
          ? new Date(Date.now() + expiresInDays * 86400_000).toISOString()
          : null
        const rows = await sql`
          INSERT INTO report_share_links (org_id, report_id, token, expires_at, password_hash, created_by)
          VALUES (${orgId}, ${reportId}, ${token_str}, ${expiresAt}, ${passwordHash}, ${token.sub})
          RETURNING id, token, expires_at, created_at
        ` as Array<{ id: string; token: string; expires_at: string | null; created_at: string }>
        const r = rows[0]
        await audit({
          orgId, userId: token.sub, action: 'report.share_link_created',
          resourceType: 'report', resourceId: reportId,
          details: { share_id: r.id, expires_at: r.expires_at, password_protected: !!passwordHash },
          ip: auditIp(req),
        })
        return res.status(201).json({
          id: r.id,
          token: r.token,
          url: `/public/report/${r.token}`,
          expires_at: r.expires_at,
          created_at: r.created_at,
        })
      }
      if (action === 'revoke-share-link') {
        const gate = await requirePermission(req, res, 'reports.publish')
        if (!gate) return
        const id = String(req.body?.id ?? '')
        if (!id) return res.status(400).json({ error: 'id required' })
        await sql`UPDATE report_share_links SET is_active = false WHERE id = ${id} AND org_id = ${orgId}`
        return res.status(200).json({ ok: true })
      }

      // ─── Entities ─────────────────────────────────────────
      if (action === 'add-entity') {
        // Org-tree mutation → admin.org.
        const gate = await requirePermission(req, res, 'admin.org')
        if (!gate) return
        try { entityActionSchema.parse(req.body) } catch (e) {
          if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
          throw e
        }
        const { parent_id, type, name, code, country, equity, industry } = req.body
        if (!type || !name) return res.status(400).json({ error: 'type and name required' })
        const created = await sql`
          INSERT INTO org_entities (org_id, parent_id, type, name, code, country, equity, industry)
          VALUES (${orgId}, ${parent_id || null}, ${type}, ${name}, ${code || null}, ${country || null}, ${equity ?? null}, ${industry || null})
          RETURNING id, parent_id, type, name, code, country, equity, industry, created_at
        `
        return res.status(201).json(created[0])
      }
      if (action === 'update-entity') {
        // Org-tree mutation → admin.org.
        const gate = await requirePermission(req, res, 'admin.org')
        if (!gate) return
        try { entityActionSchema.parse(req.body) } catch (e) {
          if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
          throw e
        }
        const { id, name, code, country, equity, industry, parent_id } = req.body
        if (!id) return res.status(400).json({ error: 'id required' })
        await sql`
          UPDATE org_entities SET
            name     = COALESCE(${name}, name),
            code     = COALESCE(${code}, code),
            country  = COALESCE(${country}, country),
            equity   = COALESCE(${equity}, equity),
            industry = COALESCE(${industry}, industry),
            parent_id = COALESCE(${parent_id}, parent_id)
          WHERE id = ${id} AND org_id = ${orgId}
        `
        return res.status(200).json({ ok: true })
      }
      if (action === 'remove-entity') {
        // Org-tree mutation → admin.org.
        const gate = await requirePermission(req, res, 'admin.org')
        if (!gate) return
        const { id } = req.body
        if (!id || !uuid.safeParse(id).success) return res.status(400).json({ error: 'valid id required' })
        // Cascade via FK ON DELETE CASCADE
        await sql`DELETE FROM org_entities WHERE id = ${id} AND org_id = ${orgId}`
        return res.status(200).json({ ok: true })
      }

      // ─── Members ──────────────────────────────────────────
      if (action === 'add-member') {
        // Membership mutation → admin.users.
        const gate = await requirePermission(req, res, 'admin.users')
        if (!gate) return
        try { memberActionSchema.parse(req.body) } catch (e) {
          if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
          throw e
        }
        const { entity_id, email, name, role, user_id } = req.body
        if (!entity_id || !email || !name || !role) return res.status(400).json({ error: 'entity_id, email, name, role required' })
        const created = await sql`
          INSERT INTO org_members (org_id, user_id, entity_id, email, name, role)
          VALUES (${orgId}, ${user_id || null}, ${entity_id}, ${email.toLowerCase().trim()}, ${name}, ${role})
          ON CONFLICT (org_id, email, entity_id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
          RETURNING id, user_id, entity_id, email, name, role, created_at
        `
        return res.status(201).json(created[0])
      }
      if (action === 'remove-member') {
        // Membership mutation → admin.users.
        const gate = await requirePermission(req, res, 'admin.users')
        if (!gate) return
        const { id } = req.body
        if (!id || !uuid.safeParse(id).success) return res.status(400).json({ error: 'valid id required' })
        await sql`DELETE FROM org_members WHERE id = ${id} AND org_id = ${orgId}`
        return res.status(200).json({ ok: true })
      }

      // ─── Assignments ──────────────────────────────────────
      if (action === 'add-assignment') {
        // Assignment creation → admin.users (treat like assignment-management).
        const gate = await requirePermission(req, res, 'admin.users')
        if (!gate) return
        const {
          framework_id, question_id, gri_code, line_item, unit,
          entity_id, assignee_email, assignee_name, assignee_user_id,
          entry_modes, due_date, assigned_by, response_type, period_id,
        } = req.body
        if (!question_id || !gri_code || !entity_id || !assignee_email) {
          return res.status(400).json({ error: 'question_id, gri_code, entity_id, assignee_email required' })
        }
        if (!uuid.safeParse(question_id).success || !uuid.safeParse(entity_id).success) {
          return res.status(400).json({ error: 'question_id and entity_id must be UUIDs' })
        }
        if (!emailStr.safeParse(assignee_email).success) {
          return res.status(400).json({ error: 'assignee_email must be a valid email' })
        }
        // Resolve period_id — default to active period for this framework if not provided
        let resolvedPeriodId = period_id
        if (!resolvedPeriodId) {
          const activeRows = await sql`SELECT id FROM reporting_periods WHERE org_id = ${orgId} AND framework_id = ${framework_id || 'gri'} AND status = 'active' ORDER BY year DESC LIMIT 1` as Array<{ id: string }>
          resolvedPeriodId = activeRows[0]?.id ?? null
        }
        const created = await sql`
          INSERT INTO question_assignments
            (org_id, framework_id, questionnaire_item_id, gri_code, line_item, unit,
             entity_id, assignee_email, assignee_name, assignee_user_id,
             entry_modes, due_date, assigned_by, response_type, period_id)
          VALUES
            (${orgId}, ${framework_id || 'gri'}, ${question_id}, ${gri_code}, ${line_item}, ${unit || null},
             ${entity_id}, ${assignee_email.toLowerCase().trim()}, ${assignee_name || assignee_email}, ${assignee_user_id || null},
             ${JSON.stringify(entry_modes || ['Manual'])}::jsonb, ${due_date || null}, ${assigned_by || token.email},
             ${response_type || 'numeric'}, ${resolvedPeriodId})
          RETURNING id, framework_id, questionnaire_item_id AS question_id, gri_code, line_item,
                    unit, entity_id, assignee_email, assignee_name, assignee_user_id,
                    entry_modes, used_mode, due_date, status, value, comment, evidence_ids,
                    response_type, narrative_body, period_id, disclosure_position,
                    formula,
                    assigned_by, assigned_at, last_updated
        `
        // Emit "you've been assigned" notification (DB row + email)
        await notify({
          orgId,
          userId: assignee_user_id || null,
          toEmail: assignee_email.toLowerCase().trim(),
          kind: 'assignment_created',
          subject: `New assignment · ${gri_code}`,
          body: `${line_item} — due ${due_date || 'TBD'}`,
          route: '/my-tasks',
          relatedAssignmentId: created[0].id,
        })
        // Chain append
        await appendChainRecord(sql, orgId, {
          record_type: 'assignment_created',
          reference_id: created[0].id,
          event_type: 'Submitted',
          facility_name: line_item,
          metadata: { gri_code, assignee_email, entity_id, framework_id: framework_id || 'gri', actor: token.email },
        })
        await audit({
          orgId,
          userId: token.sub,
          action: 'assignment.create',
          resourceType: 'assignment',
          resourceId: created[0].id,
          details: {
            framework_id: framework_id || 'gri',
            gri_code,
            line_item,
            assignee_email: assignee_email.toLowerCase().trim(),
            entity_id,
            due_date: due_date ?? null,
          },
          ip: auditIp(req),
        })
        return res.status(201).json(created[0])
      }
      if (action === 'bulk-add-assignments') {
        // Bulk fan-out of question_assignments — used during setup so an admin
        // can hand "all ESRS E1 to Jane" in one click. Caps at 500 items/call
        // so a typo doesn't fan out the entire questionnaire by mistake.
        const gate = await requirePermission(req, res, 'admin.users')
        if (!gate) return
        const bulkSchema = z.object({
          framework_id: z.string().min(1).max(120),
          entity_id: uuid.optional(),
          filter: z.object({
            sections: z.array(z.string()).optional(),
            gri_codes: z.array(z.string()).optional(),
          }).optional(),
          assignee_email: emailStr,
          assignee_name: z.string().min(1).max(200),
          due_date: z.string().optional(),
          entry_modes: z.array(z.string()).optional(),
          reviewer_email: emailStr.optional(),
          approver_email: emailStr.optional(),
        })
        let body: z.infer<typeof bulkSchema>
        try { body = bulkSchema.parse(req.body) } catch (e) {
          if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
          throw e
        }

        // Pull matching questionnaire items.
        const sections = body.filter?.sections ?? []
        const gri_codes = body.filter?.gri_codes ?? []
        const items = await sql`
          SELECT DISTINCT ON (gri_code, line_item)
                 id, gri_code, line_item, unit, section
          FROM questionnaire_item
          WHERE framework_id = ${body.framework_id}
            AND (cardinality(${sections}::text[]) = 0 OR section = ANY(${sections}::text[]))
            AND (cardinality(${gri_codes}::text[]) = 0 OR gri_code = ANY(${gri_codes}::text[]))
          ORDER BY gri_code, line_item, id
        ` as Array<{ id: string; gri_code: string; line_item: string; unit: string | null; section: string | null }>

        if (items.length > 500) {
          return res.status(400).json({ error: `Bulk-assign capped at 500 items per call; resolved ${items.length}. Narrow the filter.` })
        }
        if (items.length === 0) {
          return res.status(200).json({ ok: true, totalCreated: 0, totalSkipped: 0, notificationSent: false })
        }

        // Resolve active period for the framework — assignments need one.
        const periodRows = await sql`
          SELECT id FROM reporting_periods
          WHERE org_id = ${orgId} AND framework_id = ${body.framework_id} AND status = 'active'
          ORDER BY year DESC LIMIT 1
        ` as Array<{ id: string }>
        const resolvedPeriodId = periodRows[0]?.id ?? null

        // Entity to assign against — required for question_assignments (FK).
        // If caller didn't pick one, fall back to the org's root entity.
        let entityId = body.entity_id ?? null
        if (!entityId) {
          const root = await sql`SELECT id FROM org_entities WHERE org_id = ${orgId} AND parent_id IS NULL ORDER BY created_at ASC LIMIT 1` as Array<{ id: string }>
          entityId = root[0]?.id ?? null
        }
        if (!entityId) return res.status(400).json({ error: 'entity_id required (and no root entity found to default to)' })

        // Existing assignments to skip — same questionnaire_item + entity + assignee.
        const existing = await sql`
          SELECT questionnaire_item_id
          FROM question_assignments
          WHERE org_id = ${orgId}
            AND entity_id = ${entityId}
            AND lower(assignee_email) = ${body.assignee_email.toLowerCase()}
            AND questionnaire_item_id = ANY(${items.map(i => i.id)}::uuid[])
        ` as Array<{ questionnaire_item_id: string }>
        const skipSet = new Set(existing.map(r => r.questionnaire_item_id))

        const toCreate = items.filter(i => !skipSet.has(i.id))
        const assigneeEmail = body.assignee_email.toLowerCase().trim()
        const assigneeName = body.assignee_name
        const entryModesJson = JSON.stringify(body.entry_modes ?? ['Manual'])
        const dueDate = body.due_date ?? null

        // Batch insert (1 round-trip per row keeps it simple; cap is 500 so
        // worst-case it's 500 small inserts — Neon HTTP can handle this easily
        // and we get clear per-row errors).
        let created = 0
        for (const it of toCreate) {
          try {
            await sql`
              INSERT INTO question_assignments
                (org_id, framework_id, questionnaire_item_id, gri_code, line_item, unit,
                 entity_id, assignee_email, assignee_name,
                 entry_modes, due_date, assigned_by, response_type, period_id)
              VALUES
                (${orgId}, ${body.framework_id}, ${it.id}, ${it.gri_code}, ${it.line_item}, ${it.unit},
                 ${entityId}, ${assigneeEmail}, ${assigneeName},
                 ${entryModesJson}::jsonb, ${dueDate}, ${token.email}, 'numeric', ${resolvedPeriodId})
            `
            created += 1
          } catch {
            // FK or constraint failure on a single row — skip and continue.
          }
        }

        // Optional reviewer/approver fan-out — uses workflow_role_assignment
        // (per-item × role × user). Maps reviewer→TL, approver→SO to match the
        // existing enum. Resolves the user_id via email before insert; skips
        // silently when the user isn't on the org yet.
        const resolveUserId = async (email: string): Promise<string | null> => {
          const rows = await sql`SELECT id FROM users WHERE lower(email) = ${email.toLowerCase().trim()} LIMIT 1` as Array<{ id: string }>
          return rows[0]?.id ?? null
        }
        const fanOutRole = async (email: string, role: 'TL' | 'SO') => {
          const uid = await resolveUserId(email)
          if (!uid) return
          for (const it of toCreate) {
            await sql`
              INSERT INTO workflow_role_assignment (user_id, questionnaire_item_id, section, workflow_role, assigned_by)
              VALUES (${uid}, ${it.id}, ${it.section}, ${role}, ${token.sub})
              ON CONFLICT DO NOTHING
            `.catch(() => { /* schema drift safe */ })
          }
        }
        if (body.reviewer_email) await fanOutRole(body.reviewer_email, 'TL')
        if (body.approver_email) await fanOutRole(body.approver_email, 'SO')

        // One summary notification (DB row + email) rather than N per-row.
        let notificationSent = false
        if (created > 0) {
          await notify({
            orgId,
            toEmail: assigneeEmail,
            kind: 'assignment_bulk_created',
            subject: `${created} ${body.framework_id.toUpperCase()} item${created === 1 ? '' : 's'} assigned to you`,
            body: `You've been assigned ${created} disclosures${dueDate ? `, due ${dueDate}` : ''}. Open My Tasks to start entering data.`,
            route: '/my-tasks',
          })
          notificationSent = true
        }

        return res.status(200).json({
          ok: true,
          totalCreated: created,
          totalSkipped: items.length - created,
          notificationSent,
        })
      }
      if (action === 'update-assignment') {
        // update-assignment is multi-purpose: the original assignee enters data
        // (and progresses status), reviewers/approvers transition status, admins
        // may also tweak metadata. Gate by *role* against the prior row.
        const loaded = await import('./_auth.js').then(m => m.loadPermissions(token))
        if (!loaded) return res.status(401).json({ error: 'User not found' })
        const { id, patch } = req.body
        if (!id || !patch) return res.status(400).json({ error: 'id and patch required' })
        if (!uuid.safeParse(id).success) return res.status(400).json({ error: 'id must be a UUID' })
        // Capture previous status + period lock so we can enforce write gates.
        const priorRows = await sql`
          SELECT qa.status, qa.assignee_email, qa.assignee_name, qa.gri_code, qa.line_item, qa.entity_id,
                 qa.period_id, rp.status AS period_status
          FROM question_assignments qa
          LEFT JOIN reporting_periods rp ON rp.id = qa.period_id
          WHERE qa.id = ${id} AND qa.org_id = ${orgId}
        ` as Array<{ status: string; assignee_email: string; assignee_name: string; gri_code: string; line_item: string; entity_id: string; period_id: string | null; period_status: string | null }>
        if (priorRows.length === 0) return res.status(404).json({ error: 'Assignment not found' })
        const prior = priorRows[0]

        // Authorisation: caller is allowed if any of:
        //   • the original assignee (entering / submitting their own data)
        //   • workflow.approve / data.approve permission (reviewers/approvers)
        //   • admin.users (admin re-assigns / edits metadata)
        const callerEmail = (token.email || '').toLowerCase()
        const isAssignee = callerEmail === (prior.assignee_email || '').toLowerCase()
        const canWorkflow = loaded.permissions.has('workflow.approve') || loaded.permissions.has('data.approve')
        const isAdmin = loaded.permissions.has('admin.users') || loaded.permissions.has('admin.org')
        if (!isAssignee && !canWorkflow && !isAdmin) {
          return res.status(403).json({ error: 'Forbidden' })
        }

        // ── Period-lock: once a period is locked or published, nothing in it can change. ──
        if (prior.period_status === 'locked' || prior.period_status === 'published') {
          return res.status(423).json({ error: `Reporting period is ${prior.period_status}. No further edits allowed.` })
        }

        // ── Status-lock: once submitted/reviewed/approved, data fields are frozen. ──
        // Only status transitions (review actions) and review `comment` are accepted.
        const DATA_FIELDS = ['value', 'unit', 'narrative_body', 'evidence_ids', 'used_mode', 'entry_modes', 'formula'] as const
        const isFrozen = prior.status === 'submitted' || prior.status === 'reviewed' || prior.status === 'approved'
        if (isFrozen) {
          const attempted = DATA_FIELDS.filter(f => patch[f] !== undefined)
          if (attempted.length > 0) {
            return res.status(409).json({
              error: `Assignment is '${prior.status}'. Fields ${attempted.join(', ')} are frozen. Reject it back to 'in_progress' to edit.`,
            })
          }
        }

        if (patch.status !== undefined)     await sql`UPDATE question_assignments SET status = ${patch.status}, last_updated = now() WHERE id = ${id} AND org_id = ${orgId}`
        if (patch.value !== undefined)      await sql`UPDATE question_assignments SET value = ${patch.value}, last_updated = now() WHERE id = ${id} AND org_id = ${orgId}`
        if (patch.unit !== undefined)       await sql`UPDATE question_assignments SET unit = ${patch.unit}, last_updated = now() WHERE id = ${id} AND org_id = ${orgId}`
        if (patch.comment !== undefined)    await sql`UPDATE question_assignments SET comment = ${patch.comment}, last_updated = now() WHERE id = ${id} AND org_id = ${orgId}`
        if (patch.used_mode !== undefined)  await sql`UPDATE question_assignments SET used_mode = ${patch.used_mode}, last_updated = now() WHERE id = ${id} AND org_id = ${orgId}`
        if (patch.due_date !== undefined)   await sql`UPDATE question_assignments SET due_date = ${patch.due_date}, last_updated = now() WHERE id = ${id} AND org_id = ${orgId}`
        if (patch.narrative_body !== undefined) await sql`UPDATE question_assignments SET narrative_body = ${patch.narrative_body}, last_updated = now() WHERE id = ${id} AND org_id = ${orgId}`
        if (patch.evidence_ids !== undefined) {
          await sql`UPDATE question_assignments SET evidence_ids = ${JSON.stringify(patch.evidence_ids)}::jsonb, last_updated = now() WHERE id = ${id} AND org_id = ${orgId}`
        }
        if (patch.entry_modes !== undefined) {
          await sql`UPDATE question_assignments SET entry_modes = ${JSON.stringify(patch.entry_modes)}::jsonb, last_updated = now() WHERE id = ${id} AND org_id = ${orgId}`
        }
        // Formula text — raw `=...` string entered in the spreadsheet. Null
        // (or omitted) means the cell is a plain numeric value. We accept any
        // string; HyperFormula validation already ran client-side and stored
        // the computed result in `value`, so the server is just a passthrough.
        if (patch.formula !== undefined) {
          const formulaText = patch.formula === null
            ? null
            : (typeof patch.formula === 'string' && patch.formula.trim().startsWith('=') ? patch.formula : null)
          await sql`UPDATE question_assignments SET formula = ${formulaText}, last_updated = now() WHERE id = ${id} AND org_id = ${orgId}`
        }

        // ── Notification + chain-record on status transitions ──
        if (patch.status !== undefined && patch.status !== prior.status) {
          await emitStatusTransitionNotifications(sql, orgId, id, prior, patch.status, token.email, patch.comment)
          const eventType = patch.status === 'approved' ? 'Approved'
            : patch.status === 'rejected' ? 'Corrected'
            : patch.status === 'submitted' ? 'Submitted'
            : patch.status === 'reviewed' ? 'Submitted'
            : 'Submitted'
          await appendChainRecord(sql, orgId, {
            record_type: `assignment_${patch.status}`,
            reference_id: id,
            event_type: eventType,
            facility_name: prior.line_item,
            metadata: {
              gri_code: prior.gri_code,
              prior_status: prior.status,
              new_status: patch.status,
              value: patch.value,
              actor: token.email,
              comment: patch.comment,
            },
          })
        }

        const rows = await sql`
          SELECT id, framework_id, questionnaire_item_id AS question_id, gri_code, line_item,
                 unit, entity_id, assignee_email, assignee_name, assignee_user_id,
                 entry_modes, used_mode, due_date, status, value, comment, evidence_ids,
                 response_type, narrative_body, period_id, disclosure_position,
                 formula,
                 assigned_by, assigned_at, last_updated
          FROM question_assignments WHERE id = ${id} AND org_id = ${orgId}
        `
        return res.status(200).json(rows[0] ?? null)
      }
      if (action === 'remove-assignment') {
        // Assignment removal → admin.users.
        const gate = await requirePermission(req, res, 'admin.users')
        if (!gate) return
        const { id } = req.body
        if (!id || !uuid.safeParse(id).success) return res.status(400).json({ error: 'valid id required' })
        await sql`DELETE FROM question_assignments WHERE id = ${id} AND org_id = ${orgId}`
        return res.status(200).json({ ok: true })
      }

      // ─── Framework enablement (per-tenant) ───────────
      if (action === 'enable-framework') {
        // Per-tenant framework toggle → admin.org.
        const gate = await requirePermission(req, res, 'admin.org')
        if (!gate) return
        const { framework_id } = req.body
        if (!framework_id) return res.status(400).json({ error: 'framework_id required' })
        await sql`
          INSERT INTO org_framework_enablement (org_id, framework_id, enabled, enabled_by)
          VALUES (${orgId}, ${framework_id}, true, ${token.sub})
          ON CONFLICT (org_id, framework_id) DO UPDATE SET enabled = true, enabled_at = now(), enabled_by = EXCLUDED.enabled_by
        `
        return res.status(200).json({ ok: true })
      }
      if (action === 'disable-framework') {
        // Per-tenant framework toggle → admin.org.
        const gate = await requirePermission(req, res, 'admin.org')
        if (!gate) return
        const { framework_id } = req.body
        if (!framework_id) return res.status(400).json({ error: 'framework_id required' })
        await sql`
          UPDATE org_framework_enablement SET enabled = false
          WHERE org_id = ${orgId} AND framework_id = ${framework_id}
        `
        return res.status(200).json({ ok: true })
      }
      // ─── Targets (SBTi etc.) ─────────────────────────
      if (action === 'upsert-target') {
        // Target mgmt → admin.org.
        const gate = await requirePermission(req, res, 'admin.org')
        if (!gate) return
        const { id, framework_id, kind, label, scope_coverage, baseline_year, baseline_value, baseline_unit, target_year, target_reduction_pct, status, validated_by, notes } = req.body
        if (!kind || !label || baseline_year == null || baseline_value == null || target_year == null || target_reduction_pct == null) {
          return res.status(400).json({ error: 'kind, label, baseline_year, baseline_value, target_year, target_reduction_pct required' })
        }
        if (id) {
          await sql`
            UPDATE org_targets SET
              label = ${label}, scope_coverage = ${scope_coverage || ''},
              baseline_year = ${baseline_year}, baseline_value = ${baseline_value}, baseline_unit = ${baseline_unit || 'tCO2e'},
              target_year = ${target_year}, target_reduction_pct = ${target_reduction_pct},
              status = ${status || 'committed'}, validated_by = ${validated_by || null}, notes = ${notes || null},
              updated_at = now()
            WHERE id = ${id} AND org_id = ${orgId}
          `
          return res.status(200).json({ ok: true, id })
        }
        const rows = await sql`
          INSERT INTO org_targets (org_id, framework_id, kind, label, scope_coverage, baseline_year, baseline_value, baseline_unit, target_year, target_reduction_pct, status, validated_by, notes)
          VALUES (${orgId}, ${framework_id || 'gri'}, ${kind}, ${label}, ${scope_coverage || ''}, ${baseline_year}, ${baseline_value}, ${baseline_unit || 'tCO2e'}, ${target_year}, ${target_reduction_pct}, ${status || 'committed'}, ${validated_by || null}, ${notes || null})
          RETURNING id
        ` as Array<{ id: string }>
        return res.status(201).json({ ok: true, id: rows[0].id })
      }
      if (action === 'remove-target') {
        // Target mgmt → admin.org.
        const gate = await requirePermission(req, res, 'admin.org')
        if (!gate) return
        const { id } = req.body
        if (!id || !uuid.safeParse(id).success) return res.status(400).json({ error: 'valid id required' })
        await sql`DELETE FROM org_targets WHERE id = ${id} AND org_id = ${orgId}`
        return res.status(200).json({ ok: true })
      }

      // ─── Material topics / DMA ───────────────────────
      if (action === 'upsert-material-topic') {
        // Material-topic mgmt → admin.org.
        const gate = await requirePermission(req, res, 'admin.org')
        if (!gate) return
        const { id, framework_id, topic_name, topic_category, linked_gri_codes, impact_score, financial_score, dma_status, rationale, owner_email } = req.body
        if (!topic_name) return res.status(400).json({ error: 'topic_name required' })
        // impact_score / financial_score are INTEGER columns. Coerce floats
        // (e.g. 4.7) to int so callers can pass the natural materiality
        // matrix scale without tripping `invalid input syntax for type integer`.
        const impactInt   = impact_score   == null ? null : Math.round(Number(impact_score))
        const financialInt = financial_score == null ? null : Math.round(Number(financial_score))
        if (id) {
          await sql`
            UPDATE material_topics SET
              topic_name = ${topic_name}, topic_category = ${topic_category || null},
              linked_gri_codes = ${JSON.stringify(linked_gri_codes || [])}::jsonb,
              impact_score = ${impactInt}, financial_score = ${financialInt},
              dma_status = ${dma_status || 'identified'},
              rationale = ${rationale || null}, owner_email = ${owner_email || null},
              assessed_at = ${dma_status && dma_status !== 'identified' ? new Date().toISOString() : null}
            WHERE id = ${id} AND org_id = ${orgId}
          `
          return res.status(200).json({ ok: true, id })
        }
        const rows = await sql`
          INSERT INTO material_topics (org_id, framework_id, topic_name, topic_category, linked_gri_codes, impact_score, financial_score, dma_status, rationale, owner_email, assessed_at)
          VALUES (${orgId}, ${framework_id || 'gri'}, ${topic_name}, ${topic_category || null},
                  ${JSON.stringify(linked_gri_codes || [])}::jsonb,
                  ${impactInt}, ${financialInt}, ${dma_status || 'identified'},
                  ${rationale || null}, ${owner_email || null},
                  ${dma_status && dma_status !== 'identified' ? new Date().toISOString() : null})
          ON CONFLICT (org_id, framework_id, topic_name) DO UPDATE SET
            impact_score = EXCLUDED.impact_score, financial_score = EXCLUDED.financial_score,
            dma_status = EXCLUDED.dma_status, rationale = EXCLUDED.rationale
          RETURNING id
        ` as Array<{ id: string }>
        return res.status(201).json({ ok: true, id: rows[0]?.id })
      }
      if (action === 'remove-material-topic') {
        // Material-topic mgmt → admin.org.
        const gate = await requirePermission(req, res, 'admin.org')
        if (!gate) return
        const { id } = req.body
        if (!id || !uuid.safeParse(id).success) return res.status(400).json({ error: 'valid id required' })
        await sql`DELETE FROM material_topics WHERE id = ${id} AND org_id = ${orgId}`
        return res.status(200).json({ ok: true })
      }

      // ─── Reporting periods ──────────────────────────
      if (action === 'create-period') {
        // Period mgmt → admin.org.
        const gate = await requirePermission(req, res, 'admin.org')
        if (!gate) return
        const { framework_id, year, label, start_date, end_date, submission_deadline, notes } = req.body
        if (!year || !label) return res.status(400).json({ error: 'year and label required' })
        const rows = await sql`
          INSERT INTO reporting_periods (org_id, framework_id, year, label, status, start_date, end_date, submission_deadline, notes)
          VALUES (${orgId}, ${framework_id || 'gri'}, ${year}, ${label}, 'setup', ${start_date || null}, ${end_date || null}, ${submission_deadline || null}, ${notes || null})
          ON CONFLICT (org_id, framework_id, year) DO UPDATE SET
            label = EXCLUDED.label, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
            submission_deadline = EXCLUDED.submission_deadline, notes = EXCLUDED.notes
          RETURNING id
        ` as Array<{ id: string }>
        return res.status(201).json({ ok: true, id: rows[0].id })
      }
      if (action === 'transition-period') {
        // Period lifecycle → admin.org.
        const gate = await requirePermission(req, res, 'admin.org')
        if (!gate) return
        const { id, status } = req.body
        if (!id || !status) return res.status(400).json({ error: 'id and status required' })
        if (!uuid.safeParse(id).success) return res.status(400).json({ error: 'id must be a UUID' })
        const valid = ['setup', 'active', 'locked', 'published', 'archived']
        if (!valid.includes(status)) return res.status(400).json({ error: `status must be one of ${valid.join(', ')}` })

        // Look up period metadata for the chain record
        const periodRows = await sql`SELECT label, year FROM reporting_periods WHERE id = ${id} AND org_id = ${orgId}` as Array<{ label: string; year: number }>
        const periodMeta = periodRows[0] ?? { label: 'unknown', year: 0 }

        if (status === 'locked') {
          await sql`UPDATE reporting_periods SET status = 'locked', locked_at = now(), locked_by = ${token.sub} WHERE id = ${id} AND org_id = ${orgId}`
          await appendChainRecord(sql, orgId, {
            record_type: 'period_locked',
            reference_id: id,
            event_type: 'Anchored',
            facility_name: periodMeta.label,
            metadata: { label: periodMeta.label, year: periodMeta.year, actor: token.email },
          })
        } else if (status === 'published') {
          // Use the current chain tip hash as the publish_hash — this cryptographically
          // binds the published report to the full history of every assignment/status change.
          const { data_hash } = await appendChainRecord(sql, orgId, {
            record_type: 'period_published',
            reference_id: id,
            event_type: 'Report Generated',
            facility_name: periodMeta.label,
            metadata: { label: periodMeta.label, year: periodMeta.year, actor: token.email },
          })
          await sql`UPDATE reporting_periods SET status = 'published', published_at = now(), published_by = ${token.sub}, publish_hash = ${data_hash} WHERE id = ${id} AND org_id = ${orgId}`
        } else {
          await sql`UPDATE reporting_periods SET status = ${status} WHERE id = ${id} AND org_id = ${orgId}`
        }
        return res.status(200).json({ ok: true })
      }

      // ─── Comments ───────────────────────────────────
      if (action === 'add-comment') {
        const {
          assignment_id, body, kind,
          parent_comment_id,
          mentioned_user_emails,
          is_request_for_review,
        } = req.body as {
          assignment_id?: string
          body?: string
          kind?: string
          parent_comment_id?: string
          mentioned_user_emails?: string[]
          is_request_for_review?: boolean
        }
        if (!assignment_id || !body) return res.status(400).json({ error: 'assignment_id and body required' })
        // Resolve author identity
        const userRows = await sql`SELECT name, email FROM users WHERE id = ${token.sub}` as Array<{ name: string; email: string }>
        const u = userRows[0] ?? { name: token.email, email: token.email }

        // Flatten replies-to-replies: if the parent itself has a parent, treat
        // this as a sibling reply (one level deep maximum).
        let resolvedParent: string | null = null
        if (parent_comment_id) {
          const parentRows = await sql`SELECT id, parent_comment_id FROM assignment_comments WHERE id = ${parent_comment_id}` as Array<{ id: string; parent_comment_id: string | null }>
          if (parentRows[0]) {
            resolvedParent = parentRows[0].parent_comment_id ?? parentRows[0].id
          }
        }

        // Resolve @mentions: look up users by email within the same org. Only
        // mentions that match a real org member are persisted.
        const cleanEmails = Array.isArray(mentioned_user_emails)
          ? mentioned_user_emails.map(e => String(e).trim().toLowerCase()).filter(Boolean)
          : []
        let mentionedIds: string[] = []
        let mentionedRows: Array<{ id: string; email: string; name: string }> = []
        if (cleanEmails.length > 0) {
          mentionedRows = await sql`
            SELECT DISTINCT u.id, u.email, u.name
            FROM users u
            JOIN org_members m ON m.user_id = u.id
            WHERE m.org_id = ${orgId} AND lower(u.email) = ANY(${cleanEmails})
          ` as Array<{ id: string; email: string; name: string }>
          mentionedIds = mentionedRows.map(r => r.id)
        }

        const requestReview = !!is_request_for_review
        const safeKind = kind || (requestReview ? 'review_decision' : 'comment')

        const rows = await sql`
          INSERT INTO assignment_comments (
            assignment_id, author_user_id, author_name, author_email, body, kind,
            parent_comment_id, mentioned_user_ids, is_request_for_review
          )
          VALUES (
            ${assignment_id}, ${token.sub}, ${u.name}, ${u.email}, ${body}, ${safeKind},
            ${resolvedParent}, ${mentionedIds}, ${requestReview}
          )
          RETURNING id, assignment_id, author_user_id, author_name, author_email, body, kind,
                    parent_comment_id, mentioned_user_ids, is_request_for_review,
                    resolved_at, resolved_by, created_at
        ` as Array<{
          id: string; assignment_id: string; author_user_id: string | null;
          author_name: string; author_email: string; body: string; kind: string;
          parent_comment_id: string | null; mentioned_user_ids: string[] | null;
          is_request_for_review: boolean | null; resolved_at: string | null;
          resolved_by: string | null; created_at: string;
        }>

        const asg = await sql`SELECT assignee_email, assignee_user_id, gri_code FROM question_assignments WHERE id = ${assignment_id} AND org_id = ${orgId}` as Array<{ assignee_email: string; assignee_user_id: string | null; gri_code: string }>
        const disclosure = asg[0]?.gri_code ?? 'a disclosure'

        // Notify the assignee (if they're not the author)
        if (asg[0] && asg[0].assignee_email.toLowerCase() !== u.email.toLowerCase()) {
          await notify({
            orgId,
            userId: asg[0].assignee_user_id,
            toEmail: asg[0].assignee_email,
            kind: 'comment',
            subject: `${u.name} commented on ${disclosure}`,
            body: body.slice(0, 140),
            route: '/my-tasks',
            relatedAssignmentId: assignment_id,
          })
        }

        // Notify each @mentioned user (skip the author, skip the assignee
        // who's already been notified).
        const alreadyNotified = new Set<string>([
          u.email.toLowerCase(),
          asg[0]?.assignee_email.toLowerCase() ?? '',
        ])
        for (const m of mentionedRows) {
          if (alreadyNotified.has(m.email.toLowerCase())) continue
          alreadyNotified.add(m.email.toLowerCase())
          await notify({
            orgId,
            userId: m.id,
            toEmail: m.email,
            kind: 'mention',
            subject: `${u.name} mentioned you on ${disclosure}`,
            body: body.slice(0, 140),
            route: '/my-tasks',
            relatedAssignmentId: assignment_id,
          })
        }

        // "Request for review" → notify everyone with reviewer/approver roles
        // on this org (group_sustainability_officer + auditor). They become
        // the candidate reviewers for the work queue.
        if (requestReview) {
          const reviewers = await sql`
            SELECT DISTINCT om.user_id, om.email, om.name
            FROM org_members om
            WHERE om.org_id = ${orgId}
              AND om.role IN ('group_sustainability_officer', 'auditor', 'subsidiary_lead')
          ` as Array<{ user_id: string | null; email: string; name: string }>
          for (const r of reviewers) {
            if (alreadyNotified.has(r.email.toLowerCase())) continue
            alreadyNotified.add(r.email.toLowerCase())
            await notify({
              orgId,
              userId: r.user_id,
              toEmail: r.email,
              kind: 'review_request',
              subject: `${u.name} requested a review on ${disclosure}`,
              body: body.slice(0, 140),
              route: '/work/review',
              relatedAssignmentId: assignment_id,
            })
          }
        }

        await appendChainRecord(sql, orgId, {
          record_type: 'comment_posted',
          reference_id: assignment_id,
          event_type: 'Submitted',
          facility_name: asg[0]?.gri_code ?? null,
          metadata: { author: u.email, body_hash: body.slice(0, 120), mentions: mentionedIds.length, review_requested: requestReview },
        })
        return res.status(201).json(rows[0])
      }

      // Resolve / reopen a comment thread.
      if (action === 'resolve-comment' || action === 'reopen-comment') {
        const { id } = req.body as { id?: string }
        if (!id) return res.status(400).json({ error: 'id required' })
        // Gate: original author OR anyone with workflow.approve.
        const rows = await sql`
          SELECT c.author_user_id, c.author_email
          FROM assignment_comments c
          JOIN question_assignments qa ON qa.id = c.assignment_id
          WHERE c.id = ${id} AND qa.org_id = ${orgId}
        ` as Array<{ author_user_id: string | null; author_email: string }>
        if (rows.length === 0) return res.status(404).json({ error: 'comment not found' })
        const isAuthor = rows[0].author_email.toLowerCase() === token.email.toLowerCase()
        if (!isAuthor) {
          const gate = await requirePermission(req, res, 'workflow.approve')
          if (!gate) return
        }
        if (action === 'resolve-comment') {
          await sql`UPDATE assignment_comments SET resolved_at = now(), resolved_by = ${token.sub} WHERE id = ${id}`
        } else {
          await sql`UPDATE assignment_comments SET resolved_at = NULL, resolved_by = NULL WHERE id = ${id}`
        }
        return res.status(200).json({ ok: true })
      }

      // ─── Notifications ──────────────────────────────
      if (action === 'mark-notification-read') {
        const { id } = req.body
        if (id === 'all') {
          await sql`UPDATE notifications SET read_at = now() WHERE org_id = ${orgId} AND lower(recipient_email) = ${token.email.toLowerCase()} AND read_at IS NULL`
        } else if (id) {
          await sql`UPDATE notifications SET read_at = now() WHERE id = ${id} AND lower(recipient_email) = ${token.email.toLowerCase()}`
        } else {
          return res.status(400).json({ error: 'id or "all" required' })
        }
        return res.status(200).json({ ok: true })
      }

      // ─── Materiality assessments ────────────────────
      if (action === 'upsert-materiality-assessment') {
        // Materiality assessment mgmt → admin.org.
        const gate = await requirePermission(req, res, 'admin.org')
        if (!gate) return
        const { id, framework_id, label, kind, status, methodology, conducted_by, conducted_on, stakeholders_engaged } = req.body
        if (!label) return res.status(400).json({ error: 'label required' })
        if (id) {
          await sql`
            UPDATE materiality_assessments SET
              label = ${label}, kind = ${kind || 'gri3'}, status = ${status || 'draft'},
              methodology = ${methodology || null}, conducted_by = ${conducted_by || null},
              conducted_on = ${conducted_on || null},
              stakeholders_engaged = ${JSON.stringify(stakeholders_engaged || [])}::jsonb,
              updated_at = now()
            WHERE id = ${id} AND org_id = ${orgId}
          `
          return res.status(200).json({ ok: true, id })
        }
        const rows = await sql`
          INSERT INTO materiality_assessments (org_id, framework_id, label, kind, status, methodology, conducted_by, conducted_on, stakeholders_engaged)
          VALUES (${orgId}, ${framework_id || 'gri'}, ${label}, ${kind || 'gri3'}, ${status || 'draft'},
                  ${methodology || null}, ${conducted_by || null}, ${conducted_on || null},
                  ${JSON.stringify(stakeholders_engaged || [])}::jsonb)
          RETURNING id
        ` as Array<{ id: string }>
        return res.status(201).json({ ok: true, id: rows[0].id })
      }

      if (action === 'set-preferred-framework') {
        // User-level preference — persists the framework selector choice across sessions + devices.
        const { framework_id } = req.body
        if (!framework_id) return res.status(400).json({ error: 'framework_id required' })
        await sql`UPDATE users SET preferred_framework_id = ${framework_id} WHERE id = ${token.sub}`
        return res.status(200).json({ ok: true })
      }

      // ─── Reports ───────────────────────────────────────────
      if (action === 'publish-report') {
        // Publishing → reports.publish.
        const gate = await requirePermission(req, res, 'reports.publish')
        if (!gate) return
        const { period_id, framework_id, assurance_request_id, base_url } = req.body ?? {}
        if (!period_id) return res.status(400).json({ error: 'period_id required' })

        // Resolve framework — either explicit or the period's framework.
        let fwId: string = framework_id || ''
        if (!fwId) {
          const pRows = await sql`SELECT framework_id FROM reporting_periods WHERE id = ${period_id} AND org_id = ${orgId}` as Array<{ framework_id: string }>
          if (pRows.length === 0) return res.status(404).json({ error: 'Period not found' })
          fwId = pRows[0].framework_id
        }

        // Readiness gate — at least one approved disclosure.
        const readinessRows = await sql`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'approved')::int AS approved
          FROM question_assignments
          WHERE org_id = ${orgId} AND framework_id = ${fwId}
        ` as Array<{ total: number; approved: number }>
        if (readinessRows[0].approved === 0) {
          return res.status(409).json({ error: 'No approved disclosures to publish. Approve at least one assignment before publishing.' })
        }

        const who = await sql`SELECT name FROM users WHERE id = ${token.sub}` as Array<{ name: string }>
        const publishedByName = who[0]?.name ?? token.email

        // Derive base_url — prefer client-provided (so the QR matches the env), else request origin.
        const origin = base_url
          || (req.headers['x-forwarded-proto'] && req.headers.host ? `${req.headers['x-forwarded-proto']}://${req.headers.host}` : `https://${req.headers.host ?? 'app.aeiforo.com'}`)

        const verificationToken = generateVerificationToken()

        // Heavy: only loaded when a publish actually fires.
        const { assembleReportInput, renderReportPdf, anchorPdfToOts } = await loadReportGen()

        const input = await assembleReportInput(sql as any, {
          orgId,
          periodId: period_id,
          frameworkId: fwId,
          publishedBy: publishedByName,
          publishedAt: new Date().toISOString(),
          verificationToken,
          baseUrl: String(origin).replace(/\/$/, ''),
          assuranceRequestId: assurance_request_id ?? null,
        })

        const { bytes, sha256, byteLength } = await renderReportPdf(input)

        // Anchor. If OTS is unreachable (dev offline, etc) we still store the artifact
        // without a receipt — the hash itself is saved and can be anchored later.
        const anchor = await anchorPdfToOts(sha256)

        // Version — existing rows +1 per period+framework.
        const vRows = await sql`
          SELECT COALESCE(MAX(version), 0)::int AS v FROM report_artifacts
          WHERE org_id = ${orgId} AND period_id = ${period_id} AND framework_id = ${fwId}
        ` as Array<{ v: number }>
        const version = vRows[0].v + 1

        // Save artifact. is_draft stays true until an assurance statement is linked + signed.
        const created = await sql`
          INSERT INTO report_artifacts (
            org_id, period_id, framework_id, version,
            pdf_content, pdf_sha256, pdf_size, page_count,
            is_draft, assurance_request_id,
            anchor_receipt, anchor_tip_hash, anchor_calendar_url, anchored_at,
            verification_token, published_by, metadata
          ) VALUES (
            ${orgId}, ${period_id}, ${fwId}, ${version},
            ${bytes}, ${sha256}, ${byteLength}, ${null},
            ${input.assurance == null}, ${assurance_request_id ?? null},
            ${anchor?.receipt ?? null}, ${anchor?.anchoredAt ? sha256 : null}, ${anchor?.calendarUrl ?? null}, ${anchor?.anchoredAt ?? null},
            ${verificationToken}, ${token.sub}, ${JSON.stringify({ metrics: input.metrics.length, narratives: input.narratives.length })}::jsonb
          )
          RETURNING id
        ` as Array<{ id: string }>

        // Append to hash chain
        await appendChainRecord(sql, orgId, {
          record_type: 'report_published',
          reference_id: created[0].id,
          event_type: 'Report Generated',
          facility_name: input.period.label,
          metadata: {
            pdf_sha256: sha256,
            pdf_size: byteLength,
            framework: fwId,
            version,
            anchor_tip: anchor ? sha256 : null,
            verification_token: verificationToken,
          },
        })

        return res.status(201).json({
          ok: true,
          id: created[0].id,
          version,
          pdf_sha256: sha256,
          pdf_size: byteLength,
          verification_token: verificationToken,
          verify_url: `${origin.replace(/\/$/, '')}/verify/${verificationToken}`,
          anchored: !!anchor,
          anchor_calendar: anchor?.calendarUrl ?? null,
          is_draft: input.assurance == null,
        })
      }

      if (action === 'request-assurance') {
        // Assurance request → reports.publish (same audience that publishes).
        const gate = await requirePermission(req, res, 'reports.publish')
        if (!gate) return
        const { period_id, auditor_name, auditor_email, auditor_firm, opinion_type, isae_reference, notes } = req.body ?? {}
        if (!period_id || !auditor_email) return res.status(400).json({ error: 'period_id and auditor_email required' })
        const uploadToken = generateVerificationToken()
        const rows = await sql`
          INSERT INTO assurance_requests (
            org_id, period_id, requested_by,
            auditor_name, auditor_email, auditor_firm,
            opinion_type, isae_reference, notes, upload_token
          ) VALUES (
            ${orgId}, ${period_id}, ${token.sub},
            ${auditor_name || null}, ${auditor_email}, ${auditor_firm || null},
            ${opinion_type || null}, ${isae_reference || 'ISAE 3000 (Revised)'}, ${notes || null}, ${uploadToken}
          ) RETURNING id
        ` as Array<{ id: string }>
        await appendChainRecord(sql, orgId, {
          record_type: 'assurance_requested',
          reference_id: rows[0].id,
          event_type: 'Submitted',
          facility_name: auditor_firm ?? auditor_email,
          metadata: { auditor_email, auditor_firm, opinion_type, requester: token.email },
        })
        return res.status(201).json({ ok: true, id: rows[0].id, upload_token: uploadToken })
      }

      if (action === 'withdraw-assurance') {
        // Assurance withdrawal → reports.publish.
        const gate = await requirePermission(req, res, 'reports.publish')
        if (!gate) return
        const { id } = req.body ?? {}
        if (!id || !uuid.safeParse(id).success) return res.status(400).json({ error: 'valid id required' })
        const rows = await sql`
          UPDATE assurance_requests SET status = 'withdrawn', upload_token = NULL
          WHERE id = ${id} AND org_id = ${orgId} AND status = 'pending'
          RETURNING id
        ` as Array<{ id: string }>
        if (rows.length === 0) return res.status(409).json({ error: 'Only pending requests can be withdrawn' })
        return res.status(200).json({ ok: true })
      }

      // ─── Materiality — finalize verdict ───────────────────
      // Applies the threshold to every assessed topic and writes is_material +
      // dma_status. Audit-logged. Returns counts so the UI can confirm.
      if (action === 'finalize-materiality') {
        const gate = await requirePermission(req, res, 'admin.org')
        if (!gate) return
        // Re-use the same logic as POST /api/materiality?action=finalize so the
        // two endpoints stay consistent. Threshold defaults to 3.0.
        await sql`
          UPDATE material_topics SET
            is_material = (COALESCE(impact_score,0) >= COALESCE(threshold, 3.0))
                          OR (COALESCE(financial_score,0) >= COALESCE(threshold, 3.0)),
            dma_status = CASE
              WHEN (COALESCE(impact_score,0) >= COALESCE(threshold, 3.0))
                OR (COALESCE(financial_score,0) >= COALESCE(threshold, 3.0))
              THEN 'material'
              ELSE 'not_material'
            END,
            assessed_at = now()
          WHERE org_id = ${orgId}
            AND (impact_score IS NOT NULL OR financial_score IS NOT NULL)
        `
        const counts = await sql`
          SELECT
            COUNT(*) FILTER (WHERE dma_status = 'material')::int AS material_count,
            COUNT(*) FILTER (WHERE dma_status = 'not_material')::int AS not_material_count
          FROM material_topics WHERE org_id = ${orgId}
        ` as Array<{ material_count: number; not_material_count: number }>
        await audit({
          orgId, userId: token.sub, action: 'materiality.finalized',
          resourceType: 'materiality', resourceId: orgId,
          details: counts[0], ip: auditIp(req),
        })
        return res.status(200).json({ ok: true, ...counts[0] })
      }

      // ─── Anomaly suppression ──────────────────────────────
      if (action === 'suppress-anomaly') {
        // Suppressing flagged anomalies → reviewer/approver authority.
        const gate = await requirePermission(req, res, 'workflow.approve')
        if (!gate) return
        const { assignment_id, anomaly_type, reason } = req.body ?? {}
        if (!assignment_id || !anomaly_type || !reason) return res.status(400).json({ error: 'assignment_id, anomaly_type and reason required' })
        if (String(reason).trim().length < 10) return res.status(400).json({ error: 'Reason must be at least 10 characters — explain why' })
        // Confirm ownership
        const ar = await sql`SELECT id FROM question_assignments WHERE id = ${assignment_id} AND org_id = ${orgId}` as Array<{ id: string }>
        if (ar.length === 0) return res.status(404).json({ error: 'Assignment not found' })
        await sql`
          INSERT INTO anomaly_suppressions (org_id, assignment_id, anomaly_type, reason, suppressed_by)
          VALUES (${orgId}, ${assignment_id}, ${anomaly_type}, ${reason}, ${token.sub})
          ON CONFLICT (assignment_id, anomaly_type) DO UPDATE
          SET reason = EXCLUDED.reason, suppressed_by = EXCLUDED.suppressed_by, suppressed_at = now()
        `
        await appendChainRecord(sql, orgId, {
          record_type: 'anomaly_suppressed',
          reference_id: assignment_id,
          event_type: 'Submitted',
          facility_name: 'anomaly feed',
          metadata: { anomaly_type, reason, actor: token.email },
        })
        return res.status(200).json({ ok: true })
      }
      if (action === 'restore-anomaly') {
        // Restoring suppressed anomalies → reviewer/approver authority.
        const gate = await requirePermission(req, res, 'workflow.approve')
        if (!gate) return
        const { assignment_id, anomaly_type } = req.body ?? {}
        if (!assignment_id || !anomaly_type) return res.status(400).json({ error: 'assignment_id and anomaly_type required' })
        await sql`DELETE FROM anomaly_suppressions WHERE org_id = ${orgId} AND assignment_id = ${assignment_id} AND anomaly_type = ${anomaly_type}`
        return res.status(200).json({ ok: true })
      }

      if (action === 'rotate-upload-token') {
        // Rotating an assurance upload link → reports.publish.
        const gate = await requirePermission(req, res, 'reports.publish')
        if (!gate) return
        // Generate a fresh link if the previous one was lost/leaked.
        const { id } = req.body ?? {}
        if (!id || !uuid.safeParse(id).success) return res.status(400).json({ error: 'valid id required' })
        const newToken = generateVerificationToken()
        const rows = await sql`
          UPDATE assurance_requests SET upload_token = ${newToken}
          WHERE id = ${id} AND org_id = ${orgId} AND status = 'pending'
          RETURNING id
        ` as Array<{ id: string }>
        if (rows.length === 0) return res.status(409).json({ error: 'Can only rotate token on pending requests' })
        return res.status(200).json({ ok: true, upload_token: newToken })
      }

      return res.status(400).json({ error: `Unknown action: ${action}` })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}

/**
 * Emit notifications on assignment status transitions. Keeps handlers clean.
 *   not_started/in_progress → submitted  → notify subsidiary_lead + plant_manager members in the entity's subtree
 *   submitted → reviewed                 → notify group_sustainability_officer members
 *   submitted/reviewed → approved        → notify the original assignee ("approved")
 *   any → rejected                       → notify the assignee with the rejection reason
 */
async function emitStatusTransitionNotifications(
  sql: ReturnType<typeof getDb>,
  orgId: string,
  assignmentId: string,
  prior: { assignee_email: string; assignee_name: string; gri_code: string; line_item: string; entity_id: string },
  newStatus: string,
  actorEmail: string,
  comment?: string,
): Promise<void> {
  const subjectBase = `${prior.gri_code} · ${prior.line_item.slice(0, 60)}`

  async function notifyOne(email: string, kind: string, subject: string, body: string, route: string) {
    if (!email) return
    if (email.toLowerCase() === actorEmail.toLowerCase()) return // skip self
    await notify({
      orgId, toEmail: email, kind, subject, body, route, relatedAssignmentId: assignmentId,
    })
  }

  if (newStatus === 'submitted') {
    // Find reviewers (subsidiary_lead) in the path up the org tree
    const reviewers = await sql`
      WITH RECURSIVE path AS (
        SELECT id, parent_id FROM org_entities WHERE id = ${prior.entity_id}
        UNION ALL
        SELECT e.id, e.parent_id FROM org_entities e JOIN path p ON e.id = p.parent_id
      )
      SELECT DISTINCT m.email FROM org_members m WHERE m.entity_id IN (SELECT id FROM path)
        AND m.role IN ('subsidiary_lead','plant_manager') AND m.org_id = ${orgId}
    ` as Array<{ email: string }>
    for (const r of reviewers) {
      await notifyOne(r.email, 'review_requested', `Review requested · ${subjectBase}`, `${prior.assignee_name} submitted a value for review.`, '/workflow/review')
    }
  } else if (newStatus === 'reviewed') {
    const approvers = await sql`
      SELECT email FROM org_members WHERE org_id = ${orgId} AND role IN ('group_sustainability_officer','platform_admin')
    ` as Array<{ email: string }>
    for (const r of approvers) {
      await notifyOne(r.email, 'approval_requested', `Approval needed · ${subjectBase}`, `A subsidiary lead passed this figure on for group approval.`, '/workflow/approval')
    }
  } else if (newStatus === 'approved') {
    await notifyOne(prior.assignee_email, 'approved', `Approved · ${subjectBase}`, `Your submission was approved by the sustainability officer.`, '/my-tasks')
  } else if (newStatus === 'rejected') {
    await notifyOne(prior.assignee_email, 'rejected', `Sent back · ${subjectBase}`, comment || 'Please review and resubmit.', '/my-tasks')
  }
}
