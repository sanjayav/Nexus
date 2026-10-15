import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors, requirePermission } from '../_auth.js'
import { generateIxbrlDeep } from '../_ixbrl.js'

/**
 * GET /api/ixbrl/preview?year=2026&frameworks=csrd-e1,csrd-e2&include-unapproved=1
 * Returns the deep iXBRL document for the caller's org along with coverage
 * diagnostics. Used by /reports/ixbrl preview UI.
 *
 * Response: { xhtml, concepts, contexts, units, warnings, coverage }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = await requirePermission(req, res, 'reports.view')
  if (!token) return

  const year = Number(req.query.year ?? new Date().getUTCFullYear())
  if (!Number.isFinite(year) || year < 1990 || year > 2100) {
    return res.status(400).json({ error: 'invalid year' })
  }

  const frameworksStr = String(req.query.frameworks ?? '')
  const frameworkIds = frameworksStr
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const includeUnapproved = String(req.query['include-unapproved'] ?? '') === '1'

  try {
    const result = await generateIxbrlDeep({
      orgId: token.org,
      reportingYear: year,
      frameworkIds,
      approvedOnly: !includeUnapproved,
    })
    return res.status(200).json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
