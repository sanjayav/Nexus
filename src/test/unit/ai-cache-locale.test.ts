/**
 * Locale is part of the AI cache key: narrate-anomaly (single-slot cache on
 * the anomalies row) and analyze-gaps (ai_gap_analyses lookup).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeFakeSql, mockReq, mockRes, type FakeSql } from './fake-sql'
import type { LlmProvider, LlmRequest } from '../../../api/_llm/types'

let fakeSql: FakeSql
let anomaly: Record<string, unknown>

vi.mock('../../../api/_db', () => ({ getDb: () => fakeSql }))
vi.mock('../../../api/_rateLimit', () => ({ checkRateLimit: async () => true }))
vi.mock('../../../api/_auth', () => ({
  cors: () => {},
  requirePermission: async () => ({ sub: 'apikey:test', org: 'org-a', email: '', permissions: new Set(['analytics.view']), roleSlugs: new Set() }),
}))

import { setLlmProviderFactoryForTests } from '../../../api/_llm'

const calls: LlmRequest[] = []
const provider: LlmProvider = {
  id: 'anthropic', model: 'claude-test', label: 'stub', notConfiguredError: 'x not configured',
  supports: { pdf: true, images: true }, configured: () => true,
  complete: async req => {
    calls.push(req)
    return req.json
      ? { ok: true, text: '', json: { summary: '摘要', missingCount: 0, missingItems: [], recommendedNextSteps: [] }, usage: { tokensIn: 1, tokensOut: 1, cached: 0 }, model: 'claude-test', provider: 'anthropic' }
      : { ok: true, text: '同比上升 22%。', usage: { tokensIn: 1, tokensOut: 1, cached: 0 }, model: 'claude-test', provider: 'anthropic' }
  },
}

beforeEach(() => {
  calls.length = 0
  setLlmProviderFactoryForTests(() => provider)
  anomaly = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', facility_id: null, severity: 'warning', title: 'Spike', description: null,
    scope: null, metric: null, expected_value: '1', actual_value: '2', deviation_pct: '100', detected_at: 'now',
    ai_narrative: 'Up 22% vs Q1.', ai_narrative_generated_at: '2026-10-01', ai_narrative_model: 'claude-sonnet-4-6',
    ai_narrative_tokens_in: 5, ai_narrative_tokens_out: 6, ai_narrative_locale: null,
  }
  fakeSql = makeFakeSql(q => {
    if (q.startsWith('SELECT org_id, market')) return []
    if (q.includes("to_jsonb(u) ->> 'locale'")) return []
    if (q.startsWith('SELECT id, facility_id, severity')) return [anomaly]
    if (q.startsWith('SELECT g.id, g.summary')) return []
    if (q.startsWith('SELECT id, gri_code, line_item')) return [{ id: 'q1', gri_code: 'CN-SSE-21', line_item: '温室气体排放', unit: 't', scope_split: null, default_workflow_role: null }]
    if (q.startsWith('SELECT name, industry, country')) return [{ name: 'X', industry: null, country: 'CN' }]
    if (q.startsWith('INSERT INTO ai_gap_analyses')) return [{ id: 'gap-1' }]
    return []
  })
})
afterEach(() => setLlmProviderFactoryForTests(null))

async function narrate(headers: Record<string, string>) {
  const { default: handler } = await import('../../../api/ai/narrate-anomaly')
  const res = mockRes()
  await handler(mockReq({ method: 'POST', body: { anomalyId: anomaly.id }, headers }), res)
  return res
}

describe('narrate-anomaly cache is per locale', () => {
  it('returns the stored English narrative for an English caller (NULL locale = en)', async () => {
    const res = await narrate({ 'accept-language': 'en-GB' })
    expect(res.body).toMatchObject({ narrative: 'Up 22% vs Q1.', cached: true, ai_generated: true, locale: 'en' })
    expect(calls).toHaveLength(0)
  })

  it('regenerates for a Chinese caller and stores the locale with the narrative', async () => {
    const res = await narrate({ 'accept-language': 'zh-CN' })
    expect(res.body).toMatchObject({ narrative: '同比上升 22%。', cached: false, ai_generated: true, locale: 'zh' })
    expect(calls).toHaveLength(1)
    expect(calls[0].system).toContain('简体中文')
    const upd = fakeSql.calls.find(c => c.q.startsWith('UPDATE anomalies'))!
    expect(upd.q).toContain('ai_narrative_locale')
    expect(upd.values).toContain('zh')
  })

  it('a zh-cached narrative is served to zh callers', async () => {
    anomaly.ai_narrative = '同比上升 22%。'
    anomaly.ai_narrative_locale = 'zh'
    const res = await narrate({ 'accept-language': 'zh-CN' })
    expect(res.body).toMatchObject({ cached: true, locale: 'zh' })
    expect(calls).toHaveLength(0)
  })
})

describe('analyze-gaps cache lookup includes the locale', () => {
  it('filters the cache by locale and persists it', async () => {
    const { default: handler } = await import('../../../api/ai/analyze-gaps')
    const res = mockRes()
    await handler(mockReq({ method: 'POST', body: { frameworkId: 'cn-sse', reportingYear: 2025, question: '缺什么？' }, headers: { 'accept-language': 'zh-CN' } }), res)
    expect(res.statusCode).toBe(200)
    const lookup = fakeSql.calls.find(c => c.q.startsWith('SELECT g.id, g.summary'))!
    expect(lookup.q).toContain("COALESCE(to_jsonb(g) ->> 'locale', 'en') = $?")
    expect(lookup.values).toContain('zh')
    const ins = fakeSql.calls.find(c => c.q.startsWith('INSERT INTO ai_gap_analyses'))!
    expect(ins.values).toContain('zh')
    expect(ins.values).toContain('anthropic')
    // API-key actor is not written into the users FK column.
    expect(ins.values).not.toContain('apikey:test')
    expect(res.body).toMatchObject({ ai_generated: true, locale: 'zh', analysis: { summary: '摘要' } })
  })
})
