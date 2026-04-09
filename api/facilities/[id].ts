import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db'
import { verifyToken, cors } from '../_auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const facilityId = req.query.id as string
  if (!facilityId) return res.status(400).json({ error: 'Facility ID required' })

  const sql = getDb()

  // GET — single facility
  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT * FROM facilities
        WHERE id = ${facilityId} AND org_id = ${token.org}
      `
      if (rows.length === 0) return res.status(404).json({ error: 'Facility not found' })
      return res.status(200).json(rows[0])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  // PUT — update facility
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const { name, code, location, country, type, latitude, longitude, production_volume } = req.body ?? {}

    try {
      const check = await sql`SELECT id FROM facilities WHERE id = ${facilityId} AND org_id = ${token.org}`
      if (check.length === 0) return res.status(404).json({ error: 'Facility not found' })

      if (name !== undefined) await sql`UPDATE facilities SET name = ${name} WHERE id = ${facilityId}`
      if (code !== undefined) await sql`UPDATE facilities SET code = ${code} WHERE id = ${facilityId}`
      if (location !== undefined) await sql`UPDATE facilities SET location = ${location} WHERE id = ${facilityId}`
      if (country !== undefined) await sql`UPDATE facilities SET country = ${country} WHERE id = ${facilityId}`
      if (type !== undefined) await sql`UPDATE facilities SET type = ${type} WHERE id = ${facilityId}`
      if (latitude !== undefined) await sql`UPDATE facilities SET latitude = ${latitude} WHERE id = ${facilityId}`
      if (longitude !== undefined) await sql`UPDATE facilities SET longitude = ${longitude} WHERE id = ${facilityId}`
      if (production_volume !== undefined) await sql`UPDATE facilities SET production_volume = ${production_volume} WHERE id = ${facilityId}`

      const updated = await sql`SELECT * FROM facilities WHERE id = ${facilityId}`
      return res.status(200).json(updated[0])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  // DELETE — soft-delete (set is_active = false)
  if (req.method === 'DELETE') {
    try {
      const check = await sql`SELECT id FROM facilities WHERE id = ${facilityId} AND org_id = ${token.org}`
      if (check.length === 0) return res.status(404).json({ error: 'Facility not found' })

      await sql`UPDATE facilities SET is_active = false WHERE id = ${facilityId}`
      return res.status(200).json({ ok: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
