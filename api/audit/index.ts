import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db'
import { verifyToken, cors } from '../_auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { resource_type, user_id } = req.query as Record<string, string | undefined>

  const sql = getDb()

  try {
    const rows = await sql`
      SELECT al.*, u.name AS user_name
      FROM audit_log al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE al.org_id = ${token.org}
        AND (${resource_type || null}::text IS NULL OR al.resource_type = ${resource_type || null})
        AND (${user_id || null}::uuid IS NULL OR al.user_id = ${user_id || null}::uuid)
      ORDER BY al.created_at DESC
      LIMIT 200
    `
    return res.status(200).json(rows)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
