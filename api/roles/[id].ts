import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db.js'
import { verifyToken, cors, requirePermission } from '../_auth.js'
import { audit, auditIp } from '../_audit.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const roleId = req.query.id as string
  if (!roleId) return res.status(400).json({ error: 'Role ID required' })

  const sql = getDb()

  // PUT — update role + permissions
  if (req.method === 'PUT' || req.method === 'PATCH') {
    // Role mutation → admin.roles.
    const gate = await requirePermission(req, res, 'admin.roles')
    if (!gate) return
    const { name, description, permissionIds } = req.body ?? {}

    try {
      const check = await sql`SELECT id, is_system FROM roles WHERE id = ${roleId} AND org_id = ${token.org}`
      if (check.length === 0) return res.status(404).json({ error: 'Role not found' })

      if (name) await sql`UPDATE roles SET name = ${name} WHERE id = ${roleId}`
      if (description !== undefined) await sql`UPDATE roles SET description = ${description} WHERE id = ${roleId}`

      if (permissionIds !== undefined && Array.isArray(permissionIds)) {
        await sql`DELETE FROM role_permissions WHERE role_id = ${roleId}`
        for (const pid of permissionIds) {
          await sql`INSERT INTO role_permissions (role_id, permission_id) VALUES (${roleId}, ${pid}) ON CONFLICT DO NOTHING`
        }
      }

      await audit({
        orgId: token.org,
        userId: token.sub,
        action: 'role.update',
        resourceType: 'role',
        resourceId: roleId,
        details: { name, description, permissionIds: permissionIds ?? null },
        ip: auditIp(req),
      })
      return res.status(200).json({ ok: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  // DELETE — delete role (non-system only)
  if (req.method === 'DELETE') {
    // Role deletion → admin.roles.
    const gate = await requirePermission(req, res, 'admin.roles')
    if (!gate) return
    try {
      const check = await sql`SELECT is_system FROM roles WHERE id = ${roleId} AND org_id = ${token.org}`
      if (check.length === 0) return res.status(404).json({ error: 'Role not found' })
      if (check[0].is_system) return res.status(403).json({ error: 'Cannot delete system role' })

      await sql`DELETE FROM roles WHERE id = ${roleId}`
      return res.status(200).json({ ok: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
