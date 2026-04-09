import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db'
import { verifyToken, cors } from '../_auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  // GET — list activity data for org with filters
  if (req.method === 'GET') {
    const { facility_id, scope, period_year, period_month, status } = req.query as Record<string, string | undefined>

    try {
      const rows = await sql`
        SELECT ad.*, f.name AS facility_name
        FROM activity_data ad
        LEFT JOIN facilities f ON f.id = ad.facility_id
        WHERE ad.org_id = ${token.org}
          AND (${facility_id || null}::uuid IS NULL OR ad.facility_id = ${facility_id || null}::uuid)
          AND (${scope || null}::text IS NULL OR ad.scope = ${scope || null})
          AND (${period_year || null}::int IS NULL OR ad.period_year = ${period_year ? Number(period_year) : null})
          AND (${period_month || null}::int IS NULL OR ad.period_month = ${period_month ? Number(period_month) : null})
          AND (${status || null}::text IS NULL OR ad.status = ${status || null})
        ORDER BY ad.period_year DESC, ad.period_month DESC, ad.created_at DESC
        LIMIT 500
      `
      return res.status(200).json(rows)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  // POST — create activity data record
  if (req.method === 'POST') {
    const {
      facility_id, source_id, period_year, period_month,
      scope, category, subcategory, fuel_type,
      activity_value, activity_unit, emission_factor, ef_source, ef_unit,
      co2e_tonnes, co2, ch4, n2o, notes
    } = req.body ?? {}

    if (!facility_id || !period_year || !scope) {
      return res.status(400).json({ error: 'facility_id, period_year, and scope are required' })
    }

    try {
      // Verify facility belongs to org
      const fCheck = await sql`SELECT id FROM facilities WHERE id = ${facility_id} AND org_id = ${token.org}`
      if (fCheck.length === 0) return res.status(404).json({ error: 'Facility not found in your organization' })

      const created = await sql`
        INSERT INTO activity_data (
          org_id, facility_id, source_id, period_year, period_month,
          scope, category, subcategory, fuel_type,
          activity_value, activity_unit, emission_factor, ef_source, ef_unit,
          co2e_tonnes, co2, ch4, n2o, notes,
          submitted_by, status
        ) VALUES (
          ${token.org}, ${facility_id}, ${source_id || null}, ${Number(period_year)}, ${period_month ? Number(period_month) : null},
          ${scope}, ${category || null}, ${subcategory || null}, ${fuel_type || null},
          ${activity_value != null ? Number(activity_value) : null}, ${activity_unit || null},
          ${emission_factor != null ? Number(emission_factor) : null}, ${ef_source || null}, ${ef_unit || null},
          ${co2e_tonnes != null ? Number(co2e_tonnes) : null},
          ${co2 != null ? Number(co2) : null},
          ${ch4 != null ? Number(ch4) : null},
          ${n2o != null ? Number(n2o) : null},
          ${notes || null},
          ${token.sub}, 'draft'
        )
        RETURNING *
      `
      return res.status(201).json(created[0])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
