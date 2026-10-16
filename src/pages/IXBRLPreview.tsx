import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Download, FileCheck2, Play, AlertTriangle, XCircle, FileText, ListChecks, Table2, RotateCcw } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Button from '../design-system/components/Button'
import { EmptyState, SkeletonLedger, SkeletonTable, StateBoundary, StatLedger, StatusPill, notify, type StatLedgerItem } from '../components/ui'
import { reports, type IxbrlPreviewResult, type IxbrlValidationResult } from '../lib/api'
import { useFmt } from '../lib/fmt'
import { spring } from '../motion/tokens'
import { readIxbrlFacts } from '../components/analytics/reports/ixbrlFacts'
import FactTable, { type FactMeta } from '../components/analytics/reports/FactTable'

/**
 * /reports/ixbrl — preview the generated iXBRL document: tagged facts,
 * concept coverage, the rendered document and validation results. Route is
 * unauthenticated by URL but the preview API requires a `reports.view`
 * permission token.
 */

const INPUT =
  'w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-body text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] outline-none transition-colors focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)]'

type TabKey = 'facts' | 'preview' | 'coverage' | 'validation'

const paramsKey = (year: number, frameworks: string[], includeUnapproved: boolean) =>
  `${year}|${frameworks.join(',')}|${includeUnapproved ? 1 : 0}`

