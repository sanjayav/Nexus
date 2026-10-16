/**
 * Prompt library + task functions for the AI endpoints. Vendor calls go
 * through the provider layer in api/_llm.ts — pass `opts.provider` (from
 * aiGate()) to use the org's provider; omitted, the Anthropic provider from
 * env is used (pre-Phase-4 behaviour). `opts.locale` appends a language
 * instruction so free text comes back in the user's language.
 */
import { getProvider, type LlmProvider, type LlmProviderId, type LlmResult } from './_llm.js'
import { languageInstruction, type Locale } from './_i18n.js'

export interface AiCallOptions {
  provider?: LlmProvider
  locale?: Locale
}

interface ProviderMeta {
  model?: string
  provider?: LlmProviderId
}

function resolveProvider(opts: AiCallOptions): LlmProvider {
  return opts.provider ?? getProvider('anthropic')
}

function withLanguage(system: string, locale: Locale | undefined): string {
  return `${system}\n\n${languageInstruction(locale ?? 'en')}`
}

function usageOf(r: LlmResult) {
  return {
    tokensIn: r.usage?.tokensIn,
    tokensOut: r.usage?.tokensOut,
    cached: r.usage?.cached,
    model: r.model,
    provider: r.provider,
  }
}

/** Framework ids accepted by draftNarrative (legacy short ids + CN pack ids). */
export const DRAFT_FRAMEWORKS = ['gri', 'csrd', 'tcfd', 'cdp', 'issb', 'cn-sse', 'cn-csds', 'hkex-esg', 'cass-esg'] as const
export type DraftFramework = (typeof DRAFT_FRAMEWORKS)[number]

export interface DraftRequest {
  framework: DraftFramework
  section: string                // e.g. "GRI 305 Emissions"
  data: Record<string, unknown>  // structured org data — assignments, values, facilities
  orgContext: { name: string; industry?: string; country?: string }
  tone?: 'formal' | 'narrative' | 'concise'
}

