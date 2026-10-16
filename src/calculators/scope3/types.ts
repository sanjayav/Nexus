// Scope 3 calculator registry — one entry per GHG Protocol Scope 3 category (1–15).
// Each calculator declares 1+ "methods" (e.g. supplier-specific, activity-based,
// spend-based). The UI lets the user pick a method, fills the declared inputs,
// then runs `compute(inputs, ctx)` to produce a tCO2e result. Spend-based factors
// are illustrative averages until USEEIO v2.0 / EXIOBASE is wired in.

export type Scope3InputType = 'number' | 'select' | 'text'

export interface Scope3Input {
  key: string
  label: string
  unit?: string
  type: Scope3InputType
  required?: boolean
  options?: string[]
  default?: string | number
  hint?: string
}

export interface EmissionFactorRow {
  scope: 1 | 2 | 3
  category?: string
  fuel_or_activity?: string
  region?: string
  unit?: string
  co2e_per_unit: number
  source?: string
  source_version?: string
  notes?: string
}

export interface Scope3ComputeContext {
  /** Fetch a single EF row from the platform DB (`/api/emission-factors`). */
  lookupEF: (q: {
    scope: 1 | 2 | 3
    category?: string
    fuel_or_activity?: string
    region?: string
  }) => Promise<EmissionFactorRow>
}

export interface Scope3MethodResult {
  co2e_tonnes: number
  ef_used?: EmissionFactorRow | null
  breakdown?: Record<string, number | string>
  notes?: string
}

export interface Scope3Method {
  id: string
  name: string
  priority: number
  inputs: Scope3Input[]
  compute: (
    inputs: Record<string, string | number>,
    ctx: Scope3ComputeContext,
  ) => Promise<Scope3MethodResult> | Scope3MethodResult
  notes?: string
}

export interface Scope3Calculator {
  id: string
  category: number
  name: string
  shortName: string
  description: string
  methods: Scope3Method[]
}
