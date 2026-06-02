import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calculator, Info, Loader2, Save, CheckCircle2, Sparkles, ChevronDown, ChevronRight } from 'lucide-react'
import {
  SCOPE3_CALCULATORS,
  makeBrowserEFContext,
  type Scope3Calculator,
  type Scope3Method,
  type Scope3MethodResult,
} from '../calculators/scope3'
import { facilities as facilitiesApi, ai, type ApiFacility, type AiEfMatchResponse, type AiEfRow } from '../lib/api'
import { orgStore } from '../lib/orgStore'
import JargonTooltip from '../components/JargonTooltip'

export default function Scope3CalculatorsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(
    () => SCOPE3_CALCULATORS.find(c => c.id === selectedId) ?? null,
    [selectedId],
  )

  return (
    <div className="animate-fade-in">
      <header className="mb-5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--color-brand)]">
          <Calculator className="w-3 h-3" /> <JargonTooltip term="Scope 3" iconOnly /> Scope 3 · <JargonTooltip term="GHG" iconOnly /> GHG Protocol Corporate Value Chain
        </div>
        <h1 className="font-display text-[28px] font-bold text-[var(--text-primary)] mt-1">Scope 3 calculators</h1>
        <p className="text-[var(--text-sm)] text-[var(--text-secondary)] mt-1 max-w-3xl">
          Pick a category, choose a method (supplier-specific {`>`} activity-based {`>`} spend-based), enter inputs.
          Results are tCO2e with emission-factor citations. Spend-based factors are illustrative averages until
          USEEIO v2.0 / EXIOBASE is wired in.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-3">
          <h3 className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-2 px-2">Categories 1–15</h3>
          <ul className="space-y-1">
            {SCOPE3_CALCULATORS.map(c => (
              <li key={c.id}>
                <button
                  onClick={() => setSelectedId(c.id)}
                  className={[
                    'w-full text-left px-3 py-2 rounded-[var(--radius-md)] text-[var(--text-sm)] transition',
                    selectedId === c.id
                      ? 'bg-[var(--color-brand)]/10 text-[var(--text-primary)] ring-1 ring-[var(--color-brand)]/40'
                      : 'hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Cat {c.category}</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">{c.methods.length} methods</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{c.shortName}</div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="col-span-8">
          {selected ? (
            <CalculatorPanel calculator={selected} />
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-10 text-center text-[var(--text-secondary)]">
              <Info className="w-6 h-6 mx-auto mb-2 text-[var(--text-tertiary)]" />
              Select a Scope 3 category on the left to begin.
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function CalculatorPanel({ calculator }: { calculator: Scope3Calculator }) {
  const [methodId, setMethodId] = useState(calculator.methods[0]?.id ?? '')
  const method = calculator.methods.find(m => m.id === methodId) ?? calculator.methods[0]
  const [values, setValues] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<Scope3MethodResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveOpen, setSaveOpen] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  const run = async () => {
    if (!method) return
    setRunning(true)
    setError(null)
    setResult(null)
    setSavedId(null)
    try {
      const ctx = makeBrowserEFContext(() => localStorage.getItem('aeiforo_token'))
      const r = await method.compute(values, ctx)
      setResult(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  // Reset values when switching methods.
  const onMethodChange = (id: string) => {
    setMethodId(id)
    setValues({})
    setResult(null)
    setError(null)
    setSavedId(null)
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
          Cat {calculator.category} · {calculator.shortName}
        </div>
        <h2 className="font-display text-[22px] font-bold text-[var(--text-primary)] mt-0.5">{calculator.name}</h2>
        <p className="text-[var(--text-xs)] text-[var(--text-secondary)] mt-1">{calculator.description}</p>
      </div>

      <div className="mb-4">
        <label className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">Method</label>
        <select
          value={methodId}
          onChange={e => onMethodChange(e.target.value)}
          className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]"
        >
          {calculator.methods
            .slice()
            .sort((a, b) => a.priority - b.priority)
            .map(m => (
              <option key={m.id} value={m.id}>{m.priority}. {m.name}</option>
            ))}
        </select>
      </div>

      <MethodInputs method={method} values={values} onChange={setValues} />

      {method?.id === 'spend_based' && (
        <VendorAiMatcher
          calculator={calculator}
          values={values}
          onChange={setValues}
        />
      )}

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-[var(--border-subtle)]">
        <span className="text-[11px] text-[var(--text-tertiary)]">
          {savedId
            ? <>Saved as activity data. <Link to="/data" className="text-[var(--color-brand)] hover:underline">View in data ingestion</Link>.</>
            : 'Compute, then save the result to activity_data as a draft.'}
        </span>
        <div className="flex items-center gap-2">
          {result && (
            <button
              onClick={() => setSaveOpen(true)}
              className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-brand)] text-[var(--color-brand)] text-[var(--text-sm)] font-semibold inline-flex items-center gap-1.5 hover:bg-[var(--color-brand)]/10"
            >
              <Save className="w-3.5 h-3.5" />
              Save to activity data
            </button>
          )}
          <button
            onClick={run}
            disabled={running}
            className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
            Compute
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 rounded-[var(--radius-md)] bg-red-500/10 border border-red-500/30 text-red-400 text-[var(--text-xs)]">
          {error}
        </div>
      )}

      {result && <ResultPanel result={result} savedId={savedId} />}

      {saveOpen && result && (
        <SaveModal
          calculator={calculator}
          method={method!}
          values={values}
          result={result}
          onClose={() => setSaveOpen(false)}
          onSaved={(id) => { setSavedId(id); setSaveOpen(false) }}
        />
      )}
    </div>
  )
}

function MethodInputs({
  method,
  values,
  onChange,
}: {
  method: Scope3Method | undefined
  values: Record<string, string>
  onChange: (v: Record<string, string>) => void
}) {
  if (!method) return null
  const set = (key: string, v: string) => onChange({ ...values, [key]: v })

  return (
    <div className="grid grid-cols-2 gap-3">
      {method.inputs.map(inp => {
        const v = values[inp.key] ?? (inp.default !== undefined ? String(inp.default) : '')
        return (
          <label key={inp.key} className="block">
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">
              {inp.label}{inp.unit ? ` (${inp.unit})` : ''}{inp.required ? ' *' : ''}
            </span>
            {inp.type === 'select' ? (
              <select
                value={v}
                onChange={e => set(inp.key, e.target.value)}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]"
              >
                <option value="">— select —</option>
                {(inp.options ?? []).map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                type={inp.type === 'number' ? 'number' : 'text'}
                value={v}
                onChange={e => set(inp.key, e.target.value)}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]"
              />
            )}
            {inp.hint && <span className="block text-[10px] text-[var(--text-tertiary)] mt-1">{inp.hint}</span>}
          </label>
        )
      })}
    </div>
  )
}

function ResultPanel({ result, savedId }: { result: Scope3MethodResult; savedId: string | null }) {
  return (
    <div className="mt-4 p-4 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">Result</div>
        {savedId && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--status-ok)]">
            <CheckCircle2 className="w-3 h-3" /> Saved as draft
          </span>
        )}
      </div>
      <div className="text-[28px] font-display font-bold text-[var(--color-brand)] tabular-nums mt-1">
        {result.co2e_tonnes.toFixed(3)} <span className="text-[var(--text-sm)] text-[var(--text-secondary)]">tCO2e</span>
      </div>
      {result.ef_used && (
        <div className="mt-2 text-[11px] text-[var(--text-secondary)]">
          <strong>EF used:</strong> {result.ef_used.co2e_per_unit} {result.ef_used.unit ?? ''}
          {result.ef_used.source ? ` · ${result.ef_used.source}` : ''}
          {result.ef_used.region ? ` · ${result.ef_used.region}` : ''}
        </div>
      )}
      {result.breakdown && (
        <details className="mt-2">
          <summary className="text-[11px] text-[var(--text-tertiary)] cursor-pointer">Breakdown</summary>
          <pre className="mt-1 text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-primary)] p-2 rounded overflow-auto">
            {JSON.stringify(result.breakdown, null, 2)}
          </pre>
        </details>
      )}
      {result.notes && (
        <div className="mt-2 text-[10px] text-[var(--text-tertiary)] italic">{result.notes}</div>
      )}
    </div>
  )
}

function SaveModal({
  calculator,
  method,
  values,
  result,
  onClose,
  onSaved,
}: {
  calculator: Scope3Calculator
  method: Scope3Method
  values: Record<string, string>
  result: Scope3MethodResult
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const [facilityList, setFacilityList] = useState<ApiFacility[]>([])
  const [facilityId, setFacilityId] = useState<string>('')
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    facilitiesApi.list()
      .then(list => {
        const active = list.filter(f => f.is_active)
        setFacilityList(active)
        if (active[0]) setFacilityId(active[0].id)
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
  }, [])

  const save = async () => {
    if (!facilityId) { setErr('Pick a facility first'); return }
    setSaving(true)
    setErr(null)
    try {
      // The activity_unit on the record needs to be a real unit — pick the
      // first numeric input's unit, falling back to "units".
      const firstUnit = method.inputs.find(i => i.unit)?.unit ?? 'units'
      const firstNumericKey = method.inputs.find(i => i.type === 'number')?.key
      const firstNumericValue = firstNumericKey ? Number(values[firstNumericKey] ?? 0) : 0

      const created = await orgStore.saveActivityData({
        facility_id: facilityId,
        period_year: Number(year),
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
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-[var(--bg-primary)] rounded-[var(--radius-lg)] border border-[var(--border-default)] w-full max-w-md p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1">Persist calculator result</div>
        <h3 className="font-display text-[20px] font-bold text-[var(--text-primary)]">Save to activity data</h3>
        <p className="text-[var(--text-xs)] text-[var(--text-secondary)] mt-1 mb-4">
          Creates one draft row in <code className="font-mono">activity_data</code> tagged with the calculator (
          <code className="font-mono">{calculator.id}</code> · <code className="font-mono">{method.id}</code>).
        </p>

        <div className="space-y-3">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">Facility *</span>
            <select
              value={facilityId}
              onChange={e => setFacilityId(e.target.value)}
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]"
            >
              {facilityList.length === 0 && <option value="">No active facilities</option>}
              {facilityList.map(f => (
                <option key={f.id} value={f.id}>{f.name}{f.code ? ` (${f.code})` : ''}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">Year</span>
              <input
                type="number"
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]"
                min={2000}
                max={2100}
              />
            </label>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">Month</span>
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">Notes</span>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]"
              placeholder="Optional context for reviewers"
            />
          </label>
        </div>

        {err && (
          <div className="mt-3 p-2 rounded-[var(--radius-md)] bg-red-500/10 border border-red-500/30 text-red-400 text-[var(--text-xs)]">
            {err}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-[var(--radius-md)] text-[var(--text-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !facilityId}
            className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save draft
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Vendor → AI emission-factor matcher
   Renders below spend-based method inputs. Lets the user type a vendor name,
   asks Claude to pick the best EF from the platform DB, and offers
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
  const [vendor, setVendor] = useState(values.vendor_name ?? '')
  const [region, setRegion] = useState<string>('GLOBAL')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [match, setMatch] = useState<AiEfMatchResponse['match'] | null>(null)
  const [altsOpen, setAltsOpen] = useState(false)
  const [appliedEfId, setAppliedEfId] = useState<string | null>(null)
  const [unconfigured, setUnconfigured] = useState(false)

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
    if (!vendor.trim()) { setError('Enter a vendor name first'); return }
    setLoading(true); setError(null); setMatch(null); setAppliedEfId(null); setUnconfigured(false)
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
      // Surface the "AI not configured" 503 as a friendlier banner so demo
      // workspaces without ANTHROPIC_API_KEY see the right CTA.
      if (/ANTHROPIC_API_KEY/i.test(msg) || /503/.test(msg)) setUnconfigured(true)
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
    // Fire-and-forget — accept call is for audit, not blocking UI.
    if (matchId) {
      try { await ai.acceptEfMatch(matchId) } catch { /* swallow */ }
    }
  }

  return (
    <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand)]" />
        <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">AI emission-factor matcher</span>
      </div>
      <div className="grid grid-cols-12 gap-2 items-end">
        <label className="col-span-6 block">
          <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">Vendor name</span>
          <input
            type="text"
            value={vendor}
            onChange={e => setVendor(e.target.value)}
            placeholder="e.g. Acme Steel Co."
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]"
          />
        </label>
        <label className="col-span-3 block">
          <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-1.5">Region</span>
          <select
            value={region}
            onChange={e => setRegion(e.target.value)}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-sm)]"
          >
            {['GLOBAL','UK','US','EU','IN','CN','JP','AU','CA','DE','FR'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <div className="col-span-3">
          <button
            type="button"
            onClick={run}
            disabled={loading || !vendor.trim() || unconfigured}
            title={unconfigured ? 'Sign in to AI to get suggestions' : undefined}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {unconfigured ? 'AI unavailable' : 'Suggest EF with AI'}
          </button>
        </div>
      </div>

      {error && !unconfigured && (
        <div className="mt-2 p-2 rounded-[var(--radius-md)] bg-red-500/10 border border-red-500/30 text-red-400 text-[var(--text-xs)]">
          {error}
        </div>
      )}
      {unconfigured && (
        <div className="mt-2 p-2 rounded-[var(--radius-md)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-xs)] text-[var(--text-secondary)]">
          Sign in to AI to get suggestions. Set <code className="font-mono">ANTHROPIC_API_KEY</code> on the server to enable.
        </div>
      )}

      {match && (
        <div className="mt-3 space-y-2">
          <EfMatchCard
            ef={match.ef}
            confidence={match.confidence}
            reasoning={match.reasoning}
            badge="Top match"
            applied={appliedEfId === match.ef.id}
            onUse={() => useEf(match.ef, match.id)}
          />
          {match.alternates.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setAltsOpen(o => !o)}
                className="inline-flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              >
                {altsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {match.alternates.length} alternate{match.alternates.length === 1 ? '' : 's'}
              </button>
              {altsOpen && (
                <div className="mt-2 space-y-2">
                  {match.alternates.map((alt, i) => (
                    <EfMatchCard
                      key={alt.ef.id}
                      ef={alt.ef}
                      confidence={alt.confidence}
                      reasoning={alt.reasoning}
                      badge={`Alt ${i + 1}`}
                      applied={appliedEfId === alt.ef.id}
                      onUse={() => useEf(alt.ef, match.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {match.overallNotes && (
            <div className="text-[10px] italic text-[var(--text-tertiary)] mt-1">{match.overallNotes}</div>
          )}
        </div>
      )}
    </div>
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
  const pct = Math.round(confidence * 100)
  const tone = pct >= 80 ? 'bg-emerald-500/15 text-emerald-300' : pct >= 50 ? 'bg-amber-500/15 text-amber-300' : 'bg-red-500/15 text-red-300'
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] shrink-0">{badge}</span>
          <span className="text-[var(--text-sm)] font-semibold text-[var(--text-primary)] truncate">{ef.fuel_or_activity}</span>
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${tone}`}>{pct}%</span>
      </div>
      <div className="mt-1 text-[10px] text-[var(--text-tertiary)] tabular-nums">
        {Number(ef.co2e_per_unit)} {ef.unit} · {ef.source}{ef.region ? ` · ${ef.region}` : ''}
      </div>
      <div className="mt-1.5 text-[11px] text-[var(--text-secondary)]">{reasoning}</div>
      <div className="mt-2 flex items-center justify-end">
        <button
          type="button"
          onClick={onUse}
          disabled={applied}
          className={[
            'px-2.5 py-1 rounded-[var(--radius-md)] text-[11px] font-semibold inline-flex items-center gap-1',
            applied ? 'bg-emerald-500/15 text-emerald-300' : 'border border-[var(--color-brand)] text-[var(--color-brand)] hover:bg-[var(--color-brand)]/10',
          ].join(' ')}
        >
          {applied ? <><CheckCircle2 className="w-3 h-3" /> Applied</> : 'Use this EF'}
        </button>
      </div>
    </div>
  )
}
