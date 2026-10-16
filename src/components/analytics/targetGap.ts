import type { OrgTarget } from '../../lib/orgStore'

/**
 * Target-gap maths shared by Analytics and Climate Targets (pure, tested).
 *
 * Pathway: straight line from the baseline value in the baseline year to the
 * target value in the target year. Actuals: real yearly totals (only the
 * scopes the target covers). The gap is measured at the latest actual year.
 */
export interface YearValue { year: number; value: number }

export interface GapRow {
  year: number
  pathway: number
  /** Actual total for the year, null when none recorded. */
  actual: number | null
  /** [pathway, max(pathway, actual)] across the span of recorded actuals — the risk band (zero-width where on track). */
  band: [number, number] | null
}

export interface TargetGap {
  target: OrgTarget
  baseline: number
  targetValue: number
  rows: GapRow[]
  /** Latest year with an actual (null when there are no actuals beyond the baseline). */
  latestYear: number | null
  latest: number | null
  /** Expected value on the pathway at `latestYear`. */
  expected: number | null
  /** latest − expected; positive = above (behind) the pathway. */
  gap: number | null
  /** Required average annual abatement from the latest actual to the target. */
  requiredAnnual: number | null
  yearsRemaining: number
  onTrack: boolean | null
}

/** Which scopes a stored `scope_coverage` label covers ("Scope 1+2", "Scope 3 only", …). */
export function scopesCovered(coverage: string | null | undefined): Array<1 | 2 | 3> {
  const s = (coverage ?? '').toLowerCase()
  const out = new Set<1 | 2 | 3>()
  const m = s.match(/[123]/g)
  if (m) for (const d of m) out.add(Number(d) as 1 | 2 | 3)
  return out.size ? [...out].sort() as Array<1 | 2 | 3> : [1, 2, 3]
}

export function computeTargetGap(target: OrgTarget, actuals: YearValue[], now = new Date().getFullYear()): TargetGap {
  const baseline = Number(target.baseline_value) || 0
  const pct = Number(target.target_reduction_pct) || 0
  const by = Number(target.baseline_year)
  const ty = Math.max(Number(target.target_year), by + 1)
  const targetValue = baseline * (1 - pct / 100)
  const span = ty - by
  const pathwayAt = (y: number) => baseline - (baseline - targetValue) * ((y - by) / span)

  const byYear = new Map<number, number>()
  for (const a of actuals) {
    if (Number.isFinite(a.value) && a.year >= by && a.year <= ty) byYear.set(a.year, a.value)
  }
  if (!byYear.has(by) && baseline > 0) byYear.set(by, baseline)

  // Known actual years, ascending — the band follows the actual line between
  // them (linear, as drawn) and is clamped to the pathway where actuals sit below.
  const known = [...byYear.keys()].sort((a, b) => a - b)
  const interp = (y: number): number | null => {
    if (byYear.has(y)) return byYear.get(y)!
    let lo: number | null = null, hi: number | null = null
    for (const k of known) { if (k < y) lo = k; else if (k > y && hi == null) hi = k }
    if (lo == null || hi == null) return null
    const a = byYear.get(lo)!, b = byYear.get(hi)!
    return a + (b - a) * ((y - lo) / (hi - lo))
  }
  const rows: GapRow[] = []
  for (let y = by; y <= ty; y++) {
    const p = pathwayAt(y)
    const a = byYear.has(y) ? byYear.get(y)! : null
    const ai = interp(y)
    rows.push({ year: y, pathway: p, actual: a, band: ai != null && known.length > 1 ? [p, Math.max(p, ai)] : null })
  }

  const actualYears = [...byYear.keys()].filter(y => y > by).sort((a, b) => b - a)
  const latestYear = actualYears[0] ?? null
  const latest = latestYear != null ? byYear.get(latestYear)! : null
  const expected = latestYear != null ? pathwayAt(latestYear) : null
  const gap = latest != null && expected != null ? latest - expected : null
  const from = latestYear ?? now
  const yearsRemaining = Math.max(0, ty - Math.max(from, now))
  const requiredAnnual = latest != null
    ? (ty - latestYear! > 0 ? Math.max(0, (latest - targetValue) / (ty - latestYear!)) : 0)
    : null

  return {
    target, baseline, targetValue, rows, latestYear, latest, expected, gap, requiredAnnual, yearsRemaining,
    onTrack: gap == null ? null : gap <= 0,
  }
}
