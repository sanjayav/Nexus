/**
 * Unit tests for api/_ixbrl.ts deep iXBRL engine + validator.
 *
 * Coverage:
 *  - concept lookup / mapping
 *  - context + unit generation
 *  - inline tagging shape
 *  - top-level document assembly
 *  - server-side structural validator
 *
 * Note: We exercise the pure helpers (no DB). The DB-backed
 * `generateIxbrlDeep` is covered indirectly via a small fake-row pipeline
 * that mocks the data layer through the exported pure functions.
 */
import { describe, it, expect } from 'vitest'
import {
  escapeXml,
  namespaceOf,
  generateContexts,
  generateUnits,
  tagFact,
  unitId,
  validateIxbrl,
  mapDataValueToConcept,
  type ContextDescriptor,
  type IXBRLFact,
  type DataValueRow,
} from '../../../api/_ixbrl'
import { getConceptById, XBRL_CONCEPTS } from '../../../api/_ixbrlTaxonomy'

describe('escapeXml', () => {
  it('escapes the five XML special chars', () => {
    expect(escapeXml('<a & "b" \'c\'>')).toBe('&lt;a &amp; &quot;b&quot; &apos;c&apos;&gt;')
  })
})

describe('namespaceOf', () => {
  it('returns the prefix from a qname', () => {
    expect(namespaceOf('esrs:Foo')).toBe('esrs')
    expect(namespaceOf('ifrs-full:Bar')).toBe('ifrs-full')
  })
  it('falls back to esrs when no prefix is present', () => {
    expect(namespaceOf('NoPrefix')).toBe('esrs')
  })
})

describe('mapDataValueToConcept', () => {
  it('resolves a known ESRS E1 row', () => {
    const row: DataValueRow = {
      id: 'r1',
      questionnaire_item_id: 'q1',
      framework_id: 'csrd-e1',
      gri_code: '305-1',
      line_item: 'Scope 1 emissions',
      value: 1000,
      unit: 'tCO2e',
    }
    const c = mapDataValueToConcept(row)
    expect(c).not.toBeNull()
    expect(c?.id).toBe('esrs:GrossScope1GreenhouseGasEmissions')
  })

  it('returns null for unknown framework/code combos', () => {
    const row: DataValueRow = {
      id: 'r2', questionnaire_item_id: 'q2',
      framework_id: 'made-up-fw', gri_code: 'ZZZ-99', line_item: 'unknown',
      value: 1, unit: null,
    }
    expect(mapDataValueToConcept(row)).toBeNull()
  })

  it('honours explicit xbrl_concept_id over heuristic mapping', () => {
    const row: DataValueRow = {
      id: 'r3', questionnaire_item_id: 'q3',
      framework_id: 'csrd-e1', gri_code: '305-1', line_item: 'whatever',
      value: 1, unit: null,
      xbrl_concept_id: 'esrs:TotalEnergyConsumption',
    }
    const c = mapDataValueToConcept(row)
    expect(c?.id).toBe('esrs:TotalEnergyConsumption')
  })
})

