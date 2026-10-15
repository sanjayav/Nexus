import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../../_db.js'
import { cors, verifyToken } from '../../_auth.js'

/**
 * GET /api/auth/mfa/status
 * Returns {enrolled, enabled, lastUsedAt} for the authenticated user. Used by
 * Settings to decide whether to render "Enable 2FA" vs "Disable 2FA".
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()
  try {
    const rows = (await sql`
      SELECT enabled, last_used_at FROM user_mfa WHERE user_id = ${token.sub} LIMIT 1
    `) as Array<{ enabled: boolean; last_used_at: string | null }>
    if (rows.length === 0) {
      return res.status(200).json({ enrolled: false, enabled: false, lastUsedAt: null })
    }
    return res.status(200).json({
      enrolled: true,
      enabled: rows[0].enabled,
      lastUsedAt: rows[0].last_used_at,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
