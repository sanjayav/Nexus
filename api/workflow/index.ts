import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db.js'
import { verifyToken, cors } from '../_auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  // GET — list workflow tasks for org
  if (req.method === 'GET') {
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

  // POST — create workflow task
  if (req.method === 'POST') {
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
