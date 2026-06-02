import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Save, Loader2, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import type { PcafAssetCalculator, PcafInput, PcafResult } from '../../calculators/pcaf'
import { pcaf as pcafApi, type PcafAssetClass, type PcafCalculateResponse } from '../../lib/api'

/**
 * Per-asset PCAF calculator panel.
 *
 * Renders the calculator's declared inputs, runs the pure `compute()` on
 * every keystroke for live preview, and (when the user clicks Save) sends
 * a POST /api/pcaf/assets to persist the row.
 *
 * Inputs are persisted to localStorage keyed by calculator id so a session
 * refresh doesn't lose work in progress.
 */
interface Props {
  calculator: PcafAssetCalculator
  reportingYear: number
  onSaved?: () => void
}

const STORAGE_KEY = (id: string) => `aeiforo_pcaf_inputs_${id}`

export default function AssetCalculator({ calculator, reportingYear, onSaved }: Props) {
  const [inputs, setInputs] = useState<Record<string, string | boolean>>(() => loadInputs(calculator))
  const [serverResult, setServerResult] = useState<PcafCalculateResponse | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Persist inputs on every change (session resilience).
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY(calculator.id), JSON.stringify(inputs))
    } catch { /* quota — ignore */ }
  }, [inputs, calculator.id])

  // Live client-side compute for instant feedback.
  const clientResult = useMemo<PcafResult>(() => {
    const numericInputs: Record<string, unknown> = {}
    for (const k of Object.keys(inputs)) {
      const v = inputs[k]
      if (typeof v === 'boolean') numericInputs[k] = v
      else if (v === '') numericInputs[k] = undefined
      else {
        const asNum = Number(v)
        numericInputs[k] = Number.isFinite(asNum) && /^-?\d/.test(String(v)) ? asNum : v
      }
    }
    try {
      return calculator.compute(numericInputs)
    } catch {
      return {
        attributionFactor: 0,
        financedTotal: 0,
        dataQualityScore: 5,
        rationale: 'Awaiting inputs',
        warnings: [],
      }
    }
  }, [calculator, inputs])

  const setField = (key: string, v: string | boolean) => {
    setInputs(prev => ({ ...prev, [key]: v }))
    setServerResult(null)
    setSaved(false)
  }

  const runServer = async () => {
    setServerError(null)
    try {
      const payload: Record<string, unknown> = {}
      for (const k of Object.keys(inputs)) {
        const v = inputs[k]
        if (typeof v === 'boolean') payload[k] = v
        else if (v === '' || v == null) continue
        else {
          const asNum = Number(v)
          payload[k] = Number.isFinite(asNum) && /^-?\d/.test(String(v)) ? asNum : v
        }
      }
      const r = await pcafApi.calculate({
        assetClass: calculator.assetClass as PcafAssetClass,
        inputs: payload,
        reportingYear,
      })
      setServerResult(r)
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Server compute failed')
    }
  }

  const save = async () => {
    setSaving(true)
    setServerError(null)
    try {
      const counterpartyName = String(inputs.counterpartyName ?? '').trim()
      if (!counterpartyName) {
        setServerError('Counterparty / borrower name is required')
        return
      }
      const outstanding = Number(inputs.outstandingAmount ?? 0)
      if (!(outstanding > 0)) {
        setServerError('Outstanding amount must be > 0')
        return
      }
      const reported = Number(inputs.reportedEmissions ?? 0) > 0 || Number(inputs.measuredAnnualEmissions ?? 0) > 0 || Number(inputs.reportedCountryEmissionsMt ?? 0) > 0
      await pcafApi.createAsset({
        reportingYear,
        assetClass: calculator.assetClass as PcafAssetClass,
        counterpartyName,
        counterpartySector: inputs.counterpartySector ? String(inputs.counterpartySector) : undefined,
        counterpartyCountry: inputs.counterpartyCountry ? String(inputs.counterpartyCountry) : undefined,
        outstandingAmount: outstanding,
        totalValue: pickTotalValue(inputs, calculator.assetClass as PcafAssetClass),
        totalValueBasis: pickTotalValueBasis(calculator.assetClass as PcafAssetClass),
        attributionFactor: clientResult.attributionFactor,
        reportedEmissionsScope1: Number(inputs.reportedEmissionsScope1 ?? 0) || undefined,
        reportedEmissionsScope2: Number(inputs.reportedEmissionsScope2 ?? 0) || undefined,
        reportedEmissionsScope3: Number(inputs.reportedScope3 ?? 0) || undefined,
        emissionsBasis: reported ? 'reported' : 'economic_estimate',
        financedEmissionsScope1: clientResult.financedScope1,
        financedEmissionsScope2: clientResult.financedScope2,
        financedEmissionsScope3: clientResult.financedScope3,
        financedEmissionsTotal: clientResult.financedTotal,
        dataQualityScore: clientResult.dataQualityScore,
        dataQualityRationale: clientResult.rationale,
      })
      setSaved(true)
      onSaved?.()
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const previewResult: PcafResult | PcafCalculateResponse = serverResult ?? clientResult

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5">
      <header className="mb-4">
        <h3 className="text-[var(--text-lg)] font-semibold text-[var(--text-primary)]">{calculator.name}</h3>
        <p className="text-[var(--text-sm)] text-[var(--text-secondary)] mt-1">{calculator.description}</p>
        <a
          href={calculator.methodologyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--color-brand)] mt-1"
        >
          PCAF methodology <ExternalLink className="w-3 h-3" />
        </a>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {calculator.inputs.map(field => (
          <Field
            key={field.key}
            field={field}
            value={inputs[field.key]}
            onChange={v => setField(field.key, v)}
          />
        ))}
      </div>

      <ResultPanel result={previewResult} />

      {previewResult.warnings && previewResult.warnings.length > 0 && (
        <div className="mt-3 rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-200">
          <div className="flex items-center gap-1 font-medium mb-1"><AlertTriangle className="w-3.5 h-3.5" /> Warnings</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {previewResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {serverError && (
        <div className="mt-3 rounded-[var(--radius-md)] border border-rose-500/40 bg-rose-500/10 p-3 text-[12px] text-rose-200">
          {serverError}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={runServer}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] hover:bg-[var(--bg-secondary)] text-[var(--text-sm)]"
        >
          <Info className="w-3.5 h-3.5" /> Verify server compute
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white font-medium hover:opacity-90 disabled:opacity-50 text-[var(--text-sm)]"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Saved' : saving ? 'Saving' : 'Save asset'}
        </button>
      </div>
    </div>
  )
}

function loadInputs(calculator: PcafAssetCalculator): Record<string, string | boolean> {
  if (typeof window === 'undefined') return seedDefaults(calculator)
  try {
    const raw = localStorage.getItem(STORAGE_KEY(calculator.id))
    if (raw) return JSON.parse(raw) as Record<string, string | boolean>
  } catch { /* fall through */ }
  return seedDefaults(calculator)
}

function seedDefaults(calculator: PcafAssetCalculator): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {}
  for (const f of calculator.inputs) {
    if (f.default !== undefined) {
      out[f.key] = typeof f.default === 'boolean' ? f.default : String(f.default)
    } else if (f.type === 'boolean') {
      out[f.key] = false
    } else {
      out[f.key] = ''
    }
  }
  return out
}

function pickTotalValue(inputs: Record<string, string | boolean>, ac: PcafAssetClass): number | undefined {
  const tryNum = (k: string) => {
    const v = inputs[k]
    if (typeof v === 'string' && v !== '') {
      const n = Number(v)
      return Number.isFinite(n) ? n : undefined
    }
    return undefined
  }
  switch (ac) {
    case 'listed_equity':
    case 'corporate_bond': return tryNum('evic')
    case 'business_loan': return (tryNum('borrowerEquity') ?? 0) + (tryNum('borrowerDebt') ?? 0) || undefined
    case 'unlisted_equity': return (tryNum('investeeEquity') ?? 0) + (tryNum('investeeDebt') ?? 0) || undefined
    case 'project_finance': return (tryNum('projectEquity') ?? 0) + (tryNum('projectDebt') ?? 0) || undefined
    case 'commercial_real_estate':
    case 'mortgage': return tryNum('propertyValue')
    case 'motor_vehicle_loan': return tryNum('vehicleValue')
    case 'sovereign_debt': {
      const gdp = tryNum('gdpPppMillions')
      return gdp != null ? gdp * 1_000_000 : undefined
    }
  }
}

function pickTotalValueBasis(ac: PcafAssetClass): string {
  switch (ac) {
    case 'listed_equity':
    case 'corporate_bond': return 'EVIC'
    case 'business_loan':
    case 'unlisted_equity': return 'EquityPlusDebt'
    case 'project_finance': return 'ProjectCapitalStack'
    case 'commercial_real_estate':
    case 'mortgage': return 'AppraisedValue'
    case 'motor_vehicle_loan': return 'VehicleValue'
    case 'sovereign_debt': return 'GDP_PPP'
  }
}

function Field({ field, value, onChange }: {
  field: PcafInput
  value: string | boolean | undefined
  onChange: (v: string | boolean) => void
}) {
  const label = (
    <label className="block text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
      {field.label}{field.unit ? ` (${field.unit})` : ''}
      {field.required ? <span className="text-rose-400 ml-0.5">*</span> : null}
    </label>
  )
  if (field.type === 'boolean') {
    const v = typeof value === 'boolean' ? value : false
    return (
      <div>
        {label}
        <label className="inline-flex items-center gap-2 text-[var(--text-sm)] text-[var(--text-primary)]">
          <input type="checkbox" checked={v} onChange={e => onChange(e.target.checked)} className="rounded" />
          Yes
        </label>
        {field.help ? <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{field.help}</p> : null}
      </div>
    )
  }
  if (field.type === 'select') {
    return (
      <div>
        {label}
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[var(--text-sm)]"
        >
          <option value="">—</option>
          {(field.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {field.help ? <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{field.help}</p> : null}
      </div>
    )
  }
  return (
    <div>
      {label}
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        min={field.type === 'number' ? 0 : undefined}
        value={typeof value === 'string' ? value : ''}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[var(--text-sm)]"
      />
      {field.help ? <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{field.help}</p> : null}
    </div>
  )
}

function ResultPanel({ result }: { result: PcafResult | PcafCalculateResponse }) {
  return (
    <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[var(--text-sm)]">
        <Cell label="Attribution factor" value={result.attributionFactor.toFixed(6)} />
        <Cell label="Financed S1" value={fmtTons(result.financedScope1)} />
        <Cell label="Financed S2" value={fmtTons(result.financedScope2)} />
        <Cell label="Financed S3" value={fmtTons(result.financedScope3)} />
        <Cell label="Total financed" value={fmtTons(result.financedTotal)} highlight />
        <Cell label="Data quality" value={`DQ ${result.dataQualityScore} / 5`} highlight />
        <Cell label="Rationale" value={result.rationale} span={2} />
      </div>
    </div>
  )
}

function fmtTons(v: number | undefined): string {
  if (v == null || !Number.isFinite(v) || v === 0) return '0 tCO₂e'
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} MtCO₂e`
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(2)} ktCO₂e`
  return `${v.toFixed(2)} tCO₂e`
}

function Cell({ label, value, highlight, span }: { label: string; value: string; highlight?: boolean; span?: number }) {
  return (
    <div className={span === 2 ? 'col-span-2 md:col-span-4' : ''}>
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">{label}</div>
      <div className={`mt-0.5 ${highlight ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)]'}`}>{value}</div>
    </div>
  )
}
