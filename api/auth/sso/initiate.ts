import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { SignJWT } from 'jose'
import { getDb } from '../../_db.js'
import { cors } from '../../_auth.js'
import { checkRateLimit, clientIp } from '../../_rateLimit.js'
import { getWorkOS, getRedirectUri, getClientId, ssoUnavailable } from '../../_workos.js'

const initiateSchema = z.object({
  email: z.string().email().max(320).optional(),
  organisationId: z.string().uuid().optional(),
  connectionId: z.string().max(200).optional(),
})

/**
 * Build a signed state nonce using the same JWT_SECRET as the rest of the
 * app — we only need it for ~10 minutes while WorkOS redirects through the
 * IdP and back to our callback. We reuse the secret rather than introducing
 * a separate state secret to keep config simple.
 */
async function signState(payload: Record<string, unknown>): Promise<string> {
  const raw = process.env.JWT_SECRET
  if (!raw || raw.length < 32) throw new Error('JWT_SECRET missing/short')
  const secret = new TextEncoder().encode(raw)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(secret)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const allowedInit = await checkRateLimit(req, res, {
    key: `register:${clientIp(req)}`,
    windowSeconds: 600,
    max: 5,
  })
  if (!allowedInit) return

  const workos = getWorkOS()
  const clientId = getClientId()
  if (!workos || !clientId) {
    const u = ssoUnavailable()
    return res.status(u.status).json(u.body)
  }

  let body: z.infer<typeof initiateSchema>
  try { body = initiateSchema.parse(req.body ?? {}) }
  catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
    throw e
  }

  const sql = getDb()

  try {
    // Resolve which WorkOS connection to authorize against.
    let connectionId = body.connectionId
    if (!connectionId && body.email) {
      const domain = body.email.toLowerCase().trim().split('@')[1]
      if (domain) {
        const rows = await sql`
          SELECT connection_id FROM sso_connections
          WHERE domain = ${domain} AND is_active = true
          LIMIT 1
        ` as Array<{ connection_id: string }>
        if (rows[0]) connectionId = rows[0].connection_id
      }
    }
    if (!connectionId && body.organisationId) {
      const rows = await sql`
        SELECT connection_id FROM sso_connections
        WHERE org_id = ${body.organisationId} AND is_active = true
        LIMIT 1
      ` as Array<{ connection_id: string }>
      if (rows[0]) connectionId = rows[0].connection_id
    }

    if (!connectionId) {
      return res.status(400).json({ error: 'No SSO connection found for that email/org. Ask an admin to wire up SSO first.' })
    }

    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36)
    const state = await signState({ connectionId, nonce })

    const authorizationUrl = workos.sso.getAuthorizationUrl({
      connection: connectionId,
      clientId,
      redirectUri: getRedirectUri(),
      state,
    })

    return res.status(200).json({ authorizationUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
