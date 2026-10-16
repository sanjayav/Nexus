import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db.js'
import { verifyToken, cors } from '../_auth.js'

/**
 * GET /api/reporting-year/active
 *
 * Resolves the caller org's current reporting_year — the year data entry
 * writes into (data_value.reporting_year_id). Read-only: it never creates a
 * year.
 *
 *   200 { id, year, status, period_id }
 *       The year of the org's active reporting period wins (linked through
 *       reporting_periods.reporting_year_id, or the same org + year when the
 *       link column/value isn't there yet); latest active period first.
 *       Without an active period: status 'active' preferred, then 'setup',
 *       latest year within a status (period_id null).
 *   404 { error, code: 'no_reporting_year' }
 *       the org has no open (non-published) year.
 *
 * Years are created by the period lifecycle (/api/org create-period /
 * transition-period → api/_periodYear.ts), never here.
 *
 * Published years are excluded: a published year is immutable, so it is never
 * the target for new values. Only the caller org's periods and years are read.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const sql = getDb()
  try {
    // `to_jsonb(rp) ->> 'reporting_year_id'` keeps this valid before
    // /api/setup has added the column (ensurePeriodYearSchema).
    const rows = await sql`
      SELECT ry.id, ry.year, ry.status, rp.id AS period_id
      FROM reporting_year ry
      LEFT JOIN reporting_periods rp
        ON rp.org_id = ry.organisation_id
       AND rp.status = 'active'
       AND COALESCE((to_jsonb(rp) ->> 'reporting_year_id')::uuid = ry.id, rp.year = ry.year)
      WHERE ry.organisation_id = ${token.org}
        AND ry.status IN ('active', 'setup')
      ORDER BY (rp.id IS NOT NULL) DESC, rp.year DESC NULLS LAST,
               (ry.status = 'active') DESC, ry.year DESC
      LIMIT 1
    ` as Array<{ id: string; year: number; status: string; period_id: string | null }>
    if (rows.length === 0) {
      return res.status(404).json({
        error: 'No open reporting year is configured for this organisation. Set one up under Reporting cycles (Reporting Periods) before entering data.',
        code: 'no_reporting_year',
      })
    }
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(rows[0])
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
