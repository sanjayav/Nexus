/**
 * GET /api/connectors/oauth/callback/:provider?code=…&state=…
 *
 * OAuth 2.0 redirect target. Validates the state token (one-shot, expires in
 * 10 minutes), exchanges the auth code for tokens via the adapter's token
 * endpoint, encrypts them at rest, upserts a connector_connections row, then
 * redirects the user back to /data/connectors/:connectionId.
 *
 * Encryption: api/_crypto.ts (AES-256-GCM keyed off MFA_ENC_KEY / JWT_SECRET).
 * Never logs the decrypted tokens — only the connection id and provider.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors } from '../../../_auth.js'
import { getDb } from '../../../_db.js'
import { encrypt } from '../../../_crypto.js'
import { getConnector } from '../../../_connectors/registry.js'

interface OAuthTokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  instance_url?: string
  scope?: string
}

function redirect(res: VercelResponse, url: string): void {
  res.setHeader('Location', url)
  res.status(302).end()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const appBase = process.env.APP_BASE_URL ?? 'http://localhost:5173'
  const provider = String(req.query.provider ?? '')
  const code = String(req.query.code ?? '')
  const state = String(req.query.state ?? '')
  const errParam = req.query.error

  if (errParam) {
    return redirect(res, `${appBase}/data/connectors?error=${encodeURIComponent(String(errParam))}`)
  }
  if (!code || !state || !provider) {
    return redirect(res, `${appBase}/data/connectors?error=missing_oauth_params`)
  }

  const adapter = getConnector(provider)
  if (!adapter || adapter.authType !== 'oauth2' || !adapter.oauth) {
    return redirect(res, `${appBase}/data/connectors?error=unknown_provider`)
  }

  const sql = getDb()
  const rows = (await sql`
    SELECT state, org_id, user_id, provider, redirect_uri, expires_at
    FROM oauth_state
    WHERE state = ${state} AND provider = ${provider}
    LIMIT 1
  `) as Array<{ state: string; org_id: string; user_id: string; provider: string; redirect_uri: string; expires_at: string }>

  if (rows.length === 0) {
    return redirect(res, `${appBase}/data/connectors?error=invalid_state`)
  }
  const stateRow = rows[0]
  if (new Date(stateRow.expires_at) < new Date()) {
    await sql`DELETE FROM oauth_state WHERE state = ${state}`
    return redirect(res, `${appBase}/data/connectors?error=state_expired`)
  }
  // One-shot — burn the state immediately.
  await sql`DELETE FROM oauth_state WHERE state = ${state}`

  const clientId = process.env[adapter.oauth.clientIdEnv]
  const clientSecret = process.env[adapter.oauth.clientSecretEnv]
  if (!clientId || !clientSecret) {
    return redirect(res, `${appBase}/data/connectors?error=server_unconfigured`)
  }

  let tokenJson: OAuthTokenResponse
  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: stateRow.redirect_uri,
      client_id: clientId,
      client_secret: clientSecret,
    })
    const tokenRes = await fetch(adapter.oauth.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
    })
    if (!tokenRes.ok) {
      const txt = await tokenRes.text().catch(() => '')
      // eslint-disable-next-line no-console
      console.error('[oauth callback] token exchange failed', provider, tokenRes.status, txt.slice(0, 200))
      return redirect(res, `${appBase}/data/connectors?error=token_exchange_failed`)
    }
    tokenJson = await tokenRes.json() as OAuthTokenResponse
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[oauth callback] exchange error', provider, err instanceof Error ? err.message : err)
    return redirect(res, `${appBase}/data/connectors?error=token_exchange_failed`)
  }

  const accessToken = tokenJson.access_token
  if (!accessToken) {
    return redirect(res, `${appBase}/data/connectors?error=no_access_token`)
  }

  const accessEnc = encrypt(accessToken)
  const refreshEnc = tokenJson.refresh_token ? encrypt(tokenJson.refresh_token) : null
  const expiresAt = tokenJson.expires_in
    ? new Date(Date.now() + tokenJson.expires_in * 1000)
    : null
  const credsEnc = encrypt(JSON.stringify({})) // creds are stored on the access/refresh columns

  // Upsert one "live" connection per (org, provider). Customers can connect
  // multiple sandboxes by giving each a distinct display_name; v1 keeps it
  // simple — one connection per provider per org.
  const display = adapter.name
  const result = (await sql`
    INSERT INTO connector_connections (
      org_id, provider, display_name, auth_type, credentials_enc,
      oauth_access_token_enc, oauth_refresh_token_enc, oauth_expires_at,
      base_url, instance_url, scopes, status, created_by, updated_at
    ) VALUES (
      ${stateRow.org_id}, ${provider}, ${display}, 'oauth2', ${credsEnc},
      ${accessEnc}, ${refreshEnc}, ${expiresAt},
      ${adapter.defaultBaseUrl ?? null}, ${tokenJson.instance_url ?? null},
      ${JSON.stringify(adapter.oauth.scopes)}::jsonb, 'active', ${stateRow.user_id}, now()
    )
    ON CONFLICT (org_id, provider, display_name) DO UPDATE SET
      oauth_access_token_enc = EXCLUDED.oauth_access_token_enc,
      oauth_refresh_token_enc = COALESCE(EXCLUDED.oauth_refresh_token_enc, connector_connections.oauth_refresh_token_enc),
      oauth_expires_at = EXCLUDED.oauth_expires_at,
      instance_url = COALESCE(EXCLUDED.instance_url, connector_connections.instance_url),
      status = 'active', updated_at = now()
    RETURNING id
  `) as Array<{ id: string }>

  const connectionId = result[0]?.id
  if (!connectionId) {
    return redirect(res, `${appBase}/data/connectors?error=upsert_failed`)
  }

  return redirect(res, `${appBase}/data/connectors/${connectionId}?connected=1`)
}