export interface DraftResponse extends ProviderMeta {
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
- CN-SSE (上交所/深交所/北交所《上市公司自律监管指引——可持续发展报告（试行）》): apply double materiality (财务重要性 / 影响重要性); for climate (应对气候变化) organise by 治理 / 战略 / 影响、风险和机遇管理 / 指标与目标, including Scope 1/2/3 and any carbon credits or green-power instruments in the data.
- CN-CSDS (财政部《企业可持续披露准则——基本准则》 and the climate standard (trial)): use the four elements 治理 / 战略 / 影响、风险和机遇管理 / 指标和目标; GHG figures follow GB/T 32150 accounting.
- HKEX ESG (Appendix C2): mandatory disclosure requirements plus "comply or explain" KPIs A1–A3 / B1–B8; Part D climate disclosures align with IFRS S2.
- CASS-ESG 5.0: organise under governance, environment, social and value creation.
Never cite an article, clause or KPI number unless it appears in the provided data or the framework list above.

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

export interface EfMatchResponse extends ProviderMeta {
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

export async function matchEmissionFactor(req: EfMatchRequest, opts: AiCallOptions = {}): Promise<EfMatchResponse> {
  const provider = resolveProvider(opts)
  if (!provider.configured()) return { ok: false, error: provider.notConfiguredError, provider: provider.id, model: provider.model }

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

  const efMatchSchema = {
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
  }

  const res = await provider.complete({
    system: withLanguage(MATCHER_SYSTEM_PROMPT, opts.locale),
    cacheSystem: true,
    maxTokens: 1500,
    json: {
      name: 'submit_ef_match',
      description: 'Submit the best emission factor match for this vendor + spend category.',
      schema: efMatchSchema,
    },
    messages: [{ role: 'user', content: userPrompt }],
  })
  if (!res.ok) return { ok: false, error: res.error, ...usageOf(res) }
  const parsed = res.json as EfMatchToolResult
  if (!parsed?.top_match?.ef_id) return { ok: false, error: 'Model returned no top_match', ...usageOf(res) }
  parsed.alternates = Array.isArray(parsed.alternates) ? parsed.alternates : []
  return { ok: true, result: parsed, ...usageOf(res) }
}

export async function draftNarrative(req: DraftRequest, opts: AiCallOptions = {}): Promise<DraftResponse> {
  const provider = resolveProvider(opts)
  if (!provider.configured()) return { ok: false, error: provider.notConfiguredError, provider: provider.id, model: provider.model }

  const userPrompt = `Framework: ${req.framework.toUpperCase()}
Section to draft: ${req.section}
Tone: ${req.tone ?? 'formal'}

Organisation context:
${JSON.stringify(req.orgContext, null, 2)}

Underlying data for this section (JSON):
${JSON.stringify(req.data, null, 2)}

Write the narrative now.`

  // System prompt is large + reusable across many calls → cache breakpoint
  // (Anthropic). Repeated drafts of different sections reuse the cached prefix.
  const res = await provider.complete({
    system: withLanguage(SYSTEM_PROMPT, opts.locale),
    cacheSystem: true,
    maxTokens: 2000,
    messages: [{ role: 'user', content: userPrompt }],
  })
  if (!res.ok) return { ok: false, error: res.error, ...usageOf(res) }
  return { ok: true, text: res.text, ...usageOf(res) }
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

export interface AnomalyNarrationResponse extends ProviderMeta {
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

Format: ONE paragraph, 3-5 sentences, no bullets, no headings. Plain language. No marketing fluff. No hedging ("might be", "could perhaps"). State facts and one inference. If the historical context is limited (fewer than two prior periods), say so plainly in the narrative.`

// ──────────────────────────────────────────────────────────────
// AI Gap Analysis — Workiva-style "ESRS Intelligence" chat. Given a
// framework's required disclosures and the org's current data_value rows,
// returns a structured response (missing items, quality issues, next steps)
// via the submit_gap_analysis tool. System prompt is large + stable so it's
// marked ephemeral for prompt caching.
// ──────────────────────────────────────────────────────────────

export interface GapAnalysisDisclosure {
  id: string
  code: string                     // gri_code
  lineItem: string
  unit: string | null
  scope_split: string | null
  default_workflow_role: string | null
  /** True iff a data_value row exists for this disclosure in the active year. */
  filled: boolean
  status: string | null            // data_value.status, when present
  value: number | null
  has_evidence?: boolean
}

export interface GapAnalysisContext {
  framework: { id: string; code: string; name: string }
  reportingYear: number
  organisation: { name: string; industry?: string; country?: string }
  question: string
  scope?: 'gaps' | 'coverage' | 'quality' | 'custom'
  totals: { required: number; filled: number; inProgress: number; missing: number }
  disclosures: GapAnalysisDisclosure[]
}

export interface GapAnalysisMissingItem {
  code: string
  lineItem: string
  why_critical: string
  estimated_effort: 'low' | 'medium' | 'high'
  suggested_owner_role?: string
}

export interface GapAnalysisQualityIssue {
  code: string
  issue: string
}

export interface GapAnalysisResult {
  summary: string
  missingCount: number
  missingItems: GapAnalysisMissingItem[]
  qualityIssues: GapAnalysisQualityIssue[]
  recommendedNextSteps: string[]
}

export interface GapAnalysisResponse extends ProviderMeta {
  ok: boolean
  result?: GapAnalysisResult
  tokensIn?: number
  tokensOut?: number
  cached?: number
  error?: string
}

const GAP_ANALYSIS_SYSTEM_PROMPT = `You analyse ESG/sustainability disclosure portfolios for completeness and quality against framework requirements.

Given a framework's required disclosures and the organisation's current data:
- Identify which disclosures are MISSING and why each one matters.
- Identify data QUALITY issues (e.g., scope 1 reported but biogenic CO₂ separation missing, missing Cat 3 in Scope 3, value out of plausible range).
- Suggest the LOWEST-EFFORT path to compliance — which disclosures unblock the most reporting requirements?
- Recommend 3-5 next actions ordered by impact.

Be specific. Cite framework codes (e.g. ESRS E1-6, GRI 305-1). Don't invent codes.
Never include disclosures that ARE present in the data — only gaps.
Use "your" / "we" framing — you're advising the sustainability team, not lecturing.

Always respond by calling submit_gap_analysis with the structured fields.`

export async function analyseGaps(ctx: GapAnalysisContext, opts: AiCallOptions = {}): Promise<GapAnalysisResponse> {
  const provider = resolveProvider(opts)
  if (!provider.configured()) return { ok: false, error: provider.notConfiguredError, provider: provider.id, model: provider.model }

  const gapSchema = {
    type: 'object' as const,
    properties: {
      summary: { type: 'string', description: '2-3 sentence executive summary' },
      missingCount: { type: 'number' },
      missingItems: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            lineItem: { type: 'string' },
            why_critical: { type: 'string', description: 'Why this disclosure is required + impact' },
            estimated_effort: { type: 'string', enum: ['low','medium','high'] },
            suggested_owner_role: { type: 'string' },
          },
          required: ['code','lineItem','why_critical','estimated_effort'],
        },
      },
      qualityIssues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            issue: { type: 'string' },
          },
          required: ['code','issue'],
        },
      },
      recommendedNextSteps: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary','missingCount','missingItems','recommendedNextSteps'],
  }

  // Slim the disclosure payload so we don't waste tokens on UUIDs Claude doesn't need.
  const slimDisclosures = ctx.disclosures.map(d => ({
    code: d.code,
    lineItem: d.lineItem,
    unit: d.unit,
    scope_split: d.scope_split,
    default_workflow_role: d.default_workflow_role,
    filled: d.filled,
    status: d.status,
    value: d.value,
    has_evidence: d.has_evidence ?? false,
  }))

  const userPrompt = `Framework: ${ctx.framework.code} — ${ctx.framework.name} (${ctx.framework.id})
Reporting year: ${ctx.reportingYear}
Organisation: ${ctx.organisation.name}${ctx.organisation.industry ? ' · ' + ctx.organisation.industry : ''}${ctx.organisation.country ? ' · ' + ctx.organisation.country : ''}
Scope hint: ${ctx.scope ?? 'gaps'}

Coverage totals:
  required: ${ctx.totals.required}
  filled:   ${ctx.totals.filled}
  in progress: ${ctx.totals.inProgress}
  missing:  ${ctx.totals.missing}

Required disclosures (filled=true means a data_value exists):
${JSON.stringify(slimDisclosures, null, 2)}

User question:
${ctx.question}

Call submit_gap_analysis with the structured response now.`

  // Large + stable framework-analyst system prompt — cache breakpoint so
  // follow-up calls (same org, different question) hit the prompt cache.
  const res = await provider.complete({
    system: withLanguage(GAP_ANALYSIS_SYSTEM_PROMPT, opts.locale),
    cacheSystem: true,
    maxTokens: 3000,
    json: { name: 'submit_gap_analysis', description: 'Submit a structured gap analysis response.', schema: gapSchema },
    messages: [{ role: 'user', content: userPrompt }],
  })
  if (!res.ok) return { ok: false, error: res.error, ...usageOf(res) }
  const parsed = (res.json ?? {}) as GapAnalysisResult
  // Defensive — ensure arrays exist (models occasionally omit empty arrays).
  parsed.summary = typeof parsed.summary === 'string' ? parsed.summary : ''
  parsed.missingItems = Array.isArray(parsed.missingItems) ? parsed.missingItems : []
  parsed.qualityIssues = Array.isArray(parsed.qualityIssues) ? parsed.qualityIssues : []
  parsed.recommendedNextSteps = Array.isArray(parsed.recommendedNextSteps) ? parsed.recommendedNextSteps : []
  parsed.missingCount = typeof parsed.missingCount === 'number' ? parsed.missingCount : parsed.missingItems.length
  return { ok: true, result: parsed, ...usageOf(res) }
}

export async function narrateAnomaly(ctx: AnomalyNarrationContext, opts: AiCallOptions = {}): Promise<AnomalyNarrationResponse> {
  const provider = resolveProvider(opts)
  if (!provider.configured()) return { ok: false, error: provider.notConfiguredError, provider: provider.id, model: provider.model }

  const userPrompt = `Anomaly context (JSON):
${JSON.stringify(ctx, null, 2)}

Write the narrative now.`

  const res = await provider.complete({
    system: withLanguage(ANOMALY_SYSTEM_PROMPT, opts.locale),
    cacheSystem: true,
    maxTokens: 600,
    messages: [{ role: 'user', content: userPrompt }],
  })
  if (!res.ok) return { ok: false, error: res.error, ...usageOf(res) }
  return { ok: true, text: res.text, ...usageOf(res) }
}
