import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Printer, ArrowLeft, Shield } from 'lucide-react'
import {
  nexus,
  type NexusQuestionnaireItem,
  type NexusHistoricalPoint,
  type NexusDataValue,
} from '../lib/api'
import { buildTemplate, type TemplateSection } from '../reports/spdTemplate'
import { useFmt } from '../lib/fmt'
import { Skeleton, StateBoundary } from '../components/ui'
import SetupGuard from '../components/SetupGuard'
import { Button } from '../design-system'
import { itemLabel } from '../lib/itemLabel'

/** Stable i18n key segment for a template section/subsection name. */
const slug = (name: string) => name.replace(/[^A-Za-z0-9]+/g, '_')

const ACTIVE_YEAR = 2026

type LoadState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; error: string }
  | {
      kind: 'ready'
      items: NexusQuestionnaireItem[]
      historyByItem: Map<string, NexusHistoricalPoint[]>
      currentByItem: Map<string, NexusDataValue>
    }

/**
 * Live Sustainability Performance Data preview.
 * Reads straight from Neon via /api/workflow?view=tree + per-item /view=historical.
 * Each section mirrors the published FY2025 PDF section order; current FY shows approved
 * data_value rows, and the four trailing columns come from historical_value.
 */
export default function ReportPreview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const load = async () => {
    setState({ kind: 'loading' })
    try {
      const items = await nexus.tree()
      if (items.length === 0) return setState({ kind: 'empty' })

      // Fetch history for every item in parallel.
      const entries = await Promise.all(
        items.map(async it => [it.id, await nexus.historical(it.id)] as const)
      )
      const historyByItem = new Map<string, NexusHistoricalPoint[]>(entries)

      // Current FY2026 values come from both queues (submitted/reviewed) and from approvedqueue indirectly.
      // For preview we show approved + published + anything in the queues.
      // The backend doesn't currently expose an "all data_values for year" endpoint — we reconstruct
      // from queues. Not-yet-entered rows render as em-dash, which is the correct reviewer state anyway.
      const [reviewQ, approvalQ] = await Promise.all([
        nexus.reviewQueue(),
        nexus.approvalQueue(),
      ])
      const currentByItem = new Map<string, NexusDataValue>()
      for (const dv of reviewQ) currentByItem.set(dv.questionnaire_item_id, dv)
      for (const dv of approvalQ) currentByItem.set(dv.questionnaire_item_id, dv)

      setState({ kind: 'ready', items, historyByItem, currentByItem })
    } catch (e) {
      setState({ kind: 'error', error: e instanceof Error ? e.message : t('reportPreview.failedToLoad') })
    }
  }

  useEffect(() => { load() }, [])

  // Auto-print when ?download=1 (used by Publish Centre after a successful publish).
  useEffect(() => {
    if (state.kind === 'ready' && params.get('download') === '1') {
      const timer = setTimeout(() => window.print(), 800)
      return () => clearTimeout(timer)
    }
  }, [state.kind, params])

  const groupSections = useMemo<TemplateSection[]>(() => {
    if (state.kind !== 'ready') return []
    return buildTemplate(state.items, state.historyByItem, state.currentByItem, 'group')
  }, [state])

  const jvSections = useMemo<TemplateSection[]>(() => {
    if (state.kind !== 'ready') return []
    return buildTemplate(state.items, state.historyByItem, state.currentByItem, 'jv')
  }, [state])

  if (state.kind === 'empty') return <SetupGuard onReady={load} />

  return (
    <div>
      {/* Toolbar (hidden when printing) */}
      <div className="print:hidden flex items-center justify-between gap-3 flex-wrap mb-6">
        <button
          type="button"
          onClick={() => navigate('/reports')}
          className="h-9 -ml-2 px-2 inline-flex items-center gap-2 rounded-[var(--radius-md)] text-small font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
        >
          <ArrowLeft className="w-4 h-4" /> {t('reportPreview.backToPublish')}
        </button>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Shield className="w-3.5 h-3.5" />} onClick={() => navigate('/reports/auditor')}>
            {t('reportPreview.auditorView')}
          </Button>
          <Button variant="primary" size="sm" icon={<Printer className="w-3.5 h-3.5" />} onClick={() => window.print()}>
            {t('reportPreview.printPdf')}
          </Button>
        </div>
      </div>

      <StateBoundary
        loading={state.kind === 'loading'}
        error={state.kind === 'error' ? state.error : null}
        onRetry={load}
        errorState={{ variant: 'error', title: t('reportPreview.unableToLoad'), body: t('reportPreview.unableToLoadBody') }}
        skeleton={
          <div className="max-w-[860px] mx-auto surface-paper p-12 space-y-5">
            <Skeleton height={14} width={160} className="block" />
            <Skeleton height={44} width="70%" className="block" />
            <Skeleton height={18} width="40%" className="block" />
            <Skeleton height={240} rounded="lg" className="block mt-10" />
          </div>
        }
      >
      {/* Report document — A4 column */}
      <article className="max-w-[860px] mx-auto surface-paper text-[var(--text-primary)] overflow-hidden print:border-0 print:shadow-none">
        {/* Cover */}
        <section className="px-6 sm:px-12 pt-16 pb-20 border-b border-[var(--border-subtle)]">
          <div className="text-small font-semibold text-[var(--color-brand-strong)] mb-3">
            {t('reportPreview.cover.eyebrow')}
          </div>
          <h1 className="type-display text-[var(--text-primary)] mb-3">
            {t('reportPreview.cover.companyLine1')}<br />{t('reportPreview.cover.companyLine2')}
          </h1>
          <p className="type-h3 font-normal text-[var(--text-secondary)] mb-10">
            {t('reportPreview.cover.reportingPeriod', { year: ACTIVE_YEAR })}
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] text-caption font-semibold">
            {t('reportPreview.cover.badge', { year: ACTIVE_YEAR })}
          </div>
          <p className="mt-12 text-caption text-[var(--text-tertiary)] max-w-[68ch]">
            {t('reportPreview.cover.note')}
          </p>
        </section>

        {/* Reporting Guidelines (GRI 2-1..2-5) */}
        <section className="px-6 sm:px-12 py-10 border-b border-[var(--border-subtle)]">
          <h2 className="type-h2 text-[var(--text-primary)] mb-1">{t('reportPreview.guidelines.title')}</h2>
          <p className="text-caption font-mono text-[var(--text-tertiary)] mb-4">GRI 2-1, 2-2, 2-3, 2-4, 2-5</p>
          <div className="space-y-3 type-small text-[var(--text-secondary)] max-w-[72ch]">
            <p><strong className="text-[var(--text-primary)]">{t('reportPreview.guidelines.orgLabel')}</strong> {t('reportPreview.guidelines.orgBody')}</p>
            <p><strong className="text-[var(--text-primary)]">{t('reportPreview.guidelines.scopeLabel')}</strong> {t('reportPreview.guidelines.scopeBody')}</p>
            <p><strong className="text-[var(--text-primary)]">{t('reportPreview.guidelines.periodLabel')}</strong> {t('reportPreview.guidelines.periodBody', { year: ACTIVE_YEAR })}</p>
            <p><strong className="text-[var(--text-primary)]">{t('reportPreview.guidelines.restatementsLabel')}</strong> {t('reportPreview.guidelines.restatementsBody')}</p>
            <p><strong className="text-[var(--text-primary)]">{t('reportPreview.guidelines.assuranceLabel')}</strong> {t('reportPreview.guidelines.assuranceBody')}</p>
          </div>
        </section>

        {/* Group performance data */}
        <TemplateRenderBlock heading={t('reportPreview.headings.group')} sections={groupSections} currentYear={ACTIVE_YEAR} />

        {/* JV parallel scope */}
        {jvSections.length > 0 && (
          <TemplateRenderBlock heading={t('reportPreview.headings.jv')} sections={jvSections} currentYear={ACTIVE_YEAR} />
        )}

        {/* LRQA placeholder */}
        <section className="px-6 sm:px-12 py-10 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] print:bg-transparent">
          <h2 className="type-h2 text-[var(--text-primary)] mb-1">
            {t('reportPreview.assurance.title')}
          </h2>
          <p className="text-caption font-mono text-[var(--text-tertiary)] mb-4">{t('reportPreview.assurance.subtitle')}</p>
          <div className="space-y-3 type-small text-[var(--text-secondary)] max-w-[72ch]">
            <p>
              {t('reportPreview.assurance.p1')}
            </p>
            <p>
              {t('reportPreview.assurance.p2')}
            </p>
            <p className="text-caption text-[var(--text-tertiary)] pt-4 border-t border-[var(--border-subtle)]">
              <strong>{t('reportPreview.assurance.placeholder')}</strong> {t('reportPreview.assurance.placeholderBody')}
            </p>
          </div>
        </section>
      </article>
      </StateBoundary>
    </div>
  )
}

