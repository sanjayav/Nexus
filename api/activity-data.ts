import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getDb } from './_db.js'
import { cors, requirePermission } from './_auth.js'

// /api/activity-data
//   GET   ?facility_id&scope&period_year&period_month&status&limit
//   POST  { facility_id, period_year, period_month, scope, category, ... }
//
// The POST path is the persistence target for the Scope 3 calculator UI: each
// computed result becomes one activity_data row tagged with the calculator +
// method that produced it. Rows are inserted as status='draft' — reviewers
// promote them through the normal workflow.

const PostBody = z.object({
  facility_id: z.string().uuid(),
  period_year: z.number().int().min(2000).max(2100),
  period_month: z.number().int().min(1).max(12),
  scope: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  category: z.string().min(1).max(200),
  subcategory: z.string().max(200).optional(),
  fuel_type: z.string().max(200).optional(),
  activity_value: z.number().finite(),
  activity_unit: z.string().min(1).max(80),
  emission_factor: z.number().finite().optional(),
  ef_source: z.string().max(200).optional(),
  co2e_tonnes: z.number().finite(),
  co2: z.number().finite().optional(),
  ch4: z.number().finite().optional(),
  n2o: z.number().finite().optional(),
  notes: z.string().max(2000).optional(),
  source_calculator_id: z.string().max(120).optional(),
  source_method_id: z.string().max(120).optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const sql = getDb()

  try {
    if (req.method === 'GET') {
      const token = await requirePermission(req, res, 'data.view')
      if (!token) return
      const { facility_id, scope, period_year, period_month, status } = req.query as Record<string, string | undefined>
      const limit = Math.min(Number(req.query.limit ?? 500), 2000)

      // Compose a dynamic-but-safe query using Neon's tagged template by
      // applying optional filters via COALESCE-style NULL passthrough.
      const fid = facility_id || null
      const sc  = scope ? Number(scope) : null
      const py  = period_year ? Number(period_year) : null
      const pm  = period_month ? Number(period_month) : null
      const st  = status || null

      const rows = await sql`
        SELECT a.id, a.facility_id, f.name AS facility_name, a.source_id,
               a.period_year, a.period_month, a.scope, a.category, a.subcategory,
               a.fuel_type, a.activity_value, a.activity_unit,
               a.emission_factor, a.ef_source, a.ef_unit,
               a.co2e_tonnes, a.co2, a.ch4, a.n2o, a.status,
               a.submitted_by, a.approved_by, a.submitted_at, a.approved_at,
               a.notes, a.source_calculator_id, a.source_method_id, a.created_at
        FROM activity_data a
        LEFT JOIN facilities f ON f.id = a.facility_id
        WHERE a.org_id = ${token.org}
          AND (${fid}::uuid IS NULL OR a.facility_id = ${fid}::uuid)
          AND (${sc}::int  IS NULL OR a.scope = ${sc}::int)
          AND (${py}::int  IS NULL OR a.period_year = ${py}::int)
          AND (${pm}::int  IS NULL OR a.period_month = ${pm}::int)
          AND (${st}::text IS NULL OR a.status = ${st}::text)
        ORDER BY a.created_at DESC
        LIMIT ${limit}
      `
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const token = await requirePermission(req, res, 'data.upload')
      if (!token) return
      let body
      try { body = PostBody.parse(req.body ?? {}) } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
        throw e
      }

      // Confirm the facility belongs to this org (no cross-tenant writes).
      const fac = await sql`SELECT id FROM facilities WHERE id = ${body.facility_id} AND org_id = ${token.org}` as Array<{ id: string }>
      if (fac.length === 0) return res.status(404).json({ error: 'Facility not found in this org' })

      const created = await sql`
        INSERT INTO activity_data
          (org_id, facility_id, period_year, period_month, scope,
           category, subcategory, fuel_type,
           activity_value, activity_unit, emission_factor, ef_source,
           co2e_tonnes, co2, ch4, n2o,
           status, submitted_by, submitted_at, notes,
           source_calculator_id, source_method_id)
        VALUES
          (${token.org}, ${body.facility_id}, ${body.period_year}, ${body.period_month}, ${body.scope},
           ${body.category}, ${body.subcategory ?? null}, ${body.fuel_type ?? null},
           ${body.activity_value}, ${body.activity_unit}, ${body.emission_factor ?? null}, ${body.ef_source ?? null},
           ${body.co2e_tonnes}, ${body.co2 ?? 0}, ${body.ch4 ?? 0}, ${body.n2o ?? 0},
           'draft', ${token.sub}, now(), ${body.notes ?? null},
           ${body.source_calculator_id ?? null}, ${body.source_method_id ?? null})
        RETURNING id, facility_id, period_year, period_month, scope,
                  category, subcategory, fuel_type,
                  activity_value, activity_unit, emission_factor, ef_source, ef_unit,
                  co2e_tonnes, co2, ch4, n2o, status, submitted_by, approved_by,
                  submitted_at, approved_at, notes,
                  source_calculator_id, source_method_id, created_at
      `
      return res.status(201).json(created[0])
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
