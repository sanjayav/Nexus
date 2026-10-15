/**
 * Shape check for the AI gap analysis endpoint.
 *
 * The MSW mock in `src/test/server.ts` returns a deterministic analysis —
 * we don't validate Claude's actual output, only that the wire contract
 * (analysis, cached, generatedAt, usage) matches `src/lib/api.ts`.
 */
import { ai } from '../../lib/api'

describe('ai.analyzeGaps response shape', () => {
  it('returns a structured analysis with summary + missingItems + recommendedNextSteps', async () => {
    const res = await ai.analyzeGaps({
      frameworkId: 'csrd-e1',
      reportingYear: 2026,
      question: 'What is missing for ESRS E1?',
    })

    // Top-level
    expect(typeof res.cached).toBe('boolean')
    expect(res.generatedAt).toBeTruthy()
    expect(Number.isNaN(new Date(res.generatedAt).getTime())).toBe(false)

    // Analysis block
    expect(res.analysis).toBeDefined()
    expect(typeof res.analysis.summary).toBe('string')
    expect(res.analysis.summary.length).toBeGreaterThan(0)
    expect(typeof res.analysis.missingCount).toBe('number')
    expect(Array.isArray(res.analysis.missingItems)).toBe(true)
    expect(Array.isArray(res.analysis.qualityIssues)).toBe(true)
    expect(Array.isArray(res.analysis.recommendedNextSteps)).toBe(true)

    // Missing item shape
    expect(res.analysis.missingItems.length).toBeGreaterThan(0)
    const first = res.analysis.missingItems[0]
    expect(typeof first.code).toBe('string')
    expect(typeof first.lineItem).toBe('string')
    expect(typeof first.why_critical).toBe('string')
    expect(['low', 'medium', 'high']).toContain(first.estimated_effort)

    // Usage shape
    expect(res.usage).toBeDefined()
    expect(typeof res.usage.tokensIn).toBe('number')
    expect(typeof res.usage.tokensOut).toBe('number')
  })

  it('accepts a scope hint and regenerate flag', async () => {
    const res = await ai.analyzeGaps({
      frameworkId: 'csrd-e1',
      reportingYear: 2026,
      question: 'Quality issues?',
      scope: 'quality',
      regenerate: true,
    })
    expect(res.analysis.summary).toBeTruthy()
  })
})
