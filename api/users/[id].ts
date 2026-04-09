import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db'
import { verifyToken, cors } from '../_auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const userId = req.query.id as string
  if (!userId) return res.status(400).json({ error: 'User ID required' })

  const sql = getDb()

  // PUT — update user (name, active status, roles)
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const { name, isActive, roleIds } = req.body ?? {}

    try {
      // Verify user belongs to same org
      const check = await sql`SELECT id FROM users WHERE id = ${userId} AND org_id = ${token.org}`
      if (check.length === 0) return res.status(404).json({ error: 'User not found' })

      if (name !== undefined) {
        await sql`UPDATE users SET name = ${name} WHERE id = ${userId}`
      }
      if (isActive !== undefined) {
        await sql`UPDATE users SET is_active = ${isActive} WHERE id = ${userId}`
      }
      if (roleIds !== undefined && Array.isArray(roleIds)) {
        // Replace roles
        await sql`DELETE FROM user_roles WHERE user_id = ${userId}`
        for (const roleId of roleIds) {
          await sql`INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (${userId}, ${roleId}, ${token.sub})`
        }
      }

      // Return updated user
      const full = await sql`
        SELECT u.id, u.email, u.name, u.avatar_url, u.is_active, u.created_at, u.last_login,
               array_agg(DISTINCT jsonb_build_object('id', r.id, 'name', r.name, 'slug', r.slug)) AS roles
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE u.id = ${userId}
        GROUP BY u.id
      `
      return res.status(200).json({
        ...full[0],
        roles: (full[0].roles ?? []).filter((r: { id: string | null }) => r.id !== null),
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  // DELETE — deactivate user
  if (req.method === 'DELETE') {
    try {
      await sql`UPDATE users SET is_active = false WHERE id = ${userId} AND org_id = ${token.org}`
      return res.status(200).json({ ok: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
