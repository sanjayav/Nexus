import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import * as OTPAuth from 'otpauth'
import { z } from 'zod'
import { getDb } from '../../_db.js'
import { cors, signToken, verifyPurposeToken } from '../../_auth.js'
import { decrypt, encrypt } from '../../_crypto.js'

const schema = z.object({
  tempToken: z.string().min(1).max(2000),
  code: z.string().min(6).max(20),
})

interface RecoveryEntry { hash: string; used: boolean }

/**
 * POST /api/auth/mfa/verify
 * Body: { tempToken, code }. Consumes the short-lived MFA challenge token
 * issued by /api/auth/login (purpose: 'mfa') plus the user's TOTP code (or a
 * recovery code), and on success returns the full session JWT + user payload.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body: { tempToken: string; code: string }
  try {
    body = schema.parse(req.body)
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
    throw e
  }

  const purposeToken = await verifyPurposeToken(body.tempToken, 'mfa')
  if (!purposeToken) return res.status(401).json({ error: 'MFA session expired. Sign in again.' })

  const code = body.code.replace(/\s+/g, '')
  const sql = getDb()

  try {
    const rows = (await sql`
      SELECT secret_enc, enabled, recovery_codes_enc FROM user_mfa WHERE user_id = ${purposeToken.sub} LIMIT 1
    `) as Array<{ secret_enc: string; enabled: boolean; recovery_codes_enc: string | null }>
    if (rows.length === 0 || !rows[0].enabled) {
      return res.status(400).json({ error: 'MFA not enabled for this account.' })
    }

    let ok = false
    let usedRecovery = false

    // Try TOTP first (6 digits). If shape doesn't match, treat as a recovery code.
    const looksLikeTotp = /^\d{6,8}$/.test(code)
    if (looksLikeTotp) {
      const secretBase32 = decrypt(rows[0].secret_enc)
      const totp = new OTPAuth.TOTP({
        issuer: 'Nexus',
        label: purposeToken.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secretBase32),
      })
      const delta = totp.validate({ token: code, window: 1 })
      ok = delta !== null
    }

    // Fallback: recovery code (10 hex chars). Single-use, timing-safe compare.
    if (!ok && rows[0].recovery_codes_enc) {
      const list: RecoveryEntry[] = JSON.parse(decrypt(rows[0].recovery_codes_enc))
      const candidateHash = crypto.createHash('sha256').update(code.toLowerCase()).digest('hex')
      const candidateBuf = Buffer.from(candidateHash, 'hex')
      for (const entry of list) {
        if (entry.used) continue
        const storedBuf = Buffer.from(entry.hash, 'hex')
        if (storedBuf.length !== candidateBuf.length) continue
        if (crypto.timingSafeEqual(storedBuf, candidateBuf)) {
          entry.used = true
          ok = true
          usedRecovery = true
          break
        }
      }
      if (usedRecovery) {
        const reEnc = encrypt(JSON.stringify(list))
        await sql`UPDATE user_mfa SET recovery_codes_enc = ${reEnc} WHERE user_id = ${purposeToken.sub}`
      }
    }

    if (!ok) return res.status(400).json({ error: 'Invalid code.' })

    await sql`UPDATE user_mfa SET last_used_at = now() WHERE user_id = ${purposeToken.sub}`
    await sql`UPDATE users SET last_login = now() WHERE id = ${purposeToken.sub}`

    // Build the full session payload, matching the login endpoint shape.
    const userRows = (await sql`
      SELECT u.id, u.org_id, u.email, u.name, u.avatar_url, u.preferred_framework_id,
             o.region AS org_region,
             array_agg(DISTINCT r.slug) AS role_slugs,
             array_agg(DISTINCT r.name) AS role_names,
             array_agg(DISTINCT p.resource || '.' || p.action) AS permissions
      FROM users u
      LEFT JOIN organisations o ON o.id = u.org_id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE u.id = ${purposeToken.sub}
      GROUP BY u.id, o.region
    `) as Array<{
      id: string; org_id: string; email: string; name: string; avatar_url: string | null;
      preferred_framework_id: string | null;
      org_region: string | null;
      role_slugs: (string | null)[] | null; role_names: (string | null)[] | null; permissions: (string | null)[] | null;
    }>
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' })
    const u = userRows[0]

    const region: 'us' | 'eu' | 'apac' = (u.org_region === 'eu' || u.org_region === 'apac') ? u.org_region : 'us'
    const sessionToken = await signToken({
      sub: u.id,
      org: u.org_id,
      email: u.email,
      org_region: region,
    })

    return res.status(200).json({
      token: sessionToken,
      usedRecoveryCode: usedRecovery,
      user: {
        id: u.id,
        orgId: u.org_id,
        email: u.email,
        name: u.name,
        avatarUrl: u.avatar_url,
        preferredFrameworkId: u.preferred_framework_id ?? 'gri',
        roles: (u.role_slugs ?? []).filter(Boolean),
        roleNames: (u.role_names ?? []).filter(Boolean),
        permissions: (u.permissions ?? []).filter(Boolean),
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
