import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { z } from 'zod'
import { cors, requirePermission } from '../_auth.js'
import { getDb } from '../_db.js'

/**
 * Standard scopes available to API keys. Each maps to an existing platform
 * permission so requirePermission() can authorise an api_key the same way
 * it authorises a JWT-bearing user.
 */
const STANDARD_SCOPES = [
  'data.view',
  'data.upload',
  'data.approve',
  'reports.view',
  'reports.create',
  'analytics.view',
  'workflow.view',
] as const

const createSchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(z.string().min(1).max(80)).min(1).max(50),
  expiresInDays: z.number().int().positive().max(3650).optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await requirePermission(req, res, 'admin.users')
  if (!token) return

  const sql = getDb()

  try {
    if (req.method === 'GET') {
      const rows = (await sql`
        SELECT id, name, prefix, scopes, expires_at, last_used_at, is_active, created_at
        FROM api_keys
        WHERE org_id = ${token.org}
        ORDER BY created_at DESC
      `) as Array<{
        id: string
        name: string
        prefix: string
        scopes: unknown
        expires_at: string | null
        last_used_at: string | null
        is_active: boolean
        created_at: string
      }>
      return res.status(200).json({
        standardScopes: STANDARD_SCOPES,
        keys: rows.map(r => ({
          id: r.id,
          name: r.name,
          prefix: r.prefix,
          scopes: Array.isArray(r.scopes) ? (r.scopes as unknown[]).filter((s): s is string => typeof s === 'string') : [],
          expiresAt: r.expires_at,
          lastUsedAt: r.last_used_at,
          isActive: r.is_active,
          createdAt: r.created_at,
        })),
      })
    }

    if (req.method === 'POST') {
      let body: z.infer<typeof createSchema>
      try { body = createSchema.parse(req.body ?? {}) }
      catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
        throw e
      }

      const raw = 'aei_' + crypto.randomBytes(32).toString('base64url')
      const hash = crypto.createHash('sha256').update(raw).digest('hex')
      // Prefix = the literal "aei_" plus the first 8 chars of the random suffix,
      // so admins can identify a key in the list without revealing the secret.
      const prefix = raw.slice(0, 'aei_'.length + 8)
      const expiresAt = body.expiresInDays
        ? new Date(Date.now() + body.expiresInDays * 86400_000).toISOString()
        : null

      const inserted = (await sql`
        INSERT INTO api_keys (org_id, name, token_hash, prefix, scopes, created_by, expires_at)
        VALUES (
          ${token.org}, ${body.name}, ${hash}, ${prefix},
          ${JSON.stringify(body.scopes)}::jsonb,
          ${token.sub.startsWith('apikey:') ? null : token.sub},
          ${expiresAt}
        )
        RETURNING id, name, prefix, scopes, expires_at, last_used_at, is_active, created_at
      `) as Array<{
        id: string
        name: string
        prefix: string
        scopes: unknown
        expires_at: string | null
        last_used_at: string | null
        is_active: boolean
        created_at: string
      }>

      const row = inserted[0]
      return res.status(201).json({
        token: raw,
        warning: 'Copy this token now — it will not be shown again. We store only a SHA-256 hash.',
        key: {
          id: row.id,
          name: row.name,
          prefix: row.prefix,
          scopes: Array.isArray(row.scopes) ? (row.scopes as unknown[]).filter((s): s is string => typeof s === 'string') : [],
          expiresAt: row.expires_at,
          lastUsedAt: row.last_used_at,
          isActive: row.is_active,
          createdAt: row.created_at,
        },
      })
    }

    if (req.method === 'DELETE') {
      const id = req.query.id as string | undefined
      if (!id) return res.status(400).json({ error: 'id query param required' })
      await sql`UPDATE api_keys SET is_active = false WHERE id = ${id} AND org_id = ${token.org}`
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
