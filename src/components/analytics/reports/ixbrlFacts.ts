/**
 * Client-side reading of a generated iXBRL (XHTML) document: the tagged facts
 * with their resolved context period and unit measure. Purely a viewer — the
 * server remains the source of truth for generation and validation.
 */
export interface IxPeriod {
  kind: 'duration' | 'instant' | 'unknown'
  start?: string
  end?: string
  instant?: string
}

export interface IxFact {
  id: string
  /** Concept QName, e.g. esrs:GrossScope1GreenhouseGasEmissions. */
  name: string
  kind: 'numeric' | 'text'
  /** Rendered text inside the tag. */
  raw: string
  /** Numeric value with @scale applied (numeric facts only). */
  value: number | null
  /** No value reported (empty or em-dash body). */
  nil: boolean
  decimals: number | null
  scale: number
  contextRef: string
  unitRef: string | null
  /** Unit measure QName, e.g. iso4217:CNY, nexus:tce. */
  measure: string | null
  period: IxPeriod
}

const local = (el: Element) => (el.localName || el.nodeName).toLowerCase().replace(/^.*:/, '')

function childText(el: Element, name: string): string | undefined {
  for (const c of Array.from(el.getElementsByTagName('*'))) {
    if (local(c) === name) return c.textContent?.trim() || undefined
  }
  return undefined
}

function parse(xhtml: string): Document | null {
  if (typeof DOMParser === 'undefined' || !xhtml) return null
  const p = new DOMParser()
  const xml = p.parseFromString(xhtml, 'application/xhtml+xml')
  if (!xml.getElementsByTagName('parsererror').length) return xml
  // Not well-formed XML — fall back to the forgiving HTML parser.
  return p.parseFromString(xhtml, 'text/html')
}

export function readIxbrlFacts(xhtml: string): IxFact[] {
  const doc = parse(xhtml)
  if (!doc) return []
  const all = Array.from(doc.getElementsByTagName('*'))

  const periods = new Map<string, IxPeriod>()
  const units = new Map<string, string>()
  for (const el of all) {
    const n = local(el)
    const id = el.getAttribute('id')
    if (!id) continue
    if (n === 'context') {
      const instant = childText(el, 'instant')
      const start = childText(el, 'startdate')
      const end = childText(el, 'enddate')
      periods.set(id, instant ? { kind: 'instant', instant } : start || end ? { kind: 'duration', start, end } : { kind: 'unknown' })
    } else if (n === 'unit') {
      const measure = childText(el, 'measure')
      if (measure) units.set(id, measure)
    }
  }

  const facts: IxFact[] = []
  all.forEach((el, i) => {
    const n = local(el)
    if (n !== 'nonfraction' && n !== 'nonnumeric') return
    const raw = (el.textContent ?? '').trim()
    const nil = raw === '' || raw === '—' || el.getAttribute('xsi:nil') === 'true'
    const numeric = n === 'nonfraction'
    const scale = Number(el.getAttribute('scale') ?? 0) || 0
    const decAttr = el.getAttribute('decimals')
    const decimals = decAttr == null || decAttr === 'INF' ? null : Number(decAttr)
    const parsed = numeric && !nil ? Number(raw.replace(/,/g, '')) : NaN
    const unitRef = el.getAttribute('unitRef') ?? el.getAttribute('unitref')
    const contextRef = el.getAttribute('contextRef') ?? el.getAttribute('contextref') ?? ''
    facts.push({
      id: el.getAttribute('id') ?? `fact-${i}`,
      name: el.getAttribute('name') ?? '',
      kind: numeric ? 'numeric' : 'text',
      raw,
      value: Number.isFinite(parsed) ? parsed * 10 ** scale : null,
      nil,
      decimals: decimals != null && Number.isFinite(decimals) ? decimals : null,
      scale,
      contextRef,
      unitRef,
      measure: unitRef ? units.get(unitRef) ?? null : null,
      period: periods.get(contextRef) ?? { kind: 'unknown' },
    })
  })
  return facts
}

/** Measure QName → unit code used by the display map (iso4217:CNY → CNY). */
export function measureCode(measure: string | null): string | null {
  if (!measure) return null
  return measure.split(':').pop() ?? measure
}
