import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getDb } from '../_db.js'
import { cors, requirePermission } from '../_auth.js'
import { getWorkOS, ssoUnavailable } from '../_workos.js'

const upsertSchema = z.object({
  connectionId: z.string().min(1).max(200),
  domain: z.string().min(1).max(255).optional(),
  autoProvision: z.boolean().optional(),
  defaultRoleSlug: z.string().min(1).max(80).optional(),
  isActive: z.boolean().optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await requirePermission(req, res, 'admin.org')
  if (!token) return

  const sql = getDb()

  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT id, org_id, provider, connection_id, domain, is_active, auto_provision,
               default_role_slug, created_at, updated_at
        FROM sso_connections
        WHERE org_id = ${token.org}
        LIMIT 1
      `
      return res.status(200).json({ connection: rows[0] ?? null, workosConfigured: getWorkOS() !== null })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    // Block writes when WorkOS isn't configured — there's nothing to connect to.
    if (!getWorkOS()) {
      const u = ssoUnavailable()
      return res.status(u.status).json(u.body)
    }

    let body: z.infer<typeof upsertSchema>
    try { body = upsertSchema.parse(req.body ?? {}) }
    catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
      throw e
    }

    const domain = body.domain?.toLowerCase().trim() ?? null
    const autoProvision = body.autoProvision ?? true
    const defaultRoleSlug = body.defaultRoleSlug ?? 'viewer'
    const isActive = body.isActive ?? true

    try {
      const rows = await sql`
        INSERT INTO sso_connections (org_id, provider, connection_id, domain, is_active, auto_provision, default_role_slug, updated_at)
        VALUES (${token.org}, 'workos', ${body.connectionId}, ${domain}, ${isActive}, ${autoProvision}, ${defaultRoleSlug}, now())
        ON CONFLICT (org_id) DO UPDATE SET
          connection_id = EXCLUDED.connection_id,
          domain = EXCLUDED.domain,
          is_active = EXCLUDED.is_active,
          auto_provision = EXCLUDED.auto_provision,
          default_role_slug = EXCLUDED.default_role_slug,
          updated_at = now()
        RETURNING id, org_id, provider, connection_id, domain, is_active, auto_provision,
                  default_role_slug, created_at, updated_at
      `
      return res.status(200).json({ connection: rows[0] })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await sql`DELETE FROM sso_connections WHERE org_id = ${token.org}`
      return res.status(200).json({ ok: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return res.status(500).json({ error: message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
