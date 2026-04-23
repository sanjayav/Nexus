import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import { getDb } from '../_db.js'
import { verifyToken, cors } from '../_auth.js'

/**
 * Unified users handler — list, create, invite, update, deactivate.
 * Routes:
 *   GET  /api/users             → list
 *   POST /api/users             → create or invite (body.mode='invite')
 *   PUT  /api/users?id=<uuid>   → update (name, isActive, roleIds)
 *   DELETE /api/users?id=<uuid> → deactivate
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
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
      return res.status(201).json(await loadUser(sql, newId))
    }

    // PUT / PATCH — update user
    if (req.method === 'PUT' || req.method === 'PATCH') {
      if (!userId) return res.status(400).json({ error: 'User ID required (pass ?id=)' })
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
      }
      return res.status(200).json(await loadUser(sql, userId))
    }

    // DELETE — deactivate
    if (req.method === 'DELETE') {
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
