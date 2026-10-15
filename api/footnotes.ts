/**
 * XBRL footnotes — per data_value annotations surfaced in the Fact Details
 * panel. Three operations on one resource:
 *
 *   GET    /api/footnotes?data_value_id=…        → list footnotes for a value
 *   POST   /api/footnotes                        → create  { data_value_id, footnote_text }
 *   DELETE /api/footnotes?id=…                   → remove (owner only)
 *
 * All paths org-scoped via data_value → reporting_year join so a caller can't
 * touch another tenant's footnotes.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { cors, requirePermission } from './_auth.js'
import { getDb } from './_db.js'

const createSchema = z.object({
  data_value_id: z.string().uuid(),
  footnote_text: z.string().min(1).max(2000),
})

type FootnoteRow = {
  id: string
  data_value_id: string
  footnote_text: string
  created_by: string | null
  created_at: string
  author_name: string | null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const sql = getDb()

  if (req.method === 'GET') {
    const t = await requirePermission(req, res, 'data.view')
    if (!t) return
    const dataValueId = (req.query.data_value_id as string | undefined) ?? ''
    if (!dataValueId) return res.status(400).json({ error: 'data_value_id required' })

    // Confirm the data_value belongs to the caller's org via reporting_year.
    const ownership = (await sql`
      SELECT dv.id FROM data_value dv
      JOIN reporting_year ry ON ry.id = dv.reporting_year_id
      WHERE dv.id = ${dataValueId} AND ry.organisation_id = ${t.org}
      LIMIT 1
    `) as Array<{ id: string }>
    if (ownership.length === 0) return res.status(404).json({ error: 'Data value not found' })

    const rows = (await sql`
      SELECT f.id, f.data_value_id, f.footnote_text, f.created_by, f.created_at,
             u.name AS author_name
      FROM xbrl_footnotes f
      LEFT JOIN users u ON u.id = f.created_by
      WHERE f.data_value_id = ${dataValueId}
      ORDER BY f.created_at ASC
    `) as FootnoteRow[]
    return res.status(200).json({ footnotes: rows })
  }

  if (req.method === 'POST') {
    const t = await requirePermission(req, res, 'data.upload')
    if (!t) return

    let body: z.infer<typeof createSchema>
    try {
      body = createSchema.parse(req.body)
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
      throw e
    }

    // Ownership check before insert.
    const ownership = (await sql`
      SELECT dv.id FROM data_value dv
      JOIN reporting_year ry ON ry.id = dv.reporting_year_id
      WHERE dv.id = ${body.data_value_id} AND ry.organisation_id = ${t.org}
      LIMIT 1
    `) as Array<{ id: string }>
    if (ownership.length === 0) return res.status(404).json({ error: 'Data value not found' })

    const inserted = (await sql`
      INSERT INTO xbrl_footnotes (data_value_id, footnote_text, created_by)
      VALUES (${body.data_value_id}, ${body.footnote_text}, ${t.sub})
      RETURNING id, data_value_id, footnote_text, created_by, created_at
    `) as Array<{ id: string; data_value_id: string; footnote_text: string; created_by: string; created_at: string }>
    return res.status(201).json({ footnote: inserted[0] })
  }

  if (req.method === 'DELETE') {
    const t = await requirePermission(req, res, 'data.upload')
    if (!t) return
    const id = (req.query.id as string | undefined) ?? ''
    if (!id) return res.status(400).json({ error: 'id required' })

    // Owner-only delete — verify creator + org scope in one query.
    const deleted = (await sql`
      DELETE FROM xbrl_footnotes f
      USING data_value dv, reporting_year ry
      WHERE f.id = ${id}
        AND dv.id = f.data_value_id
        AND ry.id = dv.reporting_year_id
        AND ry.organisation_id = ${t.org}
        AND f.created_by = ${t.sub}
      RETURNING f.id
    `) as Array<{ id: string }>
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Footnote not found or you are not the author' })
    }
    return res.status(200).json({ ok: true, id: deleted[0].id })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
