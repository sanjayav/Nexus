/**
 * GapAnalysisPanel — Workiva-style "ESRS Intelligence" chat surface.
 *
 * Mounted as a tab in the DisclosureEditor right rail. Users ask natural-
 * language questions ("what's missing for ESRS E1?", "which disclosures
 * unblock assurance?") and Claude responds with structured output (summary,
 * missingItems, qualityIssues, recommendedNextSteps).
 *
 * Each missing item has an "Open" button → calls onOpenCell(qiId) which the
 * parent uses to focus the matching disclosure cell. Cell matching is best-
 * effort by gri_code + line_item; falls back to gri_code alone.
 *
 * Caching: the backend returns a cached row for 1h per (org, framework, year).
 * "Regenerate" forces a fresh call.
 */
import { useCallback, useState } from 'react'
import { Sparkles, Send, RefreshCw, Copy, AlertTriangle, ChevronRight, ListChecks, CheckCircle2 } from 'lucide-react'
import { ai, type AiGapAnalysis, type NexusQuestionnaireItem } from '../../lib/api'
import { isUnconfiguredError } from '../../lib/api'
import { useIntegrationStatus } from '../../lib/integrations'
import { Skeleton } from '../Skeleton'
import { integrationLabels } from '../IntegrationGatedButton'

export interface GapAnalysisPanelProps {
  frameworkId: string
  reportingYear: number
  /** All questionnaire items in the active framework — used to map an AI-suggested
   *  missing item back to a clickable cell id. */
  items: NexusQuestionnaireItem[]
  /** Caller focuses the matching disclosure cell in the editor document. */
  onOpenCell?: (questionnaireItemId: string) => void
}

const SUGGESTED_PROMPTS = [
  'Show all gaps for this framework.',
  'What is required for limited assurance?',
  'Which disclosures should I prioritise?',
  'What data-quality issues do I have?',
]

type FetchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string; unconfigured?: boolean }
  | { kind: 'ready'; analysis: AiGapAnalysis; cached: boolean; generatedAt: string }

