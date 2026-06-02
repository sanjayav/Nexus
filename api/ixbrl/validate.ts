import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors, requirePermission } from '../_auth.js'
import { validateIxbrl } from '../_ixbrl.js'

/**
 * POST /api/ixbrl/validate
 * Body: { xhtml: string }
 * Runs structural inline-XBRL checks (well-formedness, ref integrity,
 * concept-name presence, numeric parsability, ISO date format).
 * Returns { valid, errors[], warnings[], stats }.
 *
 * Note: production filing requires a certified taxonomy validator
 * (CoreFiling, ParsePort, IRIS Carbon) — this endpoint catches structural
 * issues but does not run the full EFRAG ESRS linkbase.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = await requirePermission(req, res, 'reports.view')
  if (!token) return

  const body = req.body as { xhtml?: unknown } | undefined
  const xhtml = body?.xhtml
  if (typeof xhtml !== 'string' || xhtml.length === 0) {
    return res.status(400).json({ error: 'Body must include { xhtml: string }' })
  }
  if (xhtml.length > 5_000_000) {
    return res.status(413).json({ error: 'Document too large (>5MB)' })
  }

  const result = validateIxbrl(xhtml)
  return res.status(200).json(result)
}
