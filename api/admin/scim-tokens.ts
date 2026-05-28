import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { z } from 'zod'
import { cors, requirePermission } from '../_auth.js'
import { getDb } from '../_db.js'

const createSchema = z.object({
  defaultRoleSlug: z.string().min(1).max(80).optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await requirePermission(req, res, 'admin.users')
  if (!token) return

  const sql = getDb()

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, prefix, default_role_slug, is_active, created_at, last_used_at
        FROM scim_tokens
        WHERE org_id = ${token.org}
        ORDER BY created_at DESC
      ` as Array<{ id: string; prefix: string; default_role_slug: string; is_active: boolean; created_at: string; last_used_at: string | null }>
      return res.status(200).json(rows.map(r => ({
        id: r.id,
        prefix: r.prefix,
        defaultRoleSlug: r.default_role_slug,
        isActive: r.is_active,
        createdAt: r.created_at,
        lastUsedAt: r.last_used_at,
      })))
    }

    if (req.method === 'POST') {
      let body: z.infer<typeof createSchema>
      try { body = createSchema.parse(req.body ?? {}) }
      catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
        throw e
      }
      const defaultRoleSlug = body.defaultRoleSlug ?? 'viewer'

      // Validate the role exists in the org.
      const roleRows = await sql`SELECT id FROM roles WHERE org_id = ${token.org} AND slug = ${defaultRoleSlug} LIMIT 1` as Array<{ id: string }>
      if (roleRows.length === 0) return res.status(400).json({ error: `Role "${defaultRoleSlug}" not found in org` })

      const raw = 'scim_' + crypto.randomBytes(32).toString('base64url')
      const hash = crypto.createHash('sha256').update(raw).digest('hex')
      const prefix = raw.slice(0, 12)

      const inserted = await sql`
        INSERT INTO scim_tokens (org_id, token_hash, prefix, default_role_slug, created_by)
        VALUES (${token.org}, ${hash}, ${prefix}, ${defaultRoleSlug}, ${token.sub})
        RETURNING id, prefix, default_role_slug, is_active, created_at, last_used_at
      ` as Array<{ id: string; prefix: string; default_role_slug: string; is_active: boolean; created_at: string; last_used_at: string | null }>

      const row = inserted[0]
      return res.status(201).json({
        token: raw,
        id: row.id,
        prefix: row.prefix,
        defaultRoleSlug: row.default_role_slug,
        isActive: row.is_active,
        createdAt: row.created_at,
        lastUsedAt: row.last_used_at,
        warning: 'Copy this token now — it will not be shown again.',
      })
    }

    if (req.method === 'DELETE') {
      const id = req.query.id as string | undefined
      if (!id) return res.status(400).json({ error: 'id query param required' })
      await sql`UPDATE scim_tokens SET is_active = false WHERE id = ${id} AND org_id = ${token.org}`
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
