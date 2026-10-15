import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getDb } from '../../_db.js'
import { cors, verifyToken } from '../../_auth.js'

const schema = z.object({
  password: z.string().min(1).max(200),
})

/**
 * POST /api/auth/mfa/disable
 * Body: { password }. Requires password re-auth (step-up) to turn off MFA.
 * Deletes the user_mfa row outright so a fresh enroll starts from scratch.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  let body: { password: string }
  try {
    body = schema.parse(req.body)
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
    throw e
  }

  const sql = getDb()
  try {
    const rows = (await sql`
      SELECT password_hash FROM users WHERE id = ${token.sub} LIMIT 1
    `) as Array<{ password_hash: string | null }>
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' })

    const hash = rows[0].password_hash
    if (!hash || hash.length === 0) {
      return res.status(400).json({ error: 'SSO accounts cannot disable MFA here.' })
    }
    if (!bcrypt.compareSync(body.password, hash)) {
      return res.status(401).json({ error: 'Incorrect password.' })
    }

    await sql`DELETE FROM user_mfa WHERE user_id = ${token.sub}`
    return res.status(200).json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
