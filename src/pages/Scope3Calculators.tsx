import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import { Calculator, Save, CheckCircle2, Sparkles, ChevronDown, ChevronRight, Lock } from 'lucide-react'
import {
  SCOPE3_CALCULATORS,
  makeBrowserEFContext,
  type Scope3Calculator,
  type Scope3Method,
  type Scope3MethodResult,
} from '../calculators/scope3'
import { localizeScope3, localizeCalcNote, localizeUnit, scope3OptionLabel } from '../calculators/labels'
import { facilities as facilitiesApi, ai, isUnconfiguredError, type ApiFacility, type AiEfMatchResponse, type AiEfRow } from '../lib/api'
import { useIntegrationStatus, integrationMissing } from '../lib/integrations'
import { orgStore } from '../lib/orgStore'
import { useFmt } from '../lib/fmt'
import JargonTooltip from '../components/JargonTooltip'
import PageHeader from '../components/PageHeader'
import { Button } from '../design-system'
import { ConfirmSheet, EmptyState, StatusPill, notify } from '../components/ui'
import { crossfadeVariants } from '../motion/tokens'
import useOrgMarket from '../components/analytics/useOrgMarket'
import {
  CalcField, CalcInput, CalcSelect, CalcTextarea, ResultLedger, Callout,
  FactorSourceBadge, PreferredFactorInline, regionLabel,
} from '../components/analytics/factors'

/** Categories whose maths uses the grid electricity factor (T&D losses). */
const GRID_CATEGORIES = new Set([3])
/** "Cat 1 Purchased Goods" → "Purchased Goods" (the number is shown separately). */
const bareName = (s: string) => s.replace(/^(Cat|类别)\s*\d+\s*/i, '')
const AI_REGIONS = ['GLOBAL', 'CN', 'UK', 'US', 'EU', 'IN', 'JP', 'AU', 'CA', 'DE', 'FR']

