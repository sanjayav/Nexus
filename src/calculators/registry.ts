// Calculator registry — a GRI-line-item-aware dispatcher.
// Each entry declares the inputs a specific question needs, a compute() that
// returns the numeric value in the output unit, and optional methodology notes.
// The DataEntry screen picks the matching calculator (if any) when mode=Calculator.
//
// Matching rule: a descriptor either targets a specific (gri_code, line_item)
// pair, or a gri_code prefix — the first match wins in registry insertion order.

import type { NexusQuestionnaireItem } from '../lib/api'

export interface CalcInput {
  key: string
  label: string
  unit?: string
  hint?: string
  placeholder?: string
  default?: number
  // Optional select — if present, input renders as a dropdown of named factors.
  options?: Array<{ value: string; label: string; factor: number; note?: string }>
}

export type CalcInputValues = Record<string, string>

export interface CalcDescriptor {
  id: string
  title: string
  description: string
  // Output unit is inferred from item.unit, but descriptor can override.
  outputUnitHint?: string
  inputs: CalcInput[]
  compute: (values: CalcInputValues, item: NexusQuestionnaireItem) => number | null
  footnotes?: string[]
  // Match either a specific (gri_code, line_item_contains) or a code prefix.
  matches: (item: NexusQuestionnaireItem) => boolean
}

const IPCC = ['IPCC 2006', 'WRI GHG Protocol', 'ISO 14064', 'Operational control approach']

// ─── Helper: parse inputs safely ───────────────────────────────────
const n = (values: CalcInputValues, key: string): number | null => {
  const v = parseFloat(values[key])
  return Number.isFinite(v) ? v : null
}
const nWithFactor = (values: CalcInputValues, input: CalcInput): number | null => {
  // For option-based inputs the select value stores the option key;
  // look up the factor from the options list.
  if (input.options) {
    const opt = input.options.find(o => o.value === values[input.key])
    return opt ? opt.factor : null
  }
  return n(values, input.key)
}

// ═══════════════════════════════════════════
// Registry
// ═══════════════════════════════════════════

