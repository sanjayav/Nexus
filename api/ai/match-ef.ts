import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { cors, requirePermission } from '../_auth.js'
import { checkRateLimit } from '../_rateLimit.js'
import { matchEmissionFactor, type EfCandidate } from '../_claude.js'
import { getDb } from '../_db.js'

const schema = z.object({
  vendorName: z.string().min(1).max(200),
  spendCategory: z.string().optional(),
  region: z.enum(['UK', 'US', 'EU', 'GLOBAL', 'IN', 'CN', 'JP', 'AU', 'CA', 'DE', 'FR']).optional(),
  spendAmount: z.number().optional(),
  spendCurrency: z.string().length(3).optional(),
  scope: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  category: z.string().optional(),
})

// Shape returned to callers — full EF row plus model reasoning. Mirrored in the
// frontend AiEfMatchResponse type in src/lib/api.ts.
interface FullEfRow extends EfCandidate {
  source_version: string | null
  valid_from: string
  valid_to: string | null
  co2_per_unit: number | string | null
  ch4_per_unit: number | string | null
  n2o_per_unit: number | string | null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const t = await requirePermission(req, res, 'calculators.edit')
  if (!t) return

  const allowed = await checkRateLimit(req, res, {
    key: `ai-ef:${t.org}`,
    windowSeconds: 60,
    max: 30,
  })
  if (!allowed) return

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(req.body)
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
    throw e
  }

  const sql = getDb()
  const scope = body.scope ?? 3
  const region = body.region ?? null
  const category = body.category ?? null

  // Pull candidate EFs from the DB. Filter by:
  //   - scope (defaults to 3 for spend-based use case)
  //   - category if a hint is provided
  //   - region IN (region, 'GLOBAL') when a region is set, so the model can
  //     fall back to GLOBAL when no regional row exists
  // Cap at 50 — wide enough to give the model real choice, narrow enough to
  // stay cheap and keep response time bounded.
  let candidates: FullEfRow[] = []
  try {
    candidates = (await sql`
      SELECT id, scope, category, subcategory, fuel_or_activity, region, unit,
             co2e_per_unit, co2_per_unit, ch4_per_unit, n2o_per_unit,
             source, source_version, valid_from, valid_to, notes
      FROM emission_factors
      WHERE scope = ${scope}::int
        AND (${category}::text IS NULL OR category = ${category}::text)
        AND (${region}::text IS NULL OR region = ${region}::text OR region = 'GLOBAL')
      ORDER BY
        CASE WHEN ${region}::text IS NULL THEN 0 WHEN region = ${region}::text THEN 0 ELSE 1 END,
        category, fuel_or_activity
      LIMIT 50
    `) as FullEfRow[]
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB error'
    return res.status(500).json({ error: `Candidate lookup failed: ${msg}` })
  }

  if (candidates.length === 0) {
    return res.status(404).json({
      error: 'No candidate emission factors match the supplied filters. Seed /api/setup or relax filters.',
    })
  }

  const match = await matchEmissionFactor({
    vendorName: body.vendorName,
    spendCategory: body.spendCategory,
    region: body.region,
    spendAmount: body.spendAmount,
    spendCurrency: body.spendCurrency,
    category: body.category,
    candidates,
  })

  if (!match.ok || !match.result) {
    return res.status(502).json({ error: match.error ?? 'Claude call failed' })
  }

  // Validate the model only used ef_ids from the candidate set — guards
  // against hallucinated UUIDs that would 404 downstream.
  const candidateIds = new Set(candidates.map((c) => c.id))
  const topId = match.result.top_match.ef_id
  if (!candidateIds.has(topId)) {
    return res.status(422).json({ error: 'Model returned ef_id not in candidate set', ef_id: topId })
  }
  const validAlternates = (match.result.alternates ?? []).filter((a) => candidateIds.has(a.ef_id))

  const byId = new Map(candidates.map((c) => [c.id, c]))
  const topEf = byId.get(topId)!
  const altEfs = validAlternates.map((a) => ({
    ef: byId.get(a.ef_id)!,
    confidence: a.confidence,
    reasoning: a.reasoning,
  }))

  // Persist the suggestion for audit + future quality analysis. Failure here
  // is logged but not fatal — the model has done its work, and we'd rather
  // return the answer than 500 because the audit row didn't insert.
  let matchId: string | null = null
  try {
    const inserted = (await sql`
      INSERT INTO ai_ef_matches
        (org_id, vendor_name, spend_category, region, spend_amount, spend_currency,
         recommended_ef_id, recommended_ef_confidence, alternates, reasoning,
         model, tokens_in, tokens_out, cached_tokens)
      VALUES
        (${t.org}, ${body.vendorName}, ${body.spendCategory ?? null}, ${body.region ?? null},
         ${body.spendAmount ?? null}, ${body.spendCurrency ?? null},
         ${topId}, ${match.result.top_match.confidence},
         ${JSON.stringify(validAlternates)}::jsonb,
         ${match.result.top_match.reasoning},
         ${'claude-sonnet-4-6'}, ${match.tokensIn ?? null}, ${match.tokensOut ?? null}, ${match.cached ?? null})
      RETURNING id
    `) as Array<{ id: string }>
    matchId = inserted[0]?.id ?? null
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[match-ef] failed to persist audit row:', err instanceof Error ? err.message : err)
  }

  return res.status(200).json({
    match: {
      id: matchId,
      ef: topEf,
      confidence: match.result.top_match.confidence,
      reasoning: match.result.top_match.reasoning,
      alternates: altEfs,
      overallNotes: match.result.overall_notes ?? null,
    },
    usage: {
      tokensIn: match.tokensIn,
      tokensOut: match.tokensOut,
      cached: match.cached,
    },
  })
}
