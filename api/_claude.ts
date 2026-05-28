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
