import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db'
import { verifyToken, cors } from '../_auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const reportId = req.query.id as string
  if (!reportId) return res.status(400).json({ error: 'Report ID required' })

  const sql = getDb()

  // GET — single report
  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT r.*, u.name AS generated_by_name
        FROM reports r
        LEFT JOIN users u ON u.id = r.generated_by
        WHERE r.id = ${reportId} AND r.org_id = ${token.org}
      `
      if (rows.length === 0) return res.status(404).json({ error: 'Report not found' })
      return res.status(200).json(rows[0])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  // PUT — update report status, assurance_status, published_at
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const { status, assurance_status, title, framework_id, framework_name, period, format, pages } = req.body ?? {}

    try {
      const check = await sql`SELECT id FROM reports WHERE id = ${reportId} AND org_id = ${token.org}`
      if (check.length === 0) return res.status(404).json({ error: 'Report not found' })

      if (title !== undefined) await sql`UPDATE reports SET title = ${title} WHERE id = ${reportId}`
      if (framework_id !== undefined) await sql`UPDATE reports SET framework_id = ${framework_id} WHERE id = ${reportId}`
      if (framework_name !== undefined) await sql`UPDATE reports SET framework_name = ${framework_name} WHERE id = ${reportId}`
      if (period !== undefined) await sql`UPDATE reports SET period = ${period} WHERE id = ${reportId}`
      if (format !== undefined) await sql`UPDATE reports SET format = ${format} WHERE id = ${reportId}`
      if (pages !== undefined) await sql`UPDATE reports SET pages = ${Number(pages)} WHERE id = ${reportId}`
      if (assurance_status !== undefined) await sql`UPDATE reports SET assurance_status = ${assurance_status} WHERE id = ${reportId}`

      if (status !== undefined) {
        await sql`UPDATE reports SET status = ${status} WHERE id = ${reportId}`

        // Auto-set published_at when status becomes 'published'
        if (status === 'published') {
          await sql`UPDATE reports SET published_at = now() WHERE id = ${reportId}`
        }
      }

      const updated = await sql`
        SELECT r.*, u.name AS generated_by_name
        FROM reports r
        LEFT JOIN users u ON u.id = r.generated_by
        WHERE r.id = ${reportId}
      `
      return res.status(200).json(updated[0])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