export default function Scope3CalculatorsPage() {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => SCOPE3_CALCULATORS.find(c => c.id === selectedId) ?? null, [selectedId])

  return (
    <div className="page-container">
      <PageHeader
        breadcrumbs={[
          { label: t('scope3.page.breadcrumbData'), to: '/data' },
          { label: t('scope3.page.breadcrumbCalculators'), to: '/calculators' },
          { label: t('scope3.page.title') },
        ]}
        eyebrow={t('scope3.page.eyebrow')}
        title={t('scope3.page.title')}
        description={
          <>
            {t('scope3.page.descriptionBefore')} <JargonTooltip term="GHG" iconOnly /> {t('scope3.page.descriptionAfter')}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] items-start">
        {/* Mobile / tablet: one select instead of the 15-row rail */}
        <div className="lg:hidden">
          <CalcField label={t('scope3.page.categoriesHeading')}>
            {p => (
              <CalcSelect {...p} value={selectedId ?? ''} onChange={e => setSelectedId(e.target.value || null)}>
                <option value="">{t('scope3.page.chooseCategory')}</option>
                {SCOPE3_CALCULATORS.map(c => (
                  <option key={c.id} value={c.id}>
                    {t('scope3.page.catLabel', { n: c.category })} · {bareName(localizeScope3(t, c).shortName)}
                  </option>
                ))}
              </CalcSelect>
            )}
          </CalcField>
        </div>

        <nav aria-label={t('scope3.page.categoriesHeading')} className="hidden lg:block surface-paper p-2 lg:sticky lg:top-20">
          <div className="px-3 pt-2 pb-2 text-caption font-medium text-[var(--text-tertiary)]">{t('scope3.page.categoriesHeading')}</div>
          <ul className="space-y-0.5">
            {SCOPE3_CALCULATORS.map(c => {
              const on = selectedId === c.id
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    aria-current={on ? 'true' : undefined}
                    className={`w-full text-left px-2.5 py-2 rounded-[var(--radius-md)] flex items-center gap-2.5 transition-colors duration-micro ${
                      on ? 'bg-[var(--color-brand-soft)]' : 'hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-[var(--radius-sm)] text-caption font-semibold tabular-nums flex items-center justify-center flex-shrink-0 ${
                        on ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {c.category}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-small truncate ${on ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                        {bareName(localizeScope3(t, c).shortName)}
                      </span>
                      <span className="block text-caption text-[var(--text-tertiary)]">{t('scope3.page.methodsCount', { count: c.methods.length })}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="min-w-0">
          {selected ? (
            <CalculatorPanel key={selected.id} calculator={selected} />
          ) : (
            <EmptyState
              framed
              art="target"
              title={t('scope3.page.selectTitle')}
              body={t('scope3.page.selectPrompt')}
            />
          )}
        </div>
      </div>
    </div>
  )
}

type Errors = Record<string, string>

function validate(method: Scope3Method | undefined, values: Record<string, string>, t: (k: string) => string): Errors {
  const errs: Errors = {}
  if (!method) return errs
  for (const inp of method.inputs) {
    const raw = values[inp.key] ?? (inp.default !== undefined ? String(inp.default) : '')
    if (inp.required && String(raw).trim() === '') {
      errs[inp.key] = inp.type === 'select' ? t('calculators.form.chooseOption') : t('calculators.form.requiredError')
      continue
    }
    if (inp.type === 'number' && String(raw).trim() !== '') {
      const n = Number(raw)
      if (!Number.isFinite(n)) errs[inp.key] = t('calculators.form.number')
      else if (n < 0) errs[inp.key] = t('calculators.form.positive')
    }
  }
  return errs
}

function CalculatorPanel({ calculator }: { calculator: Scope3Calculator }) {
  const { t } = useTranslation()
  const f = useFmt()
  const navigate = useNavigate()
  const market = useOrgMarket()
  const reduce = useReducedMotion()
  // Display-only copy — the original `calculator`/`method` are what get persisted.
  const lc = localizeScope3(t, calculator)
  const [methodId, setMethodId] = useState(calculator.methods[0]?.id ?? '')
  const method = calculator.methods.find(m => m.id === methodId) ?? calculator.methods[0]
  const lm = lc.methods.find(m => m.id === method?.id)
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Errors>({})
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<Scope3MethodResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveOpen, setSaveOpen] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  const placeholderEf = result?.ef_used?.source === 'illustrative-fallback'

  const run = async () => {
    if (!method) return
    const errs = validate(method, values, t)
    setErrors(errs)
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setRunning(true)
    setError(null)
    setSavedId(null)
    try {
      const ctx = makeBrowserEFContext(() => localStorage.getItem('aeiforo_token'))
      const r = await method.compute(values, ctx)
      setResult(r)
    } catch (e) {
      setResult(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  // Reset values when switching methods.
  const onMethodChange = (id: string) => {
    setMethodId(id)
    setValues({})
    setErrors({})
    setResult(null)
    setError(null)
    setSavedId(null)
  }

  const methods = lc.methods.slice().sort((a, b) => a.priority - b.priority)

  return (
    <div className="space-y-5">
      <section className="surface-paper">
        <header className="px-5 pt-5 pb-4 sm:px-6 border-b border-[var(--border-subtle)]">
          <div className="text-caption font-medium text-[var(--text-tertiary)]">
            {t('scope3.page.catLabel', { n: calculator.category })} · {bareName(lc.shortName)}
          </div>
          <h2 className="type-h2 text-[var(--text-primary)] mt-1">{lc.name}</h2>
          <p className="text-small text-[var(--text-secondary)] mt-1 max-w-[72ch]">{lc.description}</p>
        </header>

        <div className="px-5 py-5 sm:px-6 space-y-6">
          <fieldset>
            <legend className="text-small font-medium text-[var(--text-primary)]">{t('scope3.page.method')}</legend>
            <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('scope3.page.methodHint')}</p>
            <div role="radiogroup" aria-label={t('scope3.page.method')} className="mt-2.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {methods.map(m => {
                const on = m.id === method?.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => onMethodChange(m.id)}
                    className={`text-left rounded-[var(--radius-md)] border px-3.5 py-3 min-h-[56px] transition-[border-color,background-color,box-shadow] duration-micro ${
                      on
                        ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] shadow-[0_0_0_1px_var(--color-brand)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full text-caption font-semibold tabular-nums flex items-center justify-center flex-shrink-0 ${on ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
                        {m.priority}
                      </span>
                      <span className="text-small font-medium text-[var(--text-primary)]">{m.name}</span>
                    </span>
                    {m.priority === 1 && <span className="block mt-1 pl-7 text-caption text-[var(--text-tertiary)]">{t('scope3.page.bestQuality')}</span>}
                  </button>
                )
              })}
            </div>
            {lm?.notes && <p className="mt-2 text-caption text-[var(--text-tertiary)]">{lm.notes}</p>}
          </fieldset>

          {GRID_CATEGORIES.has(calculator.category) && !market.loading && (
            <div className="rounded-[var(--radius-md)] bg-[var(--bg-subtle)] px-4 py-3">
              <PreferredFactorInline
                isCn={market.isCn}
                onUse={method?.inputs.some(i => i.key === 'grid_ef') ? row => {
                  setValues(v => ({ ...v, grid_ef: String(Number(row.co2e_per_unit)) }))
                  setErrors(e => { const n = { ...e }; delete n.grid_ef; return n })
                  notify.success(t('scope3.page.gridEfApplied', { value: f.exact(row.co2e_per_unit, row.unit) }))
                } : undefined}
              />
            </div>
          )}

          <MethodInputs method={lm} values={values} errors={errors} onChange={(v, key) => { setValues(v); if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n }) }} />

          {method?.id === 'spend_based' && (
            <VendorAiMatcher calculator={calculator} values={values} onChange={setValues} />
          )}
        </div>

        <footer className="px-5 py-4 sm:px-6 border-t border-[var(--border-subtle)] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-caption text-[var(--text-tertiary)]">{t('scope3.page.computeHint')}</span>
          <div className="flex items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-initial">
            {result && (
              <Button
                variant="secondary"
                size="lg"
                icon={<Save className="w-4 h-4" />}
                onClick={() => setSaveOpen(true)}
                disabled={placeholderEf}
                title={placeholderEf ? t('scope3.page.placeholderBlocked') : undefined}
              >
                {t('scope3.page.saveToActivity')}
              </Button>
            )}
            <Button size="lg" onClick={run} loading={running} icon={<Calculator className="w-4 h-4" />}>
              {t('scope3.page.compute')}
            </Button>
          </div>
        </footer>
      </section>

      {Object.keys(errors).length > 0 && (
        <p role="alert" className="sr-only">{t('calculators.form.fixFields')}</p>
      )}

      {error && <Callout tone="danger" title={t('scope3.page.computeFailed')}>{error}</Callout>}

      {result && (
        <motion.div {...(reduce ? {} : { variants: crossfadeVariants, initial: 'initial', animate: 'enter' })}>
          <ResultPanel
            result={result}
            savedId={savedId}
            onOpenData={() => navigate('/data')}
            formatTonnes={n => f.exact(n)}
          />
          {placeholderEf && (
            <div className="mt-3">
              <Callout tone="danger" title={t('scope3.page.placeholderTitle')}>{t('scope3.page.placeholderBody')}</Callout>
            </div>
          )}
        </motion.div>
      )}

      {result && method && (
        <SaveSheet
          open={saveOpen}
          onOpenChange={setSaveOpen}
          calculator={calculator}
          method={method}
          values={values}
          result={result}
          onSaved={id => setSavedId(id)}
        />
      )}
    </div>
  )
}

