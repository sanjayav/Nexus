import { getDb } from './_db.js'
import type { VercelRequest } from '@vercel/node'

/**
 * Single-call helper for writing to `audit_log`. Existed inline at a handful
 * of call sites with subtly different field sets — funnel everything through
 * here so we get consistent shape + IP capture + JSONB encoding for free.
 *
 * Failures are SWALLOWED (logged to stderr). Audit writes must never block
 * the user-facing action they trace — a missing audit row is preferable to
 * a 500 on login or role-change.
 */
export interface AuditArgs {
  orgId: string
  userId: string | null
  action: string
  resourceType: string
  resourceId?: string | null
  details?: Record<string, unknown>
  ip?: string | null
}

export async function audit(args: AuditArgs): Promise<void> {
  try {
    const sql = getDb()
    await sql`
      INSERT INTO audit_log (org_id, user_id, action, resource_type, resource_id, details, ip_address)
      VALUES (
        ${args.orgId},
        ${args.userId},
        ${args.action},
        ${args.resourceType},
        ${args.resourceId ?? null},
        ${JSON.stringify(args.details ?? {})}::jsonb,
        ${args.ip ?? null}
      )
    `
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[audit] insert failed (non-fatal):', err instanceof Error ? err.message : err)
  }
}

/**
 * Best-effort client IP — mirrors `clientIp` in `_rateLimit.ts` but kept here
 * so audit code has zero coupling outside `_db.js`.
 */
export function auditIp(req: VercelRequest): string | null {
  const fwd = req.headers['x-forwarded-for']
  const fwdStr = Array.isArray(fwd) ? fwd[0] : fwd
  const firstHop = fwdStr?.split(',')[0]?.trim()
  if (firstHop) return firstHop
  const real = req.headers['x-real-ip']
  if (typeof real === 'string' && real) return real
  return null
}
