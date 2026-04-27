import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db.js'
import { verifyToken, cors } from '../_auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  // GET — list roles with permissions
  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT r.id, r.name, r.slug, r.description, r.is_system, r.created_at,
               array_agg(DISTINCT jsonb_build_object('id', p.id, 'resource', p.resource, 'action', p.action, 'description', p.description))
                 FILTER (WHERE p.id IS NOT NULL) AS permissions,
               (SELECT count(*) FROM user_roles ur WHERE ur.role_id = r.id) AS user_count
        FROM roles r
        LEFT JOIN role_permissions rp ON rp.role_id = r.id
        LEFT JOIN permissions p ON p.id = rp.permission_id
        WHERE r.org_id = ${token.org}
        GROUP BY r.id
        ORDER BY r.is_system DESC, r.created_at ASC
      `
      return res.status(200).json(rows.map(r => ({
        ...r,
        permissions: r.permissions ?? [],
        userCount: Number(r.user_count),
      })))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  // POST — create role
  if (req.method === 'POST') {
    const { name, slug, description, permissionIds } = req.body ?? {}
    if (!name || !slug) return res.status(400).json({ error: 'Name and slug required' })

    try {
      const created = await sql`
        INSERT INTO roles (org_id, name, slug, description)
        VALUES (${token.org}, ${name}, ${slug}, ${description || ''})
        RETURNING id
      `
      const roleId = created[0].id

      if (permissionIds && Array.isArray(permissionIds)) {
        for (const pid of permissionIds) {
          await sql`INSERT INTO role_permissions (role_id, permission_id) VALUES (${roleId}, ${pid}) ON CONFLICT DO NOTHING`
        }
      }

      return res.status(201).json({ id: roleId, name, slug, description })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
