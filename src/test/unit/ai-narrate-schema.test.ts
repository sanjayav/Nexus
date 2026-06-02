/**
 * Shape check for the AI anomaly narration endpoint.
 *
 * The MSW mock in `src/test/server.ts` returns a deterministic narrative —
 * we don't validate Claude's actual output, only that the wire contract
 * (narrative, generatedAt, cached, usage) is what `src/lib/api.ts` declares.
 *
 * Also exercises the GET list path that the AnomalyDetection page uses to
 * populate its "Explain with AI" table.
 */
import { ai } from '../../lib/api'

describe('ai.narrateAnomaly response shape', () => {
  it('POST returns narrative + generatedAt + cached + usage', async () => {
    const res = await ai.narrateAnomaly('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')

    // Required string fields
    expect(typeof res.narrative).toBe('string')
    expect(res.narrative.length).toBeGreaterThan(0)
    expect(res.narrative).toContain('Q1')

    // Timestamp is ISO-ish (parses to a real Date)
    expect(res.generatedAt).toBeTruthy()
    expect(Number.isNaN(new Date(res.generatedAt as string).getTime())).toBe(false)

    // Cache flag is a boolean — never undefined.
    expect(typeof res.cached).toBe('boolean')

    // Usage object — three numeric counters (cache_read_input_tokens etc.).
    expect(res.usage).toBeDefined()
    expect(typeof res.usage.tokensIn).toBe('number')
    expect(typeof res.usage.tokensOut).toBe('number')
    // `cached` on usage is optional in the SDK response — accept number or undefined.
    expect(['number', 'undefined']).toContain(typeof res.usage.cached)
  })

  it('POST forwards the regenerate flag without crashing', async () => {
    const res = await ai.narrateAnomaly('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true)
    expect(typeof res.narrative).toBe('string')
    expect(typeof res.cached).toBe('boolean')
  })

  it('GET returns an anomalies array with the documented row shape', async () => {
    const res = await ai.listAnomaliesForNarration()
    expect(Array.isArray(res.anomalies)).toBe(true)
    expect(res.anomalies.length).toBeGreaterThan(0)
    const row = res.anomalies[0]
    // Spot-check fields the AnomalyDetection page renders.
    expect(typeof row.id).toBe('string')
    expect(typeof row.title).toBe('string')
    expect(['info', 'warning', 'critical']).toContain(row.severity)
    expect(typeof row.deviation_pct === 'number' || row.deviation_pct === null).toBe(true)
    // Cache marker columns are exposed so the panel can show "last updated …"
    expect('ai_narrative' in row).toBe(true)
    expect('ai_narrative_generated_at' in row).toBe(true)
  })
})
