import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { cors, requirePermission } from '../_auth.js'
import { checkRateLimit } from '../_rateLimit.js'
import { narrateAnomaly, type AnomalyNarrationContext } from '../_claude.js'
import { getDb } from '../_db.js'

/**
 * POST /api/ai/narrate-anomaly
 *
 * Returns a plain-English explanation of a flagged anomaly, grounded in the
 * underlying activity_data for the affected facility & scope. Narrative is
 * cached on the `anomalies` row — subsequent calls return the stored text
 * unless `regenerate: true` is passed. Cache hit costs zero Claude tokens.
 */

const schema = z.object({
  anomalyId: z.string().uuid(),
  regenerate: z.boolean().optional(),
})

type AnomalyRow = {
  id: string
  facility_id: string | null
  severity: string | null
  title: string
  description: string | null
  scope: number | null
  metric: string | null
  expected_value: number | null
  actual_value: number | null
  deviation_pct: number | null
  detected_at: string
  ai_narrative: string | null
  ai_narrative_generated_at: string | null
  ai_narrative_model: string | null
  ai_narrative_tokens_in: number | null
  ai_narrative_tokens_out: number | null
}

type FacilityRow = {
  name: string
  type: string | null
  country: string | null
  production_volume: number | null
}

type ActivityAgg = {
  period_year: number
  period_quarter: number | null
  co2e_tonnes: string | number
  activity_value: string | number
  activity_unit: string | null
  emission_factor: string | number | null
  ef_source: string | null
}

