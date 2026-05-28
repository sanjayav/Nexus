import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getDb } from '../_db.js'
import { signToken, signPurposeToken, cors } from '../_auth.js'
import { checkRateLimit, clientIp } from '../_rateLimit.js'
import { audit } from '../_audit.js'

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(200),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Rate limit BEFORE bcrypt — prevents brute-force CPU exhaustion + credential stuffing.
  const allowed = await checkRateLimit(req, res, {
    key: `login:${clientIp(req)}`,
    windowSeconds: 60,
    max: 10,
  })
  if (!allowed) return

  try { loginSchema.parse(req.body) } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
    throw e
  }
  const { email, password } = req.body ?? {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const sql = getDb()

  try {
    const rows = await sql`
      SELECT u.id, u.org_id, u.email, u.name, u.password_hash, u.is_active, u.avatar_url,
             u.preferred_framework_id,
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
      WHERE u.email = ${email.toLowerCase().trim()}
      GROUP BY u.id, o.region
    `

    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' })

    const user = rows[0]
    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' })

    // SSO-provisioned users carry a zero-length password_hash. Block any
    // password-based login attempt against them — they must use the SSO flow.
    if (!user.password_hash || user.password_hash.length === 0) {
      return res.status(401).json({ error: 'This account uses SSO. Sign in via SSO.' })
    }

    const valid = bcrypt.compareSync(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const region = (user.org_region === 'eu' || user.org_region === 'apac') ? user.org_region : 'us'

    // MFA gate: if the user has TOTP enabled, don't issue the full session JWT.
    // Instead, issue a short-lived purpose='mfa' temp token; the client posts
    // it together with the TOTP code to /api/auth/mfa/verify to complete login.
    // Users WITHOUT MFA (no row, or row with enabled=false) fall through to
    // the original behaviour so we don't disrupt existing accounts.
    const mfaRows = (await sql`
      SELECT enabled FROM user_mfa WHERE user_id = ${user.id} LIMIT 1
    `) as Array<{ enabled: boolean }>
    if (mfaRows.length > 0 && mfaRows[0].enabled) {
      const tempToken = await signPurposeToken({
        sub: user.id,
        org: user.org_id,
        email: user.email,
        org_region: region,
        purpose: 'mfa',
      }, '5m')
      return res.status(200).json({ mfaRequired: true, tempToken })
    }

    // Update last login (only for non-MFA flow — MFA verify updates it on success)
    await sql`UPDATE users SET last_login = now() WHERE id = ${user.id}`

    // Audit the successful login. Non-blocking — failure is logged, never thrown.
    await audit({
      orgId: user.org_id,
      userId: user.id,
      action: 'auth.login',
      resourceType: 'user',
      resourceId: user.id,
      details: { email: user.email },
      ip: clientIp(req),
    })

    const token = await signToken({
      sub: user.id,
      org: user.org_id,
      email: user.email,
      org_region: region,
    })

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        orgId: user.org_id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        preferredFrameworkId: user.preferred_framework_id ?? 'gri',
        roles: (user.role_slugs ?? []).filter(Boolean),
        roleNames: (user.role_names ?? []).filter(Boolean),
        permissions: (user.permissions ?? []).filter(Boolean),
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
