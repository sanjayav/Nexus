import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import { z } from 'zod'
import { getDb } from '../_db.js'
import { verifyToken, cors, requirePermission } from '../_auth.js'
import { audit, auditIp } from '../_audit.js'

const createUserSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().min(1).max(200).optional(),
  password: z.string().min(6).max(200).optional(),
  roleId: z.string().uuid().optional(),
  mode: z.enum(['invite', 'create']).optional(),
})
const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
})

/**
 * Unified users handler — list, create, invite, update, deactivate.
 * Routes:
 *   GET  /api/users             → list
 *   POST /api/users             → create or invite (body.mode='invite')
 *   PUT  /api/users?id=<uuid>   → update (name, isActive, roleIds)
 *   DELETE /api/users?id=<uuid> → deactivate
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()
  const userId = req.query.id as string | undefined

  try {
    // GET — list users in org
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT u.id, u.email, u.name, u.avatar_url, u.is_active, u.created_at, u.last_login,
               array_agg(DISTINCT jsonb_build_object('id', r.id, 'name', r.name, 'slug', r.slug)) AS roles
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE u.org_id = ${token.org}
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `
      return res.status(200).json(rows.map(u => ({
        ...u,
        roles: (u.roles ?? []).filter((r: { id: string | null }) => r.id !== null),
      })))
    }

    // POST — create or invite
    if (req.method === 'POST') {
      // Creating users / sending invites → admin.users.
      const gate = await requirePermission(req, res, 'admin.users')
      if (!gate) return
      try { createUserSchema.parse(req.body) } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
        throw e
      }
      const { email, name, password, roleId, mode } = req.body ?? {}
      if (!email) return res.status(400).json({ error: 'Email required' })

      if (mode === 'invite') {
        const invToken = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        await sql`
          INSERT INTO invitations (org_id, email, role_id, invited_by, token, expires_at)
          VALUES (${token.org}, ${email.toLowerCase().trim()}, ${roleId || null}, ${token.sub}, ${invToken}, ${expiresAt.toISOString()})
        `
        return res.status(201).json({ ok: true, inviteToken: invToken, email })
      }

      if (!name || !password) return res.status(400).json({ error: 'Name and password required for direct creation' })
      const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`
      if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' })

      const hash = bcrypt.hashSync(password, 10)
      const created = await sql`
        INSERT INTO users (org_id, email, name, password_hash)
        VALUES (${token.org}, ${email.toLowerCase().trim()}, ${name}, ${hash})
        RETURNING id
      ` as Array<{ id: string }>
      const newId = created[0].id
      if (roleId) {
        await sql`INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (${newId}, ${roleId}, ${token.sub})`
      }
      await audit({
        orgId: token.org,
        userId: token.sub,
        action: 'user.create',
        resourceType: 'user',
        resourceId: newId,
        details: { email: email.toLowerCase().trim(), name, roleId: roleId ?? null },
        ip: auditIp(req),
      })
      return res.status(201).json(await loadUser(sql, newId))
    }

    // PUT / PATCH — update user
    if (req.method === 'PUT' || req.method === 'PATCH') {
      // Updating user metadata / role assignments → admin.users.
      const gate = await requirePermission(req, res, 'admin.users')
      if (!gate) return
      if (!userId) return res.status(400).json({ error: 'User ID required (pass ?id=)' })
      try { updateUserSchema.parse(req.body) } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
        throw e
      }
      const { name, isActive, roleIds } = req.body ?? {}

      const check = await sql`SELECT id FROM users WHERE id = ${userId} AND org_id = ${token.org}`
      if (check.length === 0) return res.status(404).json({ error: 'User not found' })

      if (name !== undefined) await sql`UPDATE users SET name = ${name} WHERE id = ${userId}`
      if (isActive !== undefined) await sql`UPDATE users SET is_active = ${isActive} WHERE id = ${userId}`
      if (roleIds !== undefined && Array.isArray(roleIds)) {
        await sql`DELETE FROM user_roles WHERE user_id = ${userId}`
        for (const rid of roleIds) {
          await sql`INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (${userId}, ${rid}, ${token.sub})`
        }
        // Role assignments are security-critical — log them separately from
        // the broader user.update so they're easy to filter on in the UI.
        await audit({
          orgId: token.org,
          userId: token.sub,
          action: 'user.roles_change',
          resourceType: 'user',
          resourceId: userId,
          details: { roleIds },
          ip: auditIp(req),
        })
      }
      if (name !== undefined || isActive !== undefined) {
        await audit({
          orgId: token.org,
          userId: token.sub,
          action: 'user.update',
          resourceType: 'user',
          resourceId: userId,
          details: { name, isActive },
          ip: auditIp(req),
        })
      }
      return res.status(200).json(await loadUser(sql, userId))
    }

    // DELETE — deactivate
    if (req.method === 'DELETE') {
      // Deactivating users → admin.users.
      const gate = await requirePermission(req, res, 'admin.users')
      if (!gate) return
      if (!userId) return res.status(400).json({ error: 'User ID required (pass ?id=)' })
      await sql`UPDATE users SET is_active = false WHERE id = ${userId} AND org_id = ${token.org}`
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}

async function loadUser(sql: ReturnType<typeof getDb>, id: string) {
  const full = await sql`
    SELECT u.id, u.email, u.name, u.avatar_url, u.is_active, u.created_at, u.last_login,
           array_agg(DISTINCT jsonb_build_object('id', r.id, 'name', r.name, 'slug', r.slug)) AS roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE u.id = ${id}
    GROUP BY u.id
  `
  return {
    ...full[0],
    roles: (full[0].roles ?? []).filter((r: { id: string | null }) => r.id !== null),
  }
}
