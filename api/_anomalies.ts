/**
 * Anomaly detection engine.
 *
 * Every rule here is one an auditor would actually run. No AI hype — just
 * statistically sound and well-established industry checks:
 *
 *   · yoy_spike           |delta vs prior year| above threshold
 *   · magnitude_jump      order-of-magnitude change — flags unit typos
 *   · z_score_outlier     value outside N standard deviations of the 4yr mean
 *   · trend_break         value reverses a 3-year monotonic direction
 *   · unit_change         unit string differs from the historical unit
 *   · missing_evidence    submitted/reviewed numeric entry with no evidence
 *   · late_submission     submitted after its due_date
 *   · narrative_gap       approved narrative with empty narrative_body
 *   · peer_deviation      plant's intensity deviates from sibling plants
 *
 * Severity:
 *   info      — worth noting, not actionable
 *   warn      — reviewer should look
 *   critical  — almost certainly an error / data integrity problem
 *
 * Output is a flat list. Consumers group/filter as they see fit.
 *
 * Language: `headline` / `detail` are rendered from api/_i18n.ts in the
 * requested locale (default 'en', identical to the pre-i18n English text).
 * Each anomaly also carries `code` (the dictionary key prefix) and `params`
 * so a client can re-template in its own language.
 */
import { t, intlTag, type Locale, type MessageParams } from './_i18n.js'

export type AnomalySeverity = 'info' | 'warn' | 'critical'

export type AnomalyType =
  | 'yoy_spike'
  | 'magnitude_jump'
  | 'z_score_outlier'
  | 'trend_break'
  | 'unit_change'
  | 'missing_evidence'
  | 'late_submission'
  | 'narrative_gap'
  | 'peer_deviation'

export interface Anomaly {
  id: string                // deterministic: assignment_id + '|' + type
  assignment_id: string
  entity_id: string
  entity_name: string
  gri_code: string
  line_item: string
  anomaly_type: AnomalyType
  severity: AnomalySeverity
  headline: string          // one-line for the feed (rendered in the requested locale)
  detail: string            // why we flagged it, human readable
  code?: string             // i18n key prefix, e.g. 'anomaly.yoy_spike'
  params?: MessageParams    // interpolation values for headline/detail
  current: number | null
  prior: number | null
  prior_year: number | null
  delta_pct: number | null
  z_score: number | null
  status: string
  due_date: string | null
  last_updated: string | null
  // suppression info (filled when joined)
  suppressed?: { by: string; reason: string; at: string }
}

export interface AssignmentLike {
  id: string
  questionnaire_item_id: string
  entity_id: string
  entity_name: string
  gri_code: string
  line_item: string
  unit: string | null
  value: number | null
  response_type: string | null
  narrative_body: string | null
  status: string
  evidence_ids: string[] | null
  due_date: string | null
  submitted_at?: string | null
  last_updated: string | null
}

export interface HistoricalPoint {
  questionnaire_item_id: string
  year: number
  value: number
  unit?: string | null
}

// ─── Detection rules ─────────────────────────────────────────

const YOY_WARN_THRESHOLD = 0.20   // 20%
const YOY_CRIT_THRESHOLD = 0.50   // 50%
const Z_WARN = 2
const Z_CRIT = 3

function mkAnomaly(partial: Omit<Anomaly, 'id'>): Anomaly {
  return { id: `${partial.assignment_id}|${partial.anomaly_type}`, ...partial }
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}
function stddev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)
  return Math.sqrt(v)
}

function fmtPct(x: number): string {
  const s = (x * 100).toFixed(1)
  return (x > 0 ? '+' : '') + s + '%'
}
function fmtNum(x: number | null | undefined, locale: Locale = 'en'): string {
  if (x == null || !isFinite(x)) return '—'
  if (locale !== 'en') {
    // zh → 万/亿, th → native compact forms.
    return new Intl.NumberFormat(intlTag(locale), { notation: 'compact', maximumFractionDigits: 2 }).format(x)
  }
  if (Math.abs(x) >= 1_000_000) return (x / 1_000_000).toFixed(2) + 'M'
  if (Math.abs(x) >= 1_000) return (x / 1_000).toFixed(2) + 'k'
  return x.toFixed(2)
}

