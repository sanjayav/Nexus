import Anthropic from '@anthropic-ai/sdk'
import type { LlmProvider, LlmRequest, LlmResult, LlmContentPart } from './types.js'

/**
 * The single place the Claude model id lives. Override per deployment with
 * ANTHROPIC_MODEL; the default preserves the model every AI endpoint used
 * before the provider layer existed.
 */
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-6'

export function anthropicModel(env: Record<string, string | undefined> = process.env): string {
  return env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL
}

/** Minimal surface of the SDK client we use — lets tests inject a stub. */
export interface AnthropicLike {
  messages: {
    create(params: Anthropic.Messages.MessageCreateParamsNonStreaming): Promise<Anthropic.Messages.Message>
  }
}

function toAnthropicContent(content: string | LlmContentPart[]): string | Anthropic.Messages.ContentBlockParam[] {
  if (typeof content === 'string') return content
  return content.map((p): Anthropic.Messages.ContentBlockParam => {
    if (p.type === 'text') return { type: 'text', text: p.text }
    if (p.type === 'image') {
      return { type: 'image', source: { type: 'base64', media_type: p.mediaType, data: p.data } }
    }
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: p.data } }
  })
}

export function createAnthropicProvider(opts: {
  apiKey?: string
  model?: string
  client?: AnthropicLike
} = {}): LlmProvider {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY
  const model = opts.model ?? anthropicModel()
  let client: AnthropicLike | null = opts.client ?? null

  return {
    id: 'anthropic',
    model,
    label: 'Anthropic Claude',
    notConfiguredError: 'ANTHROPIC_API_KEY not configured',
    supports: { pdf: true, images: true },
    configured: () => Boolean(opts.client || apiKey),
    async complete(req: LlmRequest): Promise<LlmResult> {
      if (!client) {
        if (!apiKey) return { ok: false, code: 'not_configured', error: 'ANTHROPIC_API_KEY not configured', model, provider: 'anthropic' }
        client = new Anthropic({ apiKey }) as unknown as AnthropicLike
      }
      const params: Anthropic.Messages.MessageCreateParamsNonStreaming = {
        model,
        max_tokens: req.maxTokens,
        system: req.cacheSystem
          ? [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }]
          : req.system,
        messages: req.messages.map(m => ({ role: m.role, content: toAnthropicContent(m.content) })),
      }
      if (req.temperature != null) params.temperature = req.temperature
      if (req.json) {
        params.tools = [{
          name: req.json.name,
          description: req.json.description ?? `Submit the ${req.json.name} result.`,
          input_schema: req.json.schema as Anthropic.Messages.Tool.InputSchema,
        }]
        params.tool_choice = { type: 'tool', name: req.json.name }
      }

      let res: Anthropic.Messages.Message
      try {
        res = await client.messages.create(params)
      } catch (err: unknown) {
        return { ok: false, code: 'provider_error', error: err instanceof Error ? err.message : 'Unknown error', model, provider: 'anthropic' }
      }

      const usage = {
        tokensIn: res.usage?.input_tokens ?? 0,
        tokensOut: res.usage?.output_tokens ?? 0,
        cached: (res.usage as { cache_read_input_tokens?: number | null } | undefined)?.cache_read_input_tokens ?? 0,
      }
      const text = res.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('\n')

      if (req.json) {
        const toolUse = res.content.find(
          (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use' && b.name === req.json!.name,
        )
        if (!toolUse) {
          return {
            ok: false, code: 'invalid_json', error: `Claude did not invoke ${req.json.name} tool`,
            text, usage, model: res.model ?? model, provider: 'anthropic',
          }
        }
        return { ok: true, text, json: toolUse.input, usage, model: res.model ?? model, provider: 'anthropic' }
      }
      return { ok: true, text, usage, model: res.model ?? model, provider: 'anthropic' }
    },
  }
}
