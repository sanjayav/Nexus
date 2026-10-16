/**
 * AI provider layer (api/_llm.ts + api/_llm/*): provider request shapes with
 * stubbed transports, per-org selection, kill switches, locale instruction,
 * labelling, and the /api/ai/draft endpoint end-to-end with a stub provider.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeFakeSql, mockReq, mockRes, type FakeSql } from './fake-sql'
import { createOpenAiCompatibleProvider, extractJsonText, openAiCompatibleOptionsFromEnv } from '../../../api/_llm/openaiCompatible'
import { createAnthropicProvider, DEFAULT_ANTHROPIC_MODEL, anthropicModel, type AnthropicLike } from '../../../api/_llm/anthropic'
import type { LlmProvider, LlmRequest, LlmResult } from '../../../api/_llm/types'

let fakeSql: FakeSql
let settingsRow: Record<string, unknown> | null = null
let userLocale: string | null = null

vi.mock('../../../api/_db', () => ({ getDb: () => fakeSql }))
vi.mock('../../../api/_rateLimit', () => ({ checkRateLimit: async () => true }))
vi.mock('../../../api/_auth', () => ({
  cors: () => {},
  requirePermission: async () => ({ sub: '55555555-5555-4555-8555-555555555555', org: 'org-a', email: 'u@x.test', permissions: new Set(['reports.create']), roleSlugs: new Set() }),
}))

import { aiGate, aiLabel, selectProviderId, describeAiAvailability, setLlmProviderFactoryForTests, aiGloballyEnabled } from '../../../api/_llm'
import { draftNarrative, analyseGaps } from '../../../api/_claude'

function stubProvider(id: 'anthropic' | 'openai_compatible', reply: (req: LlmRequest) => LlmResult, configured = true) {
  const calls: LlmRequest[] = []
  const p: LlmProvider = {
    id, model: id === 'anthropic' ? 'claude-test' : 'qwen-test', label: id,
    notConfiguredError: id === 'anthropic' ? 'ANTHROPIC_API_KEY not configured' : 'LLM_CN_API_KEY not configured',
    supports: { pdf: id === 'anthropic', images: true },
    configured: () => configured,
    complete: async req => { calls.push(req); return reply(req) },
  }
  return { p, calls }
}

beforeEach(() => {
  settingsRow = null
  userLocale = null
  delete process.env.AI_ENABLED
  fakeSql = makeFakeSql(q => {
    if (q.startsWith('SELECT org_id, market')) return settingsRow ? [settingsRow] : []
    if (q.includes("->> 'locale'")) return [{ locale: userLocale }]
    if (q.startsWith('SELECT name, industry, country FROM organisations')) return [{ name: '绿源新材料', industry: 'Chemicals', country: 'CN' }]
    return []
  })
})
afterEach(() => {
  setLlmProviderFactoryForTests(null)
  vi.unstubAllGlobals()
})

describe('OpenAI-compatible provider (Qwen / DeepSeek)', () => {
  const base = { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/', apiKey: 'sk-test', model: 'qwen-plus' }

  it('reads LLM_CN_* env and reports the first missing variable', () => {
    expect(openAiCompatibleOptionsFromEnv({ LLM_CN_BASE_URL: 'https://api.deepseek.com/v1', LLM_CN_API_KEY: 'k', LLM_CN_MODEL: 'deepseek-chat' }))
      .toMatchObject({ baseUrl: 'https://api.deepseek.com/v1', apiKey: 'k', model: 'deepseek-chat' })
    expect(createOpenAiCompatibleProvider({}).notConfiguredError).toBe('LLM_CN_BASE_URL not configured')
    expect(createOpenAiCompatibleProvider({ baseUrl: 'http://insecure', apiKey: 'k', model: 'm' }).configured()).toBe(false)
    expect(createOpenAiCompatibleProvider({ baseUrl: 'https://x.example', model: 'm' }).notConfiguredError).toBe('LLM_CN_API_KEY not configured')
  })

  it('posts chat/completions with json_object mode and parses the JSON reply', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify({
      model: 'qwen-plus',
      choices: [{ message: { content: '```json\n{"summary":"差距","missingCount":1}\n```' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, prompt_tokens_details: { cached_tokens: 2 } },
    }), { status: 200 }))
    const p = createOpenAiCompatibleProvider({ ...base, fetchImpl })
    const r = await p.complete({
      system: 'SYS', maxTokens: 100,
      json: { name: 'submit_gap_analysis', schema: { type: 'object' } },
      messages: [{ role: 'user', content: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] }],
    })
    expect(r).toMatchObject({ ok: true, json: { summary: '差距', missingCount: 1 }, usage: { tokensIn: 10, tokensOut: 5, cached: 2 }, provider: 'openai_compatible' })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test')
    const body = JSON.parse(String(init.body))
    expect(body.model).toBe('qwen-plus')
    expect(body.max_tokens).toBe(100)
    expect(body.response_format).toEqual({ type: 'json_object' })
    expect(body.messages[0].role).toBe('system')
    expect(body.messages[0].content).toContain('submit_gap_analysis')
    expect(body.messages[1].content).toBe('a\n\nb') // text-only parts flattened to a string
  })

  it('reports invalid JSON, HTTP errors, PDFs and images without a vision model', async () => {
    const bad = createOpenAiCompatibleProvider({ ...base, fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: 'not json' } }] }), { status: 200 }) })
    expect(await bad.complete({ system: 's', maxTokens: 1, json: { name: 'f', schema: {} }, messages: [{ role: 'user', content: 'x' }] }))
      .toMatchObject({ ok: false, code: 'invalid_json' })
    const err = createOpenAiCompatibleProvider({ ...base, fetchImpl: async () => new Response('quota', { status: 429 }) })
    expect(await err.complete({ system: 's', maxTokens: 1, messages: [{ role: 'user', content: 'x' }] }))
      .toMatchObject({ ok: false, code: 'provider_error' })
    const fetchImpl = vi.fn()
    const p = createOpenAiCompatibleProvider({ ...base, fetchImpl })
    expect(await p.complete({ system: 's', maxTokens: 1, messages: [{ role: 'user', content: [{ type: 'document', mediaType: 'application/pdf', data: 'AA' }] }] }))
      .toMatchObject({ ok: false, code: 'unsupported_input' })
    expect(await p.complete({ system: 's', maxTokens: 1, messages: [{ role: 'user', content: [{ type: 'image', mediaType: 'image/png', data: 'AA' }] }] }))
      .toMatchObject({ ok: false, code: 'unsupported_input' })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(extractJsonText('Here: {"a":1} thanks')).toBe('{"a":1}')
  })

  it('switches to the vision model for image input', async () => {
    const fetchImpl = vi.fn(async (_u: string, _i: RequestInit) => new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 }))
    const p = createOpenAiCompatibleProvider({ ...base, visionModel: 'qwen-vl-max', fetchImpl })
    await p.complete({ system: 's', maxTokens: 1, messages: [{ role: 'user', content: [{ type: 'image', mediaType: 'image/jpeg', data: 'QUJD' }, { type: 'text', text: 'hint' }] }] })
    const body = JSON.parse(String(fetchImpl.mock.calls[0][1].body))
    expect(body.model).toBe('qwen-vl-max')
    expect(body.messages[1].content[0]).toEqual({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,QUJD' } })
  })
})

describe('Anthropic provider', () => {
  it('keeps the model id in one place and supports ANTHROPIC_MODEL override', () => {
    expect(DEFAULT_ANTHROPIC_MODEL).toBe('claude-sonnet-4-6')
    expect(anthropicModel({})).toBe('claude-sonnet-4-6')
    expect(anthropicModel({ ANTHROPIC_MODEL: 'claude-x' })).toBe('claude-x')
  })

  it('forces a tool for json mode, caches the system prompt and returns tool input', async () => {
    const create = vi.fn(async () => ({
      model: 'claude-sonnet-4-6',
      content: [{ type: 'tool_use', id: 't', name: 'submit_ef_match', input: { top_match: { ef_id: 'e1' } } }],
      usage: { input_tokens: 7, output_tokens: 3, cache_read_input_tokens: 4 },
    }))
    const p = createAnthropicProvider({ client: { messages: { create } } as unknown as AnthropicLike })
    const r = await p.complete({ system: 'SYS', cacheSystem: true, maxTokens: 50, json: { name: 'submit_ef_match', schema: { type: 'object' } }, messages: [{ role: 'user', content: 'x' }] })
    expect(r).toMatchObject({ ok: true, json: { top_match: { ef_id: 'e1' } }, usage: { tokensIn: 7, tokensOut: 3, cached: 4 }, provider: 'anthropic' })
    const params = (create.mock.calls[0] as unknown as [Record<string, unknown>])[0]
    expect(params.tool_choice).toEqual({ type: 'tool', name: 'submit_ef_match' })
    expect(params.system).toEqual([{ type: 'text', text: 'SYS', cache_control: { type: 'ephemeral' } }])
  })

  it('maps a missing tool call to invalid_json with the model text', async () => {
    const create = vi.fn(async () => ({ content: [{ type: 'text', text: 'I cannot read this' }], usage: { input_tokens: 1, output_tokens: 1 } }))
    const p = createAnthropicProvider({ client: { messages: { create } } as unknown as AnthropicLike })
    expect(await p.complete({ system: 's', maxTokens: 1, json: { name: 'submit_extraction', schema: {} }, messages: [{ role: 'user', content: 'x' }] }))
      .toMatchObject({ ok: false, code: 'invalid_json', text: 'I cannot read this' })
  })
})

describe('selection, gating and labelling', () => {
  it('chooses the provider per org', () => {
    expect(selectProviderId({ market: 'global', ai_provider: null })).toBe('anthropic')
    expect(selectProviderId({ market: 'cn', ai_provider: null })).toBe('openai_compatible')
    expect(selectProviderId({ market: 'cn', ai_provider: 'anthropic' })).toBe('anthropic')
  })

  it('403 ai_disabled (localised) when the org switched AI off, and via AI_ENABLED=false', async () => {
    settingsRow = { org_id: 'org-a', market: 'cn', ai_enabled: false }
    const g = await aiGate(fakeSql as never, mockReq({}), { sub: 'apikey:k', org: 'org-a' })
    expect(g).toMatchObject({ ok: false, status: 403, locale: 'zh', body: { code: 'ai_disabled' } })
    if (!g.ok) expect(g.body.error).toMatch(/人工智能/)

    settingsRow = null
    process.env.AI_ENABLED = 'false'
    expect(aiGloballyEnabled()).toBe(false)
    const g2 = await aiGate(fakeSql as never, mockReq({ headers: { 'accept-language': 'en' } }), { sub: 'apikey:k', org: 'org-a' })
    expect(g2).toMatchObject({ ok: false, status: 403, body: { code: 'ai_disabled' } })
  })

  it('503 "<VAR> not configured" when the chosen provider lacks credentials', async () => {
    const { p } = stubProvider('openai_compatible', () => ({ ok: true, text: '', usage: { tokensIn: 0, tokensOut: 0, cached: 0 }, model: 'm', provider: 'openai_compatible' }), false)
    setLlmProviderFactoryForTests(() => p)
    settingsRow = { org_id: 'org-a', market: 'cn', ai_enabled: true }
    const g = await aiGate(fakeSql as never, mockReq({}), { sub: 'apikey:k', org: 'org-a' })
    expect(g).toMatchObject({ ok: false, status: 503, body: { error: 'LLM_CN_API_KEY not configured', code: 'ai_not_configured' } })
    expect(describeAiAvailability({ market: 'cn', ai_enabled: true, ai_provider: null })).toMatchObject({ enabled: true, provider: 'openai_compatible', configured: false })
  })

  it('aiLabel carries the mandatory label in the user language', () => {
    expect(aiLabel('zh', { provider: 'openai_compatible', model: 'qwen-plus' })).toEqual({
      ai_generated: true, ai_label: '本内容由人工智能生成，使用前请审核', ai_provider: 'openai_compatible', ai_model: 'qwen-plus', locale: 'zh',
    })
  })
})

describe('_claude task functions route through the provider', () => {
  it('append the locale instruction and support CN frameworks in drafting', async () => {
    const { p, calls } = stubProvider('anthropic', () => ({ ok: true, text: '草稿', usage: { tokensIn: 1, tokensOut: 2, cached: 0 }, model: 'claude-test', provider: 'anthropic' }))
    const r = await draftNarrative({ framework: 'cn-sse', section: '应对气候变化', data: {}, orgContext: { name: 'X' } }, { provider: p, locale: 'zh' })
    expect(r).toMatchObject({ ok: true, text: '草稿', model: 'claude-test', provider: 'anthropic' })
    expect(calls[0].system).toContain('Simplified Chinese (简体中文)')
    expect(calls[0].system).toContain('CN-SSE')
    expect(calls[0].messages[0].content).toContain('Framework: CN-SSE')
  })

  it('analyseGaps normalises structured output from any provider', async () => {
    const { p, calls } = stubProvider('openai_compatible', () => ({ ok: true, text: '{}', json: { summary: 's' }, usage: { tokensIn: 0, tokensOut: 0, cached: 0 }, model: 'qwen', provider: 'openai_compatible' }))
    const r = await analyseGaps({
      framework: { id: 'cn-sse', code: 'CN-SSE', name: 'cn-sse' }, reportingYear: 2025, organisation: { name: 'X' },
      question: '缺什么？', totals: { required: 1, filled: 0, inProgress: 0, missing: 1 }, disclosures: [],
    }, { provider: p, locale: 'zh' })
    expect(r.ok).toBe(true)
    expect(r.result).toEqual({ summary: 's', missingItems: [], qualityIssues: [], recommendedNextSteps: [], missingCount: 0 })
    expect(calls[0].json?.name).toBe('submit_gap_analysis')
  })
})

describe('POST /api/ai/draft', () => {
  async function draft(body: unknown, headers: Record<string, string> = {}) {
    const { default: handler } = await import('../../../api/ai/draft')
    const res = mockRes()
    await handler(mockReq({ method: 'POST', body, headers }), res)
    return res
  }

  it('uses the mainland provider for cn orgs, answers in zh and labels the output', async () => {
    const anth = stubProvider('anthropic', () => { throw new Error('should not be called') })
    const cn = stubProvider('openai_compatible', () => ({ ok: true, text: '本公司…', usage: { tokensIn: 3, tokensOut: 4, cached: 0 }, model: 'qwen-plus', provider: 'openai_compatible' }))
    setLlmProviderFactoryForTests(id => (id === 'anthropic' ? anth.p : cn.p))
    settingsRow = { org_id: 'org-a', market: 'cn', ai_enabled: true }
    const res = await draft({ framework: 'cn-sse', section: '应对气候变化' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ text: '本公司…', ai_generated: true, ai_provider: 'openai_compatible', ai_model: 'qwen-plus', locale: 'zh' })
    expect(cn.calls[0].system).toContain('简体中文')
  })

  it('global org + Accept-Language zh still answers in Chinese via Anthropic', async () => {
    const anth = stubProvider('anthropic', () => ({ ok: true, text: 'x', usage: { tokensIn: 0, tokensOut: 0, cached: 0 }, model: 'claude-test', provider: 'anthropic' }))
    setLlmProviderFactoryForTests(() => anth.p)
    const res = await draft({ framework: 'gri', section: 'GRI 305' }, { 'accept-language': 'zh-CN,zh;q=0.9' })
    expect(res.statusCode).toBe(200)
    expect((res.body as { locale: string }).locale).toBe('zh')
    expect(anth.calls[0].system).toContain('简体中文')
  })

  it('accepts the CN framework ids and rejects unknown ones', async () => {
    const anth = stubProvider('anthropic', () => ({ ok: true, text: 'x', usage: { tokensIn: 0, tokensOut: 0, cached: 0 }, model: 'c', provider: 'anthropic' }))
    setLlmProviderFactoryForTests(() => anth.p)
    for (const fw of ['cn-csds', 'hkex-esg', 'cass-esg']) expect((await draft({ framework: fw, section: 's' })).statusCode).toBe(200)
    expect((await draft({ framework: 'made-up', section: 's' })).statusCode).toBe(400)
  })

  it('returns 403 when AI is disabled for the org (no model call)', async () => {
    const anth = stubProvider('anthropic', () => { throw new Error('should not be called') })
    setLlmProviderFactoryForTests(() => anth.p)
    settingsRow = { org_id: 'org-a', market: 'global', ai_enabled: false }
    const res = await draft({ framework: 'gri', section: 'x' })
    expect(res.statusCode).toBe(403)
    expect(res.body).toMatchObject({ code: 'ai_disabled' })
    expect(anth.calls).toHaveLength(0)
  })
})
