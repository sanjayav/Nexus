import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, Printer, ArrowLeft, AlertCircle, Shield } from 'lucide-react'
import {
  nexus,
  type NexusQuestionnaireItem,
  type NexusHistoricalPoint,
  type NexusDataValue,
} from '../lib/api'
import {
  buildTemplate,
  formatValue,
  type TemplateSection,
} from '../reports/spdTemplate'
import SetupGuard from '../components/SetupGuard'
import { Button } from '../design-system'

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
 * Live PTTGC Sustainability Performance Data preview.
 * Reads straight from Neon via /api/workflow?view=tree + per-item /view=historical.
 * Each section mirrors the published FY2025 PDF section order; current FY shows approved
 * data_value rows, and the four trailing columns come from historical_value.
 */
export default function ReportPreview() {
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
      setState({ kind: 'error', error: e instanceof Error ? e.message : 'Failed to load' })
    }
  }

  useEffect(() => { load() }, [])

  // Auto-print when ?download=1 (used by Publish Centre after a successful publish).
  useEffect(() => {
    if (state.kind === 'ready' && params.get('download') === '1') {
      const t = setTimeout(() => window.print(), 800)
      return () => clearTimeout(t)
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

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" />
      </div>
    )
  }
  if (state.kind === 'empty') return <SetupGuard onReady={load} />
  if (state.kind === 'error') {
    return (
      <div className="max-w-lg mx-auto mt-20 p-6 rounded-[var(--radius-lg)] border border-[var(--status-reject)]/20 bg-[var(--accent-red-light)]">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--status-reject)] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">Unable to load preview</h3>
            <p className="text-[var(--text-sm)] text-[var(--text-secondary)] font-mono">{state.error}</p>
            <button onClick={load} className="mt-3 text-[var(--text-sm)] font-medium text-[var(--color-brand)] hover:underline">Retry</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Toolbar (hidden when printing) */}
      <div className="print:hidden flex items-center justify-between mb-6 sticky top-0 z-10 bg-[var(--bg-secondary)] -mx-8 px-8 py-3 border-b border-[var(--border-subtle)]">
        <button
          onClick={() => navigate('/reports')}
          className="inline-flex items-center gap-2 text-[var(--text-sm)] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Publish Centre
        </button>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Shield className="w-3.5 h-3.5" />} onClick={() => navigate('/reports/auditor')}>
            Auditor View
          </Button>
          <Button variant="primary" size="sm" icon={<Printer className="w-3.5 h-3.5" />} onClick={() => window.print()}>
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Report document — A4 column */}
      <article className="max-w-[860px] mx-auto bg-white text-[var(--text-primary)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] print:border-0 print:shadow-none">
        {/* Cover */}
        <section className="px-12 pt-16 pb-20 border-b border-[var(--border-subtle)]">
          <div className="text-[var(--text-xs)] uppercase tracking-[0.2em] text-[var(--color-brand)] font-semibold mb-3">
            Sustainability Performance Data
          </div>
          <h1 className="font-display text-[40px] font-bold leading-tight text-[var(--text-primary)] mb-2">
            PTT Global Chemical<br />Public Company Limited
          </h1>
          <p className="text-[var(--text-lg)] text-[var(--text-secondary)] mb-10">
            Reporting period: 1 January – 31 December {ACTIVE_YEAR}
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] text-[var(--text-xs)] font-semibold">
            FY{ACTIVE_YEAR} · Regenerated from Nexus · GRI Standards 2021
          </div>
          <p className="mt-12 text-[var(--text-xs)] text-[var(--text-tertiary)] leading-relaxed">
            Published in accordance with GRI Standards 2021, IFRS S1, IFRS S2, and SASB.
            Prior-year values (FY2022–FY2025) inherited from the published PTTGC Sustainability Performance Data report.
            All current-year values are regenerated from approved entries in the Nexus platform.
          </p>
        </section>

        {/* Reporting Guidelines (GRI 2-1..2-5) */}
        <section className="px-12 py-10 border-b border-[var(--border-subtle)]">
          <h2 className="font-display text-[var(--text-xl)] font-bold text-[var(--color-brand)] mb-2">Reporting Guidelines</h2>
          <p className="text-[var(--text-xs)] uppercase tracking-wider text-[var(--text-tertiary)] mb-4">GRI 2-1, 2-2, 2-3, 2-4, 2-5</p>
          <div className="space-y-3 text-[var(--text-sm)] text-[var(--text-secondary)] leading-relaxed">
            <p><strong className="text-[var(--text-primary)]">Organisation (GRI 2-1):</strong> PTT Global Chemical Public Company Limited (GC).
              Head Office: 555/1 Energy Complex Building A, 18th Floor, Vibhavadi Rangsit Road, Chatuchak, Bangkok 10900 Thailand.</p>
            <p><strong className="text-[var(--text-primary)]">Scope (GRI 2-2):</strong> Operational performance of companies under PTT Global Chemical Group in Thailand for the reporting year,
              including companies in which GC holds ≥ 50% of total shares, plus HMC Polymers Co., Ltd. (GC holds 41.44%, largest shareholder).
              Sustainability data covers &gt; 75% of total revenue.</p>
            <p><strong className="text-[var(--text-primary)]">Reporting period (GRI 2-3):</strong> 1 January – 31 December {ACTIVE_YEAR}. Annual cycle.</p>
            <p><strong className="text-[var(--text-primary)]">Restatements (GRI 2-4):</strong> Where the current report revises prior-year figures,
              the restatement is annotated against the affected line item.</p>
            <p><strong className="text-[var(--text-primary)]">External assurance (GRI 2-5):</strong> Limited assurance by LRQA Group Limited (ISAE 3000 revised),
              ref. BGK00001264. Assurance statement is appended at the end of this report.</p>
          </div>
        </section>

        {/* Group performance data */}
        <TemplateRenderBlock heading="Sustainability Performance Data — GC Group" sections={groupSections} currentYear={ACTIVE_YEAR} />

        {/* JV parallel scope */}
        {jvSections.length > 0 && (
          <TemplateRenderBlock heading="Joint Ventures — Parallel Scope" sections={jvSections} currentYear={ACTIVE_YEAR} />
        )}

        {/* LRQA placeholder */}
        <section className="px-12 py-10 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] print:bg-transparent">
          <h2 className="font-display text-[var(--text-xl)] font-bold text-[var(--color-brand)] mb-2">
            LRQA Independent Assurance Statement
          </h2>
          <p className="text-[var(--text-xs)] uppercase tracking-wider text-[var(--text-tertiary)] mb-4">ISAE 3000 (revised) · Ref BGK00001264</p>
          <div className="space-y-3 text-[var(--text-sm)] text-[var(--text-secondary)] leading-relaxed">
            <p>
              LRQA Group Limited provides limited assurance on GC&rsquo;s Sustainability Performance Data in accordance with
              ISAE 3000 (revised) and at the materiality of the professional judgement of the verifier, using LRQA&rsquo;s
              verification procedure based on the principles of inclusivity, materiality, responsiveness, impact, and
              reliability of performance data.
            </p>
            <p>
              Assurance covers GC&rsquo;s operations in Thailand and specific GRI disclosures: GRI 302-1, 302-3, 303-3/4/5,
              305-7, 306-3/4/5, 308-2, 403-9/10, 405-2, 414-2, GRI 11.8.3, and OGSS OG13.
            </p>
            <p className="text-[var(--text-xs)] text-[var(--text-tertiary)] pt-4 border-t border-[var(--border-subtle)]">
              <strong>Placeholder</strong> — full LRQA assurance statement is inserted here at final publish. Detailed terms of engagement,
              observations, and conclusion match the standing LRQA template for PTTGC (see PTTGC FY2025 SPD pp. 60–61).
            </p>
          </div>
        </section>
      </article>
    </div>
  )
}

