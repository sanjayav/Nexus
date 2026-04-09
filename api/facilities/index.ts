import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db'
import { verifyToken, cors } from '../_auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  // GET — list all facilities for org
  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT id, name, code, location, country, type, production_volume, is_active, created_at
        FROM facilities
        WHERE org_id = ${token.org}
        ORDER BY name
      `
      return res.status(200).json(rows)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  // POST — create facility
  if (req.method === 'POST') {
    const { name, code, location, country, type, latitude, longitude, production_volume } = req.body ?? {}
    if (!name) return res.status(400).json({ error: 'Facility name is required' })

    try {
      const created = await sql`
        INSERT INTO facilities (org_id, name, code, location, country, type, latitude, longitude, production_volume)
        VALUES (${token.org}, ${name}, ${code || null}, ${location || null}, ${country || null}, ${type || null}, ${latitude || null}, ${longitude || null}, ${production_volume || null})
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
