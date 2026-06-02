/**
 * AI extraction accept — POST /api/ai/accept-extraction
 *
 * Marks an `ai_extractions` row as accepted by the current user and links
 * it to the data_value the user is about to save. Pure audit-trail
 * bookkeeping: the actual value fill happens client-side; this endpoint
 * just records "user U accepted extraction E into data_value D".
 *
 * Org-scoped via the evidence row (evidence → data_value → reporting_year
 * → organisation_id). Same guard as the extract endpoint.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { cors, requirePermission } from '../_auth.js'
import { getDb } from '../_db.js'

const schema = z.object({
  extractionId: z.string().uuid(),
  dataValueId: z.string().uuid(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = await requirePermission(req, res, 'data.upload')
  if (!token) return

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(req.body)
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
    throw e
  }

  const sql = getDb()

  // Verify the extraction belongs to the same org as the data_value the
  // caller wants to link to. Going through the evidence row's data_value →
  // reporting_year keeps the scope check at the same level as the upload.
  const ownership = (await sql`
    SELECT ax.id
    FROM ai_extractions ax
    LEFT JOIN evidence e ON e.id = ax.evidence_id
    LEFT JOIN data_value dv ON dv.id = e.data_value_id
    LEFT JOIN reporting_year ry ON ry.id = dv.reporting_year_id
    WHERE ax.id = ${body.extractionId}
      AND ry.organisation_id = ${token.org}
    LIMIT 1
  `) as Array<{ id: string }>
  if (ownership.length === 0) return res.status(404).json({ error: 'Extraction not found' })

  // Also confirm the target data_value belongs to the same org.
  const dvCheck = (await sql`
    SELECT dv.id
    FROM data_value dv
    JOIN reporting_year ry ON ry.id = dv.reporting_year_id
    WHERE dv.id = ${body.dataValueId} AND ry.organisation_id = ${token.org}
    LIMIT 1
  `) as Array<{ id: string }>
  if (dvCheck.length === 0) return res.status(404).json({ error: 'data_value not found' })

  await sql`
    UPDATE ai_extractions
    SET accepted = true,
        accepted_by = ${token.sub},
        accepted_at = now(),
        data_value_id = ${body.dataValueId}
    WHERE id = ${body.extractionId}
  `

  return res.status(200).json({ ok: true })
}
