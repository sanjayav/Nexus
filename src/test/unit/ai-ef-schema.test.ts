/**
 * Schema / shape test for the AI vendor → emission-factor matcher.
 * Mocks the /api/ai/match-ef and /api/ai/accept-ef-match endpoints in MSW so
 * we exercise the wire contract that the Scope3Calculators + EFLibrary UI
 * depend on without standing up the real Claude integration.
 */
import { http, HttpResponse } from 'msw'
import { server } from '../server'
import { ai, setToken, clearToken, type AiEfMatchResponse } from '../../lib/api'

const FIXTURE: AiEfMatchResponse = {
  match: {
    id: 'm-1',
    ef: {
      id: 'ef-top',
      scope: 3,
      category: 'Cat 1 - Purchased goods',
      subcategory: null,
      fuel_or_activity: 'steel',
      region: 'GLOBAL',
      unit: 'kgCO2e/kg',
      co2e_per_unit: 1.85,
      co2_per_unit: null,
      ch4_per_unit: null,
      n2o_per_unit: null,
      source: 'ecoinvent 3.10',
      source_version: '3.10',
      valid_from: '2024-01-01',
      valid_to: null,
      notes: null,
    },
    confidence: 0.88,
    reasoning: 'Acme Steel Co. is unambiguously a steel manufacturer; ecoinvent steel EF is the best match.',
    alternates: [
      {
        ef: {
          id: 'ef-alt-1',
          scope: 3,
          category: 'Cat 1 - Purchased goods',
          subcategory: null,
          fuel_or_activity: 'iron',
          region: 'GLOBAL',
          unit: 'kgCO2e/kg',
          co2e_per_unit: 1.6,
          co2_per_unit: null,
          ch4_per_unit: null,
          n2o_per_unit: null,
          source: 'ecoinvent 3.10',
          source_version: null,
          valid_from: '2024-01-01',
          valid_to: null,
          notes: null,
        },
        confidence: 0.55,
        reasoning: 'Iron is upstream of steel — viable if vendor is supplying raw iron.',
      },
    ],
    overallNotes: 'Vendor name strongly implies steel.',
  },
  usage: { tokensIn: 1200, tokensOut: 250, cached: 800 },
}

describe('ai.matchEf — response shape', () => {
  beforeAll(() => setToken('test-token'))
  afterAll(() => clearToken())

  it('parses the documented payload and exposes top + alternates', async () => {
    server.use(
      http.post('/api/ai/match-ef', () => HttpResponse.json(FIXTURE)),
    )

    const res = await ai.matchEf({
      vendorName: 'Acme Steel Co.',
      scope: 3,
      category: 'Cat 1 - Purchased goods',
      region: 'GLOBAL',
    })

    expect(res.match.id).toBe('m-1')
    expect(res.match.ef.id).toBe('ef-top')
    expect(typeof res.match.confidence).toBe('number')
    expect(res.match.confidence).toBeGreaterThan(0)
    expect(res.match.confidence).toBeLessThanOrEqual(1)
    expect(res.match.reasoning.length).toBeGreaterThan(0)
    expect(Array.isArray(res.match.alternates)).toBe(true)
    expect(res.match.alternates).toHaveLength(1)
    expect(res.match.alternates[0].ef.id).toBe('ef-alt-1')
    expect(res.match.alternates[0].confidence).toBeGreaterThan(0)
    expect(res.match.overallNotes).toBe('Vendor name strongly implies steel.')
    expect(res.usage.tokensIn).toBe(1200)
  })

  it('surfaces 503 when ANTHROPIC_API_KEY is missing', async () => {
    server.use(
      http.post('/api/ai/match-ef', () =>
        HttpResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 }),
      ),
    )
    await expect(
      ai.matchEf({ vendorName: 'Anything' }),
    ).rejects.toThrow(/ANTHROPIC_API_KEY/)
  })
})

describe('ai.acceptEfMatch — audit endpoint shape', () => {
  beforeAll(() => setToken('test-token'))
  afterAll(() => clearToken())

  it('returns ok + acceptedAt on a successful accept', async () => {
    server.use(
      http.post('/api/ai/accept-ef-match', () =>
        HttpResponse.json({ ok: true, id: 'm-1', acceptedAt: '2026-05-29T00:00:00.000Z' }),
      ),
    )
    const res = await ai.acceptEfMatch('m-1')
    expect(res.ok).toBe(true)
    expect(res.id).toBe('m-1')
    expect(typeof res.acceptedAt).toBe('string')
  })
})
