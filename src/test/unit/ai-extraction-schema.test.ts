/**
 * Contract test for /api/ai/extract-evidence.
 *
 * The backend tool-call response shape ↔ AiExtractionResponse on the client
 * is the integration seam between Claude's structured output and the
 * AiExtractionPanel UI. If either side drifts (rename a field, drop a
 * confidence value, change ID shape), this test catches it before any
 * downstream component starts silently rendering `undefined`.
 *
 * MSW handler is configured in src/test/server.ts.
 */
import { z } from 'zod'
import { ai } from '../../lib/api'

// `id` is a UUID in production but we don't pin the format here — the panel
// only uses it as an opaque correlation key for the accept-extraction call.
const ExtractionSchema = z.object({
  id: z.string().nullable(),
  value: z.number(),
  unit: z.string().nullable(),
  period: z.string().nullable(),
  supplier: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  additionalNotes: z.string().nullable(),
})

const ResponseSchema = z.object({
  extraction: ExtractionSchema,
  usage: z.object({
    tokensIn: z.number(),
    tokensOut: z.number(),
    cached: z.number(),
  }),
})

describe('ai.extractEvidence response shape', () => {
  it('returns an AiExtractionResponse matching the published schema', async () => {
    const res = await ai.extractEvidence({
      evidenceId: '11111111-1111-1111-1111-111111111111',
      lineItemHint: 'Scope 2 electricity',
      expectedUnit: 'kWh',
    })

    const parsed = ResponseSchema.safeParse(res)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    // Spot-check the high-confidence band the panel relies on for its
    // green badge. Catches accidental scale changes (0-100 vs 0-1).
    expect(parsed.data.extraction.confidence).toBeGreaterThan(0.8)
    expect(parsed.data.extraction.confidence).toBeLessThanOrEqual(1)
  })

  it('ai.acceptExtraction returns {ok:true}', async () => {
    const res = await ai.acceptExtraction({
      extractionId: '00000000-0000-0000-0000-000000000099',
      dataValueId: '22222222-2222-2222-2222-222222222222',
    })
    expect(res).toEqual({ ok: true })
  })
})