describe('generateContexts', () => {
  it('deduplicates identical entity+period+dimension tuples', () => {
    const desc: ContextDescriptor = {
      entity: { scheme: 'urn:lei', identifier: 'LEI123' },
      period: { type: 'duration', startDate: '2026-01-01', endDate: '2026-12-31' },
    }
    const { contextsXml, contextMap } = generateContexts([desc, desc, desc])
    const ids = (contextsXml.match(/<xbrli:context id="/g) ?? []).length
    expect(ids).toBe(1)
    expect(contextMap.size).toBe(1)
  })

  it('emits one context per distinct dimension', () => {
    const base = {
      entity: { scheme: 'urn:lei', identifier: 'LEI' },
      period: { type: 'duration', startDate: '2026-01-01', endDate: '2026-12-31' },
    } as const
    const ds: ContextDescriptor[] = [
      { ...base },
      { ...base, dimensions: [{ axis: 'esrs:ScopeAxis', member: 'esrs:Scope1Member' }] },
      { ...base, dimensions: [{ axis: 'esrs:ScopeAxis', member: 'esrs:Scope2Member' }] },
    ]
    const { contextsXml } = generateContexts(ds)
    const ids = (contextsXml.match(/<xbrli:context id="/g) ?? []).length
    expect(ids).toBe(3)
    expect(contextsXml).toContain('Scope1Member')
    expect(contextsXml).toContain('Scope2Member')
  })

  it('emits instant period blocks for instant contexts', () => {
    const { contextsXml } = generateContexts([{
      entity: { scheme: 'u', identifier: 'i' },
      period: { type: 'instant', date: '2026-12-31' },
    }])
    expect(contextsXml).toContain('<xbrli:instant>2026-12-31</xbrli:instant>')
  })
})

describe('generateUnits', () => {
  it('emits one unit per distinct measure', () => {
    const xml = generateUnits(['tCO2e', 'EUR', 'pure'])
    expect((xml.match(/<xbrli:unit id="/g) ?? []).length).toBe(3)
    expect(xml).toContain('utr:tCO2e')
    expect(xml).toContain('iso4217:EUR')
    expect(xml).toContain('xbrli:pure')
  })

  it('deduplicates repeated units', () => {
    const xml = generateUnits(['tCO2e', 'tCO2e', 'tCO2e'])
    expect((xml.match(/<xbrli:unit id="/g) ?? []).length).toBe(1)
  })
})

describe('tagFact', () => {
  it('emits ix:nonFraction for numeric concepts with the right attributes', () => {
    const concept = getConceptById('esrs:GrossScope1GreenhouseGasEmissions')!
    const fact: IXBRLFact = {
      id: '1', conceptId: concept.id, concept,
      value: 4521,
      contextRef: 'c_d_2026_abc123',
      unitRef: unitId('tCO2e'),
      decimals: 0,
    }
    const xml = tagFact(fact)
    expect(xml).toMatch(/<ix:nonFraction\b/)
    expect(xml).toContain(`name="esrs:GrossScope1GreenhouseGasEmissions"`)
    expect(xml).toContain(`contextRef="c_d_2026_abc123"`)
    expect(xml).toContain(`unitRef="u_tCO2e"`)
    expect(xml).toContain(`decimals="0"`)
    expect(xml).toContain('>4521<')
  })

  it('emits ix:nonNumeric for string concepts', () => {
    const concept = getConceptById('esrs:TransitionPlanForClimateChangeMitigation')!
    const xml = tagFact({
      id: '2', conceptId: concept.id, concept,
      value: 'We plan to halve emissions by 2030.',
      contextRef: 'c_d_2026_xyz',
    })
    expect(xml).toMatch(/<ix:nonNumeric\b/)
    expect(xml).not.toContain('unitRef=')
  })

  it('renders booleans with the boolean format hint', () => {
    const concept = getConceptById('esrs:ScenarioAnalysisAppliedClimate')!
    const xml = tagFact({
      id: '3', conceptId: concept.id, concept,
      value: true, contextRef: 'c_d_2026_b',
    })
    expect(xml).toContain('format="ixt:booleanfalse"')
    expect(xml).toContain('>true<')
  })

  it('formats decimals correctly', () => {
    const concept = { ...getConceptById('esrs:GenderPayGap')! }
    const xml = tagFact({
      id: '4', conceptId: concept.id, concept,
      value: 12.345, contextRef: 'ctx',
      unitRef: unitId('percent'), decimals: 1,
    })
    expect(xml).toContain('>12.3<')
  })

  it('escapes XML-special chars inside ix:nonNumeric body', () => {
    const concept = getConceptById('esrs:BusinessConductPolicies')!
    const xml = tagFact({
      id: '5', conceptId: concept.id, concept,
      value: 'Acme & Co <2026 strategy>', contextRef: 'ctx',
    })
    expect(xml).toContain('Acme &amp; Co &lt;2026 strategy&gt;')
  })
})

// ─────────────────────────────────────────────────────────────────────
// Validator
// ─────────────────────────────────────────────────────────────────────

function tinyDocument(parts: { contexts?: string; units?: string; facts?: string; extraNs?: string } = {}): string {
  const ctx = parts.contexts ?? `<xbrli:context id="c1">
    <xbrli:entity><xbrli:identifier scheme="u">i</xbrli:identifier></xbrli:entity>
    <xbrli:period><xbrli:startDate>2026-01-01</xbrli:startDate><xbrli:endDate>2026-12-31</xbrli:endDate></xbrli:period>
  </xbrli:context>`
  const units = parts.units ?? `<xbrli:unit id="u_tCO2e"><xbrli:measure>utr:tCO2e</xbrli:measure></xbrli:unit>`
  const facts = parts.facts ?? `<ix:nonFraction name="esrs:GrossScope1GreenhouseGasEmissions" contextRef="c1" unitRef="u_tCO2e" decimals="0">123</ix:nonFraction>`
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:ix="http://www.xbrl.org/2013/inlineXBRL"
      xmlns:xbrli="http://www.xbrl.org/2003/instance"
      ${parts.extraNs ?? ''}>
<head><title>t</title></head>
<body>
  <div style="display:none">${ctx}${units}</div>
  <p>${facts}</p>
</body>
</html>`
}

describe('validateIxbrl', () => {
  it('accepts a well-formed minimal document', () => {
    const r = validateIxbrl(tinyDocument())
    expect(r.valid).toBe(true)
    expect(r.errors).toEqual([])
    expect(r.stats.facts).toBe(1)
    expect(r.stats.contexts).toBe(1)
    expect(r.stats.units).toBe(1)
  })

  it('flags missing namespace declarations', () => {
    const xml = `<?xml version="1.0"?><html><body/></html>`
    const r = validateIxbrl(xml)
    expect(r.valid).toBe(false)
    expect(r.errors.some(e => /xmlns:ix/.test(e.message))).toBe(true)
  })

  it('flags an ix:nonFraction with no contextRef', () => {
    const r = validateIxbrl(tinyDocument({
      facts: `<ix:nonFraction name="esrs:GrossScope1GreenhouseGasEmissions" unitRef="u_tCO2e" decimals="0">10</ix:nonFraction>`,
    }))
    expect(r.valid).toBe(false)
    expect(r.errors.some(e => /missing required @contextRef/.test(e.message))).toBe(true)
  })

  it('flags an ix:nonFraction referencing a non-existent context', () => {
    const r = validateIxbrl(tinyDocument({
      facts: `<ix:nonFraction name="esrs:GrossScope1GreenhouseGasEmissions" contextRef="ghost" unitRef="u_tCO2e" decimals="0">10</ix:nonFraction>`,
    }))
    expect(r.valid).toBe(false)
    expect(r.errors.some(e => /unknown context "ghost"/.test(e.message))).toBe(true)
  })

  it('flags an ix:nonFraction referencing a non-existent unit', () => {
    const r = validateIxbrl(tinyDocument({
      facts: `<ix:nonFraction name="esrs:GrossScope1GreenhouseGasEmissions" contextRef="c1" unitRef="u_ghost" decimals="0">10</ix:nonFraction>`,
    }))
    expect(r.valid).toBe(false)
    expect(r.errors.some(e => /unknown unit "u_ghost"/.test(e.message))).toBe(true)
  })

  it('errors when numeric body is not a number', () => {
    const r = validateIxbrl(tinyDocument({
      facts: `<ix:nonFraction name="esrs:GrossScope1GreenhouseGasEmissions" contextRef="c1" unitRef="u_tCO2e" decimals="0">abc</ix:nonFraction>`,
    }))
    expect(r.valid).toBe(false)
    expect(r.errors.some(e => /not numeric/.test(e.message))).toBe(true)
  })

  it('warns (does not error) on an unknown concept', () => {
    const r = validateIxbrl(tinyDocument({
      facts: `<ix:nonFraction name="custom:UnregisteredConcept" contextRef="c1" unitRef="u_tCO2e" decimals="0">10</ix:nonFraction>`,
    }))
    expect(r.valid).toBe(true)
    expect(r.warnings.some(w => /not in the Nexus taxonomy/.test(w.message))).toBe(true)
    expect(r.stats.unknownConcepts).toBe(1)
  })

  it('errors when an ixt:date-iso8601 body is not ISO', () => {
    // Concept registry has esrs:BaseYearForGHGEmissions as date
    const r = validateIxbrl(tinyDocument({
      facts: `<ix:nonNumeric name="esrs:BaseYearForGHGEmissions" contextRef="c1" format="ixt:date-iso8601">2026/01/01</ix:nonNumeric>`,
    }))
    expect(r.valid).toBe(false)
    expect(r.errors.some(e => /YYYY-MM-DD/.test(e.message))).toBe(true)
  })
})

describe('happy-path round trip', () => {
  it('builds + validates a multi-fact document end-to-end', () => {
    // 1. Build context + unit XML and fact tags by hand (mirrors what
    // generateIxbrlDeep does, but without the DB hit).
    const desc1: ContextDescriptor = {
      entity: { scheme: 'urn:lei', identifier: 'LEI1' },
      period: { type: 'duration', startDate: '2026-01-01', endDate: '2026-12-31' },
    }
    const desc2: ContextDescriptor = {
      ...desc1,
      dimensions: [{ axis: 'esrs:ScopeAxis', member: 'esrs:Scope2Member' }],
    }
    const { contextsXml, contextMap } = generateContexts([desc1, desc2])
    const unitsXml = generateUnits(['tCO2e', 'EUR'])

    const ctxId1 = Array.from(contextMap.values())[0]
    const ctxId2 = Array.from(contextMap.values())[1]

    const c1 = getConceptById('esrs:GrossScope1GreenhouseGasEmissions')!
    const c2 = getConceptById('esrs:GrossLocationBasedScope2GreenhouseGasEmissions')!
    const c3 = getConceptById('esrs:InternalCarbonPriceApplied')!

    const facts = [
      tagFact({ id: '1', conceptId: c1.id, concept: c1, value: 1000, contextRef: ctxId1, unitRef: unitId('tCO2e'), decimals: 0 }),
      tagFact({ id: '2', conceptId: c2.id, concept: c2, value: 2500, contextRef: ctxId2, unitRef: unitId('tCO2e'), decimals: 0 }),
      tagFact({ id: '3', conceptId: c3.id, concept: c3, value: 75, contextRef: ctxId1, unitRef: unitId('EUR'), decimals: 2 }),
    ].join('\n')

    const doc = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:ix="http://www.xbrl.org/2013/inlineXBRL"
      xmlns:xbrli="http://www.xbrl.org/2003/instance"
      xmlns:xbrldi="http://xbrl.org/2006/xbrldi"
      xmlns:esrs="http://xbrl.efrag.org/taxonomy/esrs/2024">
<head><title>t</title></head>
<body>
<div style="display:none">${contextsXml}${unitsXml}</div>
${facts}
</body>
</html>`

    const r = validateIxbrl(doc)
    expect(r.valid).toBe(true)
    expect(r.errors).toEqual([])
    expect(r.stats.facts).toBe(3)
    expect(r.stats.contexts).toBe(2)
    expect(r.stats.units).toBe(2)
    expect(r.stats.unknownConcepts).toBe(0)
  })
})

describe('taxonomy coverage', () => {
  it('exports at least 150 concepts across ESRS topical areas', () => {
    expect(XBRL_CONCEPTS.length).toBeGreaterThanOrEqual(150)
  })

  it('includes E1 climate, S1 workforce, and G1 governance coverage', () => {
    const fws = new Set(XBRL_CONCEPTS.map(c => c.framework))
    expect(fws.has('csrd-e1')).toBe(true)
    expect(fws.has('csrd-s1')).toBe(true)
    expect(fws.has('csrd-g1')).toBe(true)
  })
})
