/**
 * The 21 sustainability topics of the SSE / SZSE / BSE self-regulatory
 * guidelines (《上市公司自律监管指引——可持续发展报告（试行）》, 2024), in the
 * guideline's order, grouped by pillar.
 *
 * `code` matches the topic segment of the CN-SSE questionnaire codes seeded in
 * api/_cnSseSeed.ts (CNSSE-<code>-<n>). A materiality topic is mapped to a
 * CN-SSE topic by storing `CNSSE-<code>` in its existing `linked_gri_codes`
 * array — so the mapping needs no new column, and Analytics' material-topic
 * coverage (assignment gri_code startsWith linked code) works unchanged.
 */
export type CnSsePillar = 'environment' | 'social' | 'governance'

export interface CnSseTopic {
  code: string
  pillar: CnSsePillar
}

export const CN_SSE_TOPICS: CnSseTopic[] = [
  { code: 'CLIM', pillar: 'environment' },
  { code: 'POL', pillar: 'environment' },
  { code: 'WST', pillar: 'environment' },
  { code: 'BIO', pillar: 'environment' },
  { code: 'ENVC', pillar: 'environment' },
  { code: 'ENE', pillar: 'environment' },
  { code: 'WAT', pillar: 'environment' },
  { code: 'CIR', pillar: 'environment' },
  { code: 'RUR', pillar: 'social' },
  { code: 'SOC', pillar: 'social' },
  { code: 'INN', pillar: 'social' },
  { code: 'ETH', pillar: 'social' },
  { code: 'SUP', pillar: 'social' },
  { code: 'SME', pillar: 'social' },
  { code: 'PRD', pillar: 'social' },
  { code: 'DAT', pillar: 'social' },
  { code: 'EMP', pillar: 'social' },
  { code: 'DD', pillar: 'governance' },
  { code: 'STK', pillar: 'governance' },
  { code: 'ABC', pillar: 'governance' },
  { code: 'AUC', pillar: 'governance' },
]

export const CN_SSE_PILLARS: CnSsePillar[] = ['environment', 'social', 'governance']

const PREFIX = 'CNSSE-'

/** The CN-SSE topic code a materiality topic is mapped to (first match), or null. */
export function cnSseCodeOf(linked: string[] | null | undefined): string | null {
  for (const c of linked ?? []) {
    if (!c.startsWith(PREFIX)) continue
    const code = c.slice(PREFIX.length).split('-')[0]
    if (CN_SSE_TOPICS.some(t => t.code === code)) return code
  }
  return null
}

/** Replace (or clear) the CN-SSE mapping while keeping every other linked code. */
export function withCnSseCode(linked: string[] | null | undefined, code: string | null): string[] {
  const rest = (linked ?? []).filter(c => !(c.startsWith(PREFIX) && CN_SSE_TOPICS.some(t => c.slice(PREFIX.length).split('-')[0] === t.code) && !/-\d+$/.test(c)))
  return code ? [...rest, `${PREFIX}${code}`] : rest
}

/** Canonical (English, stable) topic name used when adding a CN-SSE topic to scope. */
export const cnSseTopicName = (code: string) => `CN-SSE ${code}`
export const isCnSsePresetName = (name: string) => /^CN-SSE [A-Z]+$/.test(name)

/** Category for a CN-SSE pillar in the existing topic_category vocabulary. */
export const pillarCategory: Record<CnSsePillar, string> = {
  environment: 'Environmental',
  social: 'Social',
  governance: 'Governance',
}