export const CALCULATORS: CalcDescriptor[] = [

  // ── GRI 305-1 Scope 1 — fuel-based ──────────────────────────────
  {
    id: 'scope-1-fuel',
    title: 'Scope 1 — Fuel combustion',
    description: 'Compute direct GHG emissions from stationary or mobile combustion. Emission = Activity × EF × GWP.',
    inputs: [
      {
        key: 'fuel',
        label: 'Fuel type',
        hint: 'Selects the emission factor',
        options: [
          // kg CO2e per TJ — tighter IPCC 2006 values, widely used for refinery/petrochem reporting
          { value: 'natural-gas',  label: 'Natural gas',       factor: 56100, note: 'IPCC 2006 — 56.1 tCO2e/TJ' },
          { value: 'fuel-gas',     label: 'Fuel gas (refinery)', factor: 57600, note: 'IPCC 2006 — 57.6 tCO2e/TJ' },
          { value: 'fuel-oil',     label: 'Fuel oil',           factor: 77400, note: 'IPCC 2006 — 77.4 tCO2e/TJ' },
          { value: 'diesel',       label: 'Diesel',             factor: 74100, note: 'IPCC 2006 — 74.1 tCO2e/TJ' },
          { value: 'lpg',          label: 'LPG',                factor: 63100, note: 'IPCC 2006 — 63.1 tCO2e/TJ' },
          { value: 'naphtha',      label: 'Naphtha',            factor: 73300, note: 'IPCC 2006 — 73.3 tCO2e/TJ' },
        ],
      },
      { key: 'activity', label: 'Activity data', unit: 'TJ', placeholder: 'e.g. 48200', hint: 'Energy content of fuel consumed' },
      { key: 'gwp', label: 'GWP', hint: 'IPCC AR6 default 1 for CO2e factors', default: 1, placeholder: '1' },
    ],
    compute: (v, item) => {
      const factor = nWithFactor(v, CALCULATORS[0].inputs[0]) // kgCO2e / TJ
      const a = n(v, 'activity')
      const g = n(v, 'gwp') ?? 1
      if (factor == null || a == null) return null
      const kg = a * factor * g // kgCO2e
      // If the reporting unit is "Million tons CO2 equivalent", divide by 1e9.
      if (item.unit?.toLowerCase().includes('million')) return kg / 1e9
      if (item.unit?.toLowerCase().startsWith('tons')) return kg / 1000
      return kg
    },
    footnotes: IPCC,
    matches: (i) => i.gri_code === '305-1 (2016)' && i.line_item.toLowerCase().includes('total direct'),
  },

  // ── GRI 305-2 Scope 2 — purchased electricity ───────────────────
  {
    id: 'scope-2-electricity',
    title: 'Scope 2 — Purchased electricity',
    description: 'Compute indirect emissions from purchased electricity. Emission = kWh × Grid EF.',
    inputs: [
      {
        key: 'grid',
        label: 'Grid / procurement method',
        options: [
          // kgCO2e per MWh
          { value: 'th-location', label: 'Thailand — location-based', factor: 487, note: 'TGO 2024 — 0.487 kgCO2/kWh' },
          { value: 'th-market',   label: 'Thailand — market-based (residual)', factor: 498, note: 'TGO 2024 market residual mix' },
          { value: 'rec-backed',  label: 'REC-backed renewable', factor: 0,   note: 'Zero emissions with valid I-REC' },
          { value: 'ppa-solar',   label: 'Corporate PPA — solar', factor: 18,  note: 'Lifecycle EF after PPA' },
        ],
      },
      { key: 'mwh', label: 'Consumption', unit: 'MWh', placeholder: 'e.g. 280000', hint: 'Metered purchased electricity' },
    ],
    compute: (v, item) => {
      const factor = nWithFactor(v, CALCULATORS[1].inputs[0])
      const mwh = n(v, 'mwh')
      if (factor == null || mwh == null) return null
      const kg = mwh * factor
      if (item.unit?.toLowerCase().includes('million')) return kg / 1e9
      if (item.unit?.toLowerCase().startsWith('tons')) return kg / 1000
      return kg
    },
    footnotes: ['Location-based + market-based per GHG Protocol Scope 2 Guidance', 'Thailand grid EF: TGO / EGAT'],
    matches: (i) => i.gri_code === '305-2 (2016)' && i.line_item.toLowerCase().includes('indirect'),
  },

  // ── GRI 305-4 GHG intensity ─────────────────────────────────────
  {
    id: 'ghg-intensity',
    title: 'GHG intensity',
    description: '(Scope 1 + Scope 2) ÷ Production volume.',
    inputs: [
      { key: 'scope1', label: 'Scope 1 emissions', unit: 'Million tons CO2e', placeholder: 'e.g. 5.77' },
      { key: 'scope2', label: 'Scope 2 emissions', unit: 'Million tons CO2e', placeholder: 'e.g. 1.51' },
      { key: 'production', label: 'Production volume', unit: 'Million tons', placeholder: 'e.g. 19.81' },
    ],
    compute: (v) => {
      const s1 = n(v, 'scope1')
      const s2 = n(v, 'scope2')
      const p = n(v, 'production')
      if (s1 == null || s2 == null || p == null || p === 0) return null
      return (s1 + s2) / p // tCO2e / t production
    },
    footnotes: IPCC,
    matches: (i) => i.gri_code === '305-4 (2016)' && i.line_item.toLowerCase().includes('intensity'),
  },

  // ── Injury rates — TRIR, LTIFR, ODR ─────────────────────────────
  {
    id: 'injury-rate',
    title: 'Injury rate (per million manhours)',
    description: 'Standard H&S rate = (Cases × 1,000,000) ÷ Manhours worked.',
    inputs: [
      { key: 'cases', label: 'Recordable cases', placeholder: 'e.g. 2' },
      { key: 'manhours', label: 'Manhours worked', unit: 'hours', placeholder: 'e.g. 18614522' },
    ],
    compute: (v) => {
      const c = n(v, 'cases')
      const h = n(v, 'manhours')
      if (c == null || h == null || h === 0) return null
      return (c * 1_000_000) / h
    },
    footnotes: ['Per GRI 403-9 — rate normalised to 1,000,000 hours worked', 'ILO OSH-MS convention'],
    matches: (i) =>
      (i.gri_code === '403-9 (2018)' || i.gri_code === '403-10 (2018)') &&
      /rate|trir|ltifr|odr/i.test(i.line_item),
  },

  // ── New hire rate, turnover rate ────────────────────────────────
  {
    id: 'workforce-rate',
    title: 'Workforce rate',
    description: '(Events ÷ Total employees) × 100.',
    inputs: [
      { key: 'events', label: 'Events (hires or leavers)', placeholder: 'e.g. 130' },
      { key: 'total', label: 'Total employees', placeholder: 'e.g. 6129' },
    ],
    compute: (v) => {
      const e = n(v, 'events')
      const t = n(v, 'total')
      if (e == null || t == null || t === 0) return null
      return (e / t) * 100
    },
    footnotes: ['GRI 401-1 — new hire and turnover rates'],
    matches: (i) => i.gri_code === '401-1 (2016)' && /rate/i.test(i.line_item),
  },

  // ── Retention rate ──────────────────────────────────────────────
  {
    id: 'retention-rate',
    title: 'Parental leave return rate',
    description: 'Employees still employed 12 months after return ÷ Employees returning × 100.',
    inputs: [
      { key: 'retained', label: 'Employees still employed (12 months)', placeholder: 'e.g. 108' },
      { key: 'returned', label: 'Employees returned from leave', placeholder: 'e.g. 111' },
    ],
    compute: (v) => {
      const r = n(v, 'retained')
      const t = n(v, 'returned')
      if (r == null || t == null || t === 0) return null
      return (r / t) * 100
    },
    footnotes: ['GRI 401-3 return-to-work retention'],
    matches: (i) => i.gri_code === '401-3 (2016)' && /return/i.test(i.line_item),
  },

  // ── Gender pay gap ──────────────────────────────────────────────
  {
    id: 'pay-gap',
    title: 'Gender pay gap',
    description: '(Average female ÷ Average male) × 100. < 100% = women paid less.',
    inputs: [
      { key: 'female', label: 'Average female pay', unit: 'Baht', placeholder: 'e.g. 3283828' },
      { key: 'male',   label: 'Average male pay',   unit: 'Baht', placeholder: 'e.g. 3978498' },
    ],
    compute: (v) => {
      const f = n(v, 'female')
      const m = n(v, 'male')
      if (f == null || m == null || m === 0) return null
      return (f / m) * 100
    },
    footnotes: ['GRI 405-2 — ratio of basic salary and remuneration of women to men'],
    matches: (i) => i.gri_code === '405-2 (2016)' && /gap|ratio/i.test(i.line_item),
  },

  // ── CEO pay ratio ───────────────────────────────────────────────
  {
    id: 'ceo-pay-ratio',
    title: 'CEO pay ratio',
    description: 'Total CEO compensation ÷ median (or mean) employee compensation.',
    inputs: [
      { key: 'ceo', label: 'Total CEO compensation', unit: 'Baht', placeholder: 'e.g. 18882000' },
      { key: 'employee', label: 'Median (or mean) employee compensation', unit: 'Baht', placeholder: 'e.g. 1671000' },
    ],
    compute: (v) => {
      const c = n(v, 'ceo')
      const e = n(v, 'employee')
      if (c == null || e == null || e === 0) return null
      return c / e
    },
    footnotes: ['GRI 2-21 — CEO compensation ratio'],
    matches: (i) => i.gri_code === '2-21 (2021)' && /ratio/i.test(i.line_item),
  },

  // ── Diversity % ─────────────────────────────────────────────────
  {
    id: 'diversity-pct',
    title: 'Diversity percentage',
    description: '(Segment count ÷ Total) × 100.',
    inputs: [
      { key: 'segment', label: 'Segment count (e.g. women)', placeholder: 'e.g. 1685' },
      { key: 'total', label: 'Total group', placeholder: 'e.g. 6129' },
    ],
    compute: (v) => {
      const s = n(v, 'segment')
      const t = n(v, 'total')
      if (s == null || t == null || t === 0) return null
      return (s / t) * 100
    },
    footnotes: ['GRI 405-1 — gender and age diversity'],
    matches: (i) => i.gri_code === '405-1 (2016)' && /%|pct|percentage/i.test(i.unit || ''),
  },

  // ── Energy intensity (302-3) ────────────────────────────────────
  {
    id: 'energy-intensity',
    title: 'Energy intensity',
    description: 'Total energy consumed ÷ Production volume.',
    inputs: [
      { key: 'energy', label: 'Total energy consumed', unit: 'MWh', placeholder: 'e.g. 34987371' },
      { key: 'production', label: 'Production volume', unit: 'Million tons', placeholder: 'e.g. 19.81' },
    ],
    compute: (v) => {
      const e = n(v, 'energy')
      const p = n(v, 'production')
      if (e == null || p == null || p === 0) return null
      return e / (p * 1_000_000) // MWh per ton of production
    },
    footnotes: ['GRI 302-3 — energy intensity ratio'],
    matches: (i) => i.gri_code === '302-3 (2016)',
  },

  // ── Emission intensity (305 sub-rows) ───────────────────────────
  {
    id: 'emission-intensity',
    title: 'Emission intensity',
    description: 'Pollutant mass ÷ Production volume.',
    inputs: [
      { key: 'mass', label: 'Pollutant mass', unit: 'Tons', placeholder: 'e.g. 2712' },
      { key: 'production', label: 'Production volume', unit: 'Million tons', placeholder: 'e.g. 19.81' },
    ],
    compute: (v) => {
      const m = n(v, 'mass')
      const p = n(v, 'production')
      if (m == null || p == null || p === 0) return null
      return m / p
    },
    footnotes: ['Per-million-ton-production intensity'],
    matches: (i) => i.gri_code === '305-7 (2016)' && /intensity/i.test(i.line_item),
  },

  // ── Water recycled % ────────────────────────────────────────────
  {
    id: 'water-recycled-pct',
    title: 'Recycled water share',
    description: '(Water recycled ÷ Total water withdrawal) × 100.',
    inputs: [
      { key: 'recycled', label: 'Water recycled', unit: 'Mega litres', placeholder: 'e.g. 2233' },
      { key: 'withdrawn', label: 'Total water withdrawal', unit: 'Mega litres', placeholder: 'e.g. 56866' },
    ],
    compute: (v) => {
      const r = n(v, 'recycled')
      const w = n(v, 'withdrawn')
      if (r == null || w == null || w === 0) return null
      return (r / w) * 100
    },
    footnotes: ['GRI 303-3 — water recycled and reused'],
    matches: (i) => i.gri_code === '303-3 (2018)' && /recycled.*%|%.*recycled/i.test(i.line_item),
  },

  // ── Water intensity ─────────────────────────────────────────────
  {
    id: 'water-intensity',
    title: 'Water consumption intensity',
    description: 'Net fresh water ÷ Production volume.',
    inputs: [
      { key: 'water', label: 'Net fresh water consumption', unit: 'Million m³', placeholder: 'e.g. 37.76' },
      { key: 'production', label: 'Production volume', unit: 'Million tons', placeholder: 'e.g. 19.81' },
    ],
    compute: (v) => {
      const w = n(v, 'water')
      const p = n(v, 'production')
      if (w == null || p == null || p === 0) return null
      return w / p // m³ / ton
    },
    footnotes: ['GRI 303-5 — water consumption per unit of production'],
    matches: (i) => i.gri_code === '303-3 (2018)' && /intensity/i.test(i.line_item),
  },

  // ── % hazardous waste recycled ──────────────────────────────────
  {
    id: 'hazardous-recycled-pct',
    title: '% hazardous waste recycled',
    description: '(Hazardous diverted ÷ Hazardous generated) × 100.',
    inputs: [
      { key: 'diverted', label: 'Hazardous waste diverted', unit: 'Tons', placeholder: 'e.g. 6371' },
      { key: 'generated', label: 'Hazardous waste generated', unit: 'Tons', placeholder: 'e.g. 44838' },
    ],
    compute: (v) => {
      const d = n(v, 'diverted')
      const g = n(v, 'generated')
      if (d == null || g == null || g === 0) return null
      return (d / g) * 100
    },
    footnotes: ['GRI 306-4 — waste diverted from disposal'],
    matches: (i) => i.gri_code === '306-4 (2020)' && /%.*hazardous/i.test(i.line_item),
  },

  // ── Human Capital ROI ───────────────────────────────────────────
  {
    id: 'hc-roi',
    title: 'Human Capital ROI',
    description: '(Revenue − (Operating expenses − Employee expenses)) ÷ Employee expenses.',
    inputs: [
      { key: 'revenue', label: 'Total revenue', unit: 'Million baht', placeholder: 'e.g. 484907' },
      { key: 'opex',    label: 'Total operating expenses', unit: 'Million baht', placeholder: 'e.g. 501385' },
      { key: 'empex',   label: 'Total employee-related expense', unit: 'Million baht', placeholder: 'e.g. 12244' },
    ],
    compute: (v) => {
      const rev = n(v, 'revenue')
      const op = n(v, 'opex')
      const emp = n(v, 'empex')
      if (rev == null || op == null || emp == null || emp === 0) return null
      return (rev - (op - emp)) / emp
    },
    footnotes: ['GRI 201-1 — Human Capital ROI'],
    matches: (i) => i.gri_code === '201-1 (2016)' && /(roi|human capital)/i.test(i.line_item),
  },
]

/** Find the calculator descriptor that matches this questionnaire item. */
export function findCalculator(item: NexusQuestionnaireItem): CalcDescriptor | null {
  return CALCULATORS.find(c => c.matches(item)) ?? null
}

/** Does this item have a *registered* calculator, not just entry_mode_default = 'Calculator'? */
export function hasCalculator(item: NexusQuestionnaireItem): boolean {
  return CALCULATORS.some(c => c.matches(item))
}
