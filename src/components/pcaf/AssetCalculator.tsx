import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
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
  const { t } = useTranslation()
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
      setServerError(e instanceof Error ? e.message : t('pcaf.calculator.serverComputeFailed'))
    }
  }

  const save = async () => {
    setSaving(true)
    setServerError(null)
    try {
      const counterpartyName = String(inputs.counterpartyName ?? '').trim()
      if (!counterpartyName) {
        setServerError(t('pcaf.calculator.counterpartyRequired'))
        return
      }
      const outstanding = Number(inputs.outstandingAmount ?? 0)
      if (!(outstanding > 0)) {
        setServerError(t('pcaf.calculator.outstandingRequired'))
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
      setServerError(e instanceof Error ? e.message : t('pcaf.calculator.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const previewResult: PcafResult | PcafCalculateResponse = serverResult ?? clientResult
  const ac = calculator.assetClass

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5">
      <header className="mb-4">
        <h3 className="text-[length:var(--text-lg)] font-semibold text-[var(--text-primary)]">{pcafCalculatorName(t, calculator)}</h3>
        <p className="text-[length:var(--text-sm)] text-[var(--text-secondary)] mt-1">{pcafCalculatorDescription(t, calculator)}</p>
        <a
          href={calculator.methodologyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-caption text-[var(--text-tertiary)] hover:text-[var(--color-brand)] mt-1"
        >
          {t('pcaf.calculator.methodology')} <ExternalLink className="w-3 h-3" />
        </a>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {calculator.inputs.map(field => (
          <Field
            key={field.key}
            field={field}
            assetClass={ac}
            value={inputs[field.key]}
            onChange={v => setField(field.key, v)}
          />
        ))}
      </div>

      <ResultPanel result={previewResult} />

      {previewResult.warnings && previewResult.warnings.length > 0 && (
        <div className="mt-3 rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-200">
          <div className="flex items-center gap-1 font-medium mb-1"><AlertTriangle className="w-3.5 h-3.5" /> {t('pcaf.calculator.warnings')}</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {previewResult.warnings.map((w, i) => <li key={i}>{localisePcafMessage(t, w)}</li>)}
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] hover:bg-[var(--bg-secondary)] text-[length:var(--text-sm)]"
        >
          <Info className="w-3.5 h-3.5" /> {t('pcaf.calculator.verifyServer')}
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] font-medium hover:opacity-90 disabled:opacity-50 text-[length:var(--text-sm)]"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? t('pcaf.calculator.saved') : saving ? t('pcaf.calculator.saving') : t('pcaf.calculator.saveAsset')}
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

function Field({ field, assetClass, value, onChange }: {
  field: PcafInput
  assetClass: string
  value: string | boolean | undefined
  onChange: (v: string | boolean) => void
}) {
  const { t } = useTranslation()
  const base = `pcaf.assetClasses.${assetClass}.inputs.${field.key}`
  const fieldLabel = t(`${base}.label`, { defaultValue: field.label })
  const help = field.help ? t(`${base}.help`, { defaultValue: field.help }) : null
  const label = (
    <label className="block text-micro uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-1">
      {fieldLabel}{field.unit ? ` (${field.unit})` : ''}
      {field.required ? <span className="text-rose-400 ml-0.5">*</span> : null}
    </label>
  )
  if (field.type === 'boolean') {
    const v = typeof value === 'boolean' ? value : false
    return (
      <div>
        {label}
        <label className="inline-flex items-center gap-2 text-[length:var(--text-sm)] text-[var(--text-primary)]">
          <input type="checkbox" checked={v} onChange={e => onChange(e.target.checked)} className="rounded" />
          {t('pcaf.calculator.yes')}
        </label>
        {help ? <p className="text-caption text-[var(--text-tertiary)] mt-1">{help}</p> : null}
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
          className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[length:var(--text-sm)]"
        >
          <option value="">—</option>
          {(field.options ?? []).map(o => <option key={o} value={o}>{t(`pcaf.options.${field.key}.${o}`, { defaultValue: o })}</option>)}
        </select>
        {help ? <p className="text-caption text-[var(--text-tertiary)] mt-1">{help}</p> : null}
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
        className="w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[length:var(--text-sm)]"
      />
      {help ? <p className="text-caption text-[var(--text-tertiary)] mt-1">{help}</p> : null}
    </div>
  )
}

function ResultPanel({ result }: { result: PcafResult | PcafCalculateResponse }) {
  const { t } = useTranslation()
  return (
    <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[length:var(--text-sm)]">
        <Cell label={t('pcaf.calculator.result.attributionFactor')} value={result.attributionFactor.toFixed(6)} />
        <Cell label={t('pcaf.calculator.result.financedS1')} value={fmtTons(result.financedScope1)} />
        <Cell label={t('pcaf.calculator.result.financedS2')} value={fmtTons(result.financedScope2)} />
        <Cell label={t('pcaf.calculator.result.financedS3')} value={fmtTons(result.financedScope3)} />
        <Cell label={t('pcaf.calculator.result.totalFinanced')} value={fmtTons(result.financedTotal)} highlight />
        <Cell label={t('pcaf.calculator.result.dataQuality')} value={t('pcaf.calculator.result.dqValue', { score: result.dataQualityScore })} highlight />
        <Cell label={t('pcaf.calculator.result.rationale')} value={localisePcafMessage(t, result.rationale)} span={2} />
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
      <div className="text-micro uppercase tracking-[0.06em] text-[var(--text-tertiary)]">{label}</div>
      <div className={`mt-0.5 ${highlight ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)]'}`}>{value}</div>
    </div>
  )
}

// ─── Display-time localisation helpers ──────────────────────
// Calculator descriptors and compute() output stay in English (they are
// persisted / asserted in tests). These helpers translate them at render
// time only, falling back to the original English text.

/** Display name for a calculator (falls back to the descriptor's English). */
function pcafCalculatorName(t: TFunction, c: PcafAssetCalculator): string {
  return t(`pcaf.assetClasses.${c.assetClass}.name`, { defaultValue: c.name })
}

/** Display description for a calculator (falls back to the descriptor's English). */
function pcafCalculatorDescription(t: TFunction, c: PcafAssetCalculator): string {
  return t(`pcaf.assetClasses.${c.assetClass}.description`, { defaultValue: c.description })
}

type OptGroup = 'counterpartySector' | 'buildingType' | 'counterpartyCountry' | 'vehicleType' | 'projectType'

/** Exact-match warnings / rationale strings emitted by the calculators. */
const STATIC_MESSAGES: Record<string, string> = {
  'EVIC estimated — supply issuer EVIC for higher data quality': 'warnings.evicEstimatedIssuer',
  'EVIC estimated — provide actual EVIC for higher data quality': 'warnings.evicEstimated',
  'Emissions estimated from sector intensity — replace with issuer disclosure for DQ ≤3': 'warnings.sectorIssuer',
  'Emissions estimated from sector intensity — request borrower disclosure for DQ ≤3': 'warnings.sectorBorrower',
  'Emissions estimated from sector intensity — replace with counterparty disclosure for DQ ≤3': 'warnings.sectorCounterparty',
  'Emissions estimated from sector intensity': 'warnings.sectorEstimate',
  'Borrower equity + debt unknown — using loan × 8 proxy. Provide actual balance-sheet figures for DQ ≤3.': 'warnings.borrowerValueUnknown',
  'Investee equity + debt unknown — using investment × 8 proxy': 'warnings.investeeValueUnknown',
  'Property value missing — using loan × 1.4 proxy (assumes ~70% LTV)': 'warnings.creValueMissing',
  'Floor-area intensity estimate — provide measured energy data for DQ ≤2': 'warnings.creFloorArea',
  'Provide measured emissions or floor area + building type': 'warnings.creNoData',
  'Total value missing or zero — attribution set to 0; provide enterprise value or property value': 'warnings.totalValueMissing',
  'Attribution factor negative — outstanding/total_value must be ≥0': 'warnings.attrNegative',
  'Vehicle value missing — using loan × 1.15 proxy': 'warnings.vehicleValueMissing',
  'Annual distance unknown — using fleet average for drivetrain': 'warnings.distanceUnknown',
  'Project capital stack unknown — using loan × 1.3 proxy': 'warnings.projectStackUnknown',
  'Project emissions estimated from project-type intensity': 'warnings.projectTypeEstimate',
  'Property value missing — using loan × 1.25 proxy (~80% LTV)': 'warnings.mortgageValueMissing',
  'Household emissions estimated from country residential intensity': 'warnings.householdEstimate',
  'Floor area missing — using typical 100 m² household': 'warnings.floorAreaMissing',
  'GDP-PPP missing — using outstanding as denominator (attribution will be ~1, expect low DQ)': 'warnings.gdpMissing',
  'Country emissions estimated from per-GDP intensity table — replace with NDC inventory data': 'warnings.countryEstimate',
  'No measured emissions, no floor area — cannot compute building emissions': 'rationale.noData',
  'Awaiting inputs': 'rationale.awaitingInputs',
}

/** Patterned messages: regex → key + named params (optionally option-translated). */
const PATTERN_MESSAGES: Array<{ re: RegExp; key: string; params: string[]; optionParams?: Partial<Record<string, OptGroup[]>> }> = [
  { re: /^Attribution factor (\S+) >1\.5 capped to 1\.5 — outstanding may exceed total value$/, key: 'warnings.attrCapped', params: ['value'] },
  { re: /^Reported emissions × attribution factor \((.+)\)$/, key: 'rationale.reported', params: ['attr'] },
  { re: /^Measured annual emissions × attribution factor \((.+)\)$/, key: 'rationale.measuredAnnual', params: ['attr'] },
  { re: /^Measured household emissions × attribution factor \((.+)\)$/, key: 'rationale.measuredHousehold', params: ['attr'] },
  { re: /^Project annual emissions × attribution factor \((.+)\)$/, key: 'rationale.projectAnnual', params: ['attr'] },
  { re: /^Sector intensity \((\S+) kgCO2e\/USD revenue, (.*)\) × est\. revenue × attribution$/, key: 'rationale.sectorEstRevenue', params: ['intensity', 'sector'], optionParams: { sector: ['counterpartySector'] } },
  { re: /^Sector intensity \((\S+) kgCO2e\/USD revenue\) × est\. revenue × attribution$/, key: 'rationale.sectorEstRevenueNoSector', params: ['intensity'] },
  { re: /^Sector intensity \((\S+) kgCO2e\/USD, (.*)\) × revenue proxy × attribution$/, key: 'rationale.sectorRevenueProxy', params: ['intensity', 'sector'], optionParams: { sector: ['counterpartySector'] } },
  { re: /^Floor area (\S+) m² × (\S+) kgCO2e\/m² \((.*)\) × attribution$/, key: 'rationale.floorArea', params: ['area', 'intensity', 'type'], optionParams: { type: ['buildingType', 'counterpartyCountry'] } },
  { re: /^Typical 100 m² × (\S+) kgCO2e\/m² \((.*)\) × attribution$/, key: 'rationale.typicalHousehold', params: ['intensity', 'type'], optionParams: { type: ['counterpartyCountry'] } },
  { re: /^(\S+) km × (\S+) kgCO2e\/km \((.*)\) × attribution$/, key: 'rationale.distance', params: ['km', 'ef', 'type'], optionParams: { type: ['vehicleType'] } },
  { re: /^Fleet average (\S+) tCO2e\/year \((.*)\) × attribution$/, key: 'rationale.fleetAverage', params: ['tons', 'type'], optionParams: { type: ['vehicleType'] } },
  { re: /^Project-type intensity \((\S+) kgCO2e\/USD, (.*)\) × project value × attribution$/, key: 'rationale.projectType', params: ['intensity', 'type'], optionParams: { type: ['projectType'] } },
  { re: /^Reported country emissions (\S+) MtCO2e × attribution \((.+)\)$/, key: 'rationale.reportedCountry', params: ['mt', 'attr'] },
  { re: /^Country EF (\S+) tCO2e\/USDm \((.*)\) × GDP-PPP × attribution$/, key: 'rationale.countryEf', params: ['rate', 'type'], optionParams: { type: ['counterpartyCountry'] } },
]

/**
 * Translate a calculator warning / rationale string for display. Unknown
 * messages (e.g. server errors) are returned unchanged.
 */
function localisePcafMessage(t: TFunction, msg: string): string {
  if (!msg) return msg
  const staticKey = STATIC_MESSAGES[msg]
  if (staticKey) return t(`pcaf.${staticKey}`, { defaultValue: msg })
  for (const p of PATTERN_MESSAGES) {
    const m = p.re.exec(msg)
    if (!m) continue
    const values: Record<string, string> = {}
    p.params.forEach((name, idx) => {
      const raw = m[idx + 1] ?? ''
      const groups = p.optionParams?.[name]
      let out = raw
      if (groups && raw) {
        for (const g of groups) {
          const key = `pcaf.options.${g}.${raw}`
          const tr = t(key)
          if (tr && tr !== key) { out = tr; break }
        }
      }
      values[name] = out
    })
    return t(`pcaf.${p.key}`, { ...values, defaultValue: msg })
  }
  return msg
}