export default function GapAnalysisPanel({
  frameworkId, reportingYear, items, onOpenCell,
}: GapAnalysisPanelProps) {
  const [question, setQuestion] = useState('')
  const [state, setState] = useState<FetchState>({ kind: 'idle' })
  const integrationStatus = useIntegrationStatus()
  // We don't disable the form purely on integration status — letting the user
  // submit and seeing the structured "ANTHROPIC_API_KEY not configured" error
  // matches the AiExtractionPanel pattern. The only thing we gate is the
  // visual "ai not configured" tooltip on the button.
  const aiUnavailable = !integrationStatus.loading && !integrationStatus.ai

  const run = useCallback(async (q: string, regenerate = false) => {
    if (!q.trim()) return
    setState({ kind: 'loading' })
    try {
      const res = await ai.analyzeGaps({
        frameworkId,
        reportingYear,
        question: q,
        regenerate,
      })
      setState({
        kind: 'ready',
        analysis: res.analysis,
        cached: res.cached,
        generatedAt: res.generatedAt,
      })
    } catch (err) {
      if (isUnconfiguredError(err)) {
        setState({ kind: 'error', message: integrationLabels.ai, unconfigured: true })
      } else {
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Gap analysis failed',
        })
      }
    }
  }, [frameworkId, reportingYear])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    void run(question)
  }, [question, run])

  const handleSuggested = useCallback((q: string) => {
    setQuestion(q)
    void run(q)
  }, [run])

  const handleRegenerate = useCallback(() => {
    if (!question.trim()) return
    void run(question, true)
  }, [question, run])

  // Resolve a missingItem (code + lineItem) → questionnaire_item id.
  // Strict match first, then code-only fallback. Returns null if no match.
  const resolveItemId = useCallback((code: string, lineItem: string): string | null => {
    const strict = items.find(i => i.gri_code === code && i.line_item === lineItem)
    if (strict) return strict.id
    const byCode = items.find(i => i.gri_code === code)
    return byCode?.id ?? null
  }, [items])

  const handleCopySummary = useCallback(() => {
    if (state.kind !== 'ready') return
    const text = [
      state.analysis.summary,
      '',
      `Missing (${state.analysis.missingCount}):`,
      ...state.analysis.missingItems.map(m => `  • ${m.code} — ${m.lineItem} [${m.estimated_effort}]`),
      '',
      'Next steps:',
      ...state.analysis.recommendedNextSteps.map((s, i) => `  ${i + 1}. ${s}`),
    ].join('\n')
    void navigator.clipboard?.writeText(text)
  }, [state])

  return (
    <div data-testid="gap-analysis-panel" className="flex flex-col gap-4 p-5">
      <header>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand)]" />
          <h3 className="font-display text-[var(--text-base)] font-semibold text-[var(--text-primary)]">
            Gap Analysis
          </h3>
        </div>
        <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
          Ask anything about your framework completeness. Answers are grounded in your
          questionnaire and current data.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-2">
        <label className="sr-only" htmlFor="gap-question">Question</label>
        <textarea
          id="gap-question"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder={`What ${frameworkId.toUpperCase()} datapoints am I missing for FY${reportingYear}?`}
          rows={3}
          disabled={state.kind === 'loading'}
          className="w-full px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] resize-none"
        />
        <div className="flex items-center justify-between gap-2">
          <button
            type="submit"
            disabled={!question.trim() || state.kind === 'loading'}
            className="inline-flex items-center gap-1 px-3 h-7 rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-white text-[11px] font-semibold hover:bg-[var(--color-brand-strong)] disabled:opacity-50 disabled:cursor-not-allowed"
            title={aiUnavailable ? integrationLabels.ai : undefined}
          >
            <Send className="w-3 h-3" /> Analyse
          </button>
          {state.kind === 'ready' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1 px-2 h-6 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                title="Copy summary"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                className="inline-flex items-center gap-1 px-2 h-6 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                title="Run a fresh analysis (skip cache)"
              >
                <RefreshCw className="w-3 h-3" /> Regenerate
              </button>
            </div>
          )}
        </div>
      </form>

      {state.kind === 'idle' && (
        <section>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mb-2">
            Try one of these
          </div>
          <ul className="space-y-1">
            {SUGGESTED_PROMPTS.map(p => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => handleSuggested(p)}
                  className="w-full text-left px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-[11px] text-[var(--text-secondary)]"
                  title={aiUnavailable ? integrationLabels.ai : undefined}
                >
                  <ChevronRight className="inline w-2.5 h-2.5 text-[var(--color-brand)] mr-1" />
                  {p}
                </button>
              </li>
            ))}
          </ul>
          {aiUnavailable && (
            <p className="mt-3 text-[10px] text-[var(--text-tertiary)] italic leading-relaxed">
              {integrationLabels.ai}
            </p>
          )}
        </section>
      )}

      {state.kind === 'loading' && (
        <div data-testid="gap-analysis-loading" className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <div className="pt-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full mt-1.5" />
            <Skeleton className="h-10 w-full mt-1.5" />
          </div>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="rounded-[var(--radius-sm)] border border-[var(--status-reject)]/30 bg-[var(--accent-red-light)] px-3 py-2 text-[11px] text-[var(--status-reject)] flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{state.message}</span>
        </div>
      )}

      {state.kind === 'ready' && (
        <div className="space-y-4">
          <section>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
                Summary
              </span>
              {state.cached && (
                <span className="px-1.5 h-4 inline-flex items-center rounded-full bg-[var(--accent-blue-light)] text-[var(--status-pending)] text-[9px] font-semibold uppercase tracking-wider">
                  Cached
                </span>
              )}
            </div>
            <p className="text-[12px] text-[var(--text-primary)] leading-relaxed">
              {state.analysis.summary}
            </p>
          </section>

          {state.analysis.missingItems.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 mb-2">
                <ListChecks className="w-3 h-3 text-[var(--color-brand)]" />
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
                  Missing ({state.analysis.missingCount})
                </span>
              </div>
              <ul className="space-y-1.5">
                {state.analysis.missingItems.map((m, idx) => {
                  const matchId = resolveItemId(m.code, m.lineItem)
                  return (
                    <li
                      key={`${m.code}-${m.lineItem}-${idx}`}
                      className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-2.5"
                      data-testid={`gap-missing-${m.code}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono text-[var(--text-tertiary)]">{m.code}</div>
                          <div className="text-[11px] font-semibold text-[var(--text-primary)] leading-snug">
                            {m.lineItem}
                          </div>
                        </div>
                        <span className={`px-1.5 h-4 inline-flex items-center rounded-full text-[9px] font-semibold uppercase tracking-wider flex-shrink-0 ${effortPill(m.estimated_effort)}`}>
                          {m.estimated_effort}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                        {m.why_critical}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        {m.suggested_owner_role && (
                          <span className="text-[9px] font-mono text-[var(--text-tertiary)]">
                            Owner: {m.suggested_owner_role}
                          </span>
                        )}
                        {matchId && onOpenCell && (
                          <button
                            type="button"
                            onClick={() => onOpenCell(matchId)}
                            className="inline-flex items-center gap-0.5 px-2 h-5 rounded-[var(--radius-xs)] bg-[var(--color-brand-soft)] text-[var(--color-brand)] text-[9px] font-semibold hover:opacity-80"
                          >
                            Open <ChevronRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {state.analysis.qualityIssues.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
                  Quality issues
                </span>
              </div>
              <ul className="space-y-1">
                {state.analysis.qualityIssues.map((q, idx) => (
                  <li key={idx} className="text-[11px] text-[var(--text-secondary)] flex items-start gap-1.5">
                    <span className="font-mono text-[10px] text-[var(--text-tertiary)] mt-0.5">{q.code}</span>
                    <span>{q.issue}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {state.analysis.recommendedNextSteps.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-3 h-3 text-[var(--status-ok)]" />
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">
                  Recommended next steps
                </span>
              </div>
              <ol className="space-y-1 list-decimal list-inside text-[11px] text-[var(--text-primary)]">
                {state.analysis.recommendedNextSteps.map((s, idx) => (
                  <li key={idx} className="leading-relaxed">{s}</li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function effortPill(effort: 'low' | 'medium' | 'high'): string {
  if (effort === 'low') return 'bg-[var(--accent-green-light)] text-[var(--status-ok)]'
  if (effort === 'medium') return 'bg-[var(--accent-amber-light)] text-[var(--status-draft)]'
  return 'bg-[var(--accent-red-light)] text-[var(--status-reject)]'
}
