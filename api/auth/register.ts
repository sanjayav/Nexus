import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as bcrypt from 'bcryptjs'
import { getDb } from '../_db'
import { signToken, cors } from '../_auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, name, password, inviteToken } = req.body ?? {}
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Email, name, and password required' })
  }

  const sql = getDb()

  try {
    // Check invitation if token provided
    let orgId = '00000000-0000-0000-0000-000000000001' // default org
    let roleId: string | null = null

    if (inviteToken) {
      const inv = await sql`
        SELECT id, org_id, role_id, email, status, expires_at
        FROM invitations WHERE token = ${inviteToken}
      `
      if (inv.length === 0) return res.status(400).json({ error: 'Invalid invitation' })
      if (inv[0].status !== 'pending') return res.status(400).json({ error: 'Invitation already used' })
      if (new Date(inv[0].expires_at) < new Date()) return res.status(400).json({ error: 'Invitation expired' })
      if (inv[0].email.toLowerCase() !== email.toLowerCase()) return res.status(400).json({ error: 'Email does not match invitation' })
      orgId = inv[0].org_id
      roleId = inv[0].role_id
    }

    // Check if email exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`
    if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' })

    // Create user
    const hash = bcrypt.hashSync(password, 10)
    const created = await sql`
      INSERT INTO users (org_id, email, name, password_hash)
      VALUES (${orgId}, ${email.toLowerCase().trim()}, ${name}, ${hash})
      RETURNING id, org_id, email, name
    `
    const user = created[0]

    // Assign role
    if (roleId) {
      await sql`INSERT INTO user_roles (user_id, role_id) VALUES (${user.id}, ${roleId})`
      // Mark invitation accepted
      if (inviteToken) {
        await sql`UPDATE invitations SET status = 'accepted' WHERE token = ${inviteToken}`
      }
    } else {
      // Default to Viewer role
      await sql`INSERT INTO user_roles (user_id, role_id) VALUES (${user.id}, '00000000-0000-0000-0000-000000000013')`
    }

    // Get full user with permissions
    const full = await sql`
      SELECT u.id, u.org_id, u.email, u.name,
             array_agg(DISTINCT r.slug) AS role_slugs,
             array_agg(DISTINCT r.name) AS role_names,
             array_agg(DISTINCT p.resource || '.' || p.action) AS permissions
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE u.id = ${user.id}
      GROUP BY u.id
    `
    const u = full[0]

    const token = await signToken({ sub: u.id, org: u.org_id, email: u.email })

    return res.status(201).json({
      token,
      user: {
        id: u.id,
        orgId: u.org_id,
        email: u.email,
        name: u.name,
        roles: (u.role_slugs ?? []).filter(Boolean),
        roleNames: (u.role_names ?? []).filter(Boolean),
        permissions: (u.permissions ?? []).filter(Boolean),
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
