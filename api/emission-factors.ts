import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getDb } from './_db.js'
import { verifyToken, cors, requirePermission } from './_auth.js'
import { audit, auditIp } from './_audit.js'

// GET    /api/emission-factors?scope=1&category=...&region=UK&source=...
// POST   /api/emission-factors           (admin.org required) — upsert a factor
// DELETE /api/emission-factors?id=<uuid> (admin.org required) — soft-delete

const efIdSchema = z.string().uuid()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const sql = getDb()

  try {
    if (req.method === 'GET') {
      const token = await verifyToken(req)
      if (!token) return res.status(401).json({ error: 'Unauthorized' })

      const scope = req.query.scope ? Number(req.query.scope) : null
      const category = (req.query.category as string | undefined) || null
      const region = (req.query.region as string | undefined) || null
      const source = (req.query.source as string | undefined) || null

      // Include soft-deleted rows only when caller explicitly opts in
      // (e.g. an admin reviewing the deprecated set). Default to active.
      const includeInactive = String(req.query.include_inactive ?? '0') === '1'

      const rows = await sql`
        SELECT id, scope, category, subcategory, fuel_or_activity, region, unit,
               co2e_per_unit, co2_per_unit, ch4_per_unit, n2o_per_unit,
               source, source_version, valid_from, valid_to, notes,
               COALESCE(is_active, true) AS is_active, created_at
        FROM emission_factors
        WHERE (${scope}::int IS NULL OR scope = ${scope}::int)
          AND (${category}::text IS NULL OR category = ${category}::text)
          AND (${region}::text IS NULL OR region = ${region}::text)
          AND (${source}::text IS NULL OR source = ${source}::text)
          AND (${includeInactive}::boolean OR COALESCE(is_active, true) = true)
        ORDER BY scope, category, fuel_or_activity, region, valid_from DESC
      `
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const t = await requirePermission(req, res, 'admin.org')
      if (!t) return // requirePermission already sent the error

      const b = req.body ?? {}
      const required = ['scope', 'category', 'fuel_or_activity', 'unit', 'co2e_per_unit', 'source', 'valid_from'] as const
      for (const k of required) {
        if (b[k] == null || b[k] === '') return res.status(400).json({ error: `${k} required` })
      }
      if (![1, 2, 3].includes(Number(b.scope))) return res.status(400).json({ error: 'scope must be 1, 2 or 3' })

      const inserted = await sql`
        INSERT INTO emission_factors
          (scope, category, subcategory, fuel_or_activity, region, unit,
           co2e_per_unit, co2_per_unit, ch4_per_unit, n2o_per_unit,
           source, source_version, valid_from, valid_to, notes)
        VALUES
          (${Number(b.scope)}, ${b.category}, ${b.subcategory ?? null}, ${b.fuel_or_activity},
           ${b.region ?? 'GLOBAL'}, ${b.unit},
           ${b.co2e_per_unit}, ${b.co2_per_unit ?? null}, ${b.ch4_per_unit ?? null}, ${b.n2o_per_unit ?? null},
           ${b.source}, ${b.source_version ?? null}, ${b.valid_from}, ${b.valid_to ?? null}, ${b.notes ?? null})
        ON CONFLICT (scope, category, fuel_or_activity, region, source, source_version, valid_from)
        DO UPDATE SET
          subcategory = EXCLUDED.subcategory,
          unit = EXCLUDED.unit,
          co2e_per_unit = EXCLUDED.co2e_per_unit,
          co2_per_unit = EXCLUDED.co2_per_unit,
          ch4_per_unit = EXCLUDED.ch4_per_unit,
          n2o_per_unit = EXCLUDED.n2o_per_unit,
          valid_to = EXCLUDED.valid_to,
          notes = EXCLUDED.notes
        RETURNING id
      ` as Array<{ id: string }>
      return res.status(201).json({ ok: true, id: inserted[0].id })
    }

    if (req.method === 'DELETE') {
      // Soft-delete only — historical activity_data may reference the row.
      // Gated admin.org to match POST (upsert) authority.
      const t = await requirePermission(req, res, 'admin.org')
      if (!t) return

      const id = String(req.query.id ?? req.body?.id ?? '')
      if (!efIdSchema.safeParse(id).success) {
        return res.status(400).json({ error: 'valid id required' })
      }

      const updated = await sql`
        UPDATE emission_factors SET is_active = false
        WHERE id = ${id} AND COALESCE(is_active, true) = true
        RETURNING id
      ` as Array<{ id: string }>
      if (updated.length === 0) {
        return res.status(404).json({ error: 'Emission factor not found or already inactive' })
      }

      await audit({
        orgId: t.org,
        userId: t.sub,
        action: 'emission_factor.delete',
        resourceType: 'emission_factor',
        resourceId: id,
        details: { soft_delete: true },
        ip: auditIp(req),
      })

      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
