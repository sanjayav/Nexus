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
 */

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
  headline: string          // one-line for the feed
  detail: string            // why we flagged it, human readable
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
function fmtNum(x: number | null | undefined): string {
  if (x == null || !isFinite(x)) return '—'
  if (Math.abs(x) >= 1_000_000) return (x / 1_000_000).toFixed(2) + 'M'
  if (Math.abs(x) >= 1_000) return (x / 1_000).toFixed(2) + 'k'
  return x.toFixed(2)
}

/** Run all rules on one assignment against its historical trail. */
export function detectAnomaliesForAssignment(
  a: AssignmentLike,
  history: HistoricalPoint[],
  peerIntensities?: number[]
): Anomaly[] {
  const out: Anomaly[] = []
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
        headline: `No evidence attached for ${a.gri_code}`,
        detail: `Status is "${a.status}" but no evidence file is on the record. Audit will fail without supporting documentation.`,
      }))
    }
  }

  if (a.response_type === 'narrative' && a.status === 'approved' && (!a.narrative_body || a.narrative_body.trim().length === 0)) {
    out.push(mkAnomaly({
      ...base,
      anomaly_type: 'narrative_gap',
      severity: 'critical',
      headline: `Narrative approved but empty — ${a.gri_code}`,
      detail: 'Disclosure marked approved with no narrative body. This will not appear in the published report.',
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
        headline: `Submitted ${daysLate} day${daysLate !== 1 ? 's' : ''} after due date`,
        detail: `Due ${a.due_date.slice(0, 10)}, submitted ${new Date(a.last_updated).toISOString().slice(0, 10)}. Track for process improvement.`,
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
      headline: `Unit changed: "${priorUnit}" → "${a.unit}"`,
      detail: `Historical filings used "${priorUnit}" for this disclosure. Current entry uses "${a.unit}". Confirm unit conversion was applied.`,
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
        headline: `${fmtPct(delta)} vs FY${latestPrior.year}`,
        detail: `Current ${fmtNum(a.value)} vs prior year ${fmtNum(latestPrior.value)} — a ${fmtPct(delta)} change. Confirm whether this reflects a genuine change (restatement, boundary change, major project) or a data error.`,
      }))
    } else if (abs >= YOY_WARN_THRESHOLD) {
      out.push(mkAnomaly({
        ...base,
        anomaly_type: 'yoy_spike',
        severity: 'warn',
        headline: `${fmtPct(delta)} vs FY${latestPrior.year}`,
        detail: `Current ${fmtNum(a.value)} vs prior year ${fmtNum(latestPrior.value)}. Variance above the 20% review threshold — recommend a short justification.`,
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
        headline: `${ratio.toFixed(1)}× vs historical average`,
        detail: `Current ${fmtNum(a.value)} is ${ratio.toFixed(1)}× the 4yr average (${fmtNum(priorAvg)}). Often indicates a unit typo (tonnes vs kg, m³ vs litres).`,
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
          headline: `|z-score| = ${abs.toFixed(2)} — extreme outlier`,
          detail: `Value sits ${abs.toFixed(2)} standard deviations from the ${series.length}-year mean of ${fmtNum(priorAvg)} (σ=${fmtNum(sd)}). Extremely unlikely without a structural change.`,
        }))
      } else if (abs >= Z_WARN) {
        out.push(mkAnomaly({
          ...base,
          anomaly_type: 'z_score_outlier',
          severity: 'warn',
          headline: `|z-score| = ${abs.toFixed(2)}`,
          detail: `${abs.toFixed(2)}σ from the ${series.length}-year mean. Worth a sanity check.`,
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
        headline: `Breaks a 3-year rising trend`,
        detail: `Previous 3 years rose monotonically. Current value (${fmtNum(a.value)}) reverses the trend. Good news if genuine — worth narrating.`,
      }))
    } else if (falling && a.value > last3[2] * 1.1) {
      out.push(mkAnomaly({
        ...base,
        anomaly_type: 'trend_break',
        severity: 'warn',
        headline: `Breaks a 3-year downward trend`,
        detail: `Previous 3 years fell monotonically. Current (${fmtNum(a.value)}) reverses the trend upward. Usually worth explaining.`,
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
          headline: `${z > 0 ? 'Higher' : 'Lower'} than peer plants (z=${z.toFixed(2)})`,
          detail: `Value sits ${Math.abs(z).toFixed(2)}σ from the peer plant mean (${fmtNum(peerMean)}). May reflect a real operating difference or a reporting boundary mismatch.`,
        }))
      }
    }
  }

  return out
}

/** Pretty-print label for an anomaly type. */
export function anomalyLabel(t: AnomalyType): string {
  switch (t) {
    case 'yoy_spike': return 'YoY spike'
    case 'magnitude_jump': return 'Magnitude jump'
    case 'z_score_outlier': return 'Statistical outlier'
    case 'trend_break': return 'Trend break'
    case 'unit_change': return 'Unit change'
    case 'missing_evidence': return 'Missing evidence'
    case 'late_submission': return 'Late submission'
    case 'narrative_gap': return 'Narrative gap'
    case 'peer_deviation': return 'Peer deviation'
  }
}
