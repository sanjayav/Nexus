import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db'
import { verifyToken, cors } from '../_auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const token = await verifyToken(req)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const sql = getDb()

  try {
    const [anomalies, emissionsHistory, facilityComparison] = await Promise.all([
      // Anomalies with facility name
      sql`
        SELECT a.*, f.name AS facility_name
        FROM anomalies a
        LEFT JOIN facilities f ON f.id = a.facility_id
        WHERE a.org_id = ${token.org}
        ORDER BY a.detected_at DESC
      `,
      // Emissions history grouped by year with scope breakdown
      sql`
        SELECT
          period_year AS year,
          COALESCE(SUM(CASE WHEN scope = 'scope_1' THEN co2e_tonnes ELSE 0 END), 0) AS scope1,
          COALESCE(SUM(CASE WHEN scope = 'scope_2' THEN co2e_tonnes ELSE 0 END), 0) AS scope2,
          COALESCE(SUM(CASE WHEN scope = 'scope_3' THEN co2e_tonnes ELSE 0 END), 0) AS scope3,
          COALESCE(SUM(co2e_tonnes), 0) AS total
        FROM activity_data
        WHERE org_id = ${token.org}
        GROUP BY period_year
        ORDER BY period_year
      `,
      // Facility comparison with scope sums and YoY change
      sql`
        WITH current_year AS (
          SELECT
            facility_id,
            COALESCE(SUM(CASE WHEN scope = 'scope_1' THEN co2e_tonnes ELSE 0 END), 0) AS scope1,
            COALESCE(SUM(CASE WHEN scope = 'scope_2' THEN co2e_tonnes ELSE 0 END), 0) AS scope2,
            COALESCE(SUM(CASE WHEN scope = 'scope_3' THEN co2e_tonnes ELSE 0 END), 0) AS scope3,
            COALESCE(SUM(co2e_tonnes), 0) AS total
          FROM activity_data
          WHERE org_id = ${token.org} AND period_year = EXTRACT(YEAR FROM now())::int
          GROUP BY facility_id
        ),
        previous_year AS (
          SELECT
            facility_id,
            COALESCE(SUM(co2e_tonnes), 0) AS total
          FROM activity_data
          WHERE org_id = ${token.org} AND period_year = EXTRACT(YEAR FROM now())::int - 1
          GROUP BY facility_id
        )
        SELECT
          f.name,
          COALESCE(cy.scope1, 0) AS scope1,
          COALESCE(cy.scope2, 0) AS scope2,
          COALESCE(cy.scope3, 0) AS scope3,
          COALESCE(cy.total, 0) AS total,
          CASE WHEN COALESCE(py.total, 0) > 0
            THEN ROUND(((COALESCE(cy.total, 0) - py.total) / py.total * 100)::numeric, 2)
            ELSE 0
          END AS yoy_change
        FROM facilities f
        LEFT JOIN current_year cy ON cy.facility_id = f.id
        LEFT JOIN previous_year py ON py.facility_id = f.id
        WHERE f.org_id = ${token.org} AND f.is_active = true
        ORDER BY COALESCE(cy.total, 0) DESC
      `
    ])

    return res.status(200).json({
      anomalies,
      emissionsHistory: emissionsHistory.map((r: Record<string, unknown>) => ({
        year: Number(r.year),
        scope1: Number(r.scope1),
        scope2: Number(r.scope2),
        scope3: Number(r.scope3),
        total: Number(r.total),
      })),
      facilityComparison: facilityComparison.map((r: Record<string, unknown>) => ({
        name: r.name,
        scope1: Number(r.scope1),
        scope2: Number(r.scope2),
        scope3: Number(r.scope3),
        total: Number(r.total),
        yoyChange: Number(r.yoy_change),
      })),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
