import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors } from './_auth.js'
import { getDb } from './_db.js'

/**
 * Public health probe. No auth — operators and sales need to see at a glance
 * whether the deployment is wired up. We deliberately expose only booleans
 * for integration configuration (never the secret values themselves).
 *
 * Returns 200 unless BOTH the DB probe fails AND ok=false (in which case 503).
 * Operators want the rest of the data even if Postgres is down.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const timestamp = new Date().toISOString()
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev'
  const region = process.env.VERCEL_REGION ?? 'local'

  // --- DB probe ---
  let dbOk = false
  let dbLatency: number | undefined
  let dbError: string | undefined
  const t0 = Date.now()
  try {
    const sql = getDb()
    await sql`SELECT 1 as ping`
    dbOk = true
    dbLatency = Date.now() - t0
  } catch (err) {
    dbError = (err instanceof Error ? err.message : String(err)).slice(0, 200)
  }

  // --- Integration probes (config-only, never secret values) ---
  const integrations = {
    email: {
      configured: Boolean(process.env.RESEND_API_KEY),
      provider: process.env.RESEND_API_KEY ? ('resend' as const) : null,
    },
    sso: {
      configured: Boolean(process.env.WORKOS_API_KEY && process.env.WORKOS_CLIENT_ID),
      provider: process.env.WORKOS_API_KEY ? ('workos' as const) : null,
    },
    ai: {
      configured: Boolean(process.env.ANTHROPIC_API_KEY),
      provider: process.env.ANTHROPIC_API_KEY ? ('claude' as const) : null,
    },
    realtime: {
      configured: Boolean(process.env.LIVEBLOCKS_SECRET_KEY),
      provider: process.env.LIVEBLOCKS_SECRET_KEY ? ('liveblocks' as const) : null,
    },
    sentry: {
      configured: Boolean(process.env.SENTRY_DSN || process.env.VITE_SENTRY_DSN),
    },
    euRegion: {
      configured: Boolean(process.env.DATABASE_URL_EU),
    },
    apacRegion: {
      configured: Boolean(process.env.DATABASE_URL_APAC),
    },
  }

  const ok = dbOk
  const body = {
    ok,
    timestamp,
    version,
    region,
    db: dbOk
      ? { ok: true, latencyMs: dbLatency }
      : { ok: false, error: dbError ?? 'Unknown DB error' },
    integrations,
  }

  // Only 503 when both ok=false AND DB is down. (Currently those are the same
  // signal, but the spec calls this out so future probes can roll up here.)
  if (!ok && !dbOk) return res.status(503).json(body)
  return res.status(200).json(body)
}
