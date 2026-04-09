import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db'
import { verifyToken, cors } from '../_auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const recordId = req.query.id as string
  if (!recordId) return res.status(400).json({ error: 'Record ID required' })

  const sql = getDb()

  // GET — single activity data record
  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT ad.*, f.name AS facility_name
        FROM activity_data ad
        LEFT JOIN facilities f ON f.id = ad.facility_id
        WHERE ad.id = ${recordId} AND ad.org_id = ${token.org}
      `
      if (rows.length === 0) return res.status(404).json({ error: 'Record not found' })
      return res.status(200).json(rows[0])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  // PUT — update activity data record
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const {
      facility_id, source_id, period_year, period_month,
      scope, category, subcategory, fuel_type,
      activity_value, activity_unit, emission_factor, ef_source, ef_unit,
      co2e_tonnes, co2, ch4, n2o, notes, status
    } = req.body ?? {}

    try {
      const check = await sql`SELECT id, status FROM activity_data WHERE id = ${recordId} AND org_id = ${token.org}`
      if (check.length === 0) return res.status(404).json({ error: 'Record not found' })

      // Update data fields
      if (facility_id !== undefined) await sql`UPDATE activity_data SET facility_id = ${facility_id} WHERE id = ${recordId}`
      if (source_id !== undefined) await sql`UPDATE activity_data SET source_id = ${source_id} WHERE id = ${recordId}`
      if (period_year !== undefined) await sql`UPDATE activity_data SET period_year = ${Number(period_year)} WHERE id = ${recordId}`
      if (period_month !== undefined) await sql`UPDATE activity_data SET period_month = ${Number(period_month)} WHERE id = ${recordId}`
      if (scope !== undefined) await sql`UPDATE activity_data SET scope = ${scope} WHERE id = ${recordId}`
      if (category !== undefined) await sql`UPDATE activity_data SET category = ${category} WHERE id = ${recordId}`
      if (subcategory !== undefined) await sql`UPDATE activity_data SET subcategory = ${subcategory} WHERE id = ${recordId}`
      if (fuel_type !== undefined) await sql`UPDATE activity_data SET fuel_type = ${fuel_type} WHERE id = ${recordId}`
      if (activity_value !== undefined) await sql`UPDATE activity_data SET activity_value = ${Number(activity_value)} WHERE id = ${recordId}`
      if (activity_unit !== undefined) await sql`UPDATE activity_data SET activity_unit = ${activity_unit} WHERE id = ${recordId}`
      if (emission_factor !== undefined) await sql`UPDATE activity_data SET emission_factor = ${Number(emission_factor)} WHERE id = ${recordId}`
      if (ef_source !== undefined) await sql`UPDATE activity_data SET ef_source = ${ef_source} WHERE id = ${recordId}`
      if (ef_unit !== undefined) await sql`UPDATE activity_data SET ef_unit = ${ef_unit} WHERE id = ${recordId}`
      if (co2e_tonnes !== undefined) await sql`UPDATE activity_data SET co2e_tonnes = ${Number(co2e_tonnes)} WHERE id = ${recordId}`
      if (co2 !== undefined) await sql`UPDATE activity_data SET co2 = ${Number(co2)} WHERE id = ${recordId}`
      if (ch4 !== undefined) await sql`UPDATE activity_data SET ch4 = ${Number(ch4)} WHERE id = ${recordId}`
      if (n2o !== undefined) await sql`UPDATE activity_data SET n2o = ${Number(n2o)} WHERE id = ${recordId}`
      if (notes !== undefined) await sql`UPDATE activity_data SET notes = ${notes} WHERE id = ${recordId}`

      // Handle status transitions
      if (status !== undefined) {
        await sql`UPDATE activity_data SET status = ${status} WHERE id = ${recordId}`

        if (status === 'submitted') {
          await sql`UPDATE activity_data SET submitted_at = now(), submitted_by = ${token.sub} WHERE id = ${recordId}`
        } else if (status === 'approved') {
          await sql`UPDATE activity_data SET approved_at = now(), approved_by = ${token.sub} WHERE id = ${recordId}`
        }
      }

      const updated = await sql`
        SELECT ad.*, f.name AS facility_name
        FROM activity_data ad
        LEFT JOIN facilities f ON f.id = ad.facility_id
        WHERE ad.id = ${recordId}
      `
      return res.status(200).json(updated[0])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  // DELETE — only if status is draft
  if (req.method === 'DELETE') {
    try {
      const check = await sql`SELECT id, status FROM activity_data WHERE id = ${recordId} AND org_id = ${token.org}`
      if (check.length === 0) return res.status(404).json({ error: 'Record not found' })
      if (check[0].status !== 'draft') return res.status(403).json({ error: 'Only draft records can be deleted' })

      await sql`DELETE FROM activity_data WHERE id = ${recordId}`
      return res.status(200).json({ ok: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
