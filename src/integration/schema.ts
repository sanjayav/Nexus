// Shared types for integrating external systems (ERP, HR, energy, procurement)
// into the reporting dashboard. This is the foundation for a governed ingestion
// pipeline that can be backed by real APIs later.

export type ESGFramework = 'GRI' | 'IFRS-S1' | 'IFRS-S2' | 'MSX'

export type Scope = 'Scope1' | 'Scope2' | 'Scope3'

export type DisclosureId = string

export type EvidenceStatus = 'anchored' | 'pending review' | 'missing'

export interface EvidenceFile {
  id: string
  name: string
  type: string
  status: EvidenceStatus
  owner?: string
  addedAt?: string | null
  url?: string
}

export interface DisclosureMeta {
  id: DisclosureId
  framework: ESGFramework
  code: string
  title: string
  moduleId: string
  status: 'Draft' | 'In Review' | 'Approved' | 'Anchored'
  owner: string
  dueDate?: string | null
  material: boolean
  tags: string[]
  completion: {
    required: number
    answered: number
  }
  evidence: {
    linked: number
    missing: number
  }
  validation: {
    warnings: number
    errors: number
  }
}

// Normalised quantitative breakdown row for emissions / numeric KPIs.
export interface NumericBreakdownRow {
  id: string
  disclosureId: DisclosureId
  scope?: Scope
  category: string
  gas?: string[]
  activityValue: number
  activityUnit: string
  emissionFactorValue?: number
  emissionFactorUnit?: string
  emissionFactorReference?: string
  calculatedValue?: number
  calculatedUnit?: string
  group?: string // BU / Site / Asset
  uncertainty?: number | null
  evidenceId?: string | null
  notes?: string | null
}

export interface KPIValue {
  id: string
  disclosureId: DisclosureId
  name: string
  value: number
  unit: string
  year: string
  yoyChangePercent?: number
  baselineYear?: string
}

// Example interface for an ingestion payload coming from an external system.
// This can be used to build real adaptors later (e.g., map from ERP exports).
export interface ExternalScope1Payload {
  periodId: string
  entityId: string
  disclosureId: DisclosureId
  rows: Array<{
    sourceCategory: string
    gas: string[]
    activity: {
      value: number
      unit: string
    }
    emissionFactor: {
      value: number
      unit: string
      reference: string
    }
    group?: string
    uncertaintyPercent?: number
    evidenceExternalId?: string
    notes?: string
  }>
}

// Normaliser example – takes an external payload and shapes it into the
// internal table-ready format. This does not touch UI; it just guarantees
// consistent structure for the rest of the app.
export function normaliseScope1Payload(
  payload: ExternalScope1Payload
): NumericBreakdownRow[] {
  return payload.rows.map((row, index) => {
    const activityValue = row.activity.value
    const emissionFactorValue = row.emissionFactor.value
    const isKgBased = row.emissionFactor.unit.toLowerCase().includes('kg')

    const totalKg = activityValue * emissionFactorValue
    const calculatedValue = isKgBased ? totalKg / 1000 : totalKg

    return {
      id: `${payload.disclosureId}-${index + 1}`,
      disclosureId: payload.disclosureId,
      scope: 'Scope1',
      category: row.sourceCategory,
      gas: row.gas,
      activityValue: row.activity.value,
      activityUnit: row.activity.unit,
      emissionFactorValue: row.emissionFactor.value,
      emissionFactorUnit: row.emissionFactor.unit,
      emissionFactorReference: row.emissionFactor.reference,
      calculatedValue: Number(calculatedValue.toFixed(2)),
      calculatedUnit: 'tCO2e',
      group: row.group,
      uncertainty: row.uncertaintyPercent ?? null,
      evidenceId: row.evidenceExternalId ?? null,
      notes: row.notes ?? null,
    }
  })
}



