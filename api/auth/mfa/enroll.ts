import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import * as OTPAuth from 'otpauth'
import { getDb } from '../../_db.js'
import { cors, verifyToken } from '../../_auth.js'
import { encrypt } from '../../_crypto.js'

/**
 * POST /api/auth/mfa/enroll
 *
 * Issues a pending TOTP secret + 10 single-use recovery codes for the
 * authenticated user. Idempotent — calling again before verify-enroll rotates
 * the pending secret so the user can re-scan if they lost the QR.
 *
 * Returns { otpauthUri, secret, recoveryCodes }. The recoveryCodes are shown
 * to the user ONCE — only their sha256 hashes are persisted.
 *
 * SSO-provisioned users (empty password_hash) are blocked — they delegate
 * authentication entirely to the IdP and shouldn't manage TOTP here.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  try {
    const userRows = (await sql`
      SELECT id, email, password_hash FROM users WHERE id = ${token.sub} LIMIT 1
    `) as Array<{ id: string; email: string; password_hash: string | null }>
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' })
    const user = userRows[0]

    // SSO users delegate auth to their IdP — TOTP enrollment doesn't apply.
    if (!user.password_hash || user.password_hash.length === 0) {
      return res.status(400).json({ error: 'MFA is managed by your identity provider for SSO accounts.' })
    }

    // If already fully enabled, refuse a second enroll — caller should disable first.
    const existing = (await sql`
      SELECT enabled FROM user_mfa WHERE user_id = ${user.id} LIMIT 1
    `) as Array<{ enabled: boolean }>
    if (existing.length > 0 && existing[0].enabled) {
      return res.status(409).json({ error: 'MFA already enabled. Disable it before re-enrolling.' })
    }

    // 20 bytes = 160-bit secret — RFC 4226 §4 recommended length for SHA-1 HOTP/TOTP.
    const secret = new OTPAuth.Secret({ size: 20 })
    const totp = new OTPAuth.TOTP({
      issuer: 'Nexus',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    })
    const otpauthUri = totp.toString()

    // Generate 10 single-use recovery codes. 5 random bytes → 10 hex chars.
    const recoveryCodes: string[] = []
    const hashedRecoveryCodes: Array<{ hash: string; used: boolean }> = []
    for (let i = 0; i < 10; i++) {
      const raw = crypto.randomBytes(5).toString('hex')
      recoveryCodes.push(raw)
      hashedRecoveryCodes.push({
        hash: crypto.createHash('sha256').update(raw).digest('hex'),
        used: false,
      })
    }

    const secretEnc = encrypt(secret.base32)
    const recoveryEnc = encrypt(JSON.stringify(hashedRecoveryCodes))

    // Upsert — replaces any pending non-enabled secret so re-enroll works.
    await sql`
      INSERT INTO user_mfa (user_id, secret_enc, enabled, recovery_codes_enc)
      VALUES (${user.id}, ${secretEnc}, false, ${recoveryEnc})
      ON CONFLICT (user_id) DO UPDATE
        SET secret_enc = EXCLUDED.secret_enc,
            recovery_codes_enc = EXCLUDED.recovery_codes_enc,
            enabled = false,
            last_used_at = NULL
    `

    return res.status(200).json({
      otpauthUri,
      secret: secret.base32,
      recoveryCodes,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
