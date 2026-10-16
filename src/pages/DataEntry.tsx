import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { itemLabel } from '../lib/itemLabel'
import { localizeCalc, localizeUnit } from '../calculators/labels'
import {
  ArrowLeft, Loader2, AlertCircle, CheckCircle2, Upload, Plug, Calculator as CalcIcon,
  PencilLine, Send, Hash, FileText, X, CalendarClock,
} from 'lucide-react'
import {
  ai,
  nexus,
  type AiExtractionResult,
  type NexusQuestionnaireItem,
  type NexusHistoricalPoint,
  type NexusEvidence,
} from '../lib/api'
import { truncateHash, capitalLabelKey, subsectionLabelKey } from '../reports/spdTemplate'
import SetupGuard from '../components/SetupGuard'
import { Button } from '../design-system'
import { findCalculator, type CalcDescriptor, type CalcInputValues } from '../calculators/registry'
import { HistoricalReferencePanel } from '../components/HistoricalReferencePanel'
import { LinkedDataPanel } from '../components/LinkedDataPanel'
import AiExtractionPanel from '../components/AiExtractionPanel'
import { orgStore } from '../lib/orgStore'
import EmptyState from '../components/EmptyState'
import { useActiveReportingYear } from '../lib/activeReportingYear'

type EntryMode = 'Manual' | 'Calculator' | 'Connector'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'notfound' }
  | { kind: 'error'; error: string }
  | { kind: 'ready'; item: NexusQuestionnaireItem; history: NexusHistoricalPoint[]; tree: NexusQuestionnaireItem[] }

/**
 * Hero data-entry screen — SRD §10 Module 4.
 * Supports Manual, Calculator, Connector modes. Historical reference panel (SRD §11)
 * on the right. Every save → POST /api/workflow { action: 'enter-value' } → hash-chained
 * audit_event on the backend. Submit → POST { action: 'submit' } → moves to TL review queue.
 */
