/**
 * Anomaly headlines/details are rendered from api/_i18n.ts. English output
 * must stay byte-identical to the pre-i18n strings.
 */
import { describe, it, expect } from 'vitest'
import { detectAnomaliesForAssignment, anomalyLabel, type AssignmentLike } from '../../../api/_anomalies'

const base: AssignmentLike = {
  id: 'as1', questionnaire_item_id: 'q1', entity_id: 'e1', entity_name: 'Plant', gri_code: 'GRI 305-1',
  line_item: 'Scope 1', unit: 'tCO2e', value: 2000, response_type: 'numeric', narrative_body: null,
  status: 'approved', evidence_ids: [], due_date: '2026-03-01', last_updated: '2026-03-02T00:00:00Z',
}
const history = [
  { questionnaire_item_id: 'q1', year: 2023, value: 1000, unit: 'tCO2e' },
  { questionnaire_item_id: 'q1', year: 2024, value: 1100 },
  { questionnaire_item_id: 'q1', year: 2025, value: 1200 },
]

describe('anomaly text', () => {
  it('English is unchanged', () => {
    const out = detectAnomaliesForAssignment(base, history)
    const by = Object.fromEntries(out.map(a => [a.anomaly_type, a]))
    expect(by.missing_evidence.headline).toBe('No evidence attached for GRI 305-1')
    expect(by.missing_evidence.detail).toBe('Status is "approved" but no evidence file is on the record. Audit will fail without supporting documentation.')
    expect(by.yoy_spike.headline).toBe('+66.7% vs FY2025')
    expect(by.yoy_spike.detail).toBe('Current 2.00k vs prior year 1.20k — a +66.7% change. Confirm whether this reflects a genuine change (restatement, boundary change, major project) or a data error.')
    expect(by.z_score_outlier.headline).toBe('|z-score| = 9.00 — extreme outlier')
    expect(anomalyLabel('yoy_spike')).toBe('YoY spike')
  })

  it('renders Chinese with code + params for client re-templating', () => {
    const out = detectAnomaliesForAssignment(base, history, undefined, 'zh')
    const by = Object.fromEntries(out.map(a => [a.anomaly_type, a]))
    expect(by.missing_evidence.headline).toBe('GRI 305-1 未附佐证材料')
    expect(by.yoy_spike.headline).toBe('较 2025 财年 +66.7%')
    expect(by.yoy_spike.detail).toMatch(/^本期 2,?000/)
    expect(by.yoy_spike.code).toBe('anomaly.yoy_spike')
    expect(by.yoy_spike.params).toMatchObject({ delta: '+66.7%', year: 2025 })
    expect(anomalyLabel('peer_deviation', 'zh')).toBe('同类偏离')
  })

  it('late submission pluralises in English', () => {
    const late = { ...base, status: 'submitted', evidence_ids: ['x'], due_date: '2026-03-01', last_updated: '2026-03-02T00:00:00Z' }
    const a = detectAnomaliesForAssignment(late, []).find(x => x.anomaly_type === 'late_submission')!
    expect(a.headline).toBe('Submitted 1 day after due date')
    const zh = detectAnomaliesForAssignment(late, [], undefined, 'zh').find(x => x.anomaly_type === 'late_submission')!
    expect(zh.headline).toBe('逾期 1 天提交')
  })
})
