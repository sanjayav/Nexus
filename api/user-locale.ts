import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { cors, verifyToken } from './_auth.js'
import { getDb } from './_db.js'
import { SUPPORTED_LOCALES } from './_i18n.js'
import { loadUserLocale, resolveRequestLocale } from './_orgSettings.js'

/**
 * The signed-in user's language preference (users.locale, api/_cnSchema.ts).
 *
 *   GET /api/user-locale
 *     → { locale: 'en'|'zh'|'th'|null, resolved, supported }
 *       `locale` is the stored preference; `resolved` is what the server will
 *       use for this request (user.locale → Accept-Language → org market → en).
 *
 *   PUT /api/user-locale   { locale: 'en'|'zh'|'th'|null }
 *     Self-service, any signed-in user. null clears the preference (the
 *     server then follows Accept-Language / the org market). Server-rendered
 *     notifications and emails use this value for the recipient.
 */
const bodySchema = z.object({ locale: z.enum(SUPPORTED_LOCALES).nullable() }).strict()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  const sql = getDb()

  try {
    if (req.method === 'GET') {
      const [locale, resolved] = await Promise.all([
        loadUserLocale(sql, token.sub),
        resolveRequestLocale(sql, req, token),
      ])
      return res.status(200).json({ locale, resolved, supported: SUPPORTED_LOCALES })
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const parsed = bodySchema.safeParse(req.body ?? {})
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' })
      const rows = (await sql`
        UPDATE users SET locale = ${parsed.data.locale}
        WHERE id = ${token.sub} AND org_id = ${token.org}
        RETURNING id
      `) as Array<{ id: string }>
      if (rows.length === 0) return res.status(404).json({ error: 'User not found' })
      const resolved = await resolveRequestLocale(sql, req, token)
      return res.status(200).json({ locale: parsed.data.locale, resolved, supported: SUPPORTED_LOCALES })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
