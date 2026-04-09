import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db'
import { verifyToken, cors } from '../_auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  // GET — list reports for org
  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT r.*, u.name AS generated_by_name
        FROM reports r
        LEFT JOIN users u ON u.id = r.generated_by
        WHERE r.org_id = ${token.org}
        ORDER BY r.created_at DESC
      `
      return res.status(200).json(rows)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  // POST — create report
  if (req.method === 'POST') {
    const { framework_id, framework_name, title, period, format, pages, assurance_status } = req.body ?? {}

    if (!title) return res.status(400).json({ error: 'Report title is required' })

    try {
      const created = await sql`
        INSERT INTO reports (
          org_id, framework_id, framework_name, title, period, format, pages,
          assurance_status, generated_by
        ) VALUES (
          ${token.org}, ${framework_id || null}, ${framework_name || null}, ${title},
          ${period || null}, ${format || 'pdf'}, ${pages ? Number(pages) : null},
          ${assurance_status || 'none'}, ${token.sub}
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
