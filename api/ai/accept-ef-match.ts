import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { cors, requirePermission } from '../_auth.js'
import { getDb } from '../_db.js'

const schema = z.object({
  matchId: z.string().uuid(),
})

// Marks an ai_ef_matches row as accepted by the current user. Provides the
// audit-trail signal we need to score AI match quality over time — every
// "Use this EF" click in the Scope 3 calculator UI should call this so we
// can later compute precision@1 / acceptance rate per category.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const t = await requirePermission(req, res, 'calculators.edit')
  if (!t) return

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(req.body)
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
    throw e
  }

  const sql = getDb()
  try {
    const updated = (await sql`
      UPDATE ai_ef_matches
      SET accepted = true,
          accepted_by = ${t.sub.startsWith('apikey:') ? null : t.sub},
          accepted_at = now()
      WHERE id = ${body.matchId} AND org_id = ${t.org}
      RETURNING id, accepted_at
    `) as Array<{ id: string; accepted_at: string }>
    if (updated.length === 0) return res.status(404).json({ error: 'Match not found' })
    return res.status(200).json({ ok: true, id: updated[0].id, acceptedAt: updated[0].accepted_at })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: msg })
  }
}
