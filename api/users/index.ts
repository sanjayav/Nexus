import type { VercelRequest, VercelResponse } from '@vercel/node'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { getDb } from '../_db'
import { verifyToken, cors } from '../_auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()

  // GET — list users in org
  if (req.method === 'GET') {
    try {
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  // POST — create user directly OR send invitation
  if (req.method === 'POST') {
    const { email, name, password, roleId, mode } = req.body ?? {}
    if (!email) return res.status(400).json({ error: 'Email required' })

    try {
      if (mode === 'invite') {
        // Create invitation
        const invToken = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        await sql`
          INSERT INTO invitations (org_id, email, role_id, invited_by, token, expires_at)
          VALUES (${token.org}, ${email.toLowerCase().trim()}, ${roleId || null}, ${token.sub}, ${invToken}, ${expiresAt.toISOString()})
        `
        return res.status(201).json({ ok: true, inviteToken: invToken, email })
      }

      // Direct create
      if (!name || !password) return res.status(400).json({ error: 'Name and password required for direct creation' })

      const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`
      if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' })

      const hash = bcrypt.hashSync(password, 10)
      const created = await sql`
        INSERT INTO users (org_id, email, name, password_hash)
        VALUES (${token.org}, ${email.toLowerCase().trim()}, ${name}, ${hash})
        RETURNING id, email, name, is_active, created_at
      `
      const user = created[0]

      if (roleId) {
        await sql`INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (${user.id}, ${roleId}, ${token.sub})`
      }

      // Return with roles
      const full = await sql`
        SELECT u.id, u.email, u.name, u.avatar_url, u.is_active, u.created_at, u.last_login,
               array_agg(DISTINCT jsonb_build_object('id', r.id, 'name', r.name, 'slug', r.slug)) AS roles
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE u.id = ${user.id}
        GROUP BY u.id
      `
      return res.status(201).json({
        ...full[0],
        roles: (full[0].roles ?? []).filter((r: { id: string | null }) => r.id !== null),
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
