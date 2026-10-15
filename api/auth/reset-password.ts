import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import * as bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getDb } from '../_db.js'
import { cors } from '../_auth.js'

const resetSchema = z.object({
  token: z.string().min(1).max(500),
  password: z.string().min(6).max(200),
})

/**
 * POST /api/auth/reset-password
 * Body: { token, password }. Validates the token (sha256 → row lookup),
 * checks expiry + used_at, marks used, then rotates the user's password hash.
 * Also re-activates the user if they were soft-deactivated.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body: { token: string; password: string }
  try {
    body = resetSchema.parse(req.body)
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
    throw e
  }

  const tokenHash = crypto.createHash('sha256').update(body.token).digest('hex')
  const sql = getDb()

  try {
    const rows = (await sql`
      SELECT id, user_id, expires_at, used_at
      FROM password_resets
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    `) as Array<{ id: string; user_id: string; expires_at: string; used_at: string | null }>

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link.' })
    }
    const row = rows[0]
    if (row.used_at) {
      return res.status(400).json({ error: 'This reset link has already been used.' })
    }
    if (new Date(row.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This reset link has expired. Request a new one.' })
    }

    const hash = bcrypt.hashSync(body.password, 10)

    await sql`
      UPDATE password_resets SET used_at = now() WHERE id = ${row.id}
    `
    await sql`
      UPDATE users SET password_hash = ${hash}, is_active = true WHERE id = ${row.user_id}
    `

    return res.status(200).json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
