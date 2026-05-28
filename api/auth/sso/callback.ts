import type { VercelRequest, VercelResponse } from '@vercel/node'
import { jwtVerify } from 'jose'
import { getDb } from '../../_db.js'
import { cors, signToken } from '../../_auth.js'
import { getWorkOS, getClientId, getAppBaseUrl, ssoUnavailable } from '../../_workos.js'

async function verifyState(token: string): Promise<{ connectionId: string; nonce: string } | null> {
  const raw = process.env.JWT_SECRET
  if (!raw || raw.length < 32) return null
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(raw))
    if (typeof payload.connectionId !== 'string' || typeof payload.nonce !== 'string') return null
    return { connectionId: payload.connectionId, nonce: payload.nonce }
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const workos = getWorkOS()
  const clientId = getClientId()
  if (!workos || !clientId) {
    const u = ssoUnavailable()
    return res.status(u.status).json(u.body)
  }

  const code = typeof req.query.code === 'string' ? req.query.code : null
  const state = typeof req.query.state === 'string' ? req.query.state : null
  if (!code || !state) return res.status(400).json({ error: 'Missing code or state' })

  const stateData = await verifyState(state)
  if (!stateData) return res.status(400).json({ error: 'Invalid or expired state' })

  const sql = getDb()

  try {
    const { profile } = await workos.sso.getProfileAndToken({ code, clientId })

    // Find the org tied to this connection.
    const ssoRows = await sql`
      SELECT org_id, auto_provision, default_role_slug
      FROM sso_connections
      WHERE connection_id = ${stateData.connectionId} AND is_active = true
      LIMIT 1
    ` as Array<{ org_id: string; auto_provision: boolean; default_role_slug: string }>

    if (ssoRows.length === 0) {
      return res.status(403).json({ error: 'SSO connection not registered for any org' })
    }
    const { org_id: orgId, auto_provision: autoProvision, default_role_slug: defaultRoleSlug } = ssoRows[0]

    const email = profile.email.toLowerCase().trim()
    const firstName = (profile as { firstName?: string | null }).firstName ?? ''
    const lastName = (profile as { lastName?: string | null }).lastName ?? ''
    const name = `${firstName} ${lastName}`.trim() || email

    // Find or provision user.
    let userRows = await sql`
      SELECT id, org_id, email FROM users WHERE email = ${email} LIMIT 1
    ` as Array<{ id: string; org_id: string; email: string }>

    let user = userRows[0]
    if (!user) {
      if (!autoProvision) {
        return res.status(403).json({ error: 'Auto-provisioning disabled. Ask admin to invite this user.' })
      }
      // Insert with empty password_hash — login.ts blocks empty-hash logins.
      const inserted = await sql`
        INSERT INTO users (org_id, email, name, password_hash)
        VALUES (${orgId}, ${email}, ${name}, '')
        RETURNING id, org_id, email
      ` as Array<{ id: string; org_id: string; email: string }>
      user = inserted[0]

      // Assign default role for this org (if it exists).
      await sql`
        INSERT INTO user_roles (user_id, role_id)
        SELECT ${user.id}, id FROM roles
        WHERE org_id = ${orgId} AND slug = ${defaultRoleSlug}
        LIMIT 1
        ON CONFLICT DO NOTHING
      `
    }

    await sql`UPDATE users SET last_login = now() WHERE id = ${user.id}`

    const token = await signToken({ sub: user.id, org: user.org_id, email: user.email })

    // TODO(v2): swap query-param token for an httpOnly cookie on the same origin
    // to avoid token leakage via referrer headers / browser history.
    const dest = `${getAppBaseUrl()}/?sso_token=${encodeURIComponent(token)}`
    res.setHeader('Location', dest)
    return res.status(302).end()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