/** Run all rules on one assignment against its historical trail. */
export function detectAnomaliesForAssignment(
  a: AssignmentLike,
  history: HistoricalPoint[],
  peerIntensities?: number[],
  locale: Locale = 'en',
): Anomaly[] {
  const out: Anomaly[] = []
  const num = (x: number | null | undefined) => fmtNum(x, locale)
  /** headline/detail from the dictionary + code/params for client re-templating. */
  const msg = (code: string, headlineKey: string, detailKey: string, params: MessageParams) => ({
    headline: t(locale, `${code}.${headlineKey}`, params),
    detail: t(locale, `${code}.${detailKey}`, params),
    code,
    params,
  })
  const base = {
    assignment_id: a.id,
    entity_id: a.entity_id,
    entity_name: a.entity_name,
    gri_code: a.gri_code,
    line_item: a.line_item,
    status: a.status,
    due_date: a.due_date ?? null,
    last_updated: a.last_updated ?? null,
    current: a.value ?? null,
    prior: null as number | null,
    prior_year: null as number | null,
    delta_pct: null as number | null,
    z_score: null as number | null,
  }

  // ── Rules that don't need history ────────────────────────
  if (a.response_type !== 'narrative' && a.value != null) {
    const missing = (a.evidence_ids == null || a.evidence_ids.length === 0) && (a.status === 'submitted' || a.status === 'reviewed' || a.status === 'approved')
    if (missing) {
      out.push(mkAnomaly({
        ...base,
        anomaly_type: 'missing_evidence',
        severity: a.status === 'approved' ? 'critical' : 'warn',
        ...msg('anomaly.missing_evidence', 'headline', 'detail', { code: a.gri_code, status: a.status }),
      }))
    }
  }

  if (a.response_type === 'narrative' && a.status === 'approved' && (!a.narrative_body || a.narrative_body.trim().length === 0)) {
    out.push(mkAnomaly({
      ...base,
      anomaly_type: 'narrative_gap',
      severity: 'critical',
      ...msg('anomaly.narrative_gap', 'headline', 'detail', { code: a.gri_code }),
    }))
  }

  if (a.due_date && a.last_updated && a.status === 'submitted') {
    const due = new Date(a.due_date).getTime()
    const sub = new Date(a.last_updated).getTime()
    if (sub > due) {
      const daysLate = Math.round((sub - due) / (24 * 3600 * 1000))
      out.push(mkAnomaly({
        ...base,
        anomaly_type: 'late_submission',
        severity: daysLate > 14 ? 'warn' : 'info',
        ...msg('anomaly.late_submission', 'headline', 'detail', {
          count: daysLate,
          due: a.due_date.slice(0, 10),
          submitted: new Date(a.last_updated).toISOString().slice(0, 10),
        }),
      }))
    }
  }

  // ── Numeric rules — need a value and history ─────────────
  if (a.value == null || a.response_type === 'narrative') return out

  const series = history
    .filter(h => h.value != null && isFinite(Number(h.value)))
    .map(h => ({ year: h.year, value: Number(h.value) }))
    .sort((a, b) => a.year - b.year)

  // Unit-change rule (only when history has a unit at all)
  const priorUnit = history.find(h => h.unit)?.unit
  if (priorUnit && a.unit && priorUnit.trim().toLowerCase() !== a.unit.trim().toLowerCase()) {
    out.push(mkAnomaly({
      ...base,
      anomaly_type: 'unit_change',
      severity: 'warn',
      ...msg('anomaly.unit_change', 'headline', 'detail', { from: priorUnit, to: a.unit }),
    }))
  }

  if (series.length === 0) return out

  const latestPrior = series[series.length - 1]
  base.prior = latestPrior.value
  base.prior_year = latestPrior.year

  // YoY spike
  if (latestPrior.value !== 0) {
    const delta = (a.value - latestPrior.value) / Math.abs(latestPrior.value)
    base.delta_pct = delta
    const abs = Math.abs(delta)
    if (abs >= YOY_CRIT_THRESHOLD) {
      out.push(mkAnomaly({
        ...base,
        anomaly_type: 'yoy_spike',
        severity: 'critical',
        ...msg('anomaly.yoy_spike', 'headline', 'detail_critical', {
          delta: fmtPct(delta), year: latestPrior.year, current: num(a.value), prior: num(latestPrior.value),
        }),
      }))
    } else if (abs >= YOY_WARN_THRESHOLD) {
      out.push(mkAnomaly({
        ...base,
        anomaly_type: 'yoy_spike',
        severity: 'warn',
        ...msg('anomaly.yoy_spike', 'headline', 'detail_warn', {
          delta: fmtPct(delta), year: latestPrior.year, current: num(a.value), prior: num(latestPrior.value),
        }),
      }))
    }
  }

  // Magnitude jump — specifically catches unit-typo errors (×10, ÷10)
  const priorAvg = mean(series.map(p => p.value))
  if (priorAvg > 0 && a.value > 0) {
    const ratio = a.value / priorAvg
    if (ratio >= 8 || ratio <= 0.125) {
      out.push(mkAnomaly({
        ...base,
        anomaly_type: 'magnitude_jump',
        severity: 'critical',
        ...msg('anomaly.magnitude_jump', 'headline', 'detail', {
          ratio: ratio.toFixed(1), current: num(a.value), avg: num(priorAvg),
        }),
      }))
    }
  }

  // Z-score outlier (needs ≥3 history points)
  if (series.length >= 3) {
    const sd = stddev(series.map(p => p.value))
    if (sd > 0) {
      const z = (a.value - priorAvg) / sd
      base.z_score = z
      const abs = Math.abs(z)
      if (abs >= Z_CRIT) {
        out.push(mkAnomaly({
          ...base,
          anomaly_type: 'z_score_outlier',
          severity: 'critical',
          ...msg('anomaly.z_score_outlier', 'headline_critical', 'detail_critical', {
            z: abs.toFixed(2), years: series.length, avg: num(priorAvg), sd: num(sd),
          }),
        }))
      } else if (abs >= Z_WARN) {
        out.push(mkAnomaly({
          ...base,
          anomaly_type: 'z_score_outlier',
          severity: 'warn',
          ...msg('anomaly.z_score_outlier', 'headline_warn', 'detail_warn', {
            z: abs.toFixed(2), years: series.length,
          }),
        }))
      }
    }
  }

  // Trend break — values monotonically rose or fell for 3+ years and current reverses by >10%
  if (series.length >= 3) {
    const last3 = series.slice(-3).map(p => p.value)
    const rising = last3[0] < last3[1] && last3[1] < last3[2]
    const falling = last3[0] > last3[1] && last3[1] > last3[2]
    if (rising && a.value < last3[2] * 0.9) {
      out.push(mkAnomaly({
        ...base,
        anomaly_type: 'trend_break',
        severity: 'info',
        ...msg('anomaly.trend_break', 'headline_rising', 'detail_rising', { current: num(a.value) }),
      }))
    } else if (falling && a.value > last3[2] * 1.1) {
      out.push(mkAnomaly({
        ...base,
        anomaly_type: 'trend_break',
        severity: 'warn',
        ...msg('anomaly.trend_break', 'headline_falling', 'detail_falling', { current: num(a.value) }),
      }))
    }
  }

  // Peer deviation — only meaningful when we have sibling plants for the same code
  if (peerIntensities && peerIntensities.length >= 3) {
    const peerMean = mean(peerIntensities)
    const peerSd = stddev(peerIntensities)
    if (peerSd > 0) {
      const z = (a.value - peerMean) / peerSd
      if (Math.abs(z) >= 2) {
        out.push(mkAnomaly({
          ...base,
          anomaly_type: 'peer_deviation',
          severity: 'warn',
          ...msg('anomaly.peer_deviation', z > 0 ? 'headline_higher' : 'headline_lower', 'detail', {
            z: z.toFixed(2), absz: Math.abs(z).toFixed(2), avg: num(peerMean),
          }),
        }))
      }
    }
  }

  return out
}

/** Pretty-print label for an anomaly type, in `locale` (default English). */
export function anomalyLabel(type: AnomalyType, locale: Locale = 'en'): string {
  return t(locale, `anomaly.label.${type}`)
}
