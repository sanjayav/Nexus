/**
 * GET /api/connectors/connections/:id        — single connection + sync history
 * DELETE /api/connectors/connections/:id     — soft-disconnect (clears tokens)
 *
 * GET returns the connection metadata + last 20 sync runs so the per-connector
 * detail page can render with a single request.
 *
 * DELETE never destroys the row — it sets status='disabled' and nulls the
 * encrypted token columns. Keeping the row preserves the sync-history audit
 * trail and the unique (org_id, provider, display_name) slot.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors, requirePermission } from '../../_auth.js'
import { getDb } from '../../_db.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const id = String(req.query.id ?? '')
  if (!id) return res.status(400).json({ error: 'Missing :id' })

  if (req.method === 'GET') {
    const token = await requirePermission(req, res, 'data.view')
    if (!token) return
    const sql = getDb()
    const rows = await sql`
      SELECT id, provider, display_name, auth_type, base_url, instance_url, account_id,
             scopes, status, last_test_at, last_test_result,
             last_sync_at, last_sync_status, last_sync_error,
             config_json, created_at, updated_at
      FROM connector_connections
      WHERE id = ${id} AND org_id = ${token.org}
      LIMIT 1
    ` as Array<Record<string, unknown>>
    if (rows.length === 0) return res.status(404).json({ error: 'Connection not found' })

    const runs = await sql`
      SELECT id, started_at, completed_at, status, rows_fetched, rows_imported, rows_failed, error
      FROM connector_sync_runs
      WHERE connection_id = ${id} AND org_id = ${token.org}
      ORDER BY started_at DESC
      LIMIT 20
    `
    return res.status(200).json({ connection: rows[0], runs })
  }

  if (req.method === 'DELETE') {
    const token = await requirePermission(req, res, 'data.upload')
    if (!token) return
    const sql = getDb()
    const upd = (await sql`
      UPDATE connector_connections
      SET status = 'disabled',
          oauth_access_token_enc = NULL,
          oauth_refresh_token_enc = NULL,
          oauth_expires_at = NULL,
          updated_at = now()
      WHERE id = ${id} AND org_id = ${token.org}
      RETURNING id
    `) as Array<{ id: string }>
    if (upd.length === 0) return res.status(404).json({ error: 'Connection not found' })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
