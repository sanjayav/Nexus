import type { LlmProvider, LlmRequest, LlmResult, LlmContentPart, LlmUsage } from './types.js'

/**
 * OpenAI-compatible Chat Completions provider for mainland-China models.
 *
 * Env (all read at call time):
 *   LLM_CN_BASE_URL       base URL up to and including the version segment, e.g.
 *                           Qwen on Alibaba Cloud Model Studio / DashScope:
 *                             https://dashscope.aliyuncs.com/compatible-mode/v1
 *                           DeepSeek:
 *                             https://api.deepseek.com/v1
 *                         `/chat/completions` is appended. Must be https.
 *   LLM_CN_API_KEY        bearer key for that endpoint
 *   LLM_CN_MODEL          e.g. qwen-plus, qwen-max, deepseek-chat
 *   LLM_CN_VISION_MODEL   optional vision model (e.g. qwen-vl-max) used when a
 *                         request carries images; without it image input is
 *                         rejected with `unsupported_input`
 *   LLM_CN_LABEL          optional display label (default "Mainland model (OpenAI-compatible)")
 *
 * Structured output uses `response_format: { type: 'json_object' }` (supported
 * by DashScope and DeepSeek) with the JSON Schema embedded in the system
 * prompt; the reply is parsed and returned as `json`. PDF input is not sent
 * (these endpoints do not accept PDF blocks) — callers get `unsupported_input`.
 * Prompt caching hints are ignored.
 */

type FetchLike = (input: string, init: RequestInit) => Promise<Response>

export interface OpenAiCompatibleOptions {
  baseUrl?: string
  apiKey?: string
  model?: string
  visionModel?: string
  label?: string
  fetchImpl?: FetchLike
  timeoutMs?: number
}

export function openAiCompatibleOptionsFromEnv(env: Record<string, string | undefined> = process.env): OpenAiCompatibleOptions {
  return {
    baseUrl: env.LLM_CN_BASE_URL?.trim() || undefined,
    apiKey: env.LLM_CN_API_KEY?.trim() || undefined,
    model: env.LLM_CN_MODEL?.trim() || undefined,
    visionModel: env.LLM_CN_VISION_MODEL?.trim() || undefined,
    label: env.LLM_CN_LABEL?.trim() || undefined,
  }
}

function isHttpsUrl(u: string | undefined): u is string {
  if (!u) return false
  try {
    return new URL(u).protocol === 'https:'
  } catch {
    return false
  }
}

/** Strip ```json fences some models add despite json_object mode. */
export function extractJsonText(raw: string): string {
  const s = raw.trim()
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(s)
  if (fenced) return fenced[1]
  const first = s.indexOf('{')
  const last = s.lastIndexOf('}')
  if (first > 0 && last > first) return s.slice(first, last + 1)
  return s
}

type OaiContent = string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>

function toOaiContent(content: string | LlmContentPart[]): { content: OaiContent; hasImage: boolean; hasPdf: boolean } {
  if (typeof content === 'string') return { content, hasImage: false, hasPdf: false }
  const hasPdf = content.some(p => p.type === 'document')
  const hasImage = content.some(p => p.type === 'image')
  if (!hasImage) {
    // Text-only → plain string for the widest compatibility (DeepSeek).
    return {
      content: content.filter((p): p is { type: 'text'; text: string } => p.type === 'text').map(p => p.text).join('\n\n'),
      hasImage,
      hasPdf,
    }
  }
  const parts: Exclude<OaiContent, string> = []
  for (const p of content) {
    if (p.type === 'text') parts.push({ type: 'text', text: p.text })
    else if (p.type === 'image') parts.push({ type: 'image_url', image_url: { url: `data:${p.mediaType};base64,${p.data}` } })
  }
  return { content: parts, hasImage, hasPdf }
}

