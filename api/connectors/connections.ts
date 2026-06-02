/**
 * GET /api/connectors/connections
 *
 * Returns the org's connector connections WITHOUT decrypted credentials.
 * Drives both the Connectors landing page (shows live integrations alongside
 * the CSV templates) and the per-connector detail page.
 *
 * Encrypted token columns are explicitly excluded from the SELECT — even if
 * a logged-in user has elevated permissions, the API contract is "tokens
 * live behind the sync endpoint".
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors, requirePermission } from '../_auth.js'
import { getDb } from '../_db.js'
import { listConnectors } from '../_connectors/registry.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = await requirePermission(req, res, 'data.view')
  if (!token) return

  const sql = getDb()
  const rows = await sql`
    SELECT id, provider, display_name, auth_type, base_url, instance_url, account_id,
           scopes, status, last_test_at, last_test_result,
           last_sync_at, last_sync_status, last_sync_error,
           config_json, created_at, updated_at
    FROM connector_connections
    WHERE org_id = ${token.org}
    ORDER BY created_at DESC
  `

  const adapters = listConnectors().map(a => ({
    id: a.id,
    name: a.name,
    category: a.category,
    description: a.description,
    iconKey: a.iconKey,
    authType: a.authType,
    fieldMappings: a.fieldMappings,
    defaultBaseUrl: a.defaultBaseUrl ?? null,
    docsUrl: a.docsUrl ?? null,
    apiKeyFields: a.apiKeyFields ?? null,
    /** Whether the server has the env vars necessary to start an OAuth flow. */
    serverConfigured: a.authType === 'oauth2'
      ? Boolean(a.oauth && process.env[a.oauth.clientIdEnv] && process.env[a.oauth.clientSecretEnv])
      : true,
  }))

  return res.status(200).json({ connections: rows, adapters })
}