function MethodInputs({
  method,
  values,
  errors,
  onChange,
}: {
  method: Scope3Method | undefined
  values: Record<string, string>
  errors: Errors
  onChange: (v: Record<string, string>, key: string) => void
}) {
  const { t } = useTranslation()
  if (!method) return null
  const set = (key: string, v: string) => onChange({ ...values, [key]: v }, key)

  return (
    <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
      {method.inputs.map(inp => {
        const v = values[inp.key] ?? (inp.default !== undefined ? String(inp.default) : '')
        const unit = inp.unit ? localizeUnit(t, inp.unit) : undefined
        return (
          <CalcField key={inp.key} label={inp.label} unit={unit} required={inp.required} hint={inp.hint} error={errors[inp.key]}>
            {p =>
              inp.type === 'select' ? (
                <CalcSelect {...p} value={v} onChange={e => set(inp.key, e.target.value)}>
                  <option value="">{t('scope3.page.selectPlaceholder')}</option>
                  {(inp.options ?? []).map(o => (
                    <option key={o} value={o}>{scope3OptionLabel(t, o)}</option>
                  ))}
                </CalcSelect>
              ) : (
                <CalcInput
                  {...p}
                  type={inp.type === 'number' ? 'number' : 'text'}
                  min={inp.type === 'number' ? 0 : undefined}
                  step="any"
                  value={v}
                  onChange={e => set(inp.key, e.target.value)}
                />
              )
            }
          </CalcField>
        )
      })}
    </div>
  )
}

