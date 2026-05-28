import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './_db.js'
import { verifyToken, cors } from './_auth.js'

// GET    /api/notifications?limit=20&offset=0&kind=approval
//        → paginated notifications for the caller. RBAC: each user only sees
//          their own notifications (recipient_email = token.email).
// POST   /api/notifications
//        { action: 'mark-read', id: <uuid|'all'> }
//        { action: 'mark-all-read' }
//
// The existing /api/org?view=notifications endpoints remain for backward
// compatibility with older clients.

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()
  const email = token.email.toLowerCase()

  try {
    if (req.method === 'GET') {
      const limit = Math.min(Math.max(Number(req.query.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT)
      const offset = Math.max(Number(req.query.offset ?? 0), 0)
      const kind = req.query.kind ? String(req.query.kind) : null

      const rows = kind
        ? await sql`
            SELECT id, kind, subject, body, route, related_assignment_id,
                   read_at, email_sent_at, email_error, created_at
            FROM notifications
            WHERE org_id = ${token.org}
              AND lower(recipient_email) = ${email}
              AND kind = ${kind}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `
        : await sql`
            SELECT id, kind, subject, body, route, related_assignment_id,
                   read_at, email_sent_at, email_error, created_at
            FROM notifications
            WHERE org_id = ${token.org}
              AND lower(recipient_email) = ${email}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `

      const unreadRows = await sql`
        SELECT COUNT(*)::int AS n FROM notifications
        WHERE org_id = ${token.org}
          AND lower(recipient_email) = ${email}
          AND read_at IS NULL
      ` as Array<{ n: number }>

      const totalRows = await sql`
        SELECT COUNT(*)::int AS n FROM notifications
        WHERE org_id = ${token.org}
          AND lower(recipient_email) = ${email}
      ` as Array<{ n: number }>

      return res.status(200).json({
        notifications: rows,
        unread: unreadRows[0]?.n ?? 0,
        total: totalRows[0]?.n ?? 0,
        limit,
        offset,
      })
    }

    if (req.method === 'POST') {
      const { action, id } = req.body ?? {}
      if (action === 'mark-all-read') {
        await sql`
          UPDATE notifications SET read_at = now()
          WHERE org_id = ${token.org}
            AND lower(recipient_email) = ${email}
            AND read_at IS NULL
        `
        return res.status(200).json({ ok: true })
      }
      if (action === 'mark-read') {
        if (!id) return res.status(400).json({ error: 'id required ("all" or a uuid)' })
        if (id === 'all') {
          await sql`
            UPDATE notifications SET read_at = now()
            WHERE org_id = ${token.org}
              AND lower(recipient_email) = ${email}
              AND read_at IS NULL
          `
        } else {
          await sql`
            UPDATE notifications SET read_at = now()
            WHERE id = ${id} AND lower(recipient_email) = ${email}
          `
        }
        return res.status(200).json({ ok: true })
      }
      return res.status(400).json({ error: 'Unknown action' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
