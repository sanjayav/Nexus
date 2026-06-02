import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null
function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  if (!client) client = new Anthropic({ apiKey: key })
  return client
}

export interface DraftRequest {
  framework: 'gri' | 'csrd' | 'tcfd' | 'cdp' | 'issb'
  section: string                // e.g. "GRI 305 Emissions"
  data: Record<string, unknown>  // structured org data — assignments, values, facilities
  orgContext: { name: string; industry?: string; country?: string }
  tone?: 'formal' | 'narrative' | 'concise'
}

export interface DraftResponse {
  ok: boolean
  text?: string
  tokensIn?: number
  tokensOut?: number
  cached?: number
  error?: string
}

const SYSTEM_PROMPT = `You are an expert sustainability disclosure writer. Draft clear, audit-ready narrative for ESG reports. Anchor every claim to the provided data — never invent numbers. Match the requested framework's disclosure conventions:
- GRI: report against the standard, cite GRI codes (e.g. GRI 305-1).
- CSRD/ESRS: use ESRS terminology, mention IROs and double materiality where relevant.
- TCFD: organise by Governance / Strategy / Risk Management / Metrics & Targets.
- CDP: respond in CDP questionnaire style — direct, structured answers.
- ISSB IFRS S2: use sustainability-related financial disclosure language.

Style rules: third person, present tense for current period, past tense for prior periods. No marketing language. No hedging adverbs ("we strive to…"). State facts. If a data point is missing, write "[Data not provided]" and continue.

Output structure: pure markdown. No preamble, no closing summary, no headings above the section unless requested.`

// ═══════════════════════════════════════════
// Vendor → emission-factor matcher (spend-based Scope 3).
// Given a vendor name + optional region/spend/category hint and a pre-filtered
// list of candidate EFs from the platform DB, asks Claude to pick the best
// match plus up to 3 alternates. Structured output is enforced via a tool.
// ═══════════════════════════════════════════

export interface EfCandidate {
  id: string
  scope: number
  category: string
  subcategory: string | null
  fuel_or_activity: string
  region: string
  unit: string
  co2e_per_unit: number | string
  source: string
  notes: string | null
}

export interface EfMatchRequest {
  vendorName: string
  spendCategory?: string
  region?: string
  spendAmount?: number
  spendCurrency?: string
  category?: string
  candidates: EfCandidate[]
}

export interface EfMatchSingle {
  ef_id: string
  confidence: number
  reasoning: string
}

export interface EfMatchToolResult {
  top_match: EfMatchSingle
  alternates: EfMatchSingle[]
  overall_notes?: string
}

export interface EfMatchResponse {
  ok: boolean
  result?: EfMatchToolResult
  tokensIn?: number
  tokensOut?: number
  cached?: number
  error?: string
}

const MATCHER_SYSTEM_PROMPT = `You match supplier spend to GHG emission factors for Scope 3 carbon accounting.

Rules:
- Given a vendor name, spend category, optional region, and a list of candidate factors, pick the SINGLE best match.
- Also return up to 3 plausible alternates.
- Confidence (0-1): 0.9+ when the vendor's industry is unambiguous; 0.5-0.8 when category match is good but vendor name is generic; <0.5 when guessing.
- Reasoning: one sentence per match. Reference the vendor name and category.
- Prefer factors that match the region. Fall back to GLOBAL if no regional match.
- For travel: prefer airline-class flight factors over generic transport.
- For office supplies: prefer paper/office supplies factors over generic manufacturing.
- For software / SaaS / IT services: prefer software/IT services EEIO factors if present, else generic professional-services.
- Never invent ef_ids. Only use IDs from the candidate list.`

