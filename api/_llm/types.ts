/**
 * Provider-neutral LLM request/response types (see api/_llm.ts).
 */

export type LlmProviderId = 'anthropic' | 'openai_compatible'

export type LlmContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaType: 'image/png' | 'image/jpeg'; data: string }
  | { type: 'document'; mediaType: 'application/pdf'; data: string }

export interface LlmMessage {
  role: 'user' | 'assistant'
  content: string | LlmContentPart[]
}

/**
 * Structured ("JSON mode") output. Anthropic enforces it with a forced tool
 * call named `name`; OpenAI-compatible providers use
 * `response_format: { type: 'json_object' }` plus the schema in the prompt.
 */
export interface LlmJsonSpec {
  name: string
  description?: string
  schema: Record<string, unknown>
}

export interface LlmRequest {
  system: string
  messages: LlmMessage[]
  maxTokens: number
  json?: LlmJsonSpec
  /** Mark the system prompt as a prompt-cache breakpoint (Anthropic only; no-op elsewhere). */
  cacheSystem?: boolean
  temperature?: number
}

export interface LlmUsage {
  tokensIn: number
  tokensOut: number
  cached: number
}

export type LlmErrorCode = 'not_configured' | 'unsupported_input' | 'provider_error' | 'invalid_json'

export type LlmResult =
  | {
      ok: true
      text: string
      /** Parsed structured output when `json` was requested. */
      json?: unknown
      usage: LlmUsage
      model: string
      provider: LlmProviderId
    }
  | {
      ok: false
      error: string
      code: LlmErrorCode
      /** Any free text the model produced (e.g. a refusal instead of a tool call). */
      text?: string
      usage?: LlmUsage
      model: string
      provider: LlmProviderId
    }

export interface LlmProvider {
  id: LlmProviderId
  /** Default model id used for requests. */
  model: string
  /** Human label for settings UI, e.g. "Anthropic Claude" / "Qwen (DashScope)". */
  label: string
  configured(): boolean
  /** Error string returned with HTTP 503 when not configured (contains "not configured"). */
  notConfiguredError: string
  supports: { pdf: boolean; images: boolean }
  complete(req: LlmRequest): Promise<LlmResult>
}
