import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getDb } from '../_db.js'
import { cors, requirePermission } from '../_auth.js'

/**
 * /api/pcaf/assets
 *   GET   ?year=2026         list assets for the org+year (data.view)
 *   POST  { ... }            persist a PCAF asset row (calculators.edit)
 *   DELETE ?id=...           remove an asset (calculators.edit)
 *
 * The POST body mirrors the pcaf_assets table; financed-emission columns are
 * expected to be pre-computed (typically by POST /api/pcaf/calculate). We
 * keep this endpoint dumb on purpose so the user can preview, tweak, and
 * commit on their own pace.
 */

const ASSET_CLASSES = [
  'listed_equity', 'corporate_bond', 'business_loan', 'unlisted_equity',
  'project_finance', 'commercial_real_estate', 'mortgage',
  'motor_vehicle_loan', 'sovereign_debt',
] as const

const PostBody = z.object({
  reportingYear: z.number().int().min(1990).max(2100),
  assetClass: z.enum(ASSET_CLASSES),
  counterpartyName: z.string().min(1).max(300),
  counterpartySector: z.string().max(120).optional(),
  counterpartyCountry: z.string().max(8).optional(),
  outstandingAmount: z.number().nonnegative().finite(),
  reportingCurrency: z.string().max(8).default('USD'),
  totalValue: z.number().nonnegative().finite().optional(),
  totalValueBasis: z.string().max(40).optional(),
  attributionFactor: z.number().nonnegative().finite(),
  reportedEmissionsScope1: z.number().nonnegative().finite().optional(),
  reportedEmissionsScope2: z.number().nonnegative().finite().optional(),
  reportedEmissionsScope3: z.number().nonnegative().finite().optional(),
  estimatedEmissions: z.number().nonnegative().finite().optional(),
  emissionsBasis: z.enum(['reported', 'physical_activity_estimate', 'economic_estimate']).optional(),
  financedEmissionsScope1: z.number().finite().optional(),
  financedEmissionsScope2: z.number().finite().optional(),
  financedEmissionsScope3: z.number().finite().optional(),
  financedEmissionsTotal: z.number().nonnegative().finite(),
  dataQualityScore: z.number().int().min(1).max(5),
  dataQualityRationale: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
})

export interface PcafAssetRow {
  id: string
  org_id: string
  reporting_year: number
  asset_class: string
  counterparty_name: string
  counterparty_sector: string | null
  counterparty_country: string | null
  outstanding_amount: number
  reporting_currency: string
  total_value: number | null
  total_value_basis: string | null
  attribution_factor: number
  reported_emissions_scope1: number | null
  reported_emissions_scope2: number | null
  reported_emissions_scope3: number | null
  estimated_emissions: number | null
  emissions_basis: string | null
  financed_emissions_scope1: number | null
  financed_emissions_scope2: number | null
  financed_emissions_scope3: number | null
  financed_emissions_total: number
  data_quality_score: number
  data_quality_rationale: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const sql = getDb()

  try {
    if (req.method === 'GET') {
      const token = await requirePermission(req, res, 'data.view')
      if (!token) return
      const year = Number(req.query.year ?? new Date().getFullYear())
      const assetClass = (req.query.asset_class as string | undefined) || null
      const rows = await sql`
        SELECT id, org_id, reporting_year, asset_class,
               counterparty_name, counterparty_sector, counterparty_country,
               outstanding_amount, reporting_currency, total_value, total_value_basis,
               attribution_factor,
               reported_emissions_scope1, reported_emissions_scope2, reported_emissions_scope3,
               estimated_emissions, emissions_basis,
               financed_emissions_scope1, financed_emissions_scope2, financed_emissions_scope3,
               financed_emissions_total, data_quality_score, data_quality_rationale,
               notes, created_by, created_at, updated_at
        FROM pcaf_assets
        WHERE org_id = ${token.org}
          AND reporting_year = ${year}
          AND (${assetClass}::text IS NULL OR asset_class = ${assetClass}::text)
        ORDER BY financed_emissions_total DESC NULLS LAST, created_at DESC
        LIMIT 2000
      ` as PcafAssetRow[]
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const token = await requirePermission(req, res, 'calculators.edit')
      if (!token) return
      let body
      try { body = PostBody.parse(req.body ?? {}) } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
        throw e
      }

      const inserted = await sql`
        INSERT INTO pcaf_assets (
          org_id, reporting_year, asset_class,
          counterparty_name, counterparty_sector, counterparty_country,
          outstanding_amount, reporting_currency, total_value, total_value_basis,
          attribution_factor,
          reported_emissions_scope1, reported_emissions_scope2, reported_emissions_scope3,
          estimated_emissions, emissions_basis,
          financed_emissions_scope1, financed_emissions_scope2, financed_emissions_scope3,
          financed_emissions_total, data_quality_score, data_quality_rationale,
          notes, created_by
        ) VALUES (
          ${token.org}, ${body.reportingYear}, ${body.assetClass},
          ${body.counterpartyName}, ${body.counterpartySector ?? null}, ${body.counterpartyCountry ?? null},
          ${body.outstandingAmount}, ${body.reportingCurrency}, ${body.totalValue ?? null}, ${body.totalValueBasis ?? null},
          ${body.attributionFactor},
          ${body.reportedEmissionsScope1 ?? null}, ${body.reportedEmissionsScope2 ?? null}, ${body.reportedEmissionsScope3 ?? null},
          ${body.estimatedEmissions ?? null}, ${body.emissionsBasis ?? null},
          ${body.financedEmissionsScope1 ?? null}, ${body.financedEmissionsScope2 ?? null}, ${body.financedEmissionsScope3 ?? null},
          ${body.financedEmissionsTotal}, ${body.dataQualityScore}, ${body.dataQualityRationale ?? null},
          ${body.notes ?? null}, ${token.sub}
        )
        RETURNING id, org_id, reporting_year, asset_class,
                  counterparty_name, counterparty_sector, counterparty_country,
                  outstanding_amount, reporting_currency, total_value, total_value_basis,
                  attribution_factor,
                  reported_emissions_scope1, reported_emissions_scope2, reported_emissions_scope3,
                  estimated_emissions, emissions_basis,
                  financed_emissions_scope1, financed_emissions_scope2, financed_emissions_scope3,
                  financed_emissions_total, data_quality_score, data_quality_rationale,
                  notes, created_by, created_at, updated_at
      ` as PcafAssetRow[]
      return res.status(201).json(inserted[0])
    }

    if (req.method === 'DELETE') {
      const token = await requirePermission(req, res, 'calculators.edit')
      if (!token) return
      const id = String(req.query.id ?? '')
      if (!id) return res.status(400).json({ error: 'Missing ?id=' })
      const deleted = await sql`
        DELETE FROM pcaf_assets WHERE id = ${id} AND org_id = ${token.org}
        RETURNING id
      ` as Array<{ id: string }>
      if (deleted.length === 0) return res.status(404).json({ error: 'Asset not found' })
      return res.status(200).json({ ok: true, id: deleted[0].id })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
