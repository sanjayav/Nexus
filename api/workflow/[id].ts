import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db'
import { verifyToken, cors } from '../_auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const taskId = req.query.id as string
  if (!taskId) return res.status(400).json({ error: 'Task ID required' })

  const sql = getDb()

  // GET — single task with comments
  if (req.method === 'GET') {
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
        WHERE wt.id = ${taskId} AND wt.org_id = ${token.org}
      `
      if (rows.length === 0) return res.status(404).json({ error: 'Task not found' })
      return res.status(200).json(rows[0])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  // PUT — update task: status, assigned_to, add comment
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const { status, assigned_to, comment } = req.body ?? {}

    try {
      const check = await sql`SELECT id, status AS current_status FROM workflow_tasks WHERE id = ${taskId} AND org_id = ${token.org}`
      if (check.length === 0) return res.status(404).json({ error: 'Task not found' })

      const oldStatus = check[0].current_status

      // Update assigned_to
      if (assigned_to !== undefined) {
        await sql`UPDATE workflow_tasks SET assigned_to = ${assigned_to} WHERE id = ${taskId}`
      }

      // Update status
      if (status !== undefined) {
        await sql`UPDATE workflow_tasks SET status = ${status} WHERE id = ${taskId}`

        if (status === 'approved' || status === 'completed') {
          await sql`UPDATE workflow_tasks SET completed_at = now() WHERE id = ${taskId}`
        }

        // Create audit log entry for status change
        if (status !== oldStatus) {
          await sql`
            INSERT INTO audit_log (org_id, user_id, action, resource_type, resource_id, details)
            VALUES (
              ${token.org}, ${token.sub}, 'status_change', 'workflow_task', ${taskId},
              ${JSON.stringify({ from: oldStatus, to: status })}::jsonb
            )
          `
        }
      }

      // Add comment (append to JSONB array)
      if (comment) {
        // Fetch current user name for comment
        const userRows = await sql`SELECT name FROM users WHERE id = ${token.sub}`
        const userName = userRows.length > 0 ? userRows[0].name : token.email

        const commentObj = {
          userId: token.sub,
          userName,
          text: comment,
          timestamp: new Date().toISOString(),
        }

        await sql`
          UPDATE workflow_tasks
          SET comments = COALESCE(comments, '[]'::jsonb) || ${JSON.stringify(commentObj)}::jsonb
          WHERE id = ${taskId}
        `
      }

      // Return updated task
      const updated = await sql`
        SELECT
          wt.*,
          ua.name AS assigned_to_name,
          us.name AS submitted_by_name,
          f.name AS facility_name
        FROM workflow_tasks wt
        LEFT JOIN users ua ON ua.id = wt.assigned_to
        LEFT JOIN users us ON us.id = wt.submitted_by
        LEFT JOIN facilities f ON f.id = wt.facility_id
        WHERE wt.id = ${taskId}
      `
      return res.status(200).json(updated[0])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
