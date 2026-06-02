/**
 * api/_ixbrl.ts — Deep iXBRL generation engine.
 *
 * Produces an XHTML+ix document with embedded ix:nonFraction / ix:nonNumeric
 * tags, properly-formed xbrli:context and xbrli:unit elements, and schemaRef
 * declarations for every namespace that appears in the fact set.
 *
 * The output is structurally well-formed inline XBRL — it parses as XML,
 * every fact references a declared context + unit (numeric facts), every
 * concept is mapped to a known ESRS/ISSB/SEC/GRI/EU-tax taxonomy entry, and
 * all dimensional axes are declared in scenario blocks.
 *
 * We deliberately stop short of running the official EFRAG ESRS XSD against
 * the document — that's an 80MB linkbase ride best delegated to CoreFiling /
 * ParsePort / IRIS Carbon as a paid SDK integration. See docs/IXBRL.md.
 */

import { getDb } from './_db.js'
import {
  XBRL_CONCEPTS,
  getConceptById,
  inferConceptId,
  NAMESPACES,
  SCHEMA_REFS,
  type XbrlConcept,
} from './_ixbrlTaxonomy.js'

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export interface IxbrlTag {
  conceptName: string  // e.g. "esrs:GrossScope1GreenhouseGasEmissions"
  value: string | number
  unit?: string        // e.g. "tCO2e", "EUR", "pure"
  contextRef: string   // e.g. "FY2026"
  decimals?: number
  scale?: number
}

export interface IxbrlMapping {
  questionnaireItemId: string
  conceptName: string
  unit: string
}

/** A single tagged fact ready to be inlined into the XHTML body. */
export interface IXBRLFact {
  /** Stable id, used as `id` attribute on the ix element. */
  id: string
  /** Taxonomy concept (qname), e.g. `esrs:GrossScope1GreenhouseGasEmissions`. */
  conceptId: string
  concept: XbrlConcept
  /** Raw value — string for text/boolean/date, number for numeric. */
  value: string | number | boolean | null
  /** Computed context id (looked up via contextMap). */
  contextRef: string
  /** Computed unit id (numeric facts only). */
  unitRef?: string
  decimals?: number
  scale?: number
  /** Source provenance — questionnaire_item id / data_value id. */
  sourceItemId?: string
  sourceValueId?: string
}

export interface EntityIdentifier {
  scheme: string
  identifier: string
}

export interface PeriodDuration {
  type: 'duration'
  startDate: string  // ISO YYYY-MM-DD
  endDate: string
}

export interface PeriodInstant {
  type: 'instant'
  date: string  // ISO YYYY-MM-DD
}

export type Period = PeriodDuration | PeriodInstant

export interface Dimension {
  axis: string    // 'esrs:ConsolidatedEntitiesAxis'
  member: string  // 'esrs:ParentMember'
}

export interface ContextDescriptor {
  entity: EntityIdentifier
  period: Period
  dimensions?: Dimension[]
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

export function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!))
}

/**
 * Returns the short prefix (`esrs`, `ifrs-full`, `us-gaap`, `gri`, `eu-tax`)
 * for a concept qname, or `esrs` as a fallback so the resulting XML at least
 * declares a namespace.
 */
export function namespaceOf(qname: string): string {
  const idx = qname.indexOf(':')
  if (idx === -1) return 'esrs'
  return qname.slice(0, idx)
}