function toNum(v: string | number | null | undefined, fallback = 0): number {
  if (v == null) return fallback
  const n = typeof v === 'number' ? v : Number(v)
  return isFinite(n) ? n : fallback
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const t = await requirePermission(req, res, 'analytics.view')
  if (!t) return

  const sql = getDb()

  // GET → return the list of DB-stored anomalies for the caller's org, joined
  // with facility name and the cached narrative metadata. No Claude call here,
  // no rate limit needed — pure read.
  if (req.method === 'GET') {
    const rows = (await sql`
      SELECT a.id, a.facility_id, f.name AS facility_name,
             a.type, a.severity, a.title, a.description, a.scope, a.metric,
             a.expected_value, a.actual_value, a.deviation_pct, a.status,
             a.detected_at,
             a.ai_narrative, a.ai_narrative_generated_at
      FROM anomalies a
      LEFT JOIN facilities f ON f.id = a.facility_id
      WHERE a.org_id = ${t.org}
      ORDER BY
        CASE a.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
        a.detected_at DESC
      LIMIT 200
    `) as Array<Record<string, unknown>>
    // Neon returns NUMERIC columns as strings — coerce to number so the
    // frontend can call .toFixed() / .toLocaleString() without crashing.
    const num = (v: unknown): number | null => {
      if (v == null) return null
      const n = typeof v === 'number' ? v : Number(v)
      return Number.isFinite(n) ? n : null
    }
    const coerced = rows.map(r => ({
      ...r,
      expected_value: num(r.expected_value),
      actual_value: num(r.actual_value),
      deviation_pct: num(r.deviation_pct),
    }))
    return res.status(200).json({ anomalies: coerced })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI not configured' })
  }

  // Below here is POST-only narration path.
  const allowed = await checkRateLimit(req, res, {
    key: `ai-narrate:${t.org}`,
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

  const { anomalyId, regenerate } = body

  // 1. Fetch anomaly scoped to caller's org. Prevents cross-tenant lookups.
  const anomalyRows = (await sql`
    SELECT id, facility_id, severity, title, description, scope, metric,
           expected_value, actual_value, deviation_pct, detected_at,
           ai_narrative, ai_narrative_generated_at, ai_narrative_model,
           ai_narrative_tokens_in, ai_narrative_tokens_out
    FROM anomalies
    WHERE id = ${anomalyId} AND org_id = ${t.org}
    LIMIT 1
  `) as AnomalyRow[]
  const anomaly = anomalyRows[0]
  if (!anomaly) return res.status(404).json({ error: 'Anomaly not found' })

  // 2. Cache hit — return stored narrative unless caller asked to regenerate.
  if (anomaly.ai_narrative && !regenerate) {
    return res.status(200).json({
      narrative: anomaly.ai_narrative,
      generatedAt: anomaly.ai_narrative_generated_at,
      cached: true,
      usage: {
        tokensIn: anomaly.ai_narrative_tokens_in ?? 0,
        tokensOut: anomaly.ai_narrative_tokens_out ?? 0,
        cached: 0,
      },
    })
  }

  // 3. Gather context for Claude — facility + period-over-period activity data.
  let facility: FacilityRow | null = null
  if (anomaly.facility_id) {
    const fr = (await sql`
      SELECT name, type, country, production_volume
      FROM facilities
      WHERE id = ${anomaly.facility_id} AND org_id = ${t.org}
      LIMIT 1
    `) as FacilityRow[]
    facility = fr[0] ?? null
  }

  // Aggregate activity_data by (year, quarter) for the same facility + scope so
  // Claude can compare Q1 2024 vs Q1 2025 vs Q1 2026. Limit to the most recent
  // 8 quarters per scope — plenty of context, bounded prompt size.
  let history: ActivityAgg[] = []
  if (anomaly.facility_id && anomaly.scope != null) {
    history = (await sql`
      SELECT
        period_year,
        CASE
          WHEN period_month BETWEEN 1 AND 3 THEN 1
          WHEN period_month BETWEEN 4 AND 6 THEN 2
          WHEN period_month BETWEEN 7 AND 9 THEN 3
          WHEN period_month BETWEEN 10 AND 12 THEN 4
          ELSE NULL
        END AS period_quarter,
        SUM(COALESCE(co2e_tonnes, 0)) AS co2e_tonnes,
        SUM(COALESCE(activity_value, 0)) AS activity_value,
        MAX(activity_unit) AS activity_unit,
        AVG(emission_factor) AS emission_factor,
        MAX(ef_source) AS ef_source
      FROM activity_data
      WHERE org_id = ${t.org}
        AND facility_id = ${anomaly.facility_id}
        AND scope = ${anomaly.scope}
      GROUP BY period_year, period_quarter
      ORDER BY period_year DESC, period_quarter DESC
      LIMIT 8
    `) as ActivityAgg[]
  }

  const cleanHistory = history.map(h => ({
    period_year: h.period_year,
    period_quarter: h.period_quarter,
    co2e_tonnes: toNum(h.co2e_tonnes),
    activity_value: toNum(h.activity_value),
    activity_unit: h.activity_unit,
    emission_factor: h.emission_factor == null ? null : toNum(h.emission_factor, 0),
    ef_source: h.ef_source,
  }))

  // EF source change detector — has the source string varied across periods?
  const efSources = new Set(cleanHistory.map(h => h.ef_source).filter((s): s is string => !!s))
  const efSourceChanged = efSources.size > 1

  const ctx: AnomalyNarrationContext = {
    anomaly: {
      severity: anomaly.severity,
      title: anomaly.title,
      description: anomaly.description,
      metric: anomaly.metric,
      scope: anomaly.scope,
      expected_value: anomaly.expected_value == null ? null : toNum(anomaly.expected_value),
      actual_value: anomaly.actual_value == null ? null : toNum(anomaly.actual_value),
      deviation_pct: anomaly.deviation_pct == null ? null : toNum(anomaly.deviation_pct),
    },
    facility,
    history: cleanHistory,
    ef_source_changed: efSourceChanged,
    limited_context: cleanHistory.length < 2,
  }

  // 4. Call Claude.
  const result = await narrateAnomaly(ctx)
  if (!result.ok || !result.text) {
    return res.status(502).json({ error: result.error ?? 'AI narration failed' })
  }

  // 5. Persist to anomaly row so subsequent reads are cache hits.
  const generatedAt = new Date().toISOString()
  await sql`
    UPDATE anomalies
    SET ai_narrative = ${result.text},
        ai_narrative_generated_at = ${generatedAt},
        ai_narrative_model = ${'claude-sonnet-4-6'},
        ai_narrative_tokens_in = ${result.tokensIn ?? 0},
        ai_narrative_tokens_out = ${result.tokensOut ?? 0}
    WHERE id = ${anomalyId} AND org_id = ${t.org}
  `

  return res.status(200).json({
    narrative: result.text,
    generatedAt,
    cached: false,
    usage: {
      tokensIn: result.tokensIn ?? 0,
      tokensOut: result.tokensOut ?? 0,
      cached: result.cached ?? 0,
    },
  })
}
