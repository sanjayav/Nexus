import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db.js'
import { verifyToken, cors } from '../_auth.js'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const sql = getDb()
  const currentYear = new Date().getFullYear()
  const previousYear = currentYear - 1

  try {
    // Run all queries in parallel
    const [
      currentYearTotals,
      scopeBreakdown,
      previousYearTotal,
      facilityCount,
      verifiedCount,
      monthlyData,
      recentAudit,
      facilityPerformance,
      totalProduction
    ] = await Promise.all([
      // Total emissions for current year
      sql`
        SELECT
          COALESCE(SUM(co2e_tonnes), 0) AS total,
          COALESCE(SUM(CASE WHEN scope = 'scope_1' THEN co2e_tonnes ELSE 0 END), 0) AS scope1,
          COALESCE(SUM(CASE WHEN scope = 'scope_2' THEN co2e_tonnes ELSE 0 END), 0) AS scope2,
          COALESCE(SUM(CASE WHEN scope = 'scope_3' THEN co2e_tonnes ELSE 0 END), 0) AS scope3
        FROM activity_data
        WHERE org_id = ${token.org} AND period_year = ${currentYear}
      `,
      // Scope breakdown
      sql`
        SELECT scope AS name, COALESCE(SUM(co2e_tonnes), 0) AS value
        FROM activity_data
        WHERE org_id = ${token.org} AND period_year = ${currentYear}
        GROUP BY scope
        ORDER BY scope
      `,
      // Previous year total for YoY
      sql`
        SELECT COALESCE(SUM(co2e_tonnes), 0) AS total
        FROM activity_data
        WHERE org_id = ${token.org} AND period_year = ${previousYear}
      `,
      // Active facility count
      sql`
        SELECT COUNT(*) AS count FROM facilities
        WHERE org_id = ${token.org} AND is_active = true
      `,
      // Verified data points (approved + anchored)
      sql`
        SELECT COUNT(*) AS count FROM activity_data
        WHERE org_id = ${token.org} AND status IN ('approved', 'anchored')
      `,
      // Monthly trend for current year
      sql`
        SELECT
          period_month,
          COALESCE(SUM(CASE WHEN scope = 'scope_1' THEN co2e_tonnes ELSE 0 END), 0) AS scope1,
          COALESCE(SUM(CASE WHEN scope = 'scope_2' THEN co2e_tonnes ELSE 0 END), 0) AS scope2,
          COALESCE(SUM(CASE WHEN scope = 'scope_3' THEN co2e_tonnes ELSE 0 END), 0) AS scope3
        FROM activity_data
        WHERE org_id = ${token.org} AND period_year = ${currentYear} AND period_month IS NOT NULL
        GROUP BY period_month
        ORDER BY period_month
      `,
      // Recent audit log entries
      sql`
        SELECT al.*, u.name AS user_name
        FROM audit_log al
        LEFT JOIN users u ON u.id = al.user_id
        WHERE al.org_id = ${token.org}
        ORDER BY al.created_at DESC
        LIMIT 10
      `,
      // Facility performance
      sql`
        SELECT
          f.name,
          f.production_volume,
          COALESCE(SUM(CASE WHEN ad.scope = 'scope_1' THEN ad.co2e_tonnes ELSE 0 END), 0) AS scope1,
          COALESCE(SUM(CASE WHEN ad.scope = 'scope_2' THEN ad.co2e_tonnes ELSE 0 END), 0) AS scope2,
          COALESCE(SUM(CASE WHEN ad.scope = 'scope_3' THEN ad.co2e_tonnes ELSE 0 END), 0) AS scope3,
          COALESCE(SUM(ad.co2e_tonnes), 0) AS total
        FROM facilities f
        LEFT JOIN activity_data ad ON ad.facility_id = f.id AND ad.period_year = ${currentYear}
        WHERE f.org_id = ${token.org} AND f.is_active = true
        GROUP BY f.id, f.name, f.production_volume
        ORDER BY total DESC
      `,
      // Total production volume across active facilities
      sql`
        SELECT COALESCE(SUM(production_volume), 0) AS total
        FROM facilities
        WHERE org_id = ${token.org} AND is_active = true
      `
    ])

    const totalEmissions = Number(currentYearTotals[0].total)
    const prevTotal = Number(previousYearTotal[0].total)
    const production = Number(totalProduction[0].total)
    const yoyChange = prevTotal > 0
      ? ((totalEmissions - prevTotal) / prevTotal) * 100
      : 0

    // Build monthly trend with all 12 months
    const monthlyMap = new Map<number, { scope1: number; scope2: number; scope3: number }>()
    for (const row of monthlyData) {
      monthlyMap.set(Number(row.period_month), {
        scope1: Number(row.scope1),
        scope2: Number(row.scope2),
        scope3: Number(row.scope3),
      })
    }
    const monthlyTrend = MONTH_NAMES.map((month, i) => {
      const data = monthlyMap.get(i + 1)
      return {
        month,
        scope1: data?.scope1 ?? 0,
        scope2: data?.scope2 ?? 0,
        scope3: data?.scope3 ?? 0,
      }
    })

    // Build facility performance with intensity and YoY
    const facilityPerfResult = facilityPerformance.map((f: Record<string, unknown>) => {
      const total = Number(f.total)
      const prod = Number(f.production_volume) || 0
      return {
        name: f.name,
        scope1: Number(f.scope1),
        scope2: Number(f.scope2),
        scope3: Number(f.scope3),
        total,
        intensity: prod > 0 ? total / prod : 0,
        yoyChange: 0, // Would require previous year per-facility query; placeholder
      }
    })

    // Map scope names for display
    const scopeMap: Record<string, string> = {
      scope_1: 'Scope 1',
      scope_2: 'Scope 2',
      scope_3: 'Scope 3',
    }

    return res.status(200).json({
      kpi: {
        totalEmissions,
        scope1: Number(currentYearTotals[0].scope1),
        scope2: Number(currentYearTotals[0].scope2),
        scope3: Number(currentYearTotals[0].scope3),
        facilityCount: Number(facilityCount[0].count),
        yoyChange: Math.round(yoyChange * 100) / 100,
        intensity: production > 0 ? Math.round((totalEmissions / production) * 1000) / 1000 : 0,
        dataPointsVerified: Number(verifiedCount[0].count),
      },
      scopeBreakdown: scopeBreakdown.map((s: Record<string, unknown>) => ({
        name: scopeMap[s.name as string] || s.name,
        value: Number(s.value),
      })),
      monthlyTrend,
      recentActivity: recentAudit,
      facilityPerformance: facilityPerfResult,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