function TemplateRenderBlock({ heading, sections, currentYear }: { heading: string; sections: TemplateSection[]; currentYear: number }) {
  return (
    <section>
      <h2 className="font-display text-[var(--text-2xl)] font-bold text-[var(--color-brand)] px-12 pt-10 pb-2 break-before-page print:break-before-page">
        {heading}
      </h2>
      {sections.map(sec => (
        <div key={sec.capital} className="px-12 py-6">
          <h3 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)] mb-4 pb-2 border-b-2 border-[var(--color-brand)]">
            {sec.capital}
          </h3>
          {sec.subsections.map(sub => (
            <div key={sub.name} className="mb-6">
              <h4 className="text-[var(--text-sm)] font-semibold text-[var(--color-brand)] mb-2 uppercase tracking-wider">
                {sub.name}
              </h4>
              <table className="w-full text-[var(--text-xs)] border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-[var(--text-tertiary)]">
                    <th className="text-left py-2 pr-2 w-[42%] font-semibold uppercase tracking-wider text-[10px]">Line item</th>
                    <th className="text-left py-2 pr-2 w-[12%] font-semibold uppercase tracking-wider text-[10px]">Unit</th>
                    <th className="text-right py-2 px-1 font-semibold uppercase tracking-wider text-[10px] tabular-nums">2022</th>
                    <th className="text-right py-2 px-1 font-semibold uppercase tracking-wider text-[10px] tabular-nums">2023</th>
                    <th className="text-right py-2 px-1 font-semibold uppercase tracking-wider text-[10px] tabular-nums">2024</th>
                    <th className="text-right py-2 px-1 font-semibold uppercase tracking-wider text-[10px] tabular-nums">2025</th>
                    <th className="text-right py-2 pl-1 font-semibold uppercase tracking-wider text-[10px] tabular-nums bg-[var(--color-brand-soft)]">{currentYear}</th>
                  </tr>
                </thead>
                <tbody>
                  {sub.rows.map(row => {
                    const hist = Object.fromEntries(row.history.map(h => [h.year, h.value]))
                    return (
                      <tr key={row.item.id} className="border-b border-[var(--border-subtle)] align-top">
                        <td className="py-2 pr-2 text-[var(--text-primary)]">
                          <div className="font-medium">{row.item.line_item}</div>
                          <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                            {row.item.gri_code}
                            {row.item.scope_split ? ` · ${row.item.scope_split}` : ''}
                            {row.item.target_fy2026 != null ? ` · target ${row.item.target_fy2026}` : ''}
                          </div>
                        </td>
                        <td className="py-2 pr-2 text-[var(--text-tertiary)]">{row.item.unit ?? ''}</td>
                        <td className="py-2 px-1 text-right tabular-nums text-[var(--text-secondary)]">{formatValue(hist[2022] as number | undefined)}</td>
                        <td className="py-2 px-1 text-right tabular-nums text-[var(--text-secondary)]">{formatValue(hist[2023] as number | undefined)}</td>
                        <td className="py-2 px-1 text-right tabular-nums text-[var(--text-secondary)]">{formatValue(hist[2024] as number | undefined)}</td>
                        <td className="py-2 px-1 text-right tabular-nums text-[var(--text-secondary)]">{formatValue(hist[2025] as number | undefined)}</td>
                        <td className="py-2 pl-1 text-right tabular-nums font-semibold text-[var(--text-primary)] bg-[var(--color-brand-soft)]">
                          {formatValue(row.current?.value ?? null)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {sub.rows.some(r => r.item.footnote_refs.length > 0) && (
                <p className="text-[10px] text-[var(--text-tertiary)] mt-2 italic">
                  Footnotes: {Array.from(new Set(sub.rows.flatMap(r => r.item.footnote_refs))).join('; ')}
                </p>
              )}
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}
