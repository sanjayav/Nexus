import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors, requirePermission } from '../_auth.js'
import { getDb } from '../_db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = await requirePermission(req, res, 'data.view')
  if (!token) return

  const sql = getDb()
  const source = req.query.source as string | undefined
  const scopeStr = req.query.scope as string | undefined
  const scope = scopeStr ? parseInt(scopeStr, 10) : undefined

  try {
    let rows
    if (source && scope !== undefined) {
      rows = await sql`
        SELECT id, name, source, description, scope, category, mapping, required_columns, optional_columns, emission_factor_lookup, is_system, created_at
        FROM connector_templates WHERE source = ${source} AND scope = ${scope}
        ORDER BY name ASC
      `
    } else if (source) {
      rows = await sql`
        SELECT id, name, source, description, scope, category, mapping, required_columns, optional_columns, emission_factor_lookup, is_system, created_at
        FROM connector_templates WHERE source = ${source}
        ORDER BY name ASC
      `
    } else if (scope !== undefined) {
      rows = await sql`
        SELECT id, name, source, description, scope, category, mapping, required_columns, optional_columns, emission_factor_lookup, is_system, created_at
        FROM connector_templates WHERE scope = ${scope}
        ORDER BY name ASC
      `
    } else {
      rows = await sql`
        SELECT id, name, source, description, scope, category, mapping, required_columns, optional_columns, emission_factor_lookup, is_system, created_at
        FROM connector_templates
        ORDER BY source, name ASC
      `
    }
    return res.status(200).json(rows)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
