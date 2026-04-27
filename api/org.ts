import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as crypto from 'crypto'
import { getDb } from './_db.js'
import { verifyToken, cors } from './_auth.js'
import { appendChainRecord } from './_hashChain.js'
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
                 assigned_by, assigned_at, last_updated
          FROM question_assignments WHERE org_id = ${orgId}
          ORDER BY assigned_at DESC
        `
        return res.status(200).json(rows)
      }
      if (view === 'my-assignments') {
        const rows = await sql`
          SELECT id, framework_id, questionnaire_item_id AS question_id, gri_code, line_item,
                 unit, entity_id, assignee_email, assignee_name, assignee_user_id,
                 entry_modes, used_mode, due_date, status, value, comment, evidence_ids,
                 response_type, narrative_body, period_id, disclosure_position,
                 assigned_by, assigned_at, last_updated
          FROM question_assignments
          WHERE org_id = ${orgId}
            AND lower(assignee_email) = ${token.email.toLowerCase()}
          ORDER BY assigned_at DESC
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
        const rows = await sql`
          SELECT id, assignment_id, author_user_id, author_name, author_email, body, kind, created_at
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

        if (assignments.length === 0) return res.status(200).json({ anomalies: [], total: 0 })

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

      // ─── Entities ─────────────────────────────────────────
      if (action === 'add-entity') {
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
        const { id } = req.body
        if (!id) return res.status(400).json({ error: 'id required' })
        // Cascade via FK ON DELETE CASCADE
        await sql`DELETE FROM org_entities WHERE id = ${id} AND org_id = ${orgId}`
        return res.status(200).json({ ok: true })
      }

      // ─── Members ──────────────────────────────────────────
      if (action === 'add-member') {
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
        const { id } = req.body
        if (!id) return res.status(400).json({ error: 'id required' })
        await sql`DELETE FROM org_members WHERE id = ${id} AND org_id = ${orgId}`
        return res.status(200).json({ ok: true })
      }

      // ─── Assignments ──────────────────────────────────────
      if (action === 'add-assignment') {
        const {
          framework_id, question_id, gri_code, line_item, unit,
          entity_id, assignee_email, assignee_name, assignee_user_id,
          entry_modes, due_date, assigned_by, response_type, period_id,
        } = req.body
        if (!question_id || !gri_code || !entity_id || !assignee_email) {
          return res.status(400).json({ error: 'question_id, gri_code, entity_id, assignee_email required' })
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
                    assigned_by, assigned_at, last_updated
        `
        // Emit "you've been assigned" notification to the assignee
        await sql`
          INSERT INTO notifications (org_id, recipient_user_id, recipient_email, kind, subject, body, route, related_assignment_id)
          VALUES (${orgId}, ${assignee_user_id || null}, ${assignee_email.toLowerCase().trim()},
                  'assignment_created',
                  ${`New assignment · ${gri_code}`},
                  ${`${line_item} — due ${due_date || 'TBD'}`},
                  '/my-tasks',
                  ${created[0].id})
        `
        // Chain append
        await appendChainRecord(sql, orgId, {
          record_type: 'assignment_created',
          reference_id: created[0].id,
          event_type: 'Submitted',
          facility_name: line_item,
          metadata: { gri_code, assignee_email, entity_id, framework_id: framework_id || 'gri', actor: token.email },
        })
        return res.status(201).json(created[0])
      }
      if (action === 'update-assignment') {
        const { id, patch } = req.body
        if (!id || !patch) return res.status(400).json({ error: 'id and patch required' })
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

        // ── Period-lock: once a period is locked or published, nothing in it can change. ──
        if (prior.period_status === 'locked' || prior.period_status === 'published') {
          return res.status(423).json({ error: `Reporting period is ${prior.period_status}. No further edits allowed.` })
        }

        // ── Status-lock: once submitted/reviewed/approved, data fields are frozen. ──
        // Only status transitions (review actions) and review `comment` are accepted.
        const DATA_FIELDS = ['value', 'unit', 'narrative_body', 'evidence_ids', 'used_mode', 'entry_modes'] as const
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
                 assigned_by, assigned_at, last_updated
          FROM question_assignments WHERE id = ${id} AND org_id = ${orgId}
        `
        return res.status(200).json(rows[0] ?? null)
      }
      if (action === 'remove-assignment') {
        const { id } = req.body
        if (!id) return res.status(400).json({ error: 'id required' })
        await sql`DELETE FROM question_assignments WHERE id = ${id} AND org_id = ${orgId}`
        return res.status(200).json({ ok: true })
      }

      // ─── Framework enablement (per-tenant) ───────────
      if (action === 'enable-framework') {
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
        const { id } = req.body
        if (!id) return res.status(400).json({ error: 'id required' })
        await sql`DELETE FROM org_targets WHERE id = ${id} AND org_id = ${orgId}`
        return res.status(200).json({ ok: true })
      }

      // ─── Material topics / DMA ───────────────────────
      if (action === 'upsert-material-topic') {
        const { id, framework_id, topic_name, topic_category, linked_gri_codes, impact_score, financial_score, dma_status, rationale, owner_email } = req.body
        if (!topic_name) return res.status(400).json({ error: 'topic_name required' })
        if (id) {
          await sql`
            UPDATE material_topics SET
              topic_name = ${topic_name}, topic_category = ${topic_category || null},
              linked_gri_codes = ${JSON.stringify(linked_gri_codes || [])}::jsonb,
              impact_score = ${impact_score ?? null}, financial_score = ${financial_score ?? null},
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
                  ${impact_score ?? null}, ${financial_score ?? null}, ${dma_status || 'identified'},
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
        const { id } = req.body
        if (!id) return res.status(400).json({ error: 'id required' })
        await sql`DELETE FROM material_topics WHERE id = ${id} AND org_id = ${orgId}`
        return res.status(200).json({ ok: true })
      }

      // ─── Reporting periods ──────────────────────────
      if (action === 'create-period') {
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
        const { id, status } = req.body
        if (!id || !status) return res.status(400).json({ error: 'id and status required' })
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
        const { assignment_id, body, kind } = req.body
        if (!assignment_id || !body) return res.status(400).json({ error: 'assignment_id and body required' })
        // Resolve author identity
        const userRows = await sql`SELECT name, email FROM users WHERE id = ${token.sub}` as Array<{ name: string; email: string }>
        const u = userRows[0] ?? { name: token.email, email: token.email }
        const rows = await sql`
          INSERT INTO assignment_comments (assignment_id, author_user_id, author_name, author_email, body, kind)
          VALUES (${assignment_id}, ${token.sub}, ${u.name}, ${u.email}, ${body}, ${kind || 'comment'})
          RETURNING id, author_name, author_email, body, kind, created_at
        ` as Array<{ id: string; author_name: string; author_email: string; body: string; kind: string; created_at: string }>
        // Notify the assignee (if they're not the author)
        const asg = await sql`SELECT assignee_email, assignee_user_id, gri_code FROM question_assignments WHERE id = ${assignment_id} AND org_id = ${orgId}` as Array<{ assignee_email: string; assignee_user_id: string | null; gri_code: string }>
        if (asg[0] && asg[0].assignee_email.toLowerCase() !== u.email.toLowerCase()) {
          await sql`
            INSERT INTO notifications (org_id, recipient_user_id, recipient_email, kind, subject, body, route, related_assignment_id)
            VALUES (${orgId}, ${asg[0].assignee_user_id}, ${asg[0].assignee_email}, 'comment',
                    ${`${u.name} commented on ${asg[0].gri_code}`},
                    ${body.slice(0, 140)},
                    '/my-tasks', ${assignment_id})
          `
        }
        await appendChainRecord(sql, orgId, {
          record_type: 'comment_posted',
          reference_id: assignment_id,
          event_type: 'Submitted',
          facility_name: asg[0]?.gri_code ?? null,
          metadata: { author: u.email, body_hash: body.slice(0, 120) },
        })
        return res.status(201).json(rows[0])
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
        const { id } = req.body ?? {}
        if (!id) return res.status(400).json({ error: 'id required' })
        const rows = await sql`
          UPDATE assurance_requests SET status = 'withdrawn', upload_token = NULL
          WHERE id = ${id} AND org_id = ${orgId} AND status = 'pending'
          RETURNING id
        ` as Array<{ id: string }>
        if (rows.length === 0) return res.status(409).json({ error: 'Only pending requests can be withdrawn' })
        return res.status(200).json({ ok: true })
      }

      // ─── Anomaly suppression ──────────────────────────────
      if (action === 'suppress-anomaly') {
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
        const { assignment_id, anomaly_type } = req.body ?? {}
        if (!assignment_id || !anomaly_type) return res.status(400).json({ error: 'assignment_id and anomaly_type required' })
        await sql`DELETE FROM anomaly_suppressions WHERE org_id = ${orgId} AND assignment_id = ${assignment_id} AND anomaly_type = ${anomaly_type}`
        return res.status(200).json({ ok: true })
      }

      if (action === 'rotate-upload-token') {
        // Generate a fresh link if the previous one was lost/leaked.
        const { id } = req.body ?? {}
        if (!id) return res.status(400).json({ error: 'id required' })
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

  async function notify(email: string, kind: string, subject: string, body: string, route: string) {
    if (!email) return
    if (email.toLowerCase() === actorEmail.toLowerCase()) return // skip self
    await sql`
      INSERT INTO notifications (org_id, recipient_email, kind, subject, body, route, related_assignment_id)
      VALUES (${orgId}, ${email}, ${kind}, ${subject}, ${body}, ${route}, ${assignmentId})
    `
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
      await notify(r.email, 'review_requested', `Review requested · ${subjectBase}`, `${prior.assignee_name} submitted a value for review.`, '/workflow/review')
    }
  } else if (newStatus === 'reviewed') {
    const approvers = await sql`
      SELECT email FROM org_members WHERE org_id = ${orgId} AND role IN ('group_sustainability_officer','platform_admin')
    ` as Array<{ email: string }>
    for (const r of approvers) {
      await notify(r.email, 'approval_requested', `Approval needed · ${subjectBase}`, `A subsidiary lead passed this figure on for group approval.`, '/workflow/approval')
    }
  } else if (newStatus === 'approved') {
    await notify(prior.assignee_email, 'approved', `Approved · ${subjectBase}`, `Your submission was approved by the sustainability officer.`, '/my-tasks')
  } else if (newStatus === 'rejected') {
    await notify(prior.assignee_email, 'rejected', `Sent back · ${subjectBase}`, comment || 'Please review and resubmit.', '/my-tasks')
  }
}