function ResultPanel({
  result,
  savedId,
  onOpenData,
  formatTonnes,
}: {
  result: Scope3MethodResult
  savedId: string | null
  onOpenData: () => void
  formatTonnes: (n: number) => string
}) {
  const { t } = useTranslation()
  const f = useFmt()
  const ef = result.ef_used
  const rows = []
  if (ef) {
    rows.push({
      label: t('scope3.page.efUsed'),
      value: (
        <span className="inline-flex items-center gap-1.5 flex-wrap justify-end">
          <span className="font-semibold text-[var(--text-primary)]">{f.exact(ef.co2e_per_unit, ef.unit ?? null)}</span>
          {ef.source && ef.source !== 'illustrative-fallback' && <FactorSourceBadge source={ef.source} version={ef.source_version} />}
        </span>
      ),
    })
    if (ef.region) rows.push({ label: t('scope3.page.region'), value: regionLabel(t, ef.region) })
  }
  for (const [k, v] of Object.entries(result.breakdown ?? {})) {
    rows.push({ label: t(`scope3.breakdown.${k}`, { defaultValue: k.replace(/_/g, ' ') }), value: typeof v === 'number' ? f.number(v, { maxFraction: 4 }) : String(v) })
  }
  return (
    <ResultLedger
      label={t('scope3.page.result')}
      value={result.co2e_tonnes}
      format={formatTonnes}
      unit="tCO₂e"
      status={savedId ? <StatusPill tone="success" icon={<CheckCircle2 />}>{t('scope3.page.savedAsDraft')}</StatusPill> : undefined}
      rows={rows}
      footnote={
        result.notes || savedId ? (
          <span className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>{result.notes ? localizeCalcNote(t, result.notes) : null}</span>
            {savedId && (
              <button type="button" onClick={onOpenData} className="font-medium text-[var(--color-brand-strong)] hover:underline whitespace-nowrap text-left">
                {t('scope3.page.viewInIngestion')}
              </button>
            )}
          </span>
        ) : undefined
      }
    />
  )
}

