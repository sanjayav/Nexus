import { jwtVerify, SignJWT } from 'jose'
import crypto from 'crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, type Region } from './_db.js'

/**
 * JWT_SECRET is required at sign / verify time. We deliberately do NOT throw
 * at module load — that crashes every serverless function with an opaque
 * FUNCTION_INVOCATION_FAILED. Instead we throw inside signToken / verifyToken
 * so endpoints can catch and return a clear 503 with diagnostic info.
 *
 * Generate a strong secret with: openssl rand -hex 32
 * Set it in Vercel project env (Production + Preview) and in your local .env.
 */
function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET
  if (!raw || raw.length < 32) {
    throw new Error(
      'JWT_SECRET env var is missing or too short (need ≥32 chars). ' +
      'Set it in Vercel project settings (Production + Preview). ' +
      'Generate one with: openssl rand -hex 32'
    )
  }
  return new TextEncoder().encode(raw)
}

/**
 * CORS allowlist. Production must set ALLOWED_ORIGINS to a comma-separated
 * list of fully-qualified origins, e.g.
 *   ALLOWED_ORIGINS="https://demo.aeiforo.com,https://app.aeiforo.com"
 *
 * Dev (NODE_ENV !== 'production') falls back to localhost origins so the
 * Vite dev server can talk to a locally-running API.
 */
const ALLOWED_ORIGINS: string[] = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000']

export interface TokenPayload {
  sub: string   // user id
  org: string   // org id
  email: string
  /**
   * Data-residency region for this org's primary store. Optional for
   * backwards compatibility with tokens issued before the region rollout —
   * absent → 'us'. Read via `getDbForToken()` to route to the right Neon
   * project.
   */
  org_region?: Region
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

/**
 * Short-lived purpose-scoped JWT (e.g. step-up MFA challenge). Caller specifies
 * the `purpose` claim and ttl. Consume via verifyPurposeToken() — it asserts
 * the purpose matches, so a session JWT cannot be replayed against an MFA step
 * and vice versa.
 */
export async function signPurposeToken(
  payload: { sub: string; org: string; email: string; org_region?: Region; purpose: string },
  ttl: string = '5m',
): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(getSecret())
}

export async function verifyPurposeToken(
  rawToken: string,
  expectedPurpose: string,
): Promise<(TokenPayload & { purpose: string }) | null> {
  let secret: Uint8Array
  try { secret = getSecret() } catch { return null }
  try {
    const { payload } = await jwtVerify(rawToken, secret)
    const purpose = (payload as Record<string, unknown>).purpose
    if (purpose !== expectedPurpose) return null
    return payload as unknown as TokenPayload & { purpose: string }
  } catch {
    return null
  }
}

/**
 * API key bearer prefix. Tokens that start with this string are looked up
 * in the api_keys table instead of being verified as JWTs.
 */
export const API_KEY_PREFIX = 'aei_'

export interface ApiKeyAuth {
  kind: 'api_key'
  id: string
  org_id: string
  scopes: string[]
}

async function verifyApiKey(raw: string): Promise<ApiKeyAuth | null> {
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  try {
    const sql = getDb()
    const rows = (await sql`
      SELECT id, org_id, scopes, expires_at
      FROM api_keys
      WHERE token_hash = ${hash} AND is_active = true
      LIMIT 1
    `) as Array<{ id: string; org_id: string; scopes: unknown; expires_at: string | null }>
    if (rows.length === 0) return null
    const row = rows[0]
    if (row.expires_at && new Date(row.expires_at) < new Date()) return null
    const scopes = Array.isArray(row.scopes)
      ? (row.scopes as unknown[]).filter((s): s is string => typeof s === 'string')
      : []
    // Update last_used_at asynchronously — never block the request on it.
    void sql`UPDATE api_keys SET last_used_at = now() WHERE id = ${row.id}`.catch(() => {})
    return { kind: 'api_key', id: row.id, org_id: row.org_id, scopes }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[verifyApiKey] lookup failed:', err instanceof Error ? err.message : err)
    return null
  }
}

