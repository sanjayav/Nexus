import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './_db.js'

/**
 * Lightweight DB-backed token bucket. Use on sensitive endpoints (auth,
 * AI spend, import-heavy paths) where cross-instance correctness matters —
 * Vercel functions are stateless per cold-start, so in-process counters
 * would let an attacker walk around the limit by hammering many instances.
 *
 * Failure mode is FAIL-OPEN: if the DB probe throws we log + allow the
 * request. Production safety (legitimate users continue to work) outweighs
 * strict enforcement when our own storage is unreachable.
 */
export interface RateLimit {
  /** Caller-supplied identifier, e.g. "login:1.2.3.4" or "ai:<orgId>". */
  key: string
  /** Window length, in seconds. The bucket key is the window start, so
   *  two contiguous windows can fire (max * 2) requests in 2 * windowSeconds. */
  windowSeconds: number
  /** Maximum requests allowed per window. */
  max: number
}

/**
 * Returns `true` if the request is allowed. Sets `X-RateLimit-*` headers on
 * the response. On block, sends 429 with `retryAfter` and returns `false` —
 * caller must `if (!ok) return`.
 */
export async function checkRateLimit(
  _req: VercelRequest,
  res: VercelResponse,
  limit: RateLimit,
): Promise<boolean> {
  const sql = getDb()
  const windowStart = new Date(
    Math.floor(Date.now() / (limit.windowSeconds * 1000)) * limit.windowSeconds * 1000
  )
  try {
    const rows = (await sql`
      INSERT INTO rate_limit_buckets (key, window_start, count)
      VALUES (${limit.key}, ${windowStart.toISOString()}, 1)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
                  WHEN rate_limit_buckets.window_start = ${windowStart.toISOString()}
                  THEN rate_limit_buckets.count + 1
                  ELSE 1
                END,
        window_start = ${windowStart.toISOString()},
        updated_at = now()
      RETURNING count
    `) as Array<{ count: number }>
    const count = rows[0]?.count ?? 1
    res.setHeader('X-RateLimit-Limit', String(limit.max))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit.max - count)))
    if (count > limit.max) {
      res.setHeader('Retry-After', String(limit.windowSeconds))
      res.status(429).json({ error: 'Too many requests', retryAfter: limit.windowSeconds })
      return false
    }
    return true
  } catch (err) {
    // Fail-open: production safety > strict enforcement.
    // eslint-disable-next-line no-console
    console.error('[rateLimit] DB unavailable, allowing request:', err instanceof Error ? err.message : err)
    return true
  }
}

/**
 * Best-effort client IP. Trusts the left-most x-forwarded-for hop (Vercel
 * inserts the real client there). Falls back to x-real-ip then 'unknown'.
 */
export function clientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for']
  const fwdStr = Array.isArray(fwd) ? fwd[0] : fwd
  const firstHop = fwdStr?.split(',')[0]?.trim()
  if (firstHop) return firstHop
  const real = req.headers['x-real-ip']
  if (typeof real === 'string' && real) return real
  return 'unknown'
}
