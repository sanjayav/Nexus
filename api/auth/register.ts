import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getDb } from '../_db.js'
import { signToken, cors } from '../_auth.js'
import { checkRateLimit, clientIp } from '../_rateLimit.js'

const registerSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().min(1).max(200),
  password: z.string().min(6).max(200),
  workspaceName: z.string().min(1).max(200).optional(),
  inviteToken: z.string().min(1).max(200).optional(),
  region: z.enum(['us', 'eu', 'apac']).optional(),
})

const ROLE_PERMS: Record<string, [string, string][]> = {
  admin: [],
  'team-lead': [
    ['dashboard','view'],['calculators','view'],['calculators','edit'],
    ['data','view'],['data','upload'],['data','approve'],
    ['reports','view'],['reports','create'],
    ['analytics','view'],['workflow','view'],['workflow','approve'],
    ['audit','view'],['admin','users'],
  ],
  analyst: [
    ['dashboard','view'],['calculators','view'],['calculators','edit'],
    ['data','view'],['data','upload'],
    ['reports','view'],['reports','create'],
    ['analytics','view'],['workflow','view'],
  ],
  viewer: [
    ['dashboard','view'],['calculators','view'],['data','view'],
    ['reports','view'],['analytics','view'],['workflow','view'],
  ],
  auditor: [
    ['dashboard','view'],['calculators','view'],['data','view'],
    ['reports','view'],['analytics','view'],['workflow','view'],
    ['audit','view'],
  ],
}

const ROLE_DESCRIPTIONS: Record<string, [string, string]> = {
  admin: ['Platform Admin', 'Full system access'],
  'team-lead': ['Team Lead', 'Manage team, approve submissions'],
  analyst: ['Analyst', 'Run calculators, upload data, create reports'],
  viewer: ['Viewer', 'Read-only access to dashboards and reports'],
  auditor: ['Auditor', 'Read-only plus audit trail access'],
}

function slugify(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'workspace'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Rate limit to stop signup spam (open self-registration creates an org each time).
  const allowedSignup = await checkRateLimit(req, res, {
    key: `register:${clientIp(req)}`,
    windowSeconds: 600,
    max: 5,
  })
  if (!allowedSignup) return

  try { registerSchema.parse(req.body) } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
    throw e
  }
  const { email, name, password, workspaceName, inviteToken, region } = req.body ?? {}
  const orgRegion: 'us' | 'eu' | 'apac' = (region === 'eu' || region === 'apac') ? region : 'us'
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Email, name, and password required' })
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  const sql = getDb()
  const normalisedEmail = String(email).toLowerCase().trim()

  try {
    const existing = await sql`SELECT id FROM users WHERE email = ${normalisedEmail}`
    if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' })

    let orgId: string
    let assignRoleId: string | null = null

    if (inviteToken) {
      // Invite-based registration: join an existing org.
      const inv = await sql`
        SELECT id, org_id, role_id, email, status, expires_at
        FROM invitations WHERE token = ${inviteToken}
      `
      if (inv.length === 0) return res.status(400).json({ error: 'Invalid invitation' })
      if (inv[0].status !== 'pending') return res.status(400).json({ error: 'Invitation already used' })
      if (new Date(inv[0].expires_at) < new Date()) return res.status(400).json({ error: 'Invitation expired' })
      if (inv[0].email.toLowerCase() !== normalisedEmail) {
        return res.status(400).json({ error: 'Email does not match invitation' })
      }
      orgId = inv[0].org_id
      assignRoleId = inv[0].role_id
    } else {
      // Open self-registration: provision a NEW org so the user can't see
      // any other tenant's data. Original open-signup was disabled because
      // it dropped users into the seed tenant.
      const desiredName = (typeof workspaceName === 'string' && workspaceName.trim())
        ? workspaceName.trim()
        : `${name}'s Workspace`

      // Race-safe slug: try INSERT, retry on UNIQUE violation with a numeric
      // suffix. Avoids the TOCTOU window between SELECT and INSERT.
      const baseSlug = slugify(desiredName)
      let slug = baseSlug
      let orgRows: { id: string }[] | null = null
      for (let attempt = 0; attempt < 50; attempt++) {
        try {
          orgRows = await sql`
            INSERT INTO organisations (name, slug, region)
            VALUES (${desiredName}, ${slug}, ${orgRegion})
            RETURNING id
          ` as { id: string }[]
          break
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : ''
          if (!/unique|duplicate/i.test(msg)) throw err
          slug = `${baseSlug}-${attempt + 1}`
        }
      }
      if (!orgRows) {
        slug = `${baseSlug}-${Date.now()}`
        orgRows = await sql`
          INSERT INTO organisations (name, slug, region)
          VALUES (${desiredName}, ${slug}, ${orgRegion})
          RETURNING id
        ` as { id: string }[]
      }
      orgId = orgRows[0].id

      const createdRoleIds: Record<string, string> = {}
      for (const slugKey of Object.keys(ROLE_DESCRIPTIONS)) {
        const [roleName, desc] = ROLE_DESCRIPTIONS[slugKey]
        const r = await sql`
          INSERT INTO roles (org_id, name, slug, description, is_system)
          VALUES (${orgId}, ${roleName}, ${slugKey}, ${desc}, true)
          RETURNING id
        `
        createdRoleIds[slugKey] = r[0].id
      }

      await sql`
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT ${createdRoleIds.admin}, id FROM permissions
        ON CONFLICT DO NOTHING
      `

      for (const [slugKey, perms] of Object.entries(ROLE_PERMS)) {
        if (slugKey === 'admin') continue
        for (const [resource, action] of perms) {
          await sql`
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT ${createdRoleIds[slugKey]}, id
            FROM permissions WHERE resource = ${resource} AND action = ${action}
            ON CONFLICT DO NOTHING
          `
        }
      }

      assignRoleId = createdRoleIds.admin
    }

    const hash = bcrypt.hashSync(password, 10)
    const created = await sql`
      INSERT INTO users (org_id, email, name, password_hash)
      VALUES (${orgId}, ${normalisedEmail}, ${name}, ${hash})
      RETURNING id, org_id, email, name
    `
    const user = created[0]

    if (assignRoleId) {
      await sql`INSERT INTO user_roles (user_id, role_id) VALUES (${user.id}, ${assignRoleId})`
    }
    if (inviteToken) {
      await sql`UPDATE invitations SET status = 'accepted' WHERE token = ${inviteToken}`
    }

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

    // Pull the stored region back so invitation-based registrations inherit it too.
    const orgRow = await sql`SELECT region FROM organisations WHERE id = ${u.org_id}` as Array<{ region: string | null }>
    const storedRegion = (orgRow[0]?.region === 'eu' || orgRow[0]?.region === 'apac') ? orgRow[0].region : 'us'

    const token = await signToken({
      sub: u.id,
      org: u.org_id,
      email: u.email,
      org_region: storedRegion as 'us' | 'eu' | 'apac',
    })

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
