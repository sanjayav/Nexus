import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getDb } from '../_db.js'
import { cors, requirePermission } from '../_auth.js'

/**
 * POST /api/pcaf/sync-scope3
 *
 * Aggregates the org's PCAF portfolio for a reporting year and writes a
 * single `activity_data` row (scope=3, category='Cat 15 — Investments')
 * that the org's standard reporting workflow pulls into ESRS E1-6 /
 * GRI 305-3 / TCFD / SEC climate disclosures.
 *
 * The user supplies a facility_id to attach the row to (typically the
 * institution's primary entity). The row is created in 'draft' status —
 * reviewers approve it via the normal queue, and the action is
 * audit-logged via the trigger on activity_data.
 */

const Body = z.object({
  reportingYear: z.number().int().min(1990).max(2100),
  facilityId: z.string().uuid(),
  periodMonth: z.number().int().min(1).max(12).default(12),
})

interface AssetRow {
  financed_emissions_total: number | string | null
  financed_emissions_scope1: number | string | null
  financed_emissions_scope2: number | string | null
  financed_emissions_scope3: number | string | null
  data_quality_score: number | string | null
  asset_class: string
}

const num = (v: unknown): number => {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = await requirePermission(req, res, 'calculators.edit')
  if (!token) return

  const parsed = Body.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body', issues: parsed.error.flatten() })
  }
  const { reportingYear, facilityId, periodMonth } = parsed.data

  const sql = getDb()

  try {
    // Confirm facility belongs to org (no cross-tenant writes).
    const fac = await sql`SELECT id FROM facilities WHERE id = ${facilityId} AND org_id = ${token.org}` as Array<{ id: string }>
    if (fac.length === 0) return res.status(404).json({ error: 'Facility not found in this org' })

    const rows = await sql`
      SELECT financed_emissions_total, financed_emissions_scope1, financed_emissions_scope2, financed_emissions_scope3,
             data_quality_score, asset_class
      FROM pcaf_assets
      WHERE org_id = ${token.org} AND reporting_year = ${reportingYear}
    ` as AssetRow[]

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No PCAF assets found for the given reporting year' })
    }

    const totals = { total: 0, dqWeightSum: 0, dqWeight: 0 }
    for (const r of rows) {
      const fin = num(r.financed_emissions_total)
      const dq = num(r.data_quality_score)
      totals.total += fin
      if (fin > 0) {
        totals.dqWeightSum += dq * fin
        totals.dqWeight += fin
      }
    }
    const weightedDq = totals.dqWeight > 0 ? totals.dqWeightSum / totals.dqWeight : 0

    // Insert a single activity_data row representing the aggregated
    // financed-emissions number for the year. Source columns mark the
    // calculator provenance so the audit trail links back here.
    const inserted = await sql`
      INSERT INTO activity_data (
        org_id, facility_id, period_year, period_month, scope,
        category, subcategory, activity_value, activity_unit,
        co2e_tonnes, status, submitted_by, submitted_at, notes,
        source_calculator_id, source_method_id
      ) VALUES (
        ${token.org}, ${facilityId}, ${reportingYear}, ${periodMonth}, 3,
        ${'Cat 15 - Investments'}, ${'PCAF Financed Emissions'}, ${totals.total}, ${'tCO2e'},
        ${totals.total}, ${'draft'}, ${token.sub}, now(),
        ${`Aggregated from ${rows.length} PCAF assets · weighted DQ ${weightedDq.toFixed(2)}`},
        ${'pcaf_portfolio'}, ${'pcaf_aggregate'}
      )
      RETURNING id, facility_id, period_year, period_month, scope, category,
                co2e_tonnes, status, notes, created_at
    ` as Array<{ id: string }>

    return res.status(201).json({
      ok: true,
      activity_data_id: inserted[0].id,
      asset_count: rows.length,
      total_financed_emissions: totals.total,
      weighted_data_quality: weightedDq,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
