import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { cors, requirePermission } from '../_auth.js'
import { checkRateLimit } from '../_rateLimit.js'
import { draftNarrative } from '../_claude.js'
import { getDb } from '../_db.js'

const schema = z.object({
  framework: z.enum(['gri', 'csrd', 'tcfd', 'cdp', 'issb']),
  section: z.string().min(1).max(200),
  tone: z.enum(['formal', 'narrative', 'concise']).optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Gracefully short-circuit when the LLM provider isn't configured — keeps the
  // route alive in environments (preview, demo) where the secret isn't set.
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const t = await requirePermission(req, res, 'reports.create')
  if (!t) return

  // Cap Claude spend per org — 20 drafts/min is plenty for interactive use.
  const allowed = await checkRateLimit(req, res, {
    key: `ai:${t.org}`,
    windowSeconds: 60,
    max: 20,
  })
  if (!allowed) return

  try {
    schema.parse(req.body)
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
    throw e
  }

  const { framework, section, tone } = req.body as z.infer<typeof schema>
  const sql = getDb()

  // Pull org context for grounding.
  let orgContext: { name: string; industry?: string; country?: string } = { name: 'Unknown' }
  try {
    const orgRows = (await sql`
      SELECT name, industry, country FROM organisations WHERE id = ${t.org}
    `) as Array<{ name: string; industry?: string; country?: string }>
    if (orgRows[0]) orgContext = orgRows[0]
  } catch {
    // organisations row may be missing in demo workspaces — ground with placeholder
  }

  // Pull approved values whose questionnaire section matches the requested section.
  // v1 heuristic: ILIKE on the section name. Falls back to empty array if the new
  // schema isn't deployed in this environment — Claude will surface "[Data not provided]".
  let dataRows: unknown[] = []
  try {
    dataRows = (await sql`
      SELECT qi.gri_code, qi.line_item, qi.unit, dv.value, dv.scope_key
      FROM data_value dv
      JOIN questionnaire_item qi ON qi.id = dv.questionnaire_item_id
      JOIN reporting_year ry ON ry.id = dv.reporting_year_id
      WHERE ry.organisation_id = ${t.org}
        AND dv.status = 'approved'
        AND qi.section ILIKE ${'%' + section + '%'}
      LIMIT 200
    `) as unknown[]
  } catch {
    dataRows = []
  }

  const result = await draftNarrative({
    framework,
    section,
    tone,
    data: { values: dataRows },
    orgContext,
  })

  if (!result.ok) return res.status(502).json({ error: result.error })
  return res.status(200).json({
    text: result.text,
    usage: { tokensIn: result.tokensIn, tokensOut: result.tokensOut, cached: result.cached },
  })
}