function SaveSheet({
  open,
  onOpenChange,
  calculator,
  method,
  values,
  result,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  calculator: Scope3Calculator
  method: Scope3Method
  values: Record<string, string>
  result: Scope3MethodResult
  onSaved: (id: string) => void
}) {
  const { t } = useTranslation()
  const f = useFmt()
  const navigate = useNavigate()
  const [facilityList, setFacilityList] = useState<ApiFacility[] | null>(null)
  const [facilityErr, setFacilityErr] = useState<string | null>(null)
  const [facilityId, setFacilityId] = useState<string>('')
  const now = new Date()
  const [year, setYear] = useState(String(now.getFullYear()))
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [notes, setNotes] = useState('')
  const [fieldErr, setFieldErr] = useState<{ facility?: string; year?: string }>({})

  useEffect(() => {
    if (!open || facilityList) return
    facilitiesApi.list()
      .then(list => {
        const active = list.filter(x => x.is_active)
        setFacilityList(active)
        if (active[0]) setFacilityId(active[0].id)
      })
      .catch(e => { setFacilityList([]); setFacilityErr(e instanceof Error ? e.message : String(e)) })
  }, [open, facilityList])

  const save = async () => {
    const errs: { facility?: string; year?: string } = {}
    if (!facilityId) errs.facility = t('scope3.page.pickFacility')
    const y = Number(year)
    if (!Number.isInteger(y) || y < 2000 || y > 2100) errs.year = t('scope3.page.yearRange')
    setFieldErr(errs)
    if (Object.keys(errs).length) throw new Error(t('calculators.form.fixFields'))
    // The activity_unit on the record needs to be a real unit — pick the
    // first numeric input's unit, falling back to "units".
    const firstUnit = method.inputs.find(i => i.unit)?.unit ?? 'units'
    const firstNumericKey = method.inputs.find(i => i.type === 'number')?.key
    const firstNumericValue = firstNumericKey ? Number(values[firstNumericKey] ?? 0) : 0
    const created = await orgStore.saveActivityData({
      facility_id: facilityId,
      period_year: y,
      period_month: Number(month),
      scope: 3,
      category: `Scope 3 · Cat ${calculator.category} ${calculator.shortName}`,
      subcategory: method.name,
      activity_value: Number.isFinite(firstNumericValue) ? firstNumericValue : 0,
      activity_unit: firstUnit,
      emission_factor: result.ef_used?.co2e_per_unit ?? undefined,
      ef_source: result.ef_used?.source ?? undefined,
      co2e_tonnes: result.co2e_tonnes,
      notes: notes || undefined,
      source_calculator_id: calculator.id,
      source_method_id: method.id,
    })
    onSaved(created.id)
    notify.success(t('scope3.page.savedToast', { value: f.exact(result.co2e_tonnes, 'tCO2e') }), {
      action: { label: t('scope3.page.viewInIngestion'), onClick: () => navigate('/data') },
    })
  }

  const loadingFacilities = open && facilityList === null

  return (
    <ConfirmSheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={t('scope3.page.saveToActivity')}
      description={t('scope3.page.saveSheetBody', { value: f.exact(result.co2e_tonnes, 'tCO2e') })}
      confirmLabel={t('scope3.page.saveDraft')}
      onConfirm={save}
    >
      <div className="space-y-4">
        <CalcField label={t('scope3.page.facility')} required error={fieldErr.facility ?? facilityErr}>
          {p => (
            <CalcSelect {...p} value={facilityId} onChange={e => { setFacilityId(e.target.value); setFieldErr(x => ({ ...x, facility: undefined })) }} disabled={loadingFacilities}>
              {loadingFacilities && <option value="">{t('scope3.page.loadingFacilities')}</option>}
              {!loadingFacilities && (facilityList ?? []).length === 0 && <option value="">{t('scope3.page.noFacilities')}</option>}
              {(facilityList ?? []).map(x => (
                <option key={x.id} value={x.id}>{x.name}{x.code ? ` (${x.code})` : ''}</option>
              ))}
            </CalcSelect>
          )}
        </CalcField>
        <div className="grid grid-cols-2 gap-4">
          <CalcField label={t('scope3.page.year')} required error={fieldErr.year}>
            {p => <CalcInput {...p} type="number" min={2000} max={2100} value={year} onChange={e => setYear(e.target.value)} />}
          </CalcField>
          <CalcField label={t('scope3.page.month')}>
            {p => (
              <CalcSelect {...p} value={month} onChange={e => setMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{t('scope3.page.monthOption', { m: String(m).padStart(2, '0'), n: m })}</option>
                ))}
              </CalcSelect>
            )}
          </CalcField>
        </div>
        <CalcField label={t('scope3.page.notes')} hint={t('scope3.page.saveTrace', { calc: calculator.id, method: method.id })}>
          {({ unit: _u, ...p }) => <CalcTextarea {...p} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('scope3.page.notesPlaceholder')} />}
        </CalcField>
      </div>
    </ConfirmSheet>
  )
}

/* ═══════════════════════════════════════════
   Vendor → AI emission-factor matcher
   Renders below spend-based method inputs. Lets the user type a vendor name,
   asks the AI provider to pick the best EF from the platform DB, and offers
   "Use this EF" buttons that write the recommended factor into the values
   map under `ef_override` (a free-form display field — the existing
   spend-based compute() still runs EEIO sector math, but storing the AI EF
   here gives reviewers a richer audit trail).
   ═══════════════════════════════════════════ */