export async function verifyToken(req: VercelRequest): Promise<TokenPayload | null> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  const raw = header.slice(7)
  // API keys are verified separately — they don't carry a `sub` user id.
  if (raw.startsWith(API_KEY_PREFIX)) return null
  let secret: Uint8Array
  try {
    secret = getSecret()
  } catch (e) {
    // Surface the config error in Vercel logs but don't crash the function.
    // Endpoint returns 401, which prompts the user to re-login; login itself
    // throws clearly via signToken when the secret is misconfigured.
    // eslint-disable-next-line no-console
    console.error('[verifyToken] JWT secret misconfigured:', e instanceof Error ? e.message : e)
    return null
  }
  try {
    const { payload } = await jwtVerify(raw, secret)
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

/**
 * Region-aware DB accessor. Returns a Neon client scoped to the org's
 * residency region (defaults to 'us' for tokens without the field, so
 * existing call sites stay correct).
 */
export function getDbForToken(token: TokenPayload) {
  return getDb(token.org_region ?? 'us')
}

/**
 * Apply CORS headers. Echoes the request Origin only if it appears in the
 * allowlist (or DEV_ORIGINS in non-production). Never falls back to '*'.
 */
export function cors(
  res: { setHeader: (k: string, v: string) => void },
  req?: { headers: { origin?: string | string[] } },
) {
  const requestOrigin = Array.isArray(req?.headers.origin) ? req?.headers.origin[0] : req?.headers.origin
  const allowed = process.env.NODE_ENV === 'production'
    ? ALLOWED_ORIGINS
    : [...ALLOWED_ORIGINS, ...DEV_ORIGINS]

  if (requestOrigin && allowed.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin)
    res.setHeader('Vary', 'Origin')
  }
  // No origin or not allowed → no ACAO header → browser blocks the response.
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}

export interface TokenWithPerms extends TokenPayload {
  permissions: Set<string>
  roleSlugs: Set<string>
}

/**
 * Load permissions + role slugs for the token's user.
 * Returns null if user is gone (token still valid but DB row deleted).
 */
export async function loadPermissions(token: TokenPayload): Promise<TokenWithPerms | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT array_agg(DISTINCT p.resource || '.' || p.action) AS perms,
           array_agg(DISTINCT r.slug) AS slugs
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    LEFT JOIN permissions p ON p.id = rp.permission_id
    WHERE u.id = ${token.sub} AND u.is_active = true
    GROUP BY u.id
  ` as Array<{ perms: (string | null)[] | null; slugs: (string | null)[] | null }>
  if (rows.length === 0) return null
  return {
    ...token,
    permissions: new Set((rows[0].perms ?? []).filter((x): x is string => Boolean(x))),
    roleSlugs: new Set((rows[0].slugs ?? []).filter((x): x is string => Boolean(x))),
  }
}

/**
 * Convenience guard. Returns the loaded token on success.
 * On failure, sends a 401/403 response and returns null — caller must `if (!t) return`.
 *
 * Backward-compatible with two bearer schemes:
 *   - JWT (default): permissions resolved via roles → role_permissions.
 *   - API key (Bearer aei_...): permissions resolved from the `scopes` JSONB
 *     column on the api_keys row. The `sub` field is set to the key id with
 *     an `apikey:` prefix so audit-log call sites still get a stable actor id.
 */
export async function requirePermission(
  req: VercelRequest,
  res: VercelResponse,
  ...required: string[]
): Promise<TokenWithPerms | null> {
  const header = req.headers.authorization
  const raw = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (raw && raw.startsWith(API_KEY_PREFIX)) {
    const apiKey = await verifyApiKey(raw)
    if (!apiKey) { res.status(401).json({ error: 'Invalid API key' }); return null }
    const permissions = new Set(apiKey.scopes)
    const ok = required.every(p => permissions.has(p))
    if (!ok) { res.status(403).json({ error: 'Forbidden', required }); return null }
    return {
      sub: `apikey:${apiKey.id}`,
      org: apiKey.org_id,
      email: `apikey:${apiKey.id}`,
      permissions,
      roleSlugs: new Set<string>(['api_key']),
    }
  }

  const t = await verifyToken(req)
  if (!t) { res.status(401).json({ error: 'Unauthorized' }); return null }
  const loaded = await loadPermissions(t)
  if (!loaded) { res.status(401).json({ error: 'User not found' }); return null }
  const ok = required.every(p => loaded.permissions.has(p))
  if (!ok) { res.status(403).json({ error: 'Forbidden', required }); return null }
  return loaded
}
