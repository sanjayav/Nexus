import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors, requirePermission } from './_auth.js'
import { getDb } from './_db.js'
import { loadOrgSettings, resolveRequestLocale, effectiveSettings } from './_orgSettings.js'
import { buildCalendar, todayIn, type CalendarRegion } from './_regCalendar.js'

/**
 * GET /api/regulatory-calendar[?region=CN,HK][&fy=2026]
 *
 * Any authenticated member (JWT or API key). Region-keyed regulatory
 * deadlines derived from the org's fiscal-year end (org_settings, default
 * 12-31) in the caller's language, with items for the org's enabled
 * frameworks / listing venues `highlighted` and sorted first.
 *
 * Response: { items: CalendarItem[], today, timezone, market, fiscal_year_end, enabled_frameworks }
 * National carbon market and CDP items carry `due_date: null` and a
 * `due_note` ("Per MEE annual notice") — dates are never invented.
 */
const REGIONS: CalendarRegion[] = ['CN', 'HK', 'EU', 'GLOBAL']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const tok = await requirePermission(req, res)
  if (!tok) return
  const sql = getDb()

  try {
    const settings = await loadOrgSettings(sql, tok.org)
    const eff = effectiveSettings(settings)
    const locale = await resolveRequestLocale(sql, req, tok, settings)

    let enabledFrameworks: string[] = []
    try {
      const rows = (await sql`
        SELECT framework_id FROM org_framework_enablement
        WHERE org_id = ${tok.org} AND enabled = true
      `) as Array<{ framework_id: string }>
      enabledFrameworks = rows.map(r => r.framework_id)
    } catch {
      enabledFrameworks = []
    }

    const regionParam = typeof req.query.region === 'string' ? req.query.region : ''
    const regions = regionParam
      ? regionParam.split(',').map(s => s.trim().toUpperCase()).filter((s): s is CalendarRegion => (REGIONS as string[]).includes(s))
      : null
    const fyRaw = Number(req.query.fy)
    const fiscalYear = Number.isInteger(fyRaw) && fyRaw >= 2000 && fyRaw <= 2100 ? fyRaw : null

    const today = todayIn(eff.timezone)
    const items = buildCalendar({
      locale,
      today,
      fiscalYearEnd: eff.fiscal_year_end,
      enabledFrameworks,
      listingVenues: settings.listing_venues,
      regions,
      fiscalYear,
    })

    return res.status(200).json({
      items,
      today,
      timezone: eff.timezone,
      market: settings.market,
      fiscal_year_end: eff.fiscal_year_end,
      enabled_frameworks: enabledFrameworks,
      locale,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
