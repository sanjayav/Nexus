import { jwtVerify, SignJWT } from 'jose'
import type { VercelRequest } from '@vercel/node'

/**
 * JWT_SECRET is required. We refuse to start without it — falling back to a
 * known string would let any reader of this repo forge admin tokens.
 * Set it in Vercel project env (and your local .env for `npm run dev:api`).
 */
const RAW_SECRET = process.env.JWT_SECRET
if (!RAW_SECRET || RAW_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET env var is missing or too short (need ≥32 chars). ' +
    'Set it in Vercel project settings (Production + Preview) and in your local .env. ' +
    'Generate one with: openssl rand -hex 32'
  )
}
const SECRET = new TextEncoder().encode(RAW_SECRET)

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
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyToken(req: VercelRequest): Promise<TokenPayload | null> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  try {
    const { payload } = await jwtVerify(header.slice(7), SECRET)
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
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