export function createOpenAiCompatibleProvider(opts: OpenAiCompatibleOptions = openAiCompatibleOptionsFromEnv()): LlmProvider {
  const model = opts.model ?? ''
  const label = opts.label ?? 'Mainland model (OpenAI-compatible)'
  const missing = !isHttpsUrl(opts.baseUrl) ? 'LLM_CN_BASE_URL' : !opts.apiKey ? 'LLM_CN_API_KEY' : !model ? 'LLM_CN_MODEL' : null
  const notConfiguredError = `${missing ?? 'LLM_CN_API_KEY'} not configured`
  const doFetch: FetchLike = opts.fetchImpl ?? ((input, init) => fetch(input, init))

  return {
    id: 'openai_compatible',
    model,
    label,
    notConfiguredError,
    supports: { pdf: false, images: Boolean(opts.visionModel) },
    configured: () => missing === null,
    async complete(req: LlmRequest): Promise<LlmResult> {
      if (missing) return { ok: false, code: 'not_configured', error: notConfiguredError, model, provider: 'openai_compatible' }

      const converted = req.messages.map(m => ({ role: m.role, ...toOaiContent(m.content) }))
      if (converted.some(m => m.hasPdf)) {
        return {
          ok: false, code: 'unsupported_input', model, provider: 'openai_compatible',
          error: 'PDF input is not supported by the configured mainland AI provider. Upload an image (PNG/JPEG) or a spreadsheet instead.',
        }
      }
      const needsVision = converted.some(m => m.hasImage)
      if (needsVision && !opts.visionModel) {
        return {
          ok: false, code: 'unsupported_input', model, provider: 'openai_compatible',
          error: 'Image input needs LLM_CN_VISION_MODEL to be configured for the mainland AI provider.',
        }
      }
      const useModel = needsVision ? opts.visionModel! : model

      let system = req.system
      if (req.json) {
        system += `\n\nOUTPUT FORMAT: Respond with ONLY one JSON object (no markdown, no prose) — the arguments of the function "${req.json.name}"${req.json.description ? ` (${req.json.description})` : ''}. It must validate against this JSON Schema:\n${JSON.stringify(req.json.schema)}`
      }

      const body: Record<string, unknown> = {
        model: useModel,
        max_tokens: req.maxTokens,
        messages: [{ role: 'system', content: system }, ...converted.map(m => ({ role: m.role, content: m.content }))],
      }
      if (req.temperature != null) body.temperature = req.temperature
      if (req.json) body.response_format = { type: 'json_object' }

      const url = `${opts.baseUrl!.replace(/\/+$/, '')}/chat/completions`
      const ctl = new AbortController()
      const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 60_000)
      let json: {
        model?: string
        choices?: Array<{ message?: { content?: string | null } }>
        usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_cache_hit_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } }
        error?: { message?: string }
      }
      try {
        const res = await doFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.apiKey}` },
          body: JSON.stringify(body),
          signal: ctl.signal,
        })
        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          return { ok: false, code: 'provider_error', error: `${label} HTTP ${res.status}: ${errText.slice(0, 300)}`, model: useModel, provider: 'openai_compatible' }
        }
        json = await res.json()
      } catch (err: unknown) {
        return { ok: false, code: 'provider_error', error: err instanceof Error ? err.message : 'Request failed', model: useModel, provider: 'openai_compatible' }
      } finally {
        clearTimeout(timer)
      }

      const usage: LlmUsage = {
        tokensIn: json.usage?.prompt_tokens ?? 0,
        tokensOut: json.usage?.completion_tokens ?? 0,
        cached: json.usage?.prompt_cache_hit_tokens ?? json.usage?.prompt_tokens_details?.cached_tokens ?? 0,
      }
      const text = json.choices?.[0]?.message?.content ?? ''
      const usedModel = json.model ?? useModel
      if (!text && json.error?.message) {
        return { ok: false, code: 'provider_error', error: json.error.message, usage, model: usedModel, provider: 'openai_compatible' }
      }
      if (req.json) {
        try {
          const parsed = JSON.parse(extractJsonText(text)) as unknown
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object')
          return { ok: true, text, json: parsed, usage, model: usedModel, provider: 'openai_compatible' }
        } catch {
          return { ok: false, code: 'invalid_json', error: `${label} did not return valid JSON for ${req.json.name}`, text, usage, model: usedModel, provider: 'openai_compatible' }
        }
      }
      return { ok: true, text, usage, model: usedModel, provider: 'openai_compatible' }
    },
  }
}
