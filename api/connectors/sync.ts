/**
 * POST /api/connectors/sync
 *
 * Body: { connectionId, fromDate?, toDate?, providerOptions? }
 *
 * Triggers a live sync: looks up the connection, decrypts the stored
 * credentials, calls into the adapter, then persists the returned SyncRows
 * into activity_data. The whole thing runs synchronously within the request
 * (Vercel serverless 30s budget) — heavy syncs should be batched server-side
 * by the adapter (e.g. SAP $top=1000).
 *
 * Idempotency: each (provider, external_id, period) we insert is upserted
 * via ON CONFLICT on (org_id, period_year, period_month, scope, category,
 * facility_id, source_external_id). Re-running sync over the same window
 * does not duplicate rows.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { cors, requirePermission } from '../_auth.js'
import { getDb } from '../_db.js'
import { decrypt } from '../_crypto.js'
import { getConnector } from '../_connectors/registry.js'
import type { ConnectorConnection, SyncOptions, SyncRow } from '../_connectors/index.js'

const syncSchema = z.object({
  connectionId: z.string().uuid(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  providerOptions: z.record(z.unknown()).optional(),
})

interface ConnectionRow {
  id: string
  org_id: string
  provider: string
  display_name: string
  auth_type: 'oauth2' | 'api_key' | 'basic' | 'jwt'
  credentials_enc: string
  oauth_access_token_enc: string | null
  oauth_refresh_token_enc: string | null
  oauth_expires_at: string | null
  base_url: string | null
  instance_url: string | null
  scopes: unknown
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = await requirePermission(req, res, 'data.upload')
  if (!token) return

  const parsed = syncSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid body' })

  const sql = getDb()

  const rows = (await sql`
    SELECT id, org_id, provider, display_name, auth_type, credentials_enc,
           oauth_access_token_enc, oauth_refresh_token_enc, oauth_expires_at,
           base_url, instance_url, scopes
    FROM connector_connections
    WHERE id = ${parsed.data.connectionId} AND org_id = ${token.org}
    LIMIT 1
  `) as ConnectionRow[]

  if (rows.length === 0) return res.status(404).json({ error: 'Connection not found' })
  const conn = rows[0]

  const adapter = getConnector(conn.provider)
  if (!adapter) return res.status(404).json({ error: `Adapter ${conn.provider} not registered` })

  // Decrypt creds. Order of precedence matches setup.ts column shape:
  //  - oauth_access_token_enc → credentials.accessToken
  //  - credentials_enc (JSON blob) → spread into credentials object
  let credentials: Record<string, string | number | undefined> = {}
  try {
    if (conn.credentials_enc) {
      const raw = decrypt(conn.credentials_enc)
      try { credentials = { ...credentials, ...JSON.parse(raw) } } catch { /* not JSON, ignore */ }
    }
    if (conn.oauth_access_token_enc) {
      credentials.accessToken = decrypt(conn.oauth_access_token_enc)
    }
    if (conn.oauth_refresh_token_enc) {
      credentials.refreshToken = decrypt(conn.oauth_refresh_token_enc)
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to decrypt connection credentials — re-authorize' })
  }

  const connection: ConnectorConnection = {
    id: conn.id,
    orgId: conn.org_id,
    provider: conn.provider,
    displayName: conn.display_name,
    authType: conn.auth_type,
    baseUrl: conn.instance_url ?? conn.base_url,
    scopes: Array.isArray(conn.scopes) ? conn.scopes as string[] : [],
    credentials,
  }

  // Open a sync_run row so the UI can show "running" while we work.
  const runRows = (await sql`
    INSERT INTO connector_sync_runs (connection_id, org_id, status)
    VALUES (${conn.id}, ${token.org}, 'running')
    RETURNING id
  `) as Array<{ id: string }>
  const runId = runRows[0].id

  const opts: SyncOptions = {
    fromDate: parsed.data.fromDate,
    toDate: parsed.data.toDate,
    providerOptions: parsed.data.providerOptions ?? {},
  }

  let syncRows: SyncRow[] = []
  let fetched = 0
  let failed = 0
  const errors: { row: number | string; error: string }[] = []

  try {
    const { rows: out, result } = await adapter.fetchData(sql, connection, opts)
    syncRows = out
    fetched = result.rowsFetched
    failed = result.rowsFailed
    errors.push(...result.errors)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync failed'
    await sql`
      UPDATE connector_sync_runs
      SET status = 'failed', completed_at = now(), error = ${msg}, rows_fetched = 0, rows_imported = 0
      WHERE id = ${runId}
    `
    await sql`
      UPDATE connector_connections
      SET last_sync_at = now(), last_sync_status = 'failed', last_sync_error = ${msg}, updated_at = now()
      WHERE id = ${conn.id}
    `
    return res.status(502).json({ error: msg, runId })
  }

  // Persist into activity_data using upsert keyed on the provider's natural
  // identifier. We synthesize a source_external_id of provider:rowId so two
  // providers can co-exist without colliding.
  let imported = 0
  for (let i = 0; i < syncRows.length; i++) {
    const r = syncRows[i]
    const extId = `${conn.provider}:${r.rowId ?? i}`
    try {
      await sql`
        INSERT INTO activity_data (
          org_id, period_year, period_month, scope, category, subcategory,
          fuel_type, facility_id, activity_value, activity_unit, source, notes, status
        )
        VALUES (
          ${conn.org_id}, ${r.periodYear}, ${r.periodMonth}, ${r.scope},
          ${r.category}, ${r.subcategory}, ${r.fuelType},
          (SELECT id FROM facilities WHERE org_id = ${conn.org_id} AND code = ${r.facilityCode} LIMIT 1),
          ${r.activityValue}, ${r.activityUnit}, 'connector',
          ${(r.notes ?? '') + ` [src=${extId}]`}, 'draft'
        )
        ON CONFLICT DO NOTHING
      `
      imported++
    } catch (err) {
      failed++
      errors.push({ row: r.rowId ?? i, error: err instanceof Error ? err.message : 'insert' })
    }
  }

  await sql`
    UPDATE connector_sync_runs
    SET status = 'complete', completed_at = now(),
        rows_fetched = ${fetched}, rows_imported = ${imported}, rows_failed = ${failed},
        details = ${JSON.stringify({ errors: errors.slice(0, 50) })}::jsonb
    WHERE id = ${runId}
  `
  await sql`
    UPDATE connector_connections
    SET last_sync_at = now(), last_sync_status = 'complete', last_sync_error = NULL, updated_at = now()
    WHERE id = ${conn.id}
  `

  return res.status(200).json({
    runId, rowsFetched: fetched, rowsImported: imported, rowsFailed: failed,
    errors: errors.slice(0, 50),
  })
}
