import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../../_db.js'
import { cors } from '../../_auth.js'
import { getWorkOS } from '../../_workos.js'

/**
 * Public, unauthenticated lookup: does an email's domain have an SSO
 * connection configured? Used by the login page to swap the password
 * field for a "Continue with SSO" CTA.
 *
 * Returns { ssoAvailable: false } when WorkOS isn't configured rather than
 * 503, so the UI quietly falls back to password auth.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const email = typeof req.query.email === 'string' ? req.query.email : ''
  const domain = email.toLowerCase().trim().split('@')[1]
  if (!domain) return res.status(200).json({ ssoAvailable: false })

  if (!getWorkOS()) return res.status(200).json({ ssoAvailable: false })

  try {
    const sql = getDb()
    const rows = await sql`
      SELECT connection_id, provider FROM sso_connections
      WHERE domain = ${domain} AND is_active = true
      LIMIT 1
    ` as Array<{ connection_id: string; provider: string }>

    if (rows.length === 0) return res.status(200).json({ ssoAvailable: false })
    return res.status(200).json({
      ssoAvailable: true,
      connectionId: rows[0].connection_id,
      providerName: rows[0].provider,
    })
  } catch {
    // Don't leak DB errors to an unauthenticated endpoint.
    return res.status(200).json({ ssoAvailable: false })
  }
}
