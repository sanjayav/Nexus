/**
 * AI Gap Analysis — POST /api/ai/analyze-gaps
 *
 * Workiva's flagship "ESRS Intelligence" use case: chat asks "what's missing
 * for CSRD E1?" → Claude answers grounded in the org's actual questionnaire
 * items + data_value rows + framework requirements.
 *
 * Flow:
 *   1. Pull all questionnaire_item rows for the framework.
 *   2. Pull all data_value rows for this org + reportingYear matching those items.
 *   3. Compute coverage totals + per-item filled/missing/value snapshot.
 *   4. Call Claude with structured tool output (submit_gap_analysis).
 *   5. Persist to ai_gap_analyses so a repeat call within 1h in the same
 *      locale returns the cached row (unless regenerate:true). Cache key:
 *      (org, framework, year, locale); NULL locale on old rows = 'en'.
 *
 * Rate limit: 10/60s per org. Gated `analytics.view`.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { cors, requirePermission } from '../_auth.js'
import { checkRateLimit } from '../_rateLimit.js'
import { analyseGaps, type GapAnalysisContext, type GapAnalysisDisclosure, type GapAnalysisResult } from '../_claude.js'
import { getDb } from '../_db.js'
import { aiGate, aiLabel } from '../_llm.js'

const CACHE_TTL_MINUTES = 60

const schema = z.object({
  frameworkId: z.string().min(1).max(40),
  reportingYear: z.number().int().min(2000).max(2100),
  question: z.string().min(1).max(2000),
  scope: z.enum(['gaps', 'coverage', 'quality', 'custom']).optional(),
  regenerate: z.boolean().optional(),
})

type QiRow = {
  id: string
  gri_code: string
  line_item: string
  unit: string | null
  scope_split: string | null
  default_workflow_role: string | null
}

type DvRow = {
  questionnaire_item_id: string
  value: string | number | null
  status: string | null
  evidence_count: string | number | null
}

type CachedRow = {
  id: string
  summary: string | null
  missing_count: number | null
  raw_response: GapAnalysisResult | null
  model: string | null
  tokens_in: number | null
  tokens_out: number | null
  cached_tokens: number | null
  created_at: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const t = await requirePermission(req, res, 'analytics.view')
  if (!t) return

  const gate = await aiGate(getDb(), req, t)
  if (!gate.ok) return res.status(gate.status).json(gate.body)
  const locale = gate.locale

  const allowed = await checkRateLimit(req, res, {
    key: `ai-gaps:${t.org}`,
    windowSeconds: 60,
    max: 10,
  })
  if (!allowed) return

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(req.body)
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', issues: e.issues })
    throw e
  }

  const { frameworkId, reportingYear, question, scope, regenerate } = body
  const sql = getDb()

  // ── Cache lookup ────────────────────────────────────────────
  // Return any analysis for this (org, framework, year) within CACHE_TTL_MINUTES.
  // The question may differ between calls — that's fine; the platform-wide
  // coverage state is what really drives the answer, and we want predictable
  // spend. `regenerate: true` bypasses.
  if (!regenerate) {
    const cached = (await sql`
      SELECT g.id, g.summary, g.missing_count, g.raw_response, g.model,
             g.tokens_in, g.tokens_out, g.cached_tokens, g.created_at
      FROM ai_gap_analyses g
      WHERE g.org_id = ${t.org}
        AND g.framework_id = ${frameworkId}
        AND g.reporting_year = ${reportingYear}
        AND COALESCE(to_jsonb(g) ->> 'locale', 'en') = ${locale}
        AND g.created_at > now() - (${CACHE_TTL_MINUTES}::int * INTERVAL '1 minute')
      ORDER BY g.created_at DESC
      LIMIT 1
    `) as CachedRow[]
    if (cached.length > 0 && cached[0].raw_response) {
      return res.status(200).json({
        analysis: cached[0].raw_response,
        cached: true,
        generatedAt: cached[0].created_at,
        usage: {
          tokensIn: cached[0].tokens_in ?? 0,
          tokensOut: cached[0].tokens_out ?? 0,
          cached: cached[0].cached_tokens ?? 0,
        },
        ...aiLabel(locale, { model: cached[0].model ?? undefined }),
      })
    }
  }

  // ── Fetch required disclosures + current data ───────────────
  let qiRows: QiRow[]
  try {
    qiRows = (await sql`
      SELECT id, gri_code, line_item, unit, scope_split, default_workflow_role
      FROM questionnaire_item
      WHERE framework_id = ${frameworkId}
      ORDER BY gri_code, line_item
      LIMIT 500
    `) as QiRow[]
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load framework' })
  }

  if (qiRows.length === 0) {
    return res.status(404).json({ error: `No disclosures defined for framework "${frameworkId}"` })
  }

  // Pull data_value rows for this org + year that match these items.
  // reporting_year resolves via reporting_year.year to data_value.reporting_year_id.
  // Many orgs may not have a reporting_year row yet — return zero filled in that case.
  let dvRows: DvRow[] = []
  try {
    dvRows = (await sql`
      SELECT dv.questionnaire_item_id,
             dv.value, dv.status,
             (SELECT COUNT(*) FROM evidence ev WHERE ev.data_value_id = dv.id) AS evidence_count
      FROM data_value dv
      JOIN reporting_year ry ON ry.id = dv.reporting_year_id
      LEFT JOIN users eu ON eu.id = dv.entered_by
      -- Owner predicate (api/_tenancy.ts DATA_VALUE_OWNER_EXPR).
      WHERE COALESCE((to_jsonb(dv) ->> 'org_id')::uuid, eu.org_id, ry.organisation_id) = ${t.org}
        AND ry.year = ${reportingYear}
        AND dv.questionnaire_item_id = ANY(${qiRows.map(r => r.id)}::uuid[])
    `) as DvRow[]
  } catch {
    dvRows = []
  }

  const dvByQi = new Map<string, DvRow>()
  for (const r of dvRows) dvByQi.set(r.questionnaire_item_id, r)

  const FILLED_STATUSES = new Set(['submitted', 'reviewed', 'approved', 'published'])
  const IN_PROGRESS_STATUSES = new Set(['draft', 'rejected'])

  let filledCount = 0
  let inProgressCount = 0
  const disclosures: GapAnalysisDisclosure[] = qiRows.map(r => {
    const dv = dvByQi.get(r.id) ?? null
    const status = dv?.status ?? null
    const valueRaw = dv?.value
    const value = valueRaw == null ? null : (typeof valueRaw === 'number' ? valueRaw : Number(valueRaw))
    const evCount = dv ? Number(dv.evidence_count ?? 0) : 0
    const isFilled = status != null && FILLED_STATUSES.has(status) && value != null
    const isInProgress = status != null && (IN_PROGRESS_STATUSES.has(status) || (value != null && !isFilled))
    if (isFilled) filledCount++
    else if (isInProgress) inProgressCount++
    return {
      id: r.id,
      code: r.gri_code,
      lineItem: r.line_item,
      unit: r.unit,
      scope_split: r.scope_split,
      default_workflow_role: r.default_workflow_role,
      filled: isFilled,
      status,
      value,
      has_evidence: evCount > 0,
    }
  })

  const totals = {
    required: disclosures.length,
    filled: filledCount,
    inProgress: inProgressCount,
    missing: disclosures.length - filledCount - inProgressCount,
  }

  // Look up org for context (best-effort).
  const orgRows = (await sql`
    SELECT name, industry, country FROM organisations WHERE id = ${t.org} LIMIT 1
  `) as Array<{ name: string; industry: string | null; country: string | null }>
  const org = orgRows[0] ?? { name: 'Your organisation', industry: null, country: null }

  const ctx: GapAnalysisContext = {
    framework: { id: frameworkId, code: frameworkId.toUpperCase(), name: frameworkId },
    reportingYear,
    organisation: {
      name: org.name,
      industry: org.industry ?? undefined,
      country: org.country ?? undefined,
    },
    question,
    scope,
    totals,
    disclosures,
  }

  // ── Call Claude ─────────────────────────────────────────────
  const result = await analyseGaps(ctx, { provider: gate.provider, locale })
  if (!result.ok || !result.result) {
    return res.status(502).json({ error: result.error ?? 'AI gap analysis failed' })
  }

  // ── Persist ─────────────────────────────────────────────────
  let savedId: string | null = null
  const model = result.model ?? gate.provider.model
  const createdBy = t.sub && !t.sub.startsWith('apikey:') ? t.sub : null
  try {
    let inserted: Array<{ id: string }>
    try {
      inserted = (await sql`
        INSERT INTO ai_gap_analyses
          (org_id, framework_id, reporting_year, question,
           summary, missing_count, raw_response, model,
           tokens_in, tokens_out, cached_tokens, created_by, locale, provider)
        VALUES
          (${t.org}, ${frameworkId}, ${reportingYear}, ${question},
           ${result.result.summary}, ${result.result.missingCount},
           ${JSON.stringify(result.result)}::jsonb, ${model},
           ${result.tokensIn ?? 0}, ${result.tokensOut ?? 0},
           ${result.cached ?? 0}, ${createdBy}, ${locale}, ${gate.provider.id})
        RETURNING id
      `) as Array<{ id: string }>
    } catch {
      // locale/provider columns not migrated yet (api/_cnSchema.ts).
      inserted = (await sql`
        INSERT INTO ai_gap_analyses
          (org_id, framework_id, reporting_year, question,
           summary, missing_count, raw_response, model,
           tokens_in, tokens_out, cached_tokens, created_by)
        VALUES
          (${t.org}, ${frameworkId}, ${reportingYear}, ${question},
           ${result.result.summary}, ${result.result.missingCount},
           ${JSON.stringify(result.result)}::jsonb, ${model},
           ${result.tokensIn ?? 0}, ${result.tokensOut ?? 0},
           ${result.cached ?? 0}, ${createdBy})
        RETURNING id
      `) as Array<{ id: string }>
    }
    savedId = inserted[0]?.id ?? null
  } catch (err) {
    // Persistence failure is non-fatal — return the inference anyway.
    // eslint-disable-next-line no-console
    console.error('[analyze-gaps] persist failed:', err instanceof Error ? err.message : err)
  }

  return res.status(200).json({
    id: savedId,
    analysis: result.result,
    cached: false,
    generatedAt: new Date().toISOString(),
    coverage: totals,
    usage: {
      tokensIn: result.tokensIn ?? 0,
      tokensOut: result.tokensOut ?? 0,
      cached: result.cached ?? 0,
    },
    ...aiLabel(locale, result),
  })
}