function VendorAiMatcher({
  calculator,
  values,
  onChange,
}: {
  calculator: Scope3Calculator
  values: Record<string, string>
  onChange: (v: Record<string, string>) => void
}) {
  const { t } = useTranslation()
  const market = useOrgMarket()
  const [vendor, setVendor] = useState(values.vendor_name ?? '')
  const [region, setRegion] = useState<string>(market.isCn ? 'CN' : 'GLOBAL')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vendorErr, setVendorErr] = useState<string | null>(null)
  const [match, setMatch] = useState<AiEfMatchResponse['match'] | null>(null)
  const [altsOpen, setAltsOpen] = useState(false)
  const [appliedEfId, setAppliedEfId] = useState<string | null>(null)
  const integrations = useIntegrationStatus()
  // Combine the up-front health probe with any 503 the API call itself
  // returned — either signal means "AI not configured".
  const [unconfiguredFromCall, setUnconfiguredFromCall] = useState(false)
  const orgDisabled = !market.loading && !market.aiEnabled
  const unconfigured = unconfiguredFromCall || integrationMissing(integrations, 'ai')
  const unavailable = unconfigured || orgDisabled

  useEffect(() => { if (market.isCn) setRegion(r => (r === 'GLOBAL' ? 'CN' : r)) }, [market.isCn])

  // Map calculator → spend-based GHG Protocol category. Defaults to a string
  // the model can read; the DB column is free-form so we don't gate on
  // exact match (the candidate query falls back to "no filter" if no rows).
  const categoryHint = useMemo<string | undefined>(() => {
    switch (calculator.category) {
      case 1: return 'Cat 1 - Purchased goods'
      case 2: return 'Cat 2 - Capital goods'
      case 4: return 'Cat 4 - Transportation'
      case 6: return 'Cat 6 - Business travel'
      case 7: return 'Cat 7 - Employee commute'
      default: return undefined
    }
  }, [calculator.category])

  const spendAmount = Number(values.spend ?? '')
  const spendCategoryHint = String(values.sector ?? values.material ?? values.travel_class ?? '')

  const run = async () => {
    if (!vendor.trim()) { setVendorErr(t('scope3.page.enterVendor')); return }
    setLoading(true); setError(null); setMatch(null); setAppliedEfId(null); setUnconfiguredFromCall(false)
    try {
      const res = await ai.matchEf({
        vendorName: vendor.trim(),
        spendCategory: spendCategoryHint || undefined,
        region: region as 'GLOBAL' | 'UK' | 'US' | 'EU',
        spendAmount: Number.isFinite(spendAmount) && spendAmount > 0 ? spendAmount : undefined,
        spendCurrency: 'USD',
        scope: 3,
        category: categoryHint,
      })
      setMatch(res.match)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // Surface the "AI not configured" 503 as a calm banner.
      if (isUnconfiguredError(e) || /API_KEY/i.test(msg) || /503/.test(msg)) setUnconfiguredFromCall(true)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const useEf = async (ef: AiEfRow, matchId: string | null) => {
    onChange({
      ...values,
      vendor_name: vendor,
      ef_override: String(ef.co2e_per_unit),
      ef_override_id: ef.id,
      ef_override_source: ef.source,
      ef_override_unit: ef.unit,
    })
    setAppliedEfId(ef.id)
    notify.success(t('scope3.page.efApplied', { name: ef.fuel_or_activity }))
    // Fire-and-forget — accept call is for audit, not blocking UI.
    if (matchId) {
      try { await ai.acceptEfMatch(matchId) } catch { /* swallow */ }
    }
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4" aria-labelledby="ai-matcher">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[var(--color-brand-strong)]" aria-hidden />
        <h3 id="ai-matcher" className="text-small font-semibold text-[var(--text-primary)]">{t('scope3.page.aiMatcherTitle')}</h3>
      </div>
      <p className="text-caption text-[var(--text-tertiary)] mt-0.5">{t('scope3.page.aiMatcherBody')}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end">
        <CalcField label={t('scope3.page.vendorName')} error={vendorErr}>
          {p => (
            <CalcInput
              {...p}
              type="text"
              value={vendor}
              onChange={e => { setVendor(e.target.value); setVendorErr(null) }}
              onKeyDown={e => { if (e.key === 'Enter' && !unavailable) void run() }}
              placeholder={t('scope3.page.vendorPlaceholder')}
            />
          )}
        </CalcField>
        <CalcField label={t('scope3.page.region')}>
          {p => (
            <CalcSelect {...p} value={region} onChange={e => setRegion(e.target.value)}>
              {AI_REGIONS.map(r => <option key={r} value={r}>{scope3OptionLabel(t, r)}</option>)}
            </CalcSelect>
          )}
        </CalcField>
        <Button
          size="lg"
          onClick={run}
          loading={loading}
          disabled={unavailable || integrations.loading}
          aria-label={unavailable ? t('scope3.page.aiUnavailable') : t('scope3.page.suggestAria')}
          icon={unavailable ? <Lock className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
        >
          {unavailable ? t('scope3.page.aiUnavailable') : t('scope3.page.suggestEf')}
        </Button>
      </div>

      {error && !unavailable && <div className="mt-3"><Callout tone="danger">{error}</Callout></div>}
      {unavailable && (
        <div className="mt-3">
          <Callout tone="info">{orgDisabled ? t('scope3.page.aiOrgDisabled') : t('scope3.page.aiNotConfigured')}</Callout>
        </div>
      )}

      {match && (
        <div className="mt-3 space-y-2">
          <EfMatchCard
            ef={match.ef}
            confidence={match.confidence}
            reasoning={match.reasoning}
            badge={t('scope3.page.topMatch')}
            applied={appliedEfId === match.ef.id}
            onUse={() => useEf(match.ef, match.id)}
          />
          {match.alternates.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setAltsOpen(o => !o)}
                aria-expanded={altsOpen}
                className="inline-flex items-center gap-1 min-h-[32px] text-caption font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {altsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                {t('scope3.page.alternates', { count: match.alternates.length })}
              </button>
              {altsOpen && (
                <div className="mt-2 space-y-2">
                  {match.alternates.map((alt, i) => (
                    <EfMatchCard
                      key={alt.ef.id}
                      ef={alt.ef}
                      confidence={alt.confidence}
                      reasoning={alt.reasoning}
                      badge={t('scope3.page.altN', { n: i + 1 })}
                      applied={appliedEfId === alt.ef.id}
                      onUse={() => useEf(alt.ef, match.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {match.overallNotes && <p className="text-caption text-[var(--text-tertiary)] mt-1">{match.overallNotes}</p>}
        </div>
      )}
    </section>
  )
}

function EfMatchCard({
  ef, confidence, reasoning, badge, applied, onUse,
}: {
  ef: AiEfRow
  confidence: number
  reasoning: string
  badge: string
  applied: boolean
  onUse: () => void
}) {
  const { t } = useTranslation()
  const f = useFmt()
  const tone = confidence >= 0.8 ? 'success' : confidence >= 0.5 ? 'warning' : 'danger'
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-caption text-[var(--text-tertiary)]">{badge}</div>
          <div className="text-small font-semibold text-[var(--text-primary)] truncate">{ef.fuel_or_activity}</div>
        </div>
        <span className="nx-pill" data-tone={tone} data-size="sm" title={t('scope3.page.confidence')}>
          {f.percent(confidence, { ratio: true })}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2 flex-wrap text-caption text-[var(--text-secondary)]">
        <span className="tabular-nums font-medium text-[var(--text-primary)]">{f.exact(ef.co2e_per_unit, ef.unit)}</span>
        <FactorSourceBadge source={ef.source} />
        {ef.region && <span>{regionLabel(t, ef.region)}</span>}
      </div>
      <p className="mt-1.5 text-caption text-[var(--text-secondary)]">{reasoning}</p>
      <div className="mt-2.5 flex justify-end">
        {applied ? (
          <StatusPill tone="success" icon={<CheckCircle2 />}>{t('scope3.page.applied')}</StatusPill>
        ) : (
          <Button variant="secondary" size="sm" onClick={onUse}>{t('scope3.page.useThisEf')}</Button>
        )}
      </div>
    </div>
  )
}

