import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ExternalLink, Save, CheckCircle2, ShieldCheck } from 'lucide-react'
import type { PcafAssetCalculator, PcafInput, PcafResult } from '../../calculators/pcaf'
import { pcaf as pcafApi, type PcafAssetClass, type PcafCalculateResponse } from '../../lib/api'
import { Button } from '../../design-system'
import { StatusPill, notify } from '../ui'
import { CalcField, CalcInput, CalcSelect, ResultLedger, Callout } from '../analytics/factors'
import { usePcafFormat, dqTone } from './format'

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
  const { f } = usePcafFormat()
  const [inputs, setInputs] = useState<Record<string, string | boolean>>(() => loadInputs(calculator))
  const [serverResult, setServerResult] = useState<PcafCalculateResponse | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [verifying, setVerifying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

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
    if (fieldErrors[key]) setFieldErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  const runServer = async () => {
    setServerError(null)
    setVerifying(true)
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
      notify.success(t('pcaf.calculator.verified'))
    } catch (e) {
      setServerError(e instanceof Error ? e.message : t('pcaf.calculator.serverComputeFailed'))
    } finally {
      setVerifying(false)
    }
  }

  const save = async () => {
    setServerError(null)
    const counterpartyName = String(inputs.counterpartyName ?? '').trim()
    const outstanding = Number(inputs.outstandingAmount ?? 0)
    const errs: Record<string, string> = {}
    if (!counterpartyName) errs.counterpartyName = t('pcaf.calculator.counterpartyRequired')
    if (!(outstanding > 0)) errs.outstandingAmount = t('pcaf.calculator.outstandingRequired')
    setFieldErrors(errs)
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setSaving(true)
    try {
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
  const tons = (v: number | undefined) => f.exact(v ?? 0, 'tCO2e', { precision: 2 })

  return (
    <div ref={rootRef} className="space-y-5">
      <header>
        <p className="text-small text-[var(--text-secondary)]">{pcafCalculatorDescription(t, calculator)}</p>
        <a
          href={calculator.methodologyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 min-h-[32px] text-caption font-medium text-[var(--color-brand-strong)] hover:underline"
        >
          {t('pcaf.calculator.methodology')} <ExternalLink className="w-3 h-3" aria-hidden />
        </a>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
        {calculator.inputs.map(field => (
          <Field
            key={field.key}
            field={field}
            assetClass={ac}
            value={inputs[field.key]}
            error={fieldErrors[field.key]}
            onChange={v => setField(field.key, v)}
          />
        ))}
      </div>

      <ResultLedger
        label={t('pcaf.calculator.result.totalFinanced')}
        value={previewResult.financedTotal ?? 0}
        format={n => f.exact(n, null, { precision: 2 })}
        unit="tCO₂e"
        status={
          <span className="flex items-center gap-1.5">
            {serverResult && <StatusPill tone="info" size="sm" icon={<ShieldCheck />}>{t('pcaf.calculator.serverVerified')}</StatusPill>}
            <span className="nx-pill" data-tone={dqTone(previewResult.dataQualityScore)} data-size="sm">
              {t('pcaf.calculator.result.dqValue', { score: previewResult.dataQualityScore })}
            </span>
          </span>
        }
        rows={[
          { label: t('pcaf.calculator.result.attributionFactor'), value: f.number(previewResult.attributionFactor, { precision: 6 }), strong: true },
          { label: t('pcaf.calculator.result.financedS1'), value: tons(previewResult.financedScope1) },
          { label: t('pcaf.calculator.result.financedS2'), value: tons(previewResult.financedScope2) },
          { label: t('pcaf.calculator.result.financedS3'), value: tons(previewResult.financedScope3) },
        ]}
        footnote={<><span className="font-medium text-[var(--text-secondary)]">{t('pcaf.calculator.result.rationale')}</span> {localisePcafMessage(t, previewResult.rationale)}</>}
      />

      {previewResult.warnings && previewResult.warnings.length > 0 && (
        <Callout tone="warning" title={t('pcaf.calculator.warnings')}>
          <ul className="list-disc pl-5 space-y-0.5">
            {previewResult.warnings.map((w, i) => <li key={i}>{localisePcafMessage(t, w)}</li>)}
          </ul>
        </Callout>
      )}

      {serverError && <Callout tone="danger">{serverError}</Callout>}
      {Object.keys(fieldErrors).length > 0 && <p role="alert" className="sr-only">{t('calculators.form.fixFields')}</p>}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
        <Button variant="secondary" size="lg" onClick={runServer} loading={verifying} icon={<ShieldCheck className="w-4 h-4" />}>
          {t('pcaf.calculator.verifyServer')}
        </Button>
        <Button size="lg" onClick={save} loading={saving} icon={saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}>
          {saved ? t('pcaf.calculator.saved') : t('pcaf.calculator.saveAsset')}
        </Button>
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

function Field({ field, assetClass, value, error, onChange }: {
  field: PcafInput
  assetClass: string
  value: string | boolean | undefined
  error?: string
  onChange: (v: string | boolean) => void
}) {
  const { t } = useTranslation()
  const base = `pcaf.assetClasses.${assetClass}.inputs.${field.key}`
  const fieldLabel = t(`${base}.label`, { defaultValue: field.label })
  const help = field.help ? t(`${base}.help`, { defaultValue: field.help }) : null
  if (field.type === 'boolean') {
    const v = typeof value === 'boolean' ? value : false
    return (
      <div className="sm:col-span-2">
        <label className="inline-flex items-start gap-2.5 min-h-[40px] cursor-pointer">
          <input
            type="checkbox"
            checked={v}
            onChange={e => onChange(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded-[4px] accent-[var(--color-brand)]"
          />
          <span>
            <span className="block text-small font-medium text-[var(--text-primary)]">{fieldLabel}</span>
            {help ? <span className="block text-caption text-[var(--text-tertiary)] mt-0.5">{help}</span> : null}
          </span>
        </label>
      </div>
    )
  }
  return (
    <CalcField label={fieldLabel} unit={field.unit} required={field.required} hint={help} error={error}>
      {p => field.type === 'select' ? (
        <CalcSelect {...p} value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)}>
          <option value="">{t('pcaf.calculator.choose')}</option>
          {(field.options ?? []).map(o => <option key={o} value={o}>{t(`pcaf.options.${field.key}.${o}`, { defaultValue: o })}</option>)}
        </CalcSelect>
      ) : (
        <CalcInput
          {...p}
          type={field.type === 'number' ? 'number' : 'text'}
          min={field.type === 'number' ? 0 : undefined}
          step="any"
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </CalcField>
  )
}

// ─── Display-time localisation helpers ──────────────────────
// Calculator descriptors and compute() output stay in English (they are
// persisted / asserted in tests). These helpers translate them at render
// time only, falling back to the original English text.

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
