import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db'
import { verifyToken, cors } from '../_auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  // GET — list disclosure responses for org
  if (req.method === 'GET') {
    const { framework_code, period_year, status } = req.query as Record<string, string | undefined>

    try {
      const rows = await sql`
        SELECT dr.*, u.name AS updated_by_name
        FROM disclosure_responses dr
        LEFT JOIN users u ON u.id = dr.updated_by
        WHERE dr.org_id = ${token.org}
          AND (${framework_code || null}::text IS NULL OR dr.framework_code = ${framework_code || null})
          AND (${period_year || null}::int IS NULL OR dr.period_year = ${period_year ? Number(period_year) : null})
          AND (${status || null}::text IS NULL OR dr.status = ${status || null})
        ORDER BY dr.framework_code, dr.disclosure_code, dr.period_year DESC
      `
      return res.status(200).json(rows)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  // POST — create or update (upsert) disclosure response
  if (req.method === 'POST') {
    const { framework_code, disclosure_code, period_year, response_data, status } = req.body ?? {}

    if (!framework_code || !disclosure_code || !period_year) {
      return res.status(400).json({ error: 'framework_code, disclosure_code, and period_year are required' })
    }

    try {
      const upserted = await sql`
        INSERT INTO disclosure_responses (
          org_id, framework_code, disclosure_code, period_year,
          response_data, status, updated_by, updated_at
        ) VALUES (
          ${token.org}, ${framework_code}, ${disclosure_code}, ${Number(period_year)},
          ${response_data ? JSON.stringify(response_data) : null}::jsonb,
          ${status || 'draft'}, ${token.sub}, now()
        )
        ON CONFLICT (org_id, framework_code, disclosure_code, period_year)
        DO UPDATE SET
          response_data = EXCLUDED.response_data,
          status = EXCLUDED.status,
          updated_by = EXCLUDED.updated_by,
          updated_at = now()
        RETURNING *
      `
      return res.status(201).json(upserted[0])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