function TemplateRenderBlock({ heading, sections, currentYear }: { heading: string; sections: TemplateSection[]; currentYear: number }) {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  return (
    <section>
      <h2 className="type-h1 text-[var(--text-primary)] px-6 sm:px-12 pt-10 pb-2 break-before-page print:break-before-page">
        {heading}
      </h2>
      {sections.map(sec => (
        <div key={sec.capital} className="px-6 sm:px-12 py-6">
          <h3 className="type-h3 text-[var(--text-primary)] mb-4 pb-2 border-b border-[var(--border-strong)]">
            {t(`reportPreview.capitals.${slug(sec.capital)}`, { defaultValue: sec.capital })}
          </h3>
          {sec.subsections.map(sub => (
            <div key={sub.name} className="mb-6">
              <h4 className="text-small font-semibold text-[var(--color-brand-strong)] mb-2">
                {t(`reportPreview.subsections.${slug(sub.name)}`, { defaultValue: sub.name })}
              </h4>
              <div className="overflow-x-auto -mx-1 px-1"><table className="w-full min-w-[560px] text-caption border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-[var(--text-tertiary)]">
                    <th className="text-left py-2 pr-2 w-[42%] font-semibold text-caption">{t('reportPreview.table.lineItem')}</th>
                    <th className="text-left py-2 pr-2 w-[12%] font-semibold text-caption">{t('reportPreview.table.unit')}</th>
                    <th className="text-right py-2 px-1 font-semibold text-caption tabular-nums">2022</th>
                    <th className="text-right py-2 px-1 font-semibold text-caption tabular-nums">2023</th>
                    <th className="text-right py-2 px-1 font-semibold text-caption tabular-nums">2024</th>
                    <th className="text-right py-2 px-1 font-semibold text-caption tabular-nums">2025</th>
                    <th className="text-right py-2 pl-1 font-semibold text-caption tabular-nums bg-[var(--color-brand-soft)]">{currentYear}</th>
                  </tr>
                </thead>
                <tbody>
                  {sub.rows.map(row => {
                    const hist = Object.fromEntries(row.history.map(h => [h.year, h.value]))
                    return (
                      <tr key={row.item.id} className="border-b border-[var(--border-subtle)] align-top">
                        <td className="py-2 pr-2 text-[var(--text-primary)]">
                          <div className="font-medium">{itemLabel(row.item, i18n.language)}</div>
                          <div className="text-caption text-[var(--text-tertiary)] mt-0.5">
                            {row.item.gri_code}
                            {row.item.scope_split ? ` · ${row.item.scope_split}` : ''}
                            {row.item.target_fy2026 != null ? ` · ${t('reportPreview.table.target', { value: row.item.target_fy2026 })}` : ''}
                          </div>
                        </td>
                        <td className="py-2 pr-2 text-[var(--text-tertiary)]">{f.unit(row.item.unit)}</td>
                        <td className="py-2 px-1 text-right tabular-nums text-[var(--text-secondary)]">{f.number(hist[2022] as number | undefined)}</td>
                        <td className="py-2 px-1 text-right tabular-nums text-[var(--text-secondary)]">{f.number(hist[2023] as number | undefined)}</td>
                        <td className="py-2 px-1 text-right tabular-nums text-[var(--text-secondary)]">{f.number(hist[2024] as number | undefined)}</td>
                        <td className="py-2 px-1 text-right tabular-nums text-[var(--text-secondary)]">{f.number(hist[2025] as number | undefined)}</td>
                        <td className="py-2 pl-1 text-right tabular-nums font-semibold text-[var(--text-primary)] bg-[var(--color-brand-soft)]">
                          {f.number(row.current?.value ?? null)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table></div>
              {sub.rows.some(r => r.item.footnote_refs.length > 0) && (
                <p className="text-caption text-[var(--text-tertiary)] mt-2 italic">
                  {t('reportPreview.table.footnotes')} {Array.from(new Set(sub.rows.flatMap(r => r.item.footnote_refs))).join('; ')}
                </p>
              )}
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}
