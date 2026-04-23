import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db.js'
import { verifyToken, cors } from '../_auth.js'
import {
  canEnter, canReview, canApprove, canPublish,
  emitAuditEvent, getPlatformRole, getWorkflowRolesForItem,
  type WorkflowRole,
} from '../_workflow.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  // ═══════════════════════════════════════════
  // GET dispatcher — SRD §16.2 views
  // ═══════════════════════════════════════════
  if (req.method === 'GET') {
    const { view } = req.query as Record<string, string | undefined>

    // Nexus views
    if (view === 'tree') {
      // Optional framework filter — default to gri since it's the only active one in Phase 1.
      // When more frameworks come online, the client passes &framework_id=<id>.
      const frameworkId = String(req.query.framework_id || 'gri')
      try {
        const items = await sql`
          SELECT id, section, subsection, gri_code, line_item, unit, scope_split,
                 default_workflow_role, entry_mode_default, target_fy2026,
                 footnote_refs, reporting_scope, framework_id
          FROM questionnaire_item
          WHERE framework_id = ${frameworkId}
          ORDER BY reporting_scope, section, subsection, gri_code, line_item
        `
        return res.status(200).json(items)
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    if (view === 'historical') {
      const { question_id } = req.query as Record<string, string | undefined>
      if (!question_id) return res.status(400).json({ error: 'question_id required' })
      try {
        const rows = await sql`
          SELECT year, scope_key, value, source_report, confidence_score
          FROM historical_value
          WHERE questionnaire_item_id = ${question_id}
          ORDER BY year ASC
        `
        return res.status(200).json(rows)
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    if (view === 'review-queue') {
      try {
        const rows = await sql`
          SELECT dv.*, qi.line_item, qi.gri_code, qi.unit, qi.section
          FROM data_value dv
          JOIN questionnaire_item qi ON qi.id = dv.questionnaire_item_id
          WHERE dv.status = 'submitted'
          ORDER BY dv.submitted_at ASC
        `
        return res.status(200).json(rows)
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    if (view === 'evidence') {
      const { data_value_id } = req.query as Record<string, string | undefined>
      if (!data_value_id) return res.status(400).json({ error: 'data_value_id required' })
      try {
        const rows = await sql`
          SELECT e.id, e.filename, e.file_type, e.file_size, e.file_hash,
                 e.uploaded_at, u.name AS uploaded_by_name
          FROM evidence e
          LEFT JOIN users u ON u.id = e.uploaded_by
          WHERE e.data_value_id = ${data_value_id}
          ORDER BY e.uploaded_at DESC
        `
        return res.status(200).json(rows)
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    if (view === 'evidence-file') {
      const { evidence_id } = req.query as Record<string, string | undefined>
      if (!evidence_id) return res.status(400).json({ error: 'evidence_id required' })
      try {
        const rows = await sql`
          SELECT filename, file_type, file_bytes
          FROM evidence WHERE id = ${evidence_id}
        ` as Array<{ filename: string; file_type: string | null; file_bytes: Buffer | Uint8Array | null }>
        if (rows.length === 0 || !rows[0].file_bytes) return res.status(404).json({ error: 'Not found' })
        const buf = Buffer.isBuffer(rows[0].file_bytes) ? rows[0].file_bytes : Buffer.from(rows[0].file_bytes)
        res.setHeader('Content-Type', rows[0].file_type || 'application/octet-stream')
        res.setHeader('Content-Disposition', `attachment; filename="${rows[0].filename.replace(/"/g, '')}"`)
        return res.status(200).send(buf)
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    if (view === 'approval-queue') {
      try {
        const rows = await sql`
          SELECT dv.*, qi.line_item, qi.gri_code, qi.unit, qi.section
          FROM data_value dv
          JOIN questionnaire_item qi ON qi.id = dv.questionnaire_item_id
          WHERE dv.status = 'reviewed'
          ORDER BY dv.reviewed_at ASC
        `
        return res.status(200).json(rows)
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    // Legacy view — workflow_tasks list (pre-Nexus)
    const { status, assigned_to, type, priority } = req.query as Record<string, string | undefined>

    try {
      const rows = await sql`
        SELECT
          wt.*,
          ua.name AS assigned_to_name,
          us.name AS submitted_by_name,
          f.name AS facility_name
        FROM workflow_tasks wt
        LEFT JOIN users ua ON ua.id = wt.assigned_to
        LEFT JOIN users us ON us.id = wt.submitted_by
        LEFT JOIN facilities f ON f.id = wt.facility_id
        WHERE wt.org_id = ${token.org}
          AND (${status || null}::text IS NULL OR wt.status = ${status || null})
          AND (${assigned_to || null}::uuid IS NULL OR wt.assigned_to = ${assigned_to || null}::uuid)
          AND (${type || null}::text IS NULL OR wt.type = ${type || null})
          AND (${priority || null}::text IS NULL OR wt.priority = ${priority || null})
        ORDER BY
          CASE wt.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
          wt.due_date ASC NULLS LAST,
          wt.created_at DESC
      `
      return res.status(200).json(rows)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  // ═══════════════════════════════════════════
  // POST dispatcher — SRD §16.2 actions
  // ═══════════════════════════════════════════
  if (req.method === 'POST') {
    const { action } = req.body ?? {}

    // --- action: enter-value ---
    if (action === 'enter-value') {
      const { question_id, reporting_year_id, facility_id, scope_key, value, unit, mode, comment } = req.body ?? {}
      if (!question_id || !reporting_year_id) {
        return res.status(400).json({ error: 'question_id and reporting_year_id are required' })
      }
      const allowed = await canEnter(sql, token.sub, question_id)
      if (!allowed) return res.status(403).json({ error: 'Not permitted to enter this value' })

      try {
        const created = await sql`
          INSERT INTO data_value
            (questionnaire_item_id, reporting_year_id, facility_id, scope_key,
             value, unit, entry_mode, status, entered_by, entered_at, comment)
          VALUES
            (${question_id}, ${reporting_year_id}, ${facility_id || null}, ${scope_key || null},
             ${value}, ${unit || null}, ${mode || 'Manual'}, 'draft',
             ${token.sub}, now(), ${comment || null})
          RETURNING *
        `
        const platformRole = await getPlatformRole(sql, token.sub)
        const workflowRoles = await getWorkflowRolesForItem(sql, token.sub, question_id)
        const workflowRole: WorkflowRole | null = workflowRoles[0] ?? null
        const { newHash } = await emitAuditEvent(sql, {
          dataValueId: created[0].id,
          eventType: 'entered',
          actorUserId: token.sub,
          actorPlatformRole: platformRole,
          actorWorkflowRole: workflowRole,
          comment,
        })
        await sql`UPDATE data_value SET value_hash = ${newHash} WHERE id = ${created[0].id}`
        return res.status(201).json({ ...created[0], value_hash: newHash })
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    // --- action: submit ---
    if (action === 'submit') {
      const { data_value_id } = req.body ?? {}
      if (!data_value_id) return res.status(400).json({ error: 'data_value_id required' })
      try {
        const rows = await sql`SELECT questionnaire_item_id, status FROM data_value WHERE id = ${data_value_id}` as Array<{ questionnaire_item_id: string; status: string }>
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
        if (rows[0].status !== 'draft') return res.status(409).json({ error: `Cannot submit from status '${rows[0].status}'` })
        const allowed = await canEnter(sql, token.sub, rows[0].questionnaire_item_id)
        if (!allowed) return res.status(403).json({ error: 'Not permitted' })

        await sql`UPDATE data_value SET status = 'submitted', submitted_at = now() WHERE id = ${data_value_id}`
        const platformRole = await getPlatformRole(sql, token.sub)
        const { newHash } = await emitAuditEvent(sql, {
          dataValueId: data_value_id,
          eventType: 'submitted',
          actorUserId: token.sub,
          actorPlatformRole: platformRole,
          actorWorkflowRole: null,
        })
        await sql`UPDATE data_value SET value_hash = ${newHash} WHERE id = ${data_value_id}`
        return res.status(200).json({ ok: true, value_hash: newHash })
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    // --- action: review ---
    if (action === 'review') {
      const { data_value_id, decision, comment } = req.body ?? {}
      if (!data_value_id || !decision) return res.status(400).json({ error: 'data_value_id and decision required' })
      if (decision !== 'pass' && decision !== 'reject') return res.status(400).json({ error: "decision must be 'pass' or 'reject'" })
      try {
        const rows = await sql`SELECT questionnaire_item_id, status FROM data_value WHERE id = ${data_value_id}` as Array<{ questionnaire_item_id: string; status: string }>
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
        if (rows[0].status !== 'submitted') return res.status(409).json({ error: `Cannot review from status '${rows[0].status}'` })
        const allowed = await canReview(sql, token.sub, rows[0].questionnaire_item_id)
        if (!allowed) return res.status(403).json({ error: 'Not permitted to review' })

        const newStatus = decision === 'pass' ? 'reviewed' : 'draft'
        await sql`
          UPDATE data_value
          SET status = ${newStatus},
              reviewed_by = ${decision === 'pass' ? token.sub : null},
              reviewed_at = ${decision === 'pass' ? new Date().toISOString() : null}
          WHERE id = ${data_value_id}
        `
        const platformRole = await getPlatformRole(sql, token.sub)
        const { newHash } = await emitAuditEvent(sql, {
          dataValueId: data_value_id,
          eventType: decision === 'pass' ? 'reviewed' : 'rejected',
          actorUserId: token.sub,
          actorPlatformRole: platformRole,
          actorWorkflowRole: 'TL',
          comment,
        })
        await sql`UPDATE data_value SET value_hash = ${newHash} WHERE id = ${data_value_id}`
        return res.status(200).json({ ok: true, new_status: newStatus, value_hash: newHash })
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    // --- action: approve ---
    if (action === 'approve') {
      const { data_value_id, decision, comment } = req.body ?? {}
      if (!data_value_id || !decision) return res.status(400).json({ error: 'data_value_id and decision required' })
      if (decision !== 'approve' && decision !== 'reject') return res.status(400).json({ error: "decision must be 'approve' or 'reject'" })
      try {
        const rows = await sql`SELECT questionnaire_item_id, status FROM data_value WHERE id = ${data_value_id}` as Array<{ questionnaire_item_id: string; status: string }>
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
        if (rows[0].status !== 'reviewed') return res.status(409).json({ error: `Cannot approve from status '${rows[0].status}'` })
        const allowed = await canApprove(sql, token.sub, rows[0].questionnaire_item_id)
        if (!allowed) return res.status(403).json({ error: 'Not permitted to approve' })

        const newStatus = decision === 'approve' ? 'approved' : 'draft'
        await sql`
          UPDATE data_value
          SET status = ${newStatus},
              approved_by = ${decision === 'approve' ? token.sub : null},
              approved_at = ${decision === 'approve' ? new Date().toISOString() : null}
          WHERE id = ${data_value_id}
        `
        const platformRole = await getPlatformRole(sql, token.sub)
        const { newHash } = await emitAuditEvent(sql, {
          dataValueId: data_value_id,
          eventType: decision === 'approve' ? 'approved' : 'rejected',
          actorUserId: token.sub,
          actorPlatformRole: platformRole,
          actorWorkflowRole: 'SO',
          comment,
        })
        await sql`UPDATE data_value SET value_hash = ${newHash} WHERE id = ${data_value_id}`
        return res.status(200).json({ ok: true, new_status: newStatus, value_hash: newHash })
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    // --- action: publish ---
    if (action === 'publish') {
      const { reporting_year_id } = req.body ?? {}
      if (!reporting_year_id) return res.status(400).json({ error: 'reporting_year_id required' })
      const allowed = await canPublish(sql, token.sub)
      if (!allowed) return res.status(403).json({ error: 'Not permitted to publish' })

      try {
        // Verify 100% Approved per SRD §15.3
        const unapproved = await sql`
          SELECT COUNT(*)::int AS cnt
          FROM data_value
          WHERE reporting_year_id = ${reporting_year_id}
            AND status NOT IN ('approved','published')
        ` as Array<{ cnt: number }>
        if (unapproved[0].cnt > 0) {
          return res.status(409).json({ error: `Cannot publish — ${unapproved[0].cnt} data values are not yet approved` })
        }

        const crypto = await import('crypto')
        const publishHash = '0x' + crypto.createHash('sha256').update(`publish|${reporting_year_id}|${Date.now()}`).digest('hex')

        await sql`
          UPDATE reporting_year
          SET status = 'published', published_at = now(), publish_hash = ${publishHash}
          WHERE id = ${reporting_year_id}
        `
        await sql`UPDATE data_value SET status = 'published' WHERE reporting_year_id = ${reporting_year_id} AND status = 'approved'`
        return res.status(200).json({ ok: true, publish_hash: publishHash })
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    // --- action: connector-pull ---
    if (action === 'connector-pull') {
      const { question_id, connector, reporting_year_id, facility_id } = req.body ?? {}
      if (!question_id || !connector || !reporting_year_id) {
        return res.status(400).json({ error: 'question_id, connector, and reporting_year_id required' })
      }
      try {
        // Simulated pull — pick most recent historical_value as the "measured" value
        const hist = await sql`
          SELECT year, value FROM historical_value
          WHERE questionnaire_item_id = ${question_id}
          ORDER BY year DESC LIMIT 1
        ` as Array<{ year: number; value: number }>
        const simulated = hist.length > 0 ? hist[0].value : 0

        const created = await sql`
          INSERT INTO data_value
            (questionnaire_item_id, reporting_year_id, facility_id,
             value, entry_mode, status, entered_by, entered_at)
          VALUES
            (${question_id}, ${reporting_year_id}, ${facility_id || null},
             ${simulated}, 'Connector', 'draft', ${token.sub}, now())
          RETURNING *
        `

        const crypto = await import('crypto')
        const receiptHash = '0x' + crypto.randomBytes(32).toString('hex')
        await sql`
          INSERT INTO connector_receipt
            (data_value_id, connector_name, source_record_id, payload_json, receipt_hash)
          VALUES
            (${created[0].id}, ${connector},
             ${'sim-' + crypto.randomBytes(8).toString('hex')},
             ${JSON.stringify({ simulated: true, source_value: simulated })}::jsonb,
             ${receiptHash})
        `
        const platformRole = await getPlatformRole(sql, token.sub)
        const { newHash } = await emitAuditEvent(sql, {
          dataValueId: created[0].id,
          eventType: 'entered',
          actorUserId: token.sub,
          actorPlatformRole: platformRole,
          actorWorkflowRole: 'AUTO',
        })
        await sql`UPDATE data_value SET value_hash = ${newHash} WHERE id = ${created[0].id}`
        return res.status(201).json({ ...created[0], value_hash: newHash, receipt_hash: receiptHash })
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    // --- action: upload-evidence ---
    // Body: { action, data_value_id, filename, file_type, size, content_base64 }
    // Inline BYTEA storage, SHA-256 hashed. Capped at 5 MB per file.
    if (action === 'upload-evidence') {
      const { data_value_id, filename, file_type, size, content_base64 } = req.body ?? {}
      if (!data_value_id || !filename || !content_base64) {
        return res.status(400).json({ error: 'data_value_id, filename, and content_base64 are required' })
      }
      const MAX_BYTES = 5 * 1024 * 1024
      const buf = Buffer.from(content_base64, 'base64')
      if (buf.length === 0) return res.status(400).json({ error: 'Empty file payload' })
      if (buf.length > MAX_BYTES) {
        return res.status(413).json({ error: `File too large (${Math.round(buf.length / 1024)}KB). Max ${MAX_BYTES / 1024 / 1024}MB in PoC inline storage.` })
      }
      try {
        // Verify the data_value exists and is still editable (draft).
        const owner = await sql`SELECT questionnaire_item_id, status, entered_by FROM data_value WHERE id = ${data_value_id}` as Array<{ questionnaire_item_id: string; status: string; entered_by: string }>
        if (owner.length === 0) return res.status(404).json({ error: 'data_value not found' })
        if (!['draft', 'submitted', 'reviewed'].includes(owner[0].status)) {
          return res.status(409).json({ error: `Cannot attach evidence to value in status '${owner[0].status}'` })
        }
        // Permission check — entry-level rights or reviewer/approver.
        const allowed = await canEnter(sql, token.sub, owner[0].questionnaire_item_id)
        if (!allowed) return res.status(403).json({ error: 'Not permitted to attach evidence' })

        const crypto = await import('crypto')
        const hash = '0x' + crypto.createHash('sha256').update(buf).digest('hex')

        const inserted = await sql`
          INSERT INTO evidence
            (data_value_id, filename, file_type, file_size, file_bytes,
             uploaded_by, file_hash)
          VALUES
            (${data_value_id}, ${filename}, ${file_type || null}, ${buf.length}, ${buf},
             ${token.sub}, ${hash})
          RETURNING id, filename, file_type, file_size, file_hash, uploaded_at
        ` as Array<{ id: string; filename: string; file_type: string | null; file_size: number; file_hash: string; uploaded_at: string }>

        // Hash-chain an audit event so evidence attachment is part of the trail.
        const platformRole = await getPlatformRole(sql, token.sub)
        await emitAuditEvent(sql, {
          dataValueId: data_value_id,
          eventType: 'entered',
          actorUserId: token.sub,
          actorPlatformRole: platformRole,
          actorWorkflowRole: null,
          comment: `Evidence attached: ${filename} (${Math.round(buf.length / 1024)}KB, ${hash.slice(0, 14)}…)`,
        })

        return res.status(201).json(inserted[0])
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    // --- action: remove-evidence ---
    if (action === 'remove-evidence') {
      const { evidence_id } = req.body ?? {}
      if (!evidence_id) return res.status(400).json({ error: 'evidence_id required' })
      try {
        const existing = await sql`
          SELECT e.id, e.data_value_id, dv.status, dv.questionnaire_item_id
          FROM evidence e JOIN data_value dv ON dv.id = e.data_value_id
          WHERE e.id = ${evidence_id}
        ` as Array<{ id: string; data_value_id: string; status: string; questionnaire_item_id: string }>
        if (existing.length === 0) return res.status(404).json({ error: 'Evidence not found' })
        if (existing[0].status !== 'draft') return res.status(409).json({ error: 'Cannot remove evidence after submit' })
        const allowed = await canEnter(sql, token.sub, existing[0].questionnaire_item_id)
        if (!allowed) return res.status(403).json({ error: 'Not permitted' })
        await sql`DELETE FROM evidence WHERE id = ${evidence_id}`
        return res.status(200).json({ ok: true })
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    // --- Legacy fallthrough: create workflow_tasks row (pre-Nexus API) ---
    const { type, title, description, facility_id, data_type, period, priority, assigned_to, due_date } = req.body ?? {}

    if (!title) return res.status(400).json({ error: 'Task title is required' })

    try {
      const created = await sql`
        INSERT INTO workflow_tasks (
          org_id, type, title, description, facility_id, data_type, period,
          priority, assigned_to, due_date, submitted_by
        ) VALUES (
          ${token.org}, ${type || 'review'}, ${title}, ${description || null},
          ${facility_id || null}, ${data_type || null}, ${period || null},
          ${priority || 'medium'}, ${assigned_to || null}, ${due_date || null},
          ${token.sub}
        )
        RETURNING *
      `
      return res.status(201).json(created[0])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
