import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as OTPAuth from 'otpauth'
import { z } from 'zod'
import { getDb } from '../../_db.js'
import { cors, verifyToken } from '../../_auth.js'
import { decrypt } from '../../_crypto.js'

const schema = z.object({
  code: z.string().min(6).max(8),
})

/**
 * POST /api/auth/mfa/verify-enroll
 * Body: { code }. Completes TOTP enrollment by verifying the first code from
 * the user's authenticator. On success, flips `enabled = true` so the next
 * login flow requires the code.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  let body: { code: string }
  try {
    body = schema.parse(req.body)
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
    throw e
  }
  const code = body.code.replace(/\s+/g, '')

  const sql = getDb()
  try {
    const rows = (await sql`
      SELECT secret_enc, enabled FROM user_mfa WHERE user_id = ${token.sub} LIMIT 1
    `) as Array<{ secret_enc: string; enabled: boolean }>
    if (rows.length === 0) return res.status(400).json({ error: 'No pending enrollment. Start with /enroll.' })
    if (rows[0].enabled) return res.status(409).json({ error: 'MFA already enabled.' })

    const secretBase32 = decrypt(rows[0].secret_enc)
    const totp = new OTPAuth.TOTP({
      issuer: 'Nexus',
      label: token.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    })
    // window: 1 = accept current ±1 step (±30s) for small clock drift.
    const delta = totp.validate({ token: code, window: 1 })
    if (delta === null) return res.status(400).json({ error: 'Invalid code. Try again.' })

    await sql`
      UPDATE user_mfa SET enabled = true, last_used_at = now() WHERE user_id = ${token.sub}
    `

    return res.status(200).json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
