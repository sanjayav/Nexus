import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { reports, type IxbrlPreviewResult, type IxbrlValidationResult } from '../lib/api'
import { Download, FileCheck2, Loader2, Play, AlertTriangle, CheckCircle2, XCircle, FileText } from 'lucide-react'

/**
 * /reports/ixbrl — preview the generated iXBRL document with mapping
 * checklist + validation results. Route is unauthenticated by URL but the
 * preview API requires a `reports.view` permission token.
 */

type TabKey = 'preview' | 'coverage' | 'validation'

function StatChip({ label, value, tone = 'neutral' }: { label: string; value: string | number; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  const toneClass = {
    neutral: 'bg-[var(--surface-2)] text-[var(--text-secondary)]',
    good:    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    warn:    'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    bad:     'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  }[tone]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium ${toneClass}`}>
      <span className="opacity-70">{label}</span>
      <span>{value}</span>
    </span>
  )
}

export default function IXBRLPreview() {
  const [params, setParams] = useSearchParams()
  const year = Number(params.get('year') ?? new Date().getUTCFullYear())
  const frameworks = (params.get('frameworks') ?? 'csrd-e1')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  const includeUnapproved = params.get('include-unapproved') === '1'

  const [tab, setTab] = useState<TabKey>('preview')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<IxbrlPreviewResult | null>(null)
  const [validation, setValidation] = useState<IxbrlValidationResult | null>(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    setValidation(null)
    try {
      const r = await reports.previewIxbrl({ year, frameworks, includeUnapproved })
      setResult(r)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate iXBRL')
    } finally {
      setLoading(false)
    }
  }

  const validate = async () => {
    if (!result) return
    setValidating(true)
    try {
      const v = await reports.validateIxbrl(result.xhtml)
      setValidation(v)
      setTab('validation')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Validation failed')
    } finally {
      setValidating(false)
    }
  }

  const download = () => {
    if (!result) return
    const blob = new Blob([result.xhtml], { type: 'application/xhtml+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexus-${year}-${frameworks.join('-')}.xhtml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Auto-generate on first load so the UI is never empty.
  useEffect(() => {
    if (!result && !loading) {
      void generate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const previewSrcDoc = useMemo(() => result?.xhtml ?? '', [result])

  const mappedCount = result?.coverage.filter(c => c.mapped).length ?? 0
  const unmappedCount = result?.coverage.filter(c => !c.mapped).length ?? 0
  const errorCount = validation?.errors.length ?? 0

  const updateFrameworks = (val: string) => {
    params.set('frameworks', val)
    setParams(params)
  }

  return (
    <div className="page-container">
      <PageHeader
        breadcrumbs={[
          { label: 'Reports', to: '/reports' },
          { label: 'iXBRL Filing' },
        ]}
        title={`iXBRL Preview · FY${year}`}
        description={
          result
            ? `${result.concepts} concept facts · ${result.contexts} contexts · ${result.units} units · ${result.warnings.length} warnings`
            : 'Generate an inline XBRL draft for downstream filing or validator review.'
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={generate}
              disabled={loading}
              className="btn btn-ghost gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4"/>}
              {loading ? 'Generating…' : 'Generate'}
            </button>
            <button
              onClick={validate}
              disabled={!result || validating}
              className="btn btn-ghost gap-1.5"
            >
              {validating ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileCheck2 className="w-4 h-4"/>}
              Validate
            </button>
            <button
              onClick={download}
              disabled={!result}
              className="btn btn-primary gap-1.5"
            >
              <Download className="w-4 h-4"/>
              Download .xhtml
            </button>
          </div>
        }
      />

      {/* Filter row */}
      <div className="glass-panel p-4 mb-5 flex flex-wrap items-center gap-3 text-[13px]">
        <span className="text-[var(--text-tertiary)]">Year</span>
        <input
          type="number"
          value={year}
          onChange={e => { params.set('year', e.target.value); setParams(params) }}
          className="input w-24"
          min={1990}
          max={2100}
        />
        <span className="text-[var(--text-tertiary)] ml-2">Frameworks</span>
        <input
          value={frameworks.join(',')}
          onChange={e => updateFrameworks(e.target.value)}
          className="input flex-1 min-w-[280px]"
          placeholder="csrd-e1,csrd-e2,issb-s2"
        />
        <label className="inline-flex items-center gap-1.5 text-[var(--text-tertiary)]">
          <input
            type="checkbox"
            checked={includeUnapproved}
            onChange={e => {
              if (e.target.checked) params.set('include-unapproved', '1')
              else params.delete('include-unapproved')
              setParams(params)
            }}
          />
          Include unapproved
        </label>
      </div>

      {/* Stats strip */}
      {result && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <StatChip label="Concepts" value={result.concepts}/>
          <StatChip label="Contexts" value={result.contexts}/>
          <StatChip label="Units" value={result.units}/>
          <StatChip label="Mapped" value={mappedCount} tone="good"/>
          {unmappedCount > 0 && <StatChip label="Gaps" value={unmappedCount} tone="warn"/>}
          {result.warnings.length > 0 && <StatChip label="Warnings" value={result.warnings.length} tone="warn"/>}
          {validation && (
            errorCount > 0
              ? <StatChip label="Errors" value={errorCount} tone="bad"/>
              : <StatChip label="Validated" value="OK" tone="good"/>
          )}
        </div>
      )}

      {error && (
        <div className="glass-panel border border-rose-500/30 p-3 mb-4 text-[13px] text-rose-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0"/>
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[var(--border-subtle)] mb-4 flex items-center gap-1">
        {([
          { k: 'preview',    label: 'Preview',          icon: <FileText className="w-4 h-4"/> },
          { k: 'coverage',   label: 'Concept Coverage', icon: <CheckCircle2 className="w-4 h-4"/> },
          { k: 'validation', label: 'Validation',       icon: <FileCheck2 className="w-4 h-4"/> },
        ] as const).map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`px-3 py-2 text-[13px] font-medium border-b-2 transition-colors inline-flex items-center gap-1.5 ${
              tab === t.k
                ? 'border-[var(--accent)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'preview' && (
        <div className="glass-panel p-0 overflow-hidden">
          {result ? (
            <iframe
              title="iXBRL Preview"
              srcDoc={previewSrcDoc}
              sandbox=""
              className="w-full h-[70vh] bg-white"
            />
          ) : (
            <div className="p-8 text-center text-[var(--text-tertiary)] text-[13px]">
              {loading ? 'Generating preview…' : 'No preview yet — click Generate.'}
            </div>
          )}
        </div>
      )}

      {tab === 'coverage' && (
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[var(--surface-2)]">
              <tr className="text-left">
                <th className="px-3 py-2 font-semibold text-[var(--text-secondary)]">Concept</th>
                <th className="px-3 py-2 font-semibold text-[var(--text-secondary)]">Label</th>
                <th className="px-3 py-2 font-semibold text-[var(--text-secondary)]">Framework</th>
                <th className="px-3 py-2 font-semibold text-[var(--text-secondary)]">Source</th>
                <th className="px-3 py-2 font-semibold text-[var(--text-secondary)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {(result?.coverage ?? []).map(c => (
                <tr key={c.conceptId + (c.valueId ?? '')} className="border-t border-[var(--border-subtle)]">
                  <td className="px-3 py-2 font-mono text-[11px] text-[var(--text-tertiary)]">{c.conceptId}</td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">{c.label}</td>
                  <td className="px-3 py-2 text-[var(--text-tertiary)]">{c.framework}</td>
                  <td className="px-3 py-2 text-[var(--text-tertiary)]">{c.griCode ?? '—'}</td>
                  <td className="px-3 py-2">
                    {c.mapped
                      ? <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5"/> Mapped</span>
                      : <span className="inline-flex items-center gap-1 text-amber-400"><AlertTriangle className="w-3.5 h-3.5"/> Missing (required)</span>}
                  </td>
                </tr>
              ))}
              {(!result || result.coverage.length === 0) && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-[var(--text-tertiary)]">No mappings yet — generate first.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'validation' && (
        <div className="glass-panel p-4">
          {!validation ? (
            <div className="text-center text-[var(--text-tertiary)] text-[13px] py-8">
              Click <strong>Validate</strong> to run structural checks on the generated document.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-[14px]">
                {validation.valid
                  ? <span className="inline-flex items-center gap-1.5 text-emerald-400"><CheckCircle2 className="w-4 h-4"/> Document is structurally valid</span>
                  : <span className="inline-flex items-center gap-1.5 text-rose-400"><XCircle className="w-4 h-4"/> Validation failed</span>}
                <span className="text-[var(--text-tertiary)]">
                  {validation.stats.facts} facts · {validation.stats.contexts} contexts · {validation.stats.units} units
                  {validation.stats.unknownConcepts > 0 && ` · ${validation.stats.unknownConcepts} unknown concepts`}
                </span>
              </div>

              {validation.errors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-[13px] mb-2 text-rose-300">Errors ({validation.errors.length})</h3>
                  <ul className="space-y-1 text-[12px] font-mono">
                    {validation.errors.map((e, i) => (
                      <li key={i} className="text-rose-200">
                        {e.line != null && <span className="text-rose-400/70">line {e.line}: </span>}
                        {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div>
                  <h3 className="font-semibold text-[13px] mb-2 text-amber-300">Warnings ({validation.warnings.length})</h3>
                  <ul className="space-y-1 text-[12px] font-mono">
                    {validation.warnings.map((w, i) => (
                      <li key={i} className="text-amber-200">
                        {w.line != null && <span className="text-amber-400/70">line {w.line}: </span>}
                        {w.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[11px] text-[var(--text-tertiary)] pt-2 border-t border-[var(--border-subtle)]">
                Structural validation only — production filing also requires the full EFRAG ESRS
                linkbase via a certified validator (CoreFiling, ParsePort, IRIS Carbon).
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
