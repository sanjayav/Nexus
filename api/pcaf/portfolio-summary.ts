import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_db.js'
import { cors, requirePermission } from '../_auth.js'

/**
 * GET /api/pcaf/portfolio-summary?year=2026
 *
 * Returns:
 *   - totals per scope + grand total tCO2e
 *   - per-asset-class breakdown (count, outstanding, financed emissions, weighted DQ)
 *   - portfolio-wide weighted-average data-quality score (weighted by
 *     financed_emissions_total)
 *   - coverage: % of outstanding that has reported emissions vs estimated
 *   - top 10 emitters
 */

interface SummaryAssetClass {
  asset_class: string
  asset_count: number
  outstanding_total: number
  financed_total: number
  financed_scope1: number
  financed_scope2: number
  financed_scope3: number
  weighted_dq: number
}

interface PortfolioSummary {
  reporting_year: number
  total_financed_emissions: number
  total_financed_scope1: number
  total_financed_scope2: number
  total_financed_scope3: number
  total_outstanding: number
  asset_count: number
  weighted_data_quality: number
  coverage_reported_pct: number
  coverage_estimated_pct: number
  by_asset_class: SummaryAssetClass[]
  top_emitters: Array<{
    id: string
    counterparty_name: string
    asset_class: string
    outstanding_amount: number
    financed_emissions_total: number
    data_quality_score: number
  }>
}

interface RawAsset {
  id: string
  asset_class: string
  counterparty_name: string
  outstanding_amount: number | string | null
  financed_emissions_scope1: number | string | null
  financed_emissions_scope2: number | string | null
  financed_emissions_scope3: number | string | null
  financed_emissions_total: number | string | null
  data_quality_score: number | string | null
  emissions_basis: string | null
}

const num = (v: unknown): number => {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = await requirePermission(req, res, 'data.view')
  if (!token) return

  const sql = getDb()
  const year = Number(req.query.year ?? new Date().getFullYear())

  try {
    const rows = await sql`
      SELECT id, asset_class, counterparty_name,
             outstanding_amount,
             financed_emissions_scope1, financed_emissions_scope2, financed_emissions_scope3,
             financed_emissions_total, data_quality_score, emissions_basis
      FROM pcaf_assets
      WHERE org_id = ${token.org} AND reporting_year = ${year}
    ` as RawAsset[]

    const totals = {
      financed: 0, s1: 0, s2: 0, s3: 0, outstanding: 0,
      dqWeightSum: 0, dqWeight: 0,
      reportedOut: 0, estimatedOut: 0,
    }
    const byClass = new Map<string, { count: number; outstanding: number; financed: number; s1: number; s2: number; s3: number; dqWeightSum: number; dqWeight: number }>()

    for (const r of rows) {
      const out = num(r.outstanding_amount)
      const fin = num(r.financed_emissions_total)
      const s1 = num(r.financed_emissions_scope1)
      const s2 = num(r.financed_emissions_scope2)
      const s3 = num(r.financed_emissions_scope3)
      const dq = num(r.data_quality_score)
      totals.financed += fin
      totals.s1 += s1
      totals.s2 += s2
      totals.s3 += s3
      totals.outstanding += out
      if (fin > 0) {
        totals.dqWeightSum += dq * fin
        totals.dqWeight += fin
      }
      if (r.emissions_basis === 'reported') totals.reportedOut += out
      else totals.estimatedOut += out

      const k = r.asset_class
      const slot = byClass.get(k) ?? { count: 0, outstanding: 0, financed: 0, s1: 0, s2: 0, s3: 0, dqWeightSum: 0, dqWeight: 0 }
      slot.count += 1
      slot.outstanding += out
      slot.financed += fin
      slot.s1 += s1
      slot.s2 += s2
      slot.s3 += s3
      if (fin > 0) {
        slot.dqWeightSum += dq * fin
        slot.dqWeight += fin
      }
      byClass.set(k, slot)
    }

    const by_asset_class: SummaryAssetClass[] = [...byClass.entries()]
      .map(([asset_class, v]) => ({
        asset_class,
        asset_count: v.count,
        outstanding_total: v.outstanding,
        financed_total: v.financed,
        financed_scope1: v.s1,
        financed_scope2: v.s2,
        financed_scope3: v.s3,
        weighted_dq: v.dqWeight > 0 ? v.dqWeightSum / v.dqWeight : 0,
      }))
      .sort((a, b) => b.financed_total - a.financed_total)

    const top_emitters = rows
      .map(r => ({
        id: r.id,
        counterparty_name: r.counterparty_name,
        asset_class: r.asset_class,
        outstanding_amount: num(r.outstanding_amount),
        financed_emissions_total: num(r.financed_emissions_total),
        data_quality_score: num(r.data_quality_score),
      }))
      .sort((a, b) => b.financed_emissions_total - a.financed_emissions_total)
      .slice(0, 10)

    const coverage_reported_pct = totals.outstanding > 0
      ? (totals.reportedOut / totals.outstanding) * 100
      : 0
    const coverage_estimated_pct = totals.outstanding > 0
      ? (totals.estimatedOut / totals.outstanding) * 100
      : 0

    const summary: PortfolioSummary = {
      reporting_year: year,
      total_financed_emissions: totals.financed,
      total_financed_scope1: totals.s1,
      total_financed_scope2: totals.s2,
      total_financed_scope3: totals.s3,
      total_outstanding: totals.outstanding,
      asset_count: rows.length,
      weighted_data_quality: totals.dqWeight > 0 ? totals.dqWeightSum / totals.dqWeight : 0,
      coverage_reported_pct,
      coverage_estimated_pct,
      by_asset_class,
      top_emitters,
    }
    return res.status(200).json(summary)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