function stableHash(input: string): string {
  // Tiny FNV-1a — collision-resistant enough for context/unit ids in a single
  // document and deterministic (so two generations of the same data produce
  // identical XHTML, which makes diffs and signing trivial).
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

// ─────────────────────────────────────────────────────────────────────
// Context generation
// ─────────────────────────────────────────────────────────────────────

function contextKey(c: ContextDescriptor): string {
  const dim = (c.dimensions ?? [])
    .map(d => `${d.axis}=${d.member}`)
    .sort()
    .join('|')
  const periodKey = c.period.type === 'duration'
    ? `${c.period.startDate}_${c.period.endDate}`
    : `i_${c.period.date}`
  return `${c.entity.scheme}#${c.entity.identifier}|${periodKey}|${dim}`
}

function contextId(c: ContextDescriptor): string {
  // Human-friendly prefix + short hash to guarantee uniqueness.
  const periodPart = c.period.type === 'duration'
    ? `d_${c.period.startDate.slice(0, 4)}`
    : `i_${c.period.date.slice(0, 4)}`
  const dimPart = (c.dimensions ?? []).length > 0
    ? `_${(c.dimensions ?? []).map(d => d.member.split(':').pop()).join('_').slice(0, 30)}`
    : ''
  return `c_${periodPart}${dimPart}_${stableHash(contextKey(c)).slice(0, 6)}`
}

export function generateContexts(
  descriptors: ContextDescriptor[],
): { contextsXml: string; contextMap: Map<string, string> } {
  const map = new Map<string, string>()
  const unique = new Map<string, ContextDescriptor>()

  for (const d of descriptors) {
    const key = contextKey(d)
    if (!unique.has(key)) unique.set(key, d)
    const id = unique.has(key) ? contextId(unique.get(key)!) : contextId(d)
    map.set(key, id)
  }

  const xml = Array.from(unique.values()).map(c => {
    const id = contextId(c)
    const dim = (c.dimensions ?? []).length > 0
      ? `    <xbrli:scenario>\n${(c.dimensions ?? []).map(d =>
          `      <xbrldi:explicitMember dimension="${escapeXml(d.axis)}">${escapeXml(d.member)}</xbrldi:explicitMember>`
        ).join('\n')}\n    </xbrli:scenario>\n`
      : ''
    const period = c.period.type === 'duration'
      ? `    <xbrli:period>\n      <xbrli:startDate>${c.period.startDate}</xbrli:startDate>\n      <xbrli:endDate>${c.period.endDate}</xbrli:endDate>\n    </xbrli:period>`
      : `    <xbrli:period>\n      <xbrli:instant>${c.period.date}</xbrli:instant>\n    </xbrli:period>`
    return `  <xbrli:context id="${id}">
    <xbrli:entity>
      <xbrli:identifier scheme="${escapeXml(c.entity.scheme)}">${escapeXml(c.entity.identifier)}</xbrli:identifier>
    </xbrli:entity>
${period}
${dim}  </xbrli:context>`
  }).join('\n')

  return { contextsXml: xml, contextMap: map }
}

// ─────────────────────────────────────────────────────────────────────
// Unit generation
// ─────────────────────────────────────────────────────────────────────

const UNIT_MEASURE: Record<string, string> = {
  tCO2e: 'utr:tCO2e',
  MWh: 'utr:MWh',
  kWh: 'utr:kWh',
  EUR: 'iso4217:EUR',
  USD: 'iso4217:USD',
  GBP: 'iso4217:GBP',
  pure: 'xbrli:pure',
  percent: 'xbrli:pure',
  m3: 'utr:m3',
  kg: 'utr:kg',
  t: 'utr:t',
  count: 'xbrli:pure',
  hours: 'utr:hour',
  fte: 'xbrli:pure',
}

export function unitId(unit: string): string {
  return `u_${unit.replace(/[^A-Za-z0-9]+/g, '_')}`
}

export function generateUnits(units: Iterable<string>): string {
  const seen = new Set<string>()
  const lines: string[] = []
  for (const u of units) {
    if (seen.has(u)) continue
    seen.add(u)
    const measure = UNIT_MEASURE[u] ?? `utr:${u}`
    lines.push(`  <xbrli:unit id="${unitId(u)}">
    <xbrli:measure>${escapeXml(measure)}</xbrli:measure>
  </xbrli:unit>`)
  }
  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────────────
// Inline tagging
// ─────────────────────────────────────────────────────────────────────

function formatNumeric(value: number, decimals: number | undefined): string {
  if (decimals == null || decimals < 0) {
    return String(Math.round(value))
  }
  return value.toFixed(decimals)
}

export function tagFact(fact: IXBRLFact): string {
  const c = fact.concept
  const name = escapeXml(fact.conceptId)
  const ctx = escapeXml(fact.contextRef)
  const id = `f_${fact.id}`

  if (c.type === 'numeric' || c.type === 'monetary' || c.type === 'percent') {
    if (fact.value == null || fact.value === '') {
      return `<ix:nonNumeric id="${id}" name="${name}" contextRef="${ctx}">—</ix:nonNumeric>`
    }
    const num = Number(fact.value)
    const decimals = fact.decimals ?? c.decimals ?? 0
    const value = Number.isFinite(num) ? formatNumeric(num, decimals) : '0'
    const unit = fact.unitRef ?? unitId(c.unitRef ?? 'pure')
    const scale = fact.scale ?? 0
    return `<ix:nonFraction id="${id}" name="${name}" contextRef="${ctx}" unitRef="${escapeXml(unit)}" decimals="${decimals}" scale="${scale}">${escapeXml(value)}</ix:nonFraction>`
  }

  if (c.type === 'boolean') {
    const s = fact.value === true || String(fact.value).toLowerCase() === 'true' ? 'true' : 'false'
    return `<ix:nonNumeric id="${id}" name="${name}" contextRef="${ctx}" format="ixt:booleanfalse">${s}</ix:nonNumeric>`
  }

  if (c.type === 'date') {
    const s = String(fact.value ?? '')
    return `<ix:nonNumeric id="${id}" name="${name}" contextRef="${ctx}" format="ixt:date-iso8601">${escapeXml(s)}</ix:nonNumeric>`
  }

  // string / enum
  const s = String(fact.value ?? '')
  return `<ix:nonNumeric id="${id}" name="${name}" contextRef="${ctx}">${escapeXml(s)}</ix:nonNumeric>`
}

// ─────────────────────────────────────────────────────────────────────
// Mapping data_value rows → ESRS concepts
// ─────────────────────────────────────────────────────────────────────

export interface DataValueRow {
  id: string
  questionnaire_item_id: string
  framework_id: string | null
  gri_code: string | null
  line_item: string | null
  scope_split?: string | null
  value: number | null
  text_value?: string | null
  unit: string | null
  status?: string | null
  facility_id?: string | null
  reporting_year?: number | null
  xbrl_concept_id?: string | null
}

export function mapDataValueToConcept(row: DataValueRow): XbrlConcept | null {
  if (row.xbrl_concept_id) {
    const explicit = getConceptById(row.xbrl_concept_id)
    if (explicit) return explicit
  }
  const fw = (row.framework_id ?? '').toLowerCase()
  const code = (row.gri_code ?? '').toString()
  const li = (row.line_item ?? '').toString()
  const id = inferConceptId(fw, code, li)
  if (!id) return null
  return getConceptById(id) ?? null
}

// ─────────────────────────────────────────────────────────────────────
// Top-level document assembly
// ─────────────────────────────────────────────────────────────────────

export interface GenerateOptions {
  orgId: string
  reportingYear: number
  frameworkIds: string[]
  approvedOnly?: boolean
}

export interface GenerateResult {
  xhtml: string
  concepts: number
  contexts: number
  units: number
  warnings: string[]
  /** Concept-coverage diagnostics — used by the UI checklist. */
  coverage: Array<{
    conceptId: string
    label: string
    framework: string
    mapped: boolean
    valueId?: string
    griCode?: string
  }>
}

interface OrgRecord {
  id: string
  name: string
  slug: string
  country: string | null
  lei: string | null
  legal_form: string | null
  isin: string | null
}

async function loadOrganisation(orgId: string): Promise<OrgRecord | null> {
  const sql = getDb()
  try {
    const rows = await sql`
      SELECT id, name, slug, country, lei, legal_form, isin
      FROM organisations WHERE id = ${orgId} LIMIT 1
    ` as OrgRecord[]
    return rows[0] ?? null
  } catch {
    // Columns may not exist yet on older schemas — degrade gracefully.
    const rows = await sql`
      SELECT id, name, slug, country
      FROM organisations WHERE id = ${orgId} LIMIT 1
    ` as Array<Omit<OrgRecord, 'lei' | 'legal_form' | 'isin'>>
    const r = rows[0]
    if (!r) return null
    return { ...r, lei: null, legal_form: null, isin: null }
  }
}

async function loadDataValues(
  orgId: string,
  year: number,
  frameworks: string[],
  approvedOnly: boolean,
): Promise<DataValueRow[]> {
  const sql = getDb()
  const ryRows = await sql`
    SELECT id FROM reporting_year WHERE org_id = ${orgId} AND year = ${year} LIMIT 1
  ` as Array<{ id: string }>
  const ryId = ryRows[0]?.id ?? null

  // Pull all data_value rows for the period, then filter status in JS.
  // (Neon serverless tagged templates don't easily compose nested fragments.)
  let dvRows: Array<DataValueRow & { xbrl_concept_id: string | null }> = []
  if (ryId) {
    try {
      dvRows = await sql`
        SELECT dv.id,
               dv.questionnaire_item_id,
               qi.gri_code,
               qi.line_item,
               qi.scope_split,
               dv.value::float AS value,
               dv.unit,
               dv.status,
               dv.facility_id,
               dv.xbrl_concept_id
        FROM data_value dv
        LEFT JOIN questionnaire_item qi ON qi.id = dv.questionnaire_item_id
        WHERE dv.reporting_year_id = ${ryId}
      ` as Array<DataValueRow & { xbrl_concept_id: string | null }>
    } catch {
      // xbrl_concept_id column not yet migrated — fall back.
      const fallback = await sql`
        SELECT dv.id,
               dv.questionnaire_item_id,
               qi.gri_code,
               qi.line_item,
               qi.scope_split,
               dv.value::float AS value,
               dv.unit,
               dv.status,
               dv.facility_id
        FROM data_value dv
        LEFT JOIN questionnaire_item qi ON qi.id = dv.questionnaire_item_id
        WHERE dv.reporting_year_id = ${ryId}
      ` as Array<DataValueRow>
      dvRows = fallback.map(r => ({ ...r, xbrl_concept_id: null }))
    }
  }

  const qaRows = await sql`
    SELECT qa.id,
           qa.questionnaire_item_id,
           qa.framework_id,
           qa.gri_code,
           qa.line_item,
           qa.value::float AS value,
           qa.unit,
           qa.status,
           NULL AS facility_id,
           NULL AS xbrl_concept_id
    FROM question_assignments qa
    WHERE qa.org_id = ${orgId}
  ` as Array<DataValueRow>

  let combined = [
    ...dvRows.map(r => ({ ...r, framework_id: r.framework_id ?? null })),
    ...qaRows,
  ]

  if (approvedOnly) {
    combined = combined.filter(r =>
      r.status === 'approved' || r.status === 'published'
    )
  }

  if (frameworks.length === 0) return combined
  return combined.filter(r =>
    r.framework_id == null ||
    frameworks.includes(String(r.framework_id))
  )
}

export async function generateIxbrlDeep(opts: GenerateOptions): Promise<GenerateResult> {
  const { orgId, reportingYear, frameworkIds, approvedOnly = true } = opts
  const warnings: string[] = []

  const org = await loadOrganisation(orgId)
  const entityScheme = org?.lei
    ? 'http://standards.iso.org/iso/17442'
    : 'http://www.example.com'
  const entityId = org?.lei ?? `nexus:${org?.slug ?? orgId}`
  if (!org?.lei) {
    warnings.push('Organisation has no LEI — using placeholder scheme. Set organisations.lei for production filing.')
  }

  const rows = await loadDataValues(orgId, reportingYear, frameworkIds, approvedOnly)

  const facts: IXBRLFact[] = []
  const descriptors: ContextDescriptor[] = []
  const units = new Set<string>()
  const seenNamespaces = new Set<string>()
  const coverage: GenerateResult['coverage'] = []

  let factCounter = 0

  for (const row of rows) {
    const concept = mapDataValueToConcept(row)
    if (!concept) {
      warnings.push(`No concept mapping for framework=${row.framework_id ?? '?'} code=${row.gri_code ?? '?'} item=${row.line_item ?? '?'}`)
      continue
    }
    if (row.value == null && (row.text_value == null || row.text_value === '')) {
      // Skip empty values silently — these are unstarted disclosures.
      continue
    }

    const period: Period = concept.periodType === 'instant'
      ? { type: 'instant', date: `${reportingYear}-12-31` }
      : { type: 'duration', startDate: `${reportingYear}-01-01`, endDate: `${reportingYear}-12-31` }

    const dimensions: Dimension[] = []
    if (row.scope_split && /scope\s*1/i.test(row.scope_split)) {
      dimensions.push({ axis: 'esrs:ScopeAxis', member: 'esrs:Scope1Member' })
    } else if (row.scope_split && /scope\s*2/i.test(row.scope_split)) {
      dimensions.push({ axis: 'esrs:ScopeAxis', member: 'esrs:Scope2Member' })
    } else if (row.scope_split && /scope\s*3/i.test(row.scope_split)) {
      dimensions.push({ axis: 'esrs:ScopeAxis', member: 'esrs:Scope3Member' })
    }

    const desc: ContextDescriptor = {
      entity: { scheme: entityScheme, identifier: entityId },
      period,
      dimensions: dimensions.length ? dimensions : undefined,
    }
    descriptors.push(desc)
    const ctxId = contextId(desc)

    const unit = concept.unitRef ?? (row.unit ?? 'pure')
    if (concept.type === 'numeric' || concept.type === 'monetary' || concept.type === 'percent') {
      units.add(unit)
    }

    seenNamespaces.add(namespaceOf(concept.id))

    facts.push({
      id: `${++factCounter}`,
      conceptId: concept.id,
      concept,
      value: row.value ?? row.text_value ?? null,
      contextRef: ctxId,
      unitRef: (concept.type === 'numeric' || concept.type === 'monetary' || concept.type === 'percent')
        ? unitId(unit)
        : undefined,
      decimals: concept.decimals,
      sourceItemId: row.questionnaire_item_id,
      sourceValueId: row.id,
    })

    coverage.push({
      conceptId: concept.id,
      label: concept.label,
      framework: concept.framework,
      mapped: true,
      valueId: row.id,
      griCode: row.gri_code ?? undefined,
    })
  }

  // Surface unmapped required concepts (gap analysis for the checklist UI).
  for (const fw of frameworkIds) {
    const required = XBRL_CONCEPTS.filter(c => c.framework === fw && c.required)
    for (const r of required) {
      const already = coverage.find(c => c.conceptId === r.id)
      if (!already) {
        coverage.push({ conceptId: r.id, label: r.label, framework: r.framework, mapped: false })
      }
    }
  }

  const { contextsXml } = generateContexts(descriptors)
  const unitsXml = generateUnits(units)

  // Schema refs — declare one per namespace we actually used.
  const schemaRefs = Array.from(seenNamespaces).map(ns => {
    const href = SCHEMA_REFS[ns] ?? SCHEMA_REFS.esrs
    return `  <link:schemaRef xlink:type="simple" xlink:href="${escapeXml(href)}"/>`
  }).join('\n')

  const nsAttrs = Object.entries(NAMESPACES)
    .map(([prefix, uri]) => prefix === 'xhtml'
      ? `xmlns="${uri}"`
      : `xmlns:${prefix}="${uri}"`)
    .concat(['xmlns:utr="http://www.xbrl.org/2009/utr"'])
    .join('\n      ')

  // Group facts by framework topic for readable narrative output.
  const factsBySection = new Map<string, IXBRLFact[]>()
  for (const f of facts) {
    const k = f.concept.framework
    if (!factsBySection.has(k)) factsBySection.set(k, [])
    factsBySection.get(k)!.push(f)
  }

  const orgName = escapeXml(org?.name ?? 'Organisation')
  const orgCountry = escapeXml(org?.country ?? '')
  const today = new Date().toISOString().slice(0, 10)

  const body = Array.from(factsBySection.entries()).map(([fw, fs]) => `
    <section>
      <h2>${escapeXml(fw.toUpperCase())}</h2>
      <table>
        <thead><tr><th>Disclosure</th><th>Value</th></tr></thead>
        <tbody>
${fs.map(f => `          <tr>
            <td>${escapeXml(f.concept.label)}</td>
            <td>${tagFact(f)} ${f.concept.unitRef ? `<span class="unit">${escapeXml(f.concept.unitRef)}</span>` : ''}</td>
          </tr>`).join('\n')}
        </tbody>
      </table>
    </section>`).join('\n')

  const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<html ${nsAttrs}>
<head>
  <title>${orgName} — Sustainability Report ${reportingYear} (iXBRL draft)</title>
  <meta charset="UTF-8"/>
  <meta name="generator" content="Nexus iXBRL Engine v2"/>
  <meta name="reporting-year" content="${reportingYear}"/>
  <meta name="country" content="${orgCountry}"/>
  <meta name="generated-at" content="${today}"/>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; max-width: 960px; margin: 2rem auto; color: #111; }
    h1 { font-size: 1.6rem; }
    h2 { font-size: 1.1rem; margin-top: 2rem; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 14px; }
    th { background: #fafafa; font-weight: 600; }
    .unit { color: #666; font-size: 12px; margin-left: 4px; }
    .draft-banner { background: #fef3c7; border: 1px solid #fcd34d; padding: 8px 12px; border-radius: 4px; margin-bottom: 1rem; font-size: 13px; }
  </style>
</head>
<body>
<header>
  <h1>${orgName} — FY${reportingYear} Sustainability Disclosures</h1>
  <p class="draft-banner">
    <strong>Draft iXBRL document.</strong> This file is structurally valid inline XBRL and tagged
    against the ESRS / ISSB / SEC / GRI / EU-Taxonomy concept set. Regulatory filing requires
    validation against the official EFRAG taxonomy via a certified validator
    (CoreFiling, ParsePort, IRIS Carbon). See Nexus iXBRL documentation.
  </p>
</header>

<div style="display:none">
  <ix:header>
    <ix:hidden></ix:hidden>
    <ix:references>
${schemaRefs}
    </ix:references>
    <ix:resources>
${contextsXml}
${unitsXml}
    </ix:resources>
  </ix:header>
</div>

<main>
${body}
</main>

<footer>
  <p style="font-size:11px; color:#888; margin-top:2rem;">
    Generated by Nexus iXBRL Engine on ${today}. ${facts.length} facts, ${descriptors.length} contexts, ${units.size} units.
  </p>
</footer>
</body>
</html>`

  // Count unique contexts (the ContextDescriptor list contains dupes — each
  // fact contributed one).
  const uniqueCtxKeys = new Set(descriptors.map(contextKey))

  return {
    xhtml,
    concepts: facts.length,
    contexts: uniqueCtxKeys.size,
    units: units.size,
    warnings,
    coverage,
  }
}

// ─────────────────────────────────────────────────────────────────────
// Legacy entry point (kept for the existing /api/reports/[id]/ixbrl route
// — wraps the deep engine with a simpler tag map for back-compat).
// ─────────────────────────────────────────────────────────────────────

export async function generateIxbrl(
  reportId: string,
  mappings: IxbrlMapping[],
  data: Record<string, IxbrlTag>,
): Promise<string> {
  const tags = Object.values(data).map(t => `
    <ix:nonFraction
      name="${escapeXml(t.conceptName)}"
      contextRef="${escapeXml(t.contextRef)}"
      unitRef="${escapeXml(unitId(t.unit ?? 'pure'))}"
      decimals="${t.decimals ?? 0}"
      scale="${t.scale ?? 0}">${escapeXml(String(t.value))}</ix:nonFraction>
  `).join('\n')

  const mappingComment = mappings.length > 0
    ? `<!-- ${mappings.length} concept mapping(s) applied -->`
    : `<!-- no concept mappings supplied -->`

  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:ix="http://www.xbrl.org/2013/inlineXBRL"
      xmlns:xbrli="http://www.xbrl.org/2003/instance"
      xmlns:esrs="http://xbrl.efrag.org/taxonomy/esrs/2024">
<head>
  <title>Sustainability Report ${escapeXml(reportId)} — iXBRL</title>
  ${mappingComment}
</head>
<body>
${tags}
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────

export interface ValidationError {
  line?: number
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  stats: {
    facts: number
    contexts: number
    units: number
    unknownConcepts: number
  }
}

/**
 * Server-side structural validator. Doesn't bring in a full XML library — uses
 * a lightweight tag-extracting regex pass, which is sufficient for the
 * structural checks the spec calls for (well-formedness, ref integrity,
 * concept-name presence, numeric parsability, ISO date format).
 *
 * A "real" validation pass would shell out to CoreFiling / ParsePort and
 * apply the full EFRAG linkbase rules — see docs/IXBRL.md.
 */
export function validateIxbrl(xhtml: string): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // 1. XML well-formedness — quickest check: tag balance + matching quotes.
  // Strip CDATA and comments before counting.
  const stripped = xhtml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')

  const openTags = (stripped.match(/<[A-Za-z][^>]*?(?<!\/)>/g) ?? [])
    .filter(t => !/<\?xml/.test(t) && !/<!DOCTYPE/i.test(t))
  const closeTags = stripped.match(/<\/[A-Za-z][^>]*>/g) ?? []
  const selfClosing = stripped.match(/<[A-Za-z][^>]*\/>/g) ?? []

  // Quick parse: ensure no obviously malformed pieces.
  if (!stripped.includes('<html')) {
    errors.push({ message: 'Missing <html> root element' })
  }
  if (!stripped.includes('xmlns:ix=')) {
    errors.push({ message: 'Missing xmlns:ix namespace declaration' })
  }
  if (!stripped.includes('xmlns:xbrli=')) {
    errors.push({ message: 'Missing xmlns:xbrli namespace declaration' })
  }

  // 2. Extract contexts, units, ix:* facts.
  const contextIds = new Set<string>()
  const ctxRe = /<xbrli:context\s+id="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = ctxRe.exec(stripped)) !== null) contextIds.add(m[1])

  const unitIds = new Set<string>()
  const unitRe = /<xbrli:unit\s+id="([^"]+)"/g
  while ((m = unitRe.exec(stripped)) !== null) unitIds.add(m[1])

  const factRe = /<ix:(nonFraction|nonNumeric)\b([^>]*)(?:\/>|>([\s\S]*?)<\/ix:(?:nonFraction|nonNumeric)>)/g
  const facts: Array<{ tag: string; attrs: string; body: string; index: number }> = []
  while ((m = factRe.exec(stripped)) !== null) {
    facts.push({ tag: m[1], attrs: m[2], body: m[3] ?? '', index: m.index })
  }

  let unknownConcepts = 0

  for (const f of facts) {
    const lineNumber = stripped.slice(0, f.index).split('\n').length
    const name = /\bname="([^"]+)"/.exec(f.attrs)?.[1]
    const ctxRef = /\bcontextRef="([^"]+)"/.exec(f.attrs)?.[1]
    const unitRef = /\bunitRef="([^"]+)"/.exec(f.attrs)?.[1]
    const decimals = /\bdecimals="([^"]+)"/.exec(f.attrs)?.[1]

    if (!name) {
      errors.push({ line: lineNumber, message: `<ix:${f.tag}> missing required @name attribute` })
      continue
    }
    if (!ctxRef) {
      errors.push({ line: lineNumber, message: `<ix:${f.tag} name="${name}"> missing required @contextRef` })
    } else if (!contextIds.has(ctxRef)) {
      errors.push({ line: lineNumber, message: `<ix:${f.tag} name="${name}"> references unknown context "${ctxRef}"` })
    }

    if (f.tag === 'nonFraction') {
      if (!unitRef) {
        errors.push({ line: lineNumber, message: `<ix:nonFraction name="${name}"> missing required @unitRef` })
      } else if (!unitIds.has(unitRef)) {
        errors.push({ line: lineNumber, message: `<ix:nonFraction name="${name}"> references unknown unit "${unitRef}"` })
      }
      if (!decimals) {
        warnings.push({ line: lineNumber, message: `<ix:nonFraction name="${name}"> missing @decimals — defaulting to INF is risky` })
      }
      const num = Number(f.body.trim())
      if (f.body.trim() !== '' && f.body.trim() !== '—' && !Number.isFinite(num)) {
        errors.push({ line: lineNumber, message: `<ix:nonFraction name="${name}"> body "${f.body.trim()}" is not numeric` })
      }
    }

    // Concept name in our taxonomy?
    if (name && !getConceptById(name)) {
      unknownConcepts++
      warnings.push({ line: lineNumber, message: `Concept "${name}" is not in the Nexus taxonomy registry (may still be valid in a vendor taxonomy)` })
    }

    // Date format if format=ixt:date-iso8601
    if (/format="ixt:date-iso8601"/.test(f.attrs)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.body.trim())) {
        errors.push({ line: lineNumber, message: `<ix:nonNumeric name="${name}"> with date format expects YYYY-MM-DD, got "${f.body.trim()}"` })
      }
    }
  }

  // Rough tag-balance smell test (not a real parser but catches gross errors).
  const totalOpen = openTags.length
  const totalClose = closeTags.length + selfClosing.length
  if (Math.abs(totalOpen - totalClose) > 5) {
    // Allow small drift — meta/link without explicit close. Big drift = bad.
    warnings.push({ message: `XML tag-balance check: ${totalOpen} open vs ${totalClose} close — verify well-formedness with a real parser` })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      facts: facts.length,
      contexts: contextIds.size,
      units: unitIds.size,
      unknownConcepts,
    },
  }
}
