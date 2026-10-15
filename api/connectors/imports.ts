import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors, requirePermission } from '../_auth.js'
import { getDb } from '../_db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = await requirePermission(req, res, 'data.view')
  if (!token) return

  const sql = getDb()

  try {
    const rows = await sql`
      SELECT ci.id, ci.template_id, ct.name AS template_name, ct.source AS template_source,
             ci.file_name, ci.rows_total, ci.rows_imported, ci.rows_failed,
             ci.status, ci.errors, ci.imported_by, u.name AS imported_by_name,
             ci.created_at
      FROM connector_imports ci
      LEFT JOIN connector_templates ct ON ct.id = ci.template_id
      LEFT JOIN users u ON u.id = ci.imported_by
      WHERE ci.org_id = ${token.org}
      ORDER BY ci.created_at DESC
      LIMIT 100
    `
    return res.status(200).json(rows)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
