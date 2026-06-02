/**
 * POST /api/connectors/oauth/start
 *
 * Body: { provider: string, displayName?: string, baseUrl?: string }
 * Returns: { authorizationUrl: string, state: string }
 *
 * Generates a single-use CSRF state token, persists it in oauth_state with a
 * 10-minute TTL, and asks the connector adapter to build the provider-specific
 * authorize URL. The redirect_uri is computed from APP_BASE_URL so callers
 * don't need to know it.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { z } from 'zod'
import { cors, requirePermission } from '../../_auth.js'
import { getDb } from '../../_db.js'
import { getConnector } from '../../_connectors/registry.js'

const startSchema = z.object({
  provider: z.string().min(1).max(64),
  displayName: z.string().max(128).optional(),
  baseUrl: z.string().url().max(512).optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = await requirePermission(req, res, 'data.upload')
  if (!token) return

  const parsed = startSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid body' })
  const { provider, baseUrl } = parsed.data

  const adapter = getConnector(provider)
  if (!adapter) return res.status(404).json({ error: `Unknown provider: ${provider}` })

  if (adapter.authType !== 'oauth2') {
    return res.status(400).json({
      error: `${adapter.name} uses ${adapter.authType} auth, not OAuth — use POST /api/connectors/connections to save credentials directly.`,
    })
  }
  if (!adapter.oauth) {
    return res.status(503).json({ error: `${adapter.name} adapter missing OAuth config` })
  }

  const clientId = process.env[adapter.oauth.clientIdEnv]
  const clientSecret = process.env[adapter.oauth.clientSecretEnv]
  if (!clientId || !clientSecret) {
    return res.status(503).json({
      error: `${adapter.oauth.clientIdEnv} / ${adapter.oauth.clientSecretEnv} not configured`,
    })
  }

  const appBase = process.env.APP_BASE_URL ?? 'http://localhost:5173'
  const redirectUri = `${appBase.replace(/\/$/, '')}/api/connectors/oauth/callback/${provider}`

  const state = crypto.randomBytes(24).toString('hex')
  const sql = getDb()
  // Garbage-collect expired states opportunistically so the table stays small.
  await sql`DELETE FROM oauth_state WHERE expires_at < now()`
  await sql`
    INSERT INTO oauth_state (state, org_id, user_id, provider, redirect_uri, expires_at)
    VALUES (${state}, ${token.org}, ${token.sub}, ${provider}, ${redirectUri},
            now() + interval '10 minutes')
  `

  // Persist the chosen baseUrl into the state row's config so the callback
  // can hydrate the connection with the right per-tenant URL. We stash it
  // in a temp JSON column on connector_connections after success — for now
  // just include in the authorize URL state if needed.
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: adapter.oauth.scopes.join(' '),
    state,
    access_type: 'offline',  // GCP refresh tokens require this
    prompt: 'consent',
  })
  const authorizationUrl = `${adapter.oauth.authorizationUrl}?${params.toString()}`

  return res.status(200).json({ authorizationUrl, state, baseUrl: baseUrl ?? null })
}
