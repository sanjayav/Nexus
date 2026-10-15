import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors, requirePermission } from './_auth.js'
import { getLiveblocks, orgRoomPattern } from './_liveblocks.js'
import { colorFor } from './_color.js'

/**
 * Liveblocks JWT signer. Called by the browser client to obtain a short-lived
 * room token. Returns 503 when `LIVEBLOCKS_SECRET_KEY` isn't configured so the
 * editor can render without realtime collab.
 *
 * Authorisation model: the caller must hold `dashboard.view` (the broadest
 * authenticated-user permission). We then grant `FULL_ACCESS` only to rooms
 * that match `nexus:<orgId>:*`, so two orgs can never share a room.
 *
 * User-info forwarded to peers: `name`, `email`, `color`. Email is what
 * already shows in comment threads and audit logs, so this isn't new PII.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const t = await requirePermission(req, res, 'dashboard.view')
  if (!t) return

  let liveblocks
  try {
    liveblocks = getLiveblocks()
  } catch (err) {
    // Surface in logs but return a soft 503 — the client treats this as
    // "collab disabled, render the editor anyway".
    // eslint-disable-next-line no-console
    console.warn('[liveblocks-auth] not configured:', err instanceof Error ? err.message : err)
    return res.status(503).json({ error: 'Realtime collaboration not configured' })
  }

  try {
    const session = liveblocks.prepareSession(t.sub, {
      userInfo: {
        name: t.email.split('@')[0],
        email: t.email,
        color: colorFor(t.sub),
      },
    })

    // Wildcard scope: any framework room inside the caller's org, never
    // outside it. The wildcard pattern is constructed from the JWT's `org`
    // claim, so a caller can't spoof another tenant by passing a room id.
    session.allow(orgRoomPattern(t.org), session.FULL_ACCESS)

    const { status, body } = await session.authorize()
    return res.status(status).send(body)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown'
    // eslint-disable-next-line no-console
    console.error('[liveblocks-auth] authorize failed:', msg)
    return res.status(500).json({ error: msg })
  }
}
