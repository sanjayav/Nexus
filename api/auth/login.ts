import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as bcrypt from 'bcryptjs'
import { getDb } from '../_db.js'
import { signToken, cors } from '../_auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password } = req.body ?? {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const sql = getDb()

  try {
    const rows = await sql`
      SELECT u.id, u.org_id, u.email, u.name, u.password_hash, u.is_active, u.avatar_url,
             u.preferred_framework_id,
             array_agg(DISTINCT r.slug) AS role_slugs,
             array_agg(DISTINCT r.name) AS role_names,
             array_agg(DISTINCT p.resource || '.' || p.action) AS permissions
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE u.email = ${email.toLowerCase().trim()}
      GROUP BY u.id
    `

    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' })

    const user = rows[0]
    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' })

    const valid = bcrypt.compareSync(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    // Update last login
    await sql`UPDATE users SET last_login = now() WHERE id = ${user.id}`

    const token = await signToken({ sub: user.id, org: user.org_id, email: user.email })

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        orgId: user.org_id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        preferredFrameworkId: user.preferred_framework_id ?? 'gri',
        roles: (user.role_slugs ?? []).filter(Boolean),
        roleNames: (user.role_names ?? []).filter(Boolean),
        permissions: (user.permissions ?? []).filter(Boolean),
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
