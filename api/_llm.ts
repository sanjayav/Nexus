/**
 * AI provider layer.
 *
 * Every AI endpoint goes through here instead of calling a vendor SDK:
 *
 *   const gate = await aiGate(sql, req, token)
 *   if (!gate.ok) return res.status(gate.status).json(gate.body)
 *   const result = await gate.provider.complete({ system, messages, maxTokens, json })
 *   res.json({ …, ...aiLabel(gate.locale, result) })
 *
 * Providers (api/_llm/*):
 *   - anthropic          Claude via @anthropic-ai/sdk (ANTHROPIC_API_KEY,
 *                        optional ANTHROPIC_MODEL; default model id lives in
 *                        api/_llm/anthropic.ts)
 *   - openai_compatible  Mainland China models through an OpenAI-compatible
 *                        Chat Completions endpoint (LLM_CN_BASE_URL,
 *                        LLM_CN_API_KEY, LLM_CN_MODEL, LLM_CN_VISION_MODEL) —
 *                        Qwen on DashScope, DeepSeek, …
 *
 * Selection per org (org_settings, api/_orgSettings.ts):
 *   ai_provider set            → that provider
 *   else market 'cn'           → openai_compatible
 *   else                       → anthropic (pre-Phase-4 behaviour)
 *
 * Kill switches: org_settings.ai_enabled = false (403, code 'ai_disabled'),
 * and a deployment-wide AI_ENABLED=false env var (same 403).
 *
 * Labelling: AI output returned to clients carries `ai_generated: true` and a
 * localised `ai_label` (CAC 《人工智能生成合成内容标识办法》 explicit-label
 * requirement for generated text).
 */
import type { VercelRequest } from '@vercel/node'
import type { Sql } from './_db.js'
import { t, type Locale } from './_i18n.js'
import { loadOrgSettings, resolveRequestLocale, type OrgSettings, type AiProviderId } from './_orgSettings.js'
import { createAnthropicProvider } from './_llm/anthropic.js'
import { createOpenAiCompatibleProvider, openAiCompatibleOptionsFromEnv } from './_llm/openaiCompatible.js'
import type { LlmProvider, LlmProviderId } from './_llm/types.js'

export type {
  LlmProvider,
  LlmProviderId,
  LlmRequest,
  LlmResult,
  LlmMessage,
  LlmContentPart,
  LlmJsonSpec,
  LlmUsage,
} from './_llm/types.js'
export { DEFAULT_ANTHROPIC_MODEL, anthropicModel } from './_llm/anthropic.js'

type ProviderFactory = (id: LlmProviderId) => LlmProvider

const defaultFactory: ProviderFactory = id =>
  id === 'openai_compatible'
    ? createOpenAiCompatibleProvider(openAiCompatibleOptionsFromEnv())
    : createAnthropicProvider()

let factory: ProviderFactory = defaultFactory

/** Test hook — inject stub providers. Pass null to restore the real ones. */
export function setLlmProviderFactoryForTests(f: ProviderFactory | null): void {
  factory = f ?? defaultFactory
}

export function getProvider(id: LlmProviderId): LlmProvider {
  return factory(id)
}

/** Provider id for an org: explicit choice, else market default. */
export function selectProviderId(settings: Pick<OrgSettings, 'ai_provider' | 'market'>): AiProviderId {
  return settings.ai_provider ?? (settings.market === 'cn' ? 'openai_compatible' : 'anthropic')
}

export function aiGloballyEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const v = env.AI_ENABLED?.trim().toLowerCase()
  return !(v === 'false' || v === '0' || v === 'off')
}

/** What the settings UI shows about AI for this org. */
export function describeAiAvailability(settings: Pick<OrgSettings, 'ai_enabled' | 'ai_provider' | 'market'>) {
  const providerId = selectProviderId(settings)
  const provider = getProvider(providerId)
  return {
    enabled: settings.ai_enabled && aiGloballyEnabled(),
    disabled_reason: !aiGloballyEnabled() ? 'deployment' as const : !settings.ai_enabled ? 'organisation' as const : null,
    provider: providerId,
    provider_label: provider.label,
    model: provider.model || null,
    configured: provider.configured(),
    supports: provider.supports,
  }
}

export type AiGateResult =
  | { ok: true; provider: LlmProvider; locale: Locale; settings: OrgSettings }
  | { ok: false; status: number; body: { error: string; code: 'ai_disabled' | 'ai_not_configured' }; locale: Locale }

/**
 * Per-request AI gate: loads org settings, resolves the caller's locale,
 * enforces the kill switches and checks the chosen provider is configured.
 */
export async function aiGate(
  sql: Sql,
  req: Pick<VercelRequest, 'headers'>,
  token: { sub: string; org: string },
): Promise<AiGateResult> {
  const settings = await loadOrgSettings(sql, token.org)
  const locale = await resolveRequestLocale(sql, req, token, settings)
  if (!settings.ai_enabled || !aiGloballyEnabled()) {
    return { ok: false, status: 403, locale, body: { error: t(locale, 'ai.disabled'), code: 'ai_disabled' } }
  }
  const provider = getProvider(selectProviderId(settings))
  if (!provider.configured()) {
    // Keep the "<VAR> not configured" wording: src/lib/api.ts maps it to
    // ApiError.reason = 'unconfigured'.
    return { ok: false, status: 503, locale, body: { error: provider.notConfiguredError, code: 'ai_not_configured' } }
  }
  return { ok: true, provider, locale, settings }
}

/** Mandatory-labelling fields spread into every AI response body. */
export function aiLabel(locale: Locale, result?: { provider?: LlmProviderId; model?: string } | null) {
  return {
    ai_generated: true as const,
    ai_label: t(locale, 'ai.label'),
    ai_provider: result?.provider ?? null,
    ai_model: result?.model ?? null,
    locale,
  }
}