export default function IXBRLPreview() {
  const { t } = useTranslation()
  const f = useFmt()
  const [params, setParams] = useSearchParams()
  const year = Number(params.get('year') ?? new Date().getUTCFullYear())
  const frameworks = (params.get('frameworks') ?? 'csrd-e1')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  const includeUnapproved = params.get('include-unapproved') === '1'

  const [tab, setTab] = useState<TabKey>('facts')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<IxbrlPreviewResult | null>(null)
  const [generatedFor, setGeneratedFor] = useState<string | null>(null)
  const [validation, setValidation] = useState<IxbrlValidationResult | null>(null)
  const frameworksRef = useRef<HTMLInputElement>(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await reports.previewIxbrl({ year, frameworks, includeUnapproved })
      // A malformed response must surface as an error, not crash the page.
      if (!r || typeof r !== 'object' || !Array.isArray((r as { coverage?: unknown }).coverage)) {
        throw new Error(t('ixbrl.errors.generate'))
      }
      setResult(r)
      setValidation(null)
      setGeneratedFor(paramsKey(year, frameworks, includeUnapproved))
    } catch (e: unknown) {
      const msg = e instanceof Error && e.message ? e.message : t('ixbrl.errors.generate')
      // Keep the last good document on screen; only an empty page shows the error state.
      if (result) notify.error(t('ixbrl.errors.generate'), { description: msg })
      else setError(msg)
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
      if (v.valid) notify.success(t('ixbrl.validation.valid'))
      else notify.warning(t('ixbrl.validation.failedToast', { count: v.errors.length }))
    } catch (e: unknown) {
      notify.error(t('ixbrl.errors.validate'), { description: e instanceof Error ? e.message : undefined })
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
    notify.success(t('ixbrl.toast.downloaded', { file: a.download }))
  }

  // Auto-generate on first load so the UI is never empty.
  useEffect(() => {
    if (!result && !loading) {
      void generate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const facts = useMemo(() => (result ? readIxbrlFacts(result.xhtml) : []), [result])
  const meta = useMemo(() => {
    const m = new Map<string, FactMeta>()
    for (const c of result?.coverage ?? []) m.set(c.conceptId, { label: c.label, framework: c.framework, griCode: c.griCode })
    return m
  }, [result])

  const mappedCount = result?.coverage.filter(c => c.mapped).length ?? 0
  const unmappedCount = result?.coverage.filter(c => !c.mapped).length ?? 0
  const errorCount = validation?.errors.length ?? 0
  const stale = Boolean(result && generatedFor && generatedFor !== paramsKey(year, frameworks, includeUnapproved))
  const isEmpty = Boolean(result && result.concepts === 0 && facts.length === 0)

  const setParam = (k: string, v: string | null) => {
    if (v == null || v === '') params.delete(k)
    else params.set(k, v)
    setParams(params, { replace: true })
  }

  const ledger: StatLedgerItem[] = result
    ? [
        { id: 'facts', label: t('ixbrl.stats.facts'), value: facts.length, tone: 'neutral' },
        { id: 'mapped', label: t('ixbrl.stats.mapped'), value: mappedCount, tone: 'success', hint: t('ixbrl.stats.ofConcepts', { count: result.coverage.length }) },
        { id: 'gaps', label: t('ixbrl.stats.gaps'), value: unmappedCount, tone: unmappedCount > 0 ? 'warning' : 'success', hint: unmappedCount > 0 ? t('ixbrl.stats.gapsHint') : t('ixbrl.stats.noGaps') },
        { id: 'contexts', label: t('ixbrl.stats.contextsUnits'), value: `${f.number(result.contexts)} / ${f.number(result.units)}`, tone: 'neutral' },
        {
          id: 'validation',
          label: t('ixbrl.stats.validation'),
          value: !validation ? t('ixbrl.stats.notRun') : validation.valid ? t('ixbrl.stats.passed') : t('ixbrl.stats.errorCount', { count: errorCount }),
          tone: !validation ? 'neutral' : validation.valid ? 'success' : 'danger',
        },
      ]
    : []

  const tabs: { k: TabKey; label: string; icon: ReactNode; count?: number }[] = [
    { k: 'facts', label: t('ixbrl.tabs.facts'), icon: <Table2 className="w-4 h-4" aria-hidden />, count: facts.length },
    { k: 'preview', label: t('ixbrl.tabs.preview'), icon: <FileText className="w-4 h-4" aria-hidden /> },
    { k: 'coverage', label: t('ixbrl.tabs.coverage'), icon: <ListChecks className="w-4 h-4" aria-hidden />, count: result?.coverage.length },
    { k: 'validation', label: t('ixbrl.tabs.validation'), icon: <FileCheck2 className="w-4 h-4" aria-hidden />, count: validation ? errorCount + validation.warnings.length : undefined },
  ]

  return (
    <div className="max-w-[1280px] mx-auto">
      <PageHeader
        breadcrumbs={[
          { label: t('ixbrl.breadcrumbReports'), to: '/reports' },
          { label: t('ixbrl.breadcrumb') },
        ]}
        title={t('ixbrl.title', { year })}
        description={
          result
            ? t('ixbrl.summary', { concepts: f.number(result.concepts), contexts: f.number(result.contexts), units: f.number(result.units), warnings: f.number(result.warnings.length) })
            : t('ixbrl.emptyDescription')
        }
        actions={
          <>
            <Button variant="secondary" size="md" onClick={generate} loading={loading} icon={!loading ? (result ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />) : undefined}>
              {loading ? t('ixbrl.actions.generating') : result ? t('ixbrl.actions.regenerate') : t('ixbrl.actions.generate')}
            </Button>
            <Button variant="secondary" size="md" onClick={validate} disabled={!result || loading} loading={validating} icon={!validating ? <FileCheck2 className="w-4 h-4" /> : undefined}>
              {t('ixbrl.actions.validate')}
            </Button>
            <Button variant="primary" size="md" onClick={download} disabled={!result || isEmpty} icon={<Download className="w-4 h-4" />}>
              {t('ixbrl.actions.download')}
            </Button>
          </>
        }
      />

      <div className="space-y-5">
        {/* Filters */}
        <form
          className="surface-paper px-4 py-3.5 sm:px-5 flex flex-wrap items-start gap-x-5 gap-y-3"
          onSubmit={e => {
            e.preventDefault()
            void generate()
          }}
        >
          <label className="flex flex-col gap-1 w-[112px]">
            <span className="text-caption font-medium text-[var(--text-secondary)]">{t('ixbrl.filters.year')}</span>
            <input
              type="number"
              inputMode="numeric"
              value={year}
              onChange={e => setParam('year', e.target.value)}
              className={`${INPUT} tabular-nums`}
              min={1990}
              max={2100}
            />
          </label>
          <label className="flex flex-col gap-1 flex-1 min-w-[220px]">
            <span className="text-caption font-medium text-[var(--text-secondary)]">{t('ixbrl.filters.frameworks')}</span>
            <input
              ref={frameworksRef}
              value={frameworks.join(',')}
              onChange={e => setParam('frameworks', e.target.value)}
              className={`${INPUT} font-mono text-small`}
              placeholder="csrd-e1,csrd-e2,issb-s2"
              aria-describedby="ixbrl-fw-hint"
              spellCheck={false}
            />
            <span id="ixbrl-fw-hint" className="text-caption text-[var(--text-tertiary)]">{t('ixbrl.filters.frameworksHint')}</span>
          </label>
          <label className="inline-flex items-center gap-2 min-h-[40px] text-small text-[var(--text-secondary)] cursor-pointer sm:mt-5">
            <input
              type="checkbox"
              className="w-4 h-4 accent-[var(--color-brand)]"
              checked={includeUnapproved}
              onChange={e => setParam('include-unapproved', e.target.checked ? '1' : null)}
            />
            {t('ixbrl.filters.includeUnapproved')}
          </label>
          {stale && (
            <div className="w-full flex flex-wrap items-center gap-3 pt-3 border-t border-[var(--border-subtle)]" role="status">
              <StatusPill tone="warning" dot>{t('ixbrl.stale.pill')}</StatusPill>
              <span className="text-caption text-[var(--text-secondary)]">{t('ixbrl.stale.body')}</span>
              <Button type="submit" size="sm" variant="secondary" loading={loading}>{t('ixbrl.actions.regenerate')}</Button>
            </div>
          )}
        </form>

        {includeUnapproved && result && (
          <div role="note" className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-[var(--status-warning-line)] bg-[var(--status-warning-soft)] px-4 py-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--status-warning)]" aria-hidden />
            <p className="text-small text-[var(--text-primary)]">{t('ixbrl.unapprovedNote')}</p>
          </div>
        )}

        <StateBoundary
          loading={loading}
          hasData={Boolean(result)}
          error={error}
          onRetry={generate}
          errorState={{ title: t('ixbrl.errors.generateTitle'), body: t('ixbrl.errors.generateBody') }}
          empty={isEmpty}
          emptyState={{
            title: t('ixbrl.empty.title', { year }),
            body: t('ixbrl.empty.body'),
            cta: { label: t('ixbrl.empty.cta'), onClick: () => frameworksRef.current?.focus() },
          }}
          skeleton={
            <div className="space-y-5">
              <SkeletonLedger items={5} />
              <SkeletonTable rows={6} cols={5} framed />
            </div>
          }
        >
          {result && (
            <div className="space-y-5">
              <StatLedger items={ledger} aria-label={t('ixbrl.stats.label')} />

              {result.warnings.length > 0 && (
                <ul className="space-y-1.5">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-small text-[var(--text-secondary)]">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--status-warning)]" aria-hidden />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="surface-paper overflow-hidden">
                <div role="tablist" aria-label={t('ixbrl.tabs.label')} className="flex items-center gap-1 px-2 sm:px-3 border-b border-[var(--border-subtle)] overflow-x-auto">
                  {tabs.map(tb => {
                    const active = tab === tb.k
                    return (
                      <button
                        key={tb.k}
                        type="button"
                        role="tab"
                        id={`ixbrl-tab-${tb.k}`}
                        aria-selected={active}
                        aria-controls={`ixbrl-panel-${tb.k}`}
                        onClick={() => setTab(tb.k)}
                        className={`relative px-3 min-h-[44px] text-small font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                          active ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        {tb.icon}
                        {tb.label}
                        {tb.count != null && (
                          <span className="ml-0.5 text-caption tabular-nums text-[var(--text-tertiary)]">{f.number(tb.count)}</span>
                        )}
                        {active && (
                          <motion.span layoutId="ixbrl-tab" transition={spring.snappy} className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-[var(--color-brand)]" aria-hidden />
                        )}
                      </button>
                    )
                  })}
                </div>

                <div role="tabpanel" id={`ixbrl-panel-${tab}`} aria-labelledby={`ixbrl-tab-${tab}`}>
                  {tab === 'facts' &&
                    (facts.length > 0 ? (
                      <FactTable facts={facts} meta={meta} />
                    ) : (
                      <EmptyState density="compact" title={t('ixbrl.facts.none')} body={t('ixbrl.facts.noneBody')} />
                    ))}

                  {tab === 'preview' && (
                    <div className="p-3 sm:p-4 bg-[var(--bg-secondary)]">
                      <iframe
                        title={t('ixbrl.iframeTitle')}
                        srcDoc={result.xhtml}
                        sandbox=""
                        className="w-full h-[70vh] rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)]"
                      />
                      <p className="mt-2 text-caption text-[var(--text-tertiary)]">{t('ixbrl.previewNote')}</p>
                    </div>
                  )}

                  {tab === 'coverage' && <CoverageTable coverage={result.coverage} />}

                  {tab === 'validation' && (
                    <ValidationPanel validation={validation} validating={validating} onValidate={validate} />
                  )}
                </div>
              </div>
            </div>
          )}
        </StateBoundary>
      </div>
    </div>
  )
}

function CoverageTable({ coverage }: { coverage: IxbrlPreviewResult['coverage'] }) {
  const { t } = useTranslation()
  if (coverage.length === 0) {
    return <EmptyState density="compact" title={t('ixbrl.coverage.empty')} />
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <caption className="sr-only">{t('ixbrl.tabs.coverage')}</caption>
        <thead className="bg-[var(--bg-secondary)]">
          <tr className="text-left text-caption font-medium text-[var(--text-secondary)]">
            <th scope="col" className="px-5 py-2.5 font-medium">{t('ixbrl.coverage.concept')}</th>
            <th scope="col" className="px-4 py-2.5 font-medium">{t('ixbrl.coverage.framework')}</th>
            <th scope="col" className="px-4 py-2.5 font-medium">{t('ixbrl.coverage.source')}</th>
            <th scope="col" className="px-5 py-2.5 font-medium">{t('ixbrl.coverage.status')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
          {coverage.map(c => (
            <tr key={c.conceptId + (c.valueId ?? '')} className="hover:bg-[var(--bg-hover)] transition-colors">
              <th scope="row" className="px-5 py-3 text-left font-normal">
                <span className="block text-small text-[var(--text-primary)]">{c.label}</span>
                <span className="block text-caption font-mono text-[var(--text-tertiary)] mt-0.5 break-all">{c.conceptId}</span>
              </th>
              <td className="px-4 py-3 text-small text-[var(--text-secondary)] whitespace-nowrap">{t(`ixbrl.frameworks.${c.framework}`, { defaultValue: c.framework.toUpperCase() })}</td>
              <td className="px-4 py-3 text-small text-[var(--text-secondary)] whitespace-nowrap">{c.griCode ? `GRI ${c.griCode}` : '—'}</td>
              <td className="px-5 py-3">
                {c.mapped ? (
                  <StatusPill tone="success" size="sm">{t('ixbrl.coverage.mapped')}</StatusPill>
                ) : (
                  <StatusPill tone="warning" size="sm" dot>{t('ixbrl.coverage.missing')}</StatusPill>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ValidationPanel({
  validation,
  validating,
  onValidate,
}: {
  validation: IxbrlValidationResult | null
  validating: boolean
  onValidate: () => void
}) {
  const { t } = useTranslation()
  const f = useFmt()
  if (!validation) {
    return (
      <EmptyState
        density="compact"
        art="filtered"
        title={t('ixbrl.validation.notRunTitle')}
        body={t('ixbrl.validation.notRunBody')}
        cta={{ label: validating ? t('ixbrl.validation.running') : t('ixbrl.actions.validate'), onClick: onValidate, disabled: validating }}
      />
    )
  }
  const issues = [
    ...validation.errors.map(e => ({ ...e, level: 'error' as const })),
    ...validation.warnings.map(w => ({ ...w, level: 'warning' as const })),
  ]
  return (
    <div>
      <div className="px-5 py-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--border-subtle)]">
        {validation.valid ? (
          <StatusPill tone="success">{t('ixbrl.validation.valid')}</StatusPill>
        ) : (
          <StatusPill tone="danger" icon={<XCircle className="w-3.5 h-3.5" aria-hidden />}>{t('ixbrl.validation.failed')}</StatusPill>
        )}
        <span className="text-small text-[var(--text-secondary)] tabular-nums">
          {t('ixbrl.validation.stats', { facts: f.number(validation.stats.facts), contexts: f.number(validation.stats.contexts), units: f.number(validation.stats.units) })}
          {validation.stats.unknownConcepts > 0 && t('ixbrl.validation.unknownConcepts', { count: validation.stats.unknownConcepts })}
        </span>
      </div>
      {issues.length > 0 ? (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {issues.map((it, i) => (
            <li key={i} className="px-5 py-3 flex items-start gap-3">
              <StatusPill tone={it.level === 'error' ? 'danger' : 'warning'} size="sm">
                {it.level === 'error' ? t('ixbrl.validation.error') : t('ixbrl.validation.warning')}
              </StatusPill>
              <div className="min-w-0 flex-1">
                <p className="text-small font-mono text-[var(--text-primary)] break-words">{it.message}</p>
                {it.line != null && <p className="text-caption text-[var(--text-tertiary)] mt-0.5 tabular-nums">{t('ixbrl.validation.line', { line: it.line })}</p>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-6 text-small text-[var(--text-secondary)]">{t('ixbrl.validation.noIssues')}</p>
      )}
      <p className="px-5 py-3.5 text-caption text-[var(--text-tertiary)] border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        {t('ixbrl.validation.footnote')}
      </p>
    </div>
  )
}
