import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db'
import { verifyToken, cors } from '../_auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  try {
    const rows = await sql`
      SELECT u.id, u.org_id, u.email, u.name, u.avatar_url, u.is_active, u.created_at, u.last_login,
             array_agg(DISTINCT r.slug) AS role_slugs,
             array_agg(DISTINCT r.name) AS role_names,
             array_agg(DISTINCT p.resource || '.' || p.action) AS permissions
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE u.id = ${token.sub}
      GROUP BY u.id
    `

    if (rows.length === 0) return res.status(404).json({ error: 'User not found' })

    const u = rows[0]
    return res.status(200).json({
      id: u.id,
      orgId: u.org_id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatar_url,
      isActive: u.is_active,
      roles: (u.role_slugs ?? []).filter(Boolean),
      roleNames: (u.role_names ?? []).filter(Boolean),
      permissions: (u.permissions ?? []).filter(Boolean),
      createdAt: u.created_at,
      lastLogin: u.last_login,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
