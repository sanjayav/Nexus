import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './_db.js'
import { cors, requirePermission } from './_auth.js'

// /api/facilities
//   GET → list facilities in the caller's org (active first). Gated `data.view`.
//
// Used by the calculator save-to-activity-data modal + any future facility
// picker. POST/PUT/DELETE round out the CRUD when org admins start managing
// the facility register directly; for now read is enough.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = await requirePermission(req, res, 'data.view')
  if (!token) return

  try {
    const sql = getDb()
    const rows = await sql`
      SELECT id, name, code, location, country, type, latitude, longitude,
             production_volume, is_active, created_at
      FROM facilities
      WHERE org_id = ${token.org}
      ORDER BY is_active DESC, name ASC
    `
    return res.status(200).json(rows)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