export async function matchEmissionFactor(req: EfMatchRequest): Promise<EfMatchResponse> {
  const c = getClient()
  if (!c) return { ok: false, error: 'ANTHROPIC_API_KEY not configured' }

  // Build the user message — slim the candidate payload to the fields the
  // model actually needs (full row stays server-side for the response).
  const slimCandidates = req.candidates.map((ef) => ({
    ef_id: ef.id,
    scope: ef.scope,
    category: ef.category,
    subcategory: ef.subcategory,
    activity: ef.fuel_or_activity,
    region: ef.region,
    unit: ef.unit,
    co2e_per_unit: Number(ef.co2e_per_unit),
    source: ef.source,
    notes: ef.notes,
  }))

  const userPrompt = `Vendor: ${req.vendorName}
${req.spendCategory ? `Spend category hint: ${req.spendCategory}\n` : ''}${req.category ? `Calculator category: ${req.category}\n` : ''}${req.region ? `Region: ${req.region}\n` : ''}${req.spendAmount != null ? `Spend amount: ${req.spendAmount}${req.spendCurrency ? ' ' + req.spendCurrency : ''}\n` : ''}
Candidate emission factors (only choose ef_id values from this list):
${JSON.stringify(slimCandidates, null, 2)}

Pick the best match and up to 3 alternates by calling submit_ef_match.`

  const tools = [
    {
      name: 'submit_ef_match',
      description: 'Submit the best emission factor match for this vendor + spend category.',
      input_schema: {
        type: 'object' as const,
        properties: {
          top_match: {
            type: 'object',
            properties: {
              ef_id: { type: 'string' },
              confidence: { type: 'number' },
              reasoning: { type: 'string' },
            },
            required: ['ef_id', 'confidence', 'reasoning'],
          },
          alternates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ef_id: { type: 'string' },
                confidence: { type: 'number' },
                reasoning: { type: 'string' },
              },
              required: ['ef_id', 'confidence', 'reasoning'],
            },
          },
          overall_notes: { type: 'string' },
        },
        required: ['top_match', 'alternates'],
      },
    },
  ]

  try {
    const res = await c.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: [{ type: 'text', text: MATCHER_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: tools as unknown as Parameters<typeof c.messages.create>[0]['tools'],
      tool_choice: { type: 'tool', name: 'submit_ef_match' },
      messages: [{ role: 'user', content: userPrompt }],
    })

    // Find the tool_use block — tool_choice forces the model to call it.
    const toolUse = res.content.find((b) => b.type === 'tool_use') as
      | { type: 'tool_use'; name: string; input: unknown }
      | undefined
    if (!toolUse) {
      return { ok: false, error: 'Claude did not invoke submit_ef_match tool' }
    }
    const parsed = toolUse.input as EfMatchToolResult
    return {
      ok: true,
      result: parsed,
      tokensIn: res.usage.input_tokens,
      tokensOut: res.usage.output_tokens,
      cached: (res.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: msg }
  }
}

export async function draftNarrative(req: DraftRequest): Promise<DraftResponse> {
  const c = getClient()
  if (!c) return { ok: false, error: 'ANTHROPIC_API_KEY not configured' }

  const userPrompt = `Framework: ${req.framework.toUpperCase()}
Section to draft: ${req.section}
Tone: ${req.tone ?? 'formal'}

Organisation context:
${JSON.stringify(req.orgContext, null, 2)}

Underlying data for this section (JSON):
${JSON.stringify(req.data, null, 2)}

Write the narrative now.`

  try {
    // System prompt is large + reusable across many calls → mark as cache breakpoint.
    // Repeated drafts of different sections reuse the cached prefix (5-min TTL).
    const res = await c.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = res.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('\n')

    return {
      ok: true,
      text,
      tokensIn: res.usage.input_tokens,
      tokensOut: res.usage.output_tokens,
      cached: (res.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: msg }
  }
}

// ──────────────────────────────────────────────────────────────
// Anomaly narration — explains a flagged anomaly in plain English
// by looking at the underlying activity data (period-over-period).
// ──────────────────────────────────────────────────────────────

export interface AnomalyNarrationContext {
  anomaly: {
    severity: string | null
    title: string
    description: string | null
    metric: string | null
    scope: number | null
    expected_value: number | null
    actual_value: number | null
    deviation_pct: number | null
  }
  facility: {
    name: string
    type: string | null
    country: string | null
    production_volume: number | null
  } | null
  /** Aggregated activity data, one row per (period_year, period_quarter). */
  history: Array<{
    period_year: number
    period_quarter: number | null
    co2e_tonnes: number
    activity_value: number
    activity_unit: string | null
    emission_factor: number | null
    ef_source: string | null
  }>
  ef_source_changed?: boolean
  limited_context?: boolean
}

export interface AnomalyNarrationResponse {
  ok: boolean
  text?: string
  tokensIn?: number
  tokensOut?: number
  cached?: number
  error?: string
}

const ANOMALY_SYSTEM_PROMPT = `You analyse sustainability data anomalies for ESG reporting teams. You write short, factual narratives that:
- State the variance clearly with numbers.
- Identify the proximate driver (activity change vs emission-factor change vs production change vs reporting change).
- Compare period-over-period multiplicatively (e.g. "+22% vs Q1 2025").
- Avoid speculation beyond what the data supports.
- Suggest ONE actionable next step.

Format: ONE paragraph, 3-5 sentences, no bullets, no headings. Plain English. No marketing fluff. No hedging ("might be", "could perhaps"). State facts and one inference. If the historical context is limited (fewer than two prior periods), say so plainly in the narrative.`

export async function narrateAnomaly(ctx: AnomalyNarrationContext): Promise<AnomalyNarrationResponse> {
  const c = getClient()
  if (!c) return { ok: false, error: 'ANTHROPIC_API_KEY not configured' }

  const userPrompt = `Anomaly context (JSON):
${JSON.stringify(ctx, null, 2)}

Write the narrative now.`

  try {
    const res = await c.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: [{ type: 'text', text: ANOMALY_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = res.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('\n')

    return {
      ok: true,
      text,
      tokensIn: res.usage.input_tokens,
      tokensOut: res.usage.output_tokens,
      cached: (res.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: msg }
  }
}