export default function DataEntry() {
  const { questionId } = useParams<{ questionId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  // The org's own open reporting year — every value is written into it.
  const activeYear = useActiveReportingYear()
  const reportingYearId = activeYear.kind === 'ready' ? activeYear.year.id : null
  const reportingYear = activeYear.kind === 'ready' ? activeYear.year.year : new Date().getFullYear()
  const [mode, setMode] = useState<EntryMode>('Manual')
  const [value, setValue] = useState<string>('')
  const [comment, setComment] = useState<string>('')

  // Draft-state tracking — set after enter-value succeeds.
  const [dataValueId, setDataValueId] = useState<string | null>(null)
  const [valueHash, setValueHash] = useState<string | null>(null)
  const [receiptHash, setReceiptHash] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'submitting' | 'submitted' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)

  // Calculator — registry-driven. Each GRI line item can bind to its own typed
  // calculator (Scope 1 fuel × EF × GWP, Scope 2 kWh × grid EF, TRIR, pay gap, etc.)
  // via src/calculators/registry.ts. If no descriptor matches, the Calculator mode
  // button is hidden for that question.
  const [calcValues, setCalcValues] = useState<CalcInputValues>({})

  // Evidence — required for Manual + Calculator modes before Submit (SRD §10.4 / §13.2).
  // Connector mode is exempt: the connector receipt hash acts as evidence.
  const [evidence, setEvidence] = useState<NexusEvidence[]>([])
  const [uploadingEvidence, setUploadingEvidence] = useState(false)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)

  // AI-extracted value tracking. The accepted extraction id is kept alongside
  // the data_value_id so we can POST /ai/accept-extraction once the user
  // submits — that's what gives auditors the "value X came from evidence Y"
  // linkage. We also stash the extraction id per-evidence so re-rendering
  // the panel doesn't lose state.
  const [pendingExtractionId, setPendingExtractionId] = useState<string | null>(null)

  const load = async () => {
    setState({ kind: 'loading' })
    try {
      const tree = await nexus.tree()
      if (tree.length === 0) return setState({ kind: 'empty' })
      const item = tree.find(t => t.id === questionId)
      if (!item) return setState({ kind: 'notfound' })
      const history = await nexus.historical(item.id)
      setState({ kind: 'ready', item, history, tree })
      const requested = searchParams.get('mode')
      const initial = (requested === 'Manual' || requested === 'Calculator' || requested === 'Connector')
        ? requested
        : item.entry_mode_default
      setMode(initial)
    } catch (e) {
      setState({ kind: 'error', error: e instanceof Error ? e.message : t('dataEntry.entry.failedToLoad') })
    }
  }

  useEffect(() => { load(); setDataValueId(null); setValueHash(null); setReceiptHash(null); setStatus('idle'); setValue(''); setComment(''); setCalcValues({}); setEvidence([]); setEvidenceError(null) }, [questionId])

  // Refresh evidence list whenever we have a saved draft.
  useEffect(() => {
    if (!dataValueId) { setEvidence([]); return }
    nexus.listEvidence(dataValueId).then(setEvidence).catch(() => { /* swallow */ })
  }, [dataValueId])

  const handleUploadEvidence = async (file: File) => {
    if (!dataValueId) {
      setEvidenceError(t('dataEntry.entry.saveDraftFirst'))
      return
    }
    const ALLOWED = ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'image/png', 'image/jpeg']
    if (file.type && !ALLOWED.includes(file.type)) {
      setEvidenceError(t('dataEntry.entry.unsupportedType', { type: file.type }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setEvidenceError(t('dataEntry.entry.tooLarge', { size: (file.size / 1024 / 1024).toFixed(1) }))
      return
    }
    setUploadingEvidence(true); setEvidenceError(null)
    try {
      const uploaded = await nexus.uploadEvidence(dataValueId, file)
      setEvidence(ev => [uploaded, ...ev])
    } catch (e) {
      setEvidenceError(e instanceof Error ? e.message : t('dataEntry.entry.uploadFailed'))
    } finally {
      setUploadingEvidence(false)
    }
  }

  const handleRemoveEvidence = async (id: string) => {
    try {
      await nexus.removeEvidence(id)
      setEvidence(ev => ev.filter(e => e.id !== id))
    } catch (e) {
      setEvidenceError(e instanceof Error ? e.message : t('dataEntry.entry.removeFailed'))
    }
  }

  // The registered calculator for the current question (null if none applies).
  // useMemo keeps the reference stable across renders — essential for the
  // useEffect below (otherwise an infinite render loop).
  const calculator: CalcDescriptor | null = useMemo(
    () => state.kind === 'ready' ? localizeCalc(t, findCalculator(state.item)) : null,
    [state, t]
  )

  // Snap mode back to a valid tab if the current mode isn't available for this
  // question (e.g. user came in with ?mode=Calculator but the item has no descriptor).
  // Depends only on primitives — no state-object identity, so no loop.
  useEffect(() => {
    if (mode === 'Calculator' && !calculator && state.kind === 'ready') {
      setMode(state.item.entry_mode_default)
    }
    // Safe: depending on the full `state` object would re-trigger the snap on
    // every fetch even when `state.kind` and the calculator haven't changed.
    // `mode` and `setMode` are deliberately excluded — `mode` is read inside
    // the guard but we only want to snap when calculator/state.kind flip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculator, state.kind])

  const calcResult = useMemo(() => {
    if (state.kind !== 'ready' || !calculator) return null
    return calculator.compute(calcValues, state.item)
  }, [calculator, calcValues, state])

  const effectiveValue = useMemo(() => {
    if (mode === 'Calculator') return calcResult
    if (mode === 'Manual') {
      const v = parseFloat(value)
      return Number.isNaN(v) ? null : v
    }
    return null // Connector — not entered by hand
  }, [mode, calcResult, value])

  const handleSaveDraft = async () => {
    if (state.kind !== 'ready' || effectiveValue == null || !reportingYearId) return
    setStatus('saving'); setErrMsg(null)
    try {
      const res = await nexus.enterValue({
        question_id: state.item.id,
        reporting_year_id: reportingYearId,
        scope_key: state.item.scope_split,
        value: effectiveValue,
        unit: state.item.unit ?? undefined,
        mode,
        comment: comment || undefined,
      })
      setDataValueId(res.id)
      setValueHash(res.value_hash)
      setStatus('saved')
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : t('dataEntry.entry.saveFailed'))
      setStatus('error')
    }
  }

  const handleConnectorPull = async () => {
    if (state.kind !== 'ready' || !reportingYearId) return
    setStatus('saving'); setErrMsg(null)
    try {
      const res = await nexus.connectorPull({
        question_id: state.item.id,
        reporting_year_id: reportingYearId,
        connector: pickConnector(state.item),
      })
      setDataValueId(res.id)
      setValueHash(res.value_hash)
      setReceiptHash(res.receipt_hash)
      setValue(String(res.value ?? ''))
      setStatus('saved')
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : t('dataEntry.entry.pullFailed'))
      setStatus('error')
    }
  }

  // Evidence is mandatory for Manual + Calculator modes before Submit.
  // Connector rows carry a connector_receipt (same chain), so skip the check.
  const needsEvidence = mode === 'Manual' || mode === 'Calculator'
  const hasEvidence = evidence.length > 0
  const canSubmit = !!dataValueId && (!needsEvidence || hasEvidence)

  // Accept handler for the AI extraction panel — fills the value field, sets
  // the unit hint into the comment, and stashes the extraction id so we can
  // record the audit linkage at submit time.
  const handleAcceptExtraction = (sourceFilename: string) => (extraction: AiExtractionResult) => {
    if (status === 'submitted' || status === 'submitting') return
    setMode('Manual')
    setValue(String(extraction.value))
    const note = t('dataEntry.entry.autoExtracted', { file: sourceFilename }) + (extraction.unit ? ` (${extraction.unit})` : '') + (extraction.period ? t('dataEntry.entry.autoExtractedPeriod', { period: extraction.period }) : '')
    setComment(prev => (prev && prev.length > 0 ? `${prev}\n${note}` : note))
    if (extraction.id) setPendingExtractionId(extraction.id)
  }

  const handleSubmit = async () => {
    if (!dataValueId) return
    if (needsEvidence && !hasEvidence) {
      setErrMsg(t('dataEntry.entry.needEvidence'))
      return
    }
    setStatus('submitting'); setErrMsg(null)
    try {
      await nexus.submit(dataValueId)
      // Record the AI-extraction → data_value linkage for audit trail. Best-
      // effort: a failure here shouldn't block the submit the user just made.
      if (pendingExtractionId) {
        try {
          await ai.acceptExtraction({ extractionId: pendingExtractionId, dataValueId })
        } catch {
          // eslint-disable-next-line no-console
          console.warn('[DataEntry] accept-extraction audit link failed; submit still recorded')
        }
      }
      setStatus('submitted')
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : t('dataEntry.entry.submitFailed'))
      setStatus('error')
    }
  }

  if (state.kind === 'loading' || activeYear.kind === 'loading') return <Center><Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" /></Center>
  if (state.kind === 'empty') return <SetupGuard onReady={load} />
  if (activeYear.kind === 'none') return (
    <EmptyState
      icon={CalendarClock}
      title={t('reportingYear.none.title')}
      body={t('reportingYear.none.body')}
      cta={{ label: t('reportingYear.none.cta'), onClick: () => navigate('/admin/periods') }}
      secondaryCta={{ label: t('reportingYear.none.retry'), onClick: activeYear.reload }}
    />
  )
  if (activeYear.kind === 'error') return <ErrorPane error={activeYear.error} onRetry={activeYear.reload} />
  if (state.kind === 'notfound') return (
    <div className="max-w-lg mx-auto mt-20 p-6 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-primary)]">
      <h2 className="font-semibold text-[var(--text-primary)] mb-1">{t('dataEntry.entry.notFound')}</h2>
      <p className="text-[length:var(--text-sm)] text-[var(--text-secondary)] mb-4">{t('dataEntry.entry.notFoundBody')}</p>
      <Button variant="primary" size="sm" onClick={() => navigate('/data/entry')}>{t('dataEntry.entry.backToPicker')}</Button>
    </div>
  )
  if (state.kind === 'error') return <ErrorPane error={state.error} onRetry={load} />

  const { item } = state

  return (
    <div>
      {/* Top breadcrumb */}
      <div className="topbar-surface flex items-center justify-between mb-6 sticky top-0 z-10 -mx-8 px-8 py-3">
        <button
          onClick={() => navigate('/data/entry')}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" /> {t('dataEntry.entry.allQuestions')}
        </button>
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-tertiary)]">
          <span>{t(capitalLabelKey(item.section), { defaultValue: item.section })}</span>
          <span className="text-[var(--text-quaternary)]">/</span>
          <span>{t(subsectionLabelKey(item.subsection), { defaultValue: item.subsection })}</span>
          <span className="text-[var(--text-quaternary)]">/</span>
          <span className="font-semibold text-[var(--text-primary)]">{item.gri_code}</span>
          <span className="ml-2 chip chip-active">
            {t(`workflowStatus.role.${item.default_workflow_role}`, { defaultValue: item.default_workflow_role })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_380px] gap-6 items-start">
        {/* MAIN — entry form */}
        <div className="space-y-5">
          {/* Question header — hero treatment */}
          <div className="surface-hero p-7">
            <div className="kicker mb-3">{item.gri_code}</div>
            <h1 className="text-display text-[28px] md:text-[32px] text-[var(--text-primary)] leading-[1.1] max-w-2xl">{itemLabel(item, i18n.language)}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-5">
              {item.unit && <span className="chip"><span className="text-[var(--text-quaternary)]">{t('dataEntry.entry.unit')}</span><strong className="text-[var(--text-primary)]">{localizeUnit(t, item.unit)}</strong></span>}
              {item.scope_split && <span className="chip"><span className="text-[var(--text-quaternary)]">{t('dataEntry.entry.scope')}</span><strong className="text-[var(--text-primary)]">{t(`dataEntry.scope.${item.scope_split}`, { defaultValue: item.scope_split })}</strong></span>}
              {item.target_fy2026 != null && <span className="chip chip-active"><span>{t('dataEntry.entry.target', { year: 2026 /* target_fy2026 is an FY2026 target */ })}</span><strong>{item.target_fy2026}</strong></span>}
              <span className="chip"><span className="text-[var(--text-quaternary)]">{t('dataEntry.entry.reporting')}</span><strong className="text-[var(--text-primary)]">{item.reporting_scope === 'jv' ? t('dataEntry.entry.jvParallel') : t('dataEntry.entry.group')}</strong></span>
            </div>
          </div>

          {/* ──────────────────────────────────────────
              LINKED DATA — Workiva-style propagation panel.
              Shows every framework that auto-syncs from this disclosure.
              ────────────────────────────────────────── */}
          <LinkedDataPanel
            questionnaireItemId={item.id}
            onPeerClick={(peer) => navigate(`/data/entry/${peer.questionnaire_item_id}`)}
          />

          {/* ──────────────────────────────────────────
              COMPARE SOURCES — all references side by side
              so the contributor can cross-verify before
              committing a value.
              ────────────────────────────────────────── */}
          <CompareSources
            item={item}
            calcResult={calcResult}
            calculator={calculator}
            manualValue={parseFloat(value) || null}
            connectorValue={mode === 'Connector' && receiptHash ? parseFloat(value) || null : null}
            onUse={(_src, v) => {
              if (v == null) return
              setMode('Manual')
              setValue(String(v))
            }}
          />

          {/* ──────────────────────────────────────────
              VALUE — the single field that gets submitted.
              Mode chips switch what helper block shows, but
              the manual field is always the source of truth.
              ────────────────────────────────────────── */}
          <div className="surface-paper overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="kicker !mb-0">{t('dataEntry.entry.yourSubmission')}</span>
                <div className="flex gap-1">
                  {(['Manual', 'Calculator', 'Connector'] as EntryMode[])
                    .filter(m => m !== 'Calculator' || calculator != null)
                    .map(m => {
                      const active = mode === m
                      const Icon = m === 'Manual' ? PencilLine : m === 'Calculator' ? CalcIcon : Plug
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMode(m)}
                          disabled={status === 'saving' || status === 'submitting' || status === 'submitted'}
                          className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-[7px] text-[12px] font-semibold transition-all ${
                            active
                              ? 'bg-[var(--accent-teal-subtle)] text-[var(--color-brand-strong)] shadow-[inset_0_0_0_1px_rgba(4, 120, 87,0.2)]'
                              : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {t(`dataEntry.mode.${m}`)}
                        </button>
                      )
                    })}
                </div>
              </div>

              {/* Value block per mode */}
              {mode === 'Manual' && (
                <label className="block">
                  <span className="block text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] mb-2">
                    {t('dataEntry.entry.valueFor', { year: reportingYear })}
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      value={value}
                      onChange={e => setValue(e.target.value)}
                      disabled={status === 'saved' || status === 'submitting' || status === 'submitted'}
                      placeholder={t('dataEntry.entry.valuePlaceholder')}
                      className="flex-1 px-4 h-12 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[22px] font-bold tabular-nums tracking-[-0.01em] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/15 outline-none disabled:bg-[var(--bg-secondary)] transition-all"
                    />
                    {item.unit && (
                      <div className="px-4 h-12 rounded-[10px] bg-[var(--bg-secondary)] text-[13px] font-semibold text-[var(--text-secondary)] flex items-center border border-[var(--border-subtle)]">
                        {localizeUnit(t, item.unit)}
                      </div>
                    )}
                  </div>
                </label>
              )}

              {mode === 'Calculator' && calculator && (
                <div className="space-y-4">
                  <div className="text-caption text-[var(--text-tertiary)] leading-relaxed">
                    {t('dataEntry.entry.calcIntro', { description: calculator.description })}
                  </div>
                  <div className={`grid gap-3 ${calculator.inputs.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {calculator.inputs.map(input => (
                      <CalcField
                        key={input.key}
                        input={input}
                        value={calcValues[input.key] ?? (input.default != null ? String(input.default) : '')}
                        onChange={v => setCalcValues(s => ({ ...s, [input.key]: v }))}
                      />
                    ))}
                  </div>
                  {calculator.footnotes && calculator.footnotes.length > 0 && (
                    <div className="text-caption text-[var(--text-tertiary)] leading-relaxed italic">
                      {t('calculators.page.methodology', { notes: calculator.footnotes.join(t('calculators.page.listSeparator')) })}
                    </div>
                  )}
                </div>
              )}

              {mode === 'Connector' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-[9px] flex items-center justify-center" style={{ background: 'var(--accent-teal-subtle)', color: 'var(--color-brand)' }}>
                        <Plug className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{pickConnector(item)}</div>
                        <div className="text-caption text-[var(--text-tertiary)]">{t('dataEntry.entry.connectorHint')}</div>
                      </div>
                      {!receiptHash && (
                        <Button
                          variant="brand"
                          size="sm"
                          icon={status === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />}
                          onClick={handleConnectorPull}
                          disabled={status === 'saving' || status === 'saved'}
                        >
                          {status === 'saving' ? t('dataEntry.entry.pulling') : t('dataEntry.entry.pull')}
                        </Button>
                      )}
                    </div>
                    {receiptHash && (
                      <div className="mt-3 p-3 rounded-[8px] bg-[var(--accent-green-light)] border border-[var(--status-ok)]/20">
                        <div className="flex items-center gap-2 text-[12px] text-[var(--status-ok)] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t('dataEntry.entry.pulled')} <span className="font-mono tabular-nums">{value}</span> {localizeUnit(t, item.unit)}
                        </div>
                        <div className="text-caption text-[var(--text-tertiary)] font-mono mt-1">{t('dataEntry.entry.receipt', { hash: truncateHash(receiptHash, 10, 8) })}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Evidence — required for Manual + Calculator */}
              {(mode === 'Manual' || mode === 'Calculator') && (
                <div className="mt-5">
                  <EvidenceZone
                    dataValueId={dataValueId}
                    evidence={evidence}
                    uploading={uploadingEvidence}
                    error={evidenceError}
                    onUpload={handleUploadEvidence}
                    onRemove={handleRemoveEvidence}
                    locked={status === 'submitting' || status === 'submitted' || status === 'error'}
                    aiExtraction={{
                      questionnaireItemId: state.item.id,
                      expectedUnit: state.item.unit ?? undefined,
                      lineItemHint: state.item.line_item,
                      onAccept: handleAcceptExtraction,
                      disabled: status === 'submitting' || status === 'submitted',
                    }}
                  />
                </div>
              )}

              {/* Comment */}
              <div className="mt-4">
                <label className="block">
                  <span className="block text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] mb-1.5">
                    {t('dataEntry.entry.commentLabel')}
                  </span>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    disabled={status === 'saved' || status === 'submitting' || status === 'submitted'}
                    rows={2}
                    maxLength={500}
                    placeholder={t('dataEntry.entry.commentPlaceholder')}
                    className="w-full px-3 py-2 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/15 outline-none disabled:bg-[var(--bg-secondary)] resize-none transition-all"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Save + Submit bar */}
          <div className="surface-paper p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 text-[12.5px] min-w-0">
                <StatusChip status={status} />
                {valueHash && (
                  <span className="inline-flex items-center gap-1.5 font-mono text-[var(--text-tertiary)]">
                    <Hash className="w-3 h-3" />
                    {truncateHash(valueHash, 8, 6)}
                  </span>
                )}
                {errMsg && <span className="text-[var(--status-reject)] truncate font-medium">{errMsg}</span>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {status !== 'saved' && status !== 'submitted' && mode !== 'Connector' && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleSaveDraft}
                    disabled={effectiveValue == null || status === 'saving'}
                    icon={<Upload className="w-4 h-4" />}
                  >
                    {t('dataEntry.entry.saveDraft')}
                  </Button>
                )}
                {status === 'saved' && dataValueId && (
                  <Button
                    variant="brand"
                    size="md"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    icon={<Send className="w-4 h-4" />}
                  >
                    {needsEvidence && !hasEvidence ? t('dataEntry.entry.attachToSubmit') : t('dataEntry.entry.submitForReview')}
                  </Button>
                )}
                {status === 'submitted' && (
                  <Button variant="secondary" size="md" onClick={() => navigate('/workflow/review')}>
                    {t('dataEntry.entry.viewInQueue')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SIDE — Historical Reference Panel (4yr + anomaly detection) */}
        <aside className="sticky top-[72px] surface-paper overflow-hidden">
          <HistoricalReferencePanel
            questionnaire_item_id={item.id}
            currentValue={effectiveValue}
            currentYear={reportingYear}
          />
        </aside>
      </div>
    </div>
  )
}

// ─── Supporting components ──────────────────────────────────

function CalcField({ input, value, onChange }: { input: import('../calculators/registry').CalcInput; value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  return (
    <label className="block">
      <span className="block text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] mb-1">
        {input.label}
        {input.unit && <span className="ml-1 text-[var(--text-tertiary)]/70 normal-case tracking-normal">({localizeUnit(t, input.unit)})</span>}
      </span>
      {input.options ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-2.5 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-sm)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none"
        >
          <option value="">{t('dataEntry.entry.select')}</option>
          {input.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          type="number"
          step="any"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={input.placeholder}
          className="w-full px-2.5 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-sm)] tabular-nums focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none"
        />
      )}
      {input.hint && <span className="block text-caption text-[var(--text-tertiary)] mt-1">{input.hint}</span>}
      {input.options && value && (() => {
        const opt = input.options!.find(o => o.value === value)
        return opt?.note ? <span className="block text-caption text-[var(--color-brand)] mt-1 font-mono">{opt.note}</span> : null
      })()}
    </label>
  )
}

function EvidenceZone({
  dataValueId, evidence, uploading, error, onUpload, onRemove, locked, aiExtraction,
}: {
  dataValueId: string | null
  evidence: NexusEvidence[]
  uploading: boolean
  error: string | null
  onUpload: (file: File) => void
  onRemove: (id: string) => void
  locked: boolean
  /** Optional AI-extraction wiring. When present, each uploaded evidence file
   *  renders an AiExtractionPanel below it. */
  aiExtraction?: {
    questionnaireItemId?: string
    expectedUnit?: string
    expectedPeriod?: string
    lineItemHint?: string
    /** Returns a handler bound to the source filename so the parent can keep
     *  a coherent audit-trail note. */
    onAccept: (filename: string) => (extraction: AiExtractionResult) => void
    disabled?: boolean
  }
}) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const trigger = () => fileInputRef.current?.click()
  const handleFile = (f: File | undefined) => { if (f) onUpload(f) }
  const canUpload = !!dataValueId && !locked

  const empty = evidence.length === 0

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        onClick={canUpload ? trigger : undefined}
        onDragOver={e => { if (canUpload) { e.preventDefault(); setDragging(true) } }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault(); setDragging(false)
          if (canUpload) handleFile(e.dataTransfer.files[0])
        }}
        className={`p-4 rounded-[var(--radius-md)] border-2 border-dashed text-center transition-colors ${
          !canUpload
            ? 'border-[var(--border-default)] bg-[var(--bg-secondary)] opacity-60 cursor-not-allowed'
            : dragging
            ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)] cursor-copy'
            : empty
            ? 'border-[var(--status-reject)]/30 bg-[var(--accent-red-light)]/30 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] cursor-pointer'
            : 'border-[var(--border-default)] bg-[var(--bg-secondary)] hover:border-[var(--color-brand)] cursor-pointer'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={e => handleFile(e.target.files?.[0] ?? undefined)}
          className="hidden"
          accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,image/png,image/jpeg"
          disabled={!canUpload}
        />
        <div className={`text-[length:var(--text-xs)] font-semibold ${empty && canUpload ? 'text-[var(--status-reject)]' : 'text-[var(--text-secondary)]'}`}>
          {uploading ? (
            <><Loader2 className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5 animate-spin" /> {t('dataEntry.evidence.uploading')}</>
          ) : empty ? (
            <><AlertCircle className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" /> {t('dataEntry.evidence.required')}</>
          ) : (
            <><Upload className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" /> {t('dataEntry.evidence.another')}</>
          )}
        </div>
        <div className="text-caption text-[var(--text-tertiary)] mt-1">
          {t('dataEntry.evidence.formats')}
          {!dataValueId && t('dataEntry.evidence.saveFirst')}
        </div>
        {error && <div className="text-caption text-[var(--status-reject)] font-mono mt-2">{error}</div>}
      </div>

      {/* File list */}
      {evidence.length > 0 && (
        <ul className="space-y-2">
          {evidence.map(e => (
            <li key={e.id} className="rounded-[var(--radius-sm)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2">
                <FileText className="w-3.5 h-3.5 text-[var(--color-brand)] flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[length:var(--text-xs)] font-medium text-[var(--text-primary)] truncate">{e.filename}</div>
                  <div className="text-caption text-[var(--text-tertiary)] flex items-center gap-1.5">
                    <span>{(e.file_size / 1024).toFixed(1)} KB</span>
                    <span>·</span>
                    <Hash className="w-2.5 h-2.5" />
                    <span className="font-mono">{e.file_hash.slice(0, 10)}…{e.file_hash.slice(-6)}</span>
                  </div>
                </div>
                <a
                  href={nexus.evidenceDownloadUrl(e.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-caption text-[var(--color-brand)] hover:underline"
                >
                  {t('dataEntry.evidence.open')}
                </a>
                {!locked && (
                  <button
                    type="button"
                    onClick={() => onRemove(e.id)}
                    className="w-5 h-5 rounded-[var(--radius-xs)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-reject)] hover:bg-[var(--accent-red-light)]"
                    aria-label={t('dataEntry.evidence.remove')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {/* AI extraction — user-triggered, never auto-runs, so we don't
                  burn Claude tokens on every drag-drop. */}
              {aiExtraction && (
                <div className="px-3 pb-2.5 pt-0">
                  <AiExtractionPanel
                    evidenceId={e.id}
                    filename={e.filename}
                    questionnaireItemId={aiExtraction.questionnaireItemId}
                    expectedUnit={aiExtraction.expectedUnit}
                    expectedPeriod={aiExtraction.expectedPeriod}
                    lineItemHint={aiExtraction.lineItemHint}
                    onAccept={aiExtraction.onAccept(e.filename)}
                    disabled={aiExtraction.disabled}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StatusChip({ status }: { status: 'idle' | 'saving' | 'saved' | 'submitting' | 'submitted' | 'error' }) {
  const { t } = useTranslation()
  const map: Record<typeof status, { label: string; bg: string; fg: string } | null> = {
    idle: null,
    saving: { label: t('dataEntry.status.saving'), bg: 'var(--accent-blue-light)', fg: 'var(--status-pending)' },
    saved: { label: t('dataEntry.status.saved'), bg: 'var(--accent-amber-light)', fg: 'var(--status-draft)' },
    submitting: { label: t('dataEntry.status.submitting'), bg: 'var(--accent-blue-light)', fg: 'var(--status-pending)' },
    submitted: { label: t('dataEntry.status.submitted'), bg: 'var(--accent-green-light)', fg: 'var(--status-ok)' },
    error: { label: t('dataEntry.status.error'), bg: 'var(--accent-red-light)', fg: 'var(--status-reject)' },
  }
  const c = map[status]
  if (!c) return null
  return (
    <span className="px-2 py-0.5 rounded-[var(--radius-sm)] text-micro font-semibold uppercase tracking-wider" style={{ background: c.bg, color: c.fg }}>
      {c.label}
    </span>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center py-20">{children}</div>
}

function ErrorPane({ error, onRetry }: { error: string; onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="max-w-lg mx-auto mt-20 p-6 rounded-[var(--radius-lg)] border border-[var(--status-reject)]/20 bg-[var(--accent-red-light)]">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[var(--status-reject)] flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">{t('dataEntry.entry.unableToLoad')}</h3>
          <p className="text-[length:var(--text-sm)] text-[var(--text-secondary)] font-mono">{error}</p>
          <button onClick={onRetry} className="mt-3 text-[length:var(--text-sm)] font-medium text-[var(--color-brand)] hover:underline">{t('dataEntry.picker.retry')}</button>
        </div>
      </div>
    </div>
  )
}

/** Compare panel — cradle-to-submit reference. Shows every source at once. */
function CompareSources({
  item, calcResult, calculator, manualValue, connectorValue, onUse,
}: {
  item: NexusQuestionnaireItem
  calcResult: number | null
  calculator: CalcDescriptor | null
  manualValue: number | null
  connectorValue: number | null
  onUse: (src: 'calculator' | 'connector' | 'historical' | 'peer', value: number) => void
}) {
  const { t } = useTranslation()
  const [ref, setRef] = useState<null | { lastYear: number; lastYearValue: number; avg: number; min: number; max: number; peers: Array<{ entity_name: string; value: number }> }>(null)

  useEffect(() => {
    let cancelled = false
    orgStore.historicalReference(item.id)
      .then(r => {
        if (cancelled) return
        const series = [...r.history].sort((a, b) => a.year - b.year)
        if (series.length === 0) { setRef(null); return }
        const values = series.map(s => s.value)
        const avg = values.reduce((a, b) => a + b, 0) / values.length
        const last = series[series.length - 1]
        setRef({
          lastYear: last.year,
          lastYearValue: last.value,
          avg,
          min: Math.min(...values),
          max: Math.max(...values),
          peers: r.peers.slice(0, 3),
        })
      })
      .catch(() => setRef(null))
    return () => { cancelled = true }
  }, [item.id])

  const sources = [
    { key: 'manual' as const,     label: t('dataEntry.mode.Manual'), icon: PencilLine, value: manualValue,         actionable: false },
    { key: 'calculator' as const, label: calculator?.title ?? t('dataEntry.mode.Calculator'), icon: CalcIcon,   value: calcResult,          actionable: calcResult != null, sub: calculator?.description },
    { key: 'connector' as const,  label: pickConnector(item), icon: Plug,      value: connectorValue,      actionable: connectorValue != null },
    { key: 'historical' as const, label: t('dataEntry.compare.lastFiled', { year: ref?.lastYear ?? '—' }), icon: Hash, value: ref?.lastYearValue ?? null, actionable: ref?.lastYearValue != null, sub: t('dataEntry.compare.priorYear') },
    { key: 'avg' as const,        label: t('dataEntry.compare.avg4'), icon: Hash,       value: ref?.avg ?? null,    actionable: false,            sub: ref ? t('dataEntry.compare.range', { min: fmt(ref.min), max: fmt(ref.max) }) : undefined },
    { key: 'peer' as const,       label: t('dataEntry.compare.peerAvg'), icon: Hash,      value: ref && ref.peers.length > 0 ? (ref.peers.reduce((s, p) => s + p.value, 0) / ref.peers.length) : null, actionable: false, sub: ref && ref.peers.length > 0 ? t('dataEntry.compare.plants', { count: ref.peers.length }) : t('dataEntry.compare.noPeers') },
  ]

  const hasAnything = sources.some(s => s.value != null)

  return (
    <div className="surface-paper p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="kicker !mb-0.5">{t('dataEntry.compare.title')}</span>
          <div className="text-caption text-[var(--text-tertiary)]">{t('dataEntry.compare.intro')}</div>
        </div>
      </div>

      {!hasAnything ? (
        <div className="py-6 text-center text-[12px] text-[var(--text-tertiary)] italic">
          {t('dataEntry.compare.empty')}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {sources.map((s, i) => {
            const isPrimary = s.key === 'manual'
            const Icon = s.icon
            return (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i, duration: 0.25 }}
                className={`rounded-[10px] p-3 transition-all ${
                  isPrimary
                    ? 'bg-[var(--accent-teal-subtle)] border border-[var(--color-brand)]/20'
                    : 'bg-[var(--bg-secondary)] border border-[var(--border-subtle)]'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon className={`w-3 h-3 ${isPrimary ? 'text-[var(--color-brand)]' : 'text-[var(--text-tertiary)]'}`} />
                  <span className={`text-micro uppercase tracking-[0.1em] font-bold truncate ${isPrimary ? 'text-[var(--color-brand-strong)]' : 'text-[var(--text-tertiary)]'}`}>{s.label}</span>
                </div>
                <div className={`text-[18px] font-bold tabular-nums tracking-[-0.01em] ${isPrimary ? 'text-[var(--color-brand-strong)]' : s.value != null ? 'text-[var(--text-primary)]' : 'text-[var(--text-quaternary)]'}`}>
                  {s.value != null ? fmt(s.value) : '—'}
                </div>
                {s.sub && <div className="text-caption text-[var(--text-tertiary)] mt-1 truncate" title={s.sub}>{s.sub}</div>}
                {s.actionable && !isPrimary && s.value != null && (
                  <button
                    onClick={() => onUse(s.key === 'calculator' ? 'calculator' : s.key === 'connector' ? 'connector' : 'historical', s.value as number)}
                    className="mt-2 text-caption font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] inline-flex items-center gap-1 link-underline"
                  >
                    {t('dataEntry.compare.useValue')}
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function fmt(n: number): string {
  if (!isFinite(n)) return '—'
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(2) + 'k'
  if (Math.abs(n) >= 1) return n.toFixed(2)
  return n.toFixed(3)
}

/** Pick a plausible simulated connector for a given item (SRD §13.4 catalogue). */
function pickConnector(item: NexusQuestionnaireItem): string {
  if (item.gri_code.startsWith('201-') || item.gri_code.startsWith('204-') || item.gri_code.startsWith('2-5') || item.gri_code.startsWith('2-21')) return 'SAP ERP — FI/CO'
  if (item.gri_code.startsWith('2-7') || item.gri_code.startsWith('2-8') || item.gri_code.startsWith('401-') || item.gri_code.startsWith('404-') || item.gri_code.startsWith('405-')) return 'SAP SuccessFactors — HR'
  if (item.gri_code.startsWith('305-7')) return 'CEMS — Rayong site'
  if (item.gri_code.startsWith('302-')) return 'Utilities ERP — Fuel & Energy feed'
  if (item.gri_code.startsWith('303-')) return 'Water meter telemetry'
  if (item.gri_code.startsWith('306-')) return 'Waste manifest system'
  if (item.gri_code.startsWith('403-')) return 'HSE incident management'
  if (item.gri_code.startsWith('305-')) return 'GHG Inventory — IPCC methodology'
  return 'Generic ERP connector'
}
