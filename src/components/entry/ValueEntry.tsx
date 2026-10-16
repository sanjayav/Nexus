import { useId, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Send, Upload, Plug, Loader2, CheckCircle2, Hash, CornerUpLeft, ArrowUpRight, Calculator as CalcIcon, AlertCircle } from 'lucide-react'
import type { OrgEntity, OrgMember } from '../../lib/orgStore'
import { localizeUnit } from '../../calculators/labels'
import { useActiveReportingYear } from '../../lib/activeReportingYear'
import { useFmt } from '../../lib/fmt'
import { truncateHash } from '../../reports/spdTemplate'
import { HistoricalReferencePanel } from '../HistoricalReferencePanel'
import { LinkedDataPanel, type PeerMapping } from '../LinkedDataPanel'
import CommentThread from '../CommentThread'
import { SealCheck } from '../ui'
import { transition } from '../../motion/tokens'
import { useValueEntry, type UseValueEntryArgs, type ValueEntryState } from './useValueEntry'
import ModeSwitch from './ModeSwitch'
import PanelBoundary from './PanelBoundary'
import EvidenceBlock from './EvidenceBlock'
import ReferenceStrip from './ReferenceStrip'
import SaveStatus from './SaveStatus'
import { AiLabel } from './AiLabel'
import { handoffFor, reviewerFor } from './handoff'
import { NARRATIVE_MIN } from './persist'

export type ValueEntryVariant = 'page' | 'panel' | 'rail'

export interface ValueEntryProps extends UseValueEntryArgs {
  /**
   *   page  — /data/entry/:id, full width with history + linked data + discussion aside
   *   panel — My Tasks inline, entry + discussion side by side
   *   rail  — disclosure-editor side rail, one column
   */
  variant?: ValueEntryVariant
  entities?: OrgEntity[]
  members?: OrgMember[]
  /** Link to the full-page version (panel / rail). */
  fullPageHref?: string | null
  onPeerClick?: (peer: PeerMapping) => void
}

/**
 * ValueEntry — the one place a value is entered. Numeric (manual, calculator,
 * connector) and narrative answers, evidence with AI extraction, reviewer
 * note, history and linked data, autosave and submit — identical behaviour in
 * My Tasks, on /data/entry/:id and in the disclosure editor.
 */
export default function ValueEntry({
  variant = 'page', entities, members, fullPageHref, onPeerClick, reviewerName, ...args
}: ValueEntryProps) {
  const reviewer = reviewerName ?? reviewerFor(args.assignment, entities, members)
  const entry = useValueEntry({ ...args, reviewerName: reviewer })
  const rootRef = useRef<HTMLDivElement>(null)

  const focusFirstError = () => requestAnimationFrame(() => {
    const el = rootRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-entry-error]')
    if (!el) return
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el.focus({ preventScroll: true })
  })
  const onSubmit = async () => {
    const ok = await entry.submit()
    if (!ok) focusFirstError()
    // Bring the "with the reviewer" banner into view on long pages.
    else if (variant !== 'panel') requestAnimationFrame(() => rootRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  }

  const form = (
    <div className="space-y-5">
      <StatusBanner entry={entry} entities={entities} members={members} variant={variant} />
      {!entry.narrative && (entry.modes.length > 1 || (fullPageHref && variant === 'panel')) && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <ModeSwitch modes={entry.modes} value={entry.mode} onChange={entry.setMode} disabled={entry.locked} />
          {fullPageHref && variant === 'panel' && <span className="ml-auto"><FullPageLink href={fullPageHref} /></span>}
        </div>
      )}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={entry.narrative ? 'narrative' : entry.mode} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={transition.fast}>
          {entry.narrative ? <NarrativeField entry={entry} onSubmitShortcut={onSubmit} />
            : entry.mode === 'Calculator' ? <CalculatorFields entry={entry} />
            : entry.mode === 'Connector' ? <ConnectorBlock entry={entry} />
            : <NumericField entry={entry} onSubmitShortcut={onSubmit} />}
        </motion.div>
      </AnimatePresence>
      {!entry.narrative && (
        <ReferenceStrip
          questionId={entry.question.id}
          entityId={entry.assignment?.entityId}
          unit={entry.question.unit}
          current={entry.effectiveValue}
          onUse={v => { entry.setMode('Manual'); entry.setValue(String(v)) }}
          disabled={entry.locked}
          columns={variant === 'rail' ? 2 : 4}
        />
      )}
      <EvidenceBlock entry={entry} compact={variant === 'rail'} />
      <CommentField entry={entry} />
    </div>
  )

  const actions = <ActionBar entry={entry} variant={variant} onSubmit={onSubmit} entities={entities} members={members} />

  if (variant === 'rail') {
    return (
      <div ref={rootRef} className="flex flex-col min-h-0">
        <div className="px-5 pb-5">{form}</div>
        <div className="sticky bottom-0 z-10 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-5 py-3">{actions}</div>
        {fullPageHref && <div className="px-5 py-3"><FullPageLink href={fullPageHref} /></div>}
      </div>
    )
  }

  if (variant === 'panel') {
    return (
      <div ref={rootRef} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 mt-3">
        <div className="min-w-0 space-y-5">
          {form}
          <div className="pt-4 border-t border-[var(--border-subtle)]">{actions}</div>
        </div>
        {entry.assignment && (
          <aside className="min-w-0 lg:border-l lg:border-[var(--border-subtle)] lg:pl-6" aria-label={args.question.gri_code}>
            <CommentThread assignmentId={entry.assignment.id} />
          </aside>
        )}
      </div>
    )
  }

  // page
  return (
    <div ref={rootRef} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
      <div className="min-w-0 space-y-4">
        <div className="surface-paper p-5 sm:p-6">{form}</div>
        <div className="surface-paper px-5 sm:px-6 py-3.5 sticky bottom-3 z-10 shadow-[var(--shadow-raised)]">{actions}</div>
      </div>
      <aside className="min-w-0 space-y-4 xl:sticky xl:top-[76px]">
        <PanelBoundary>
          <div className="surface-paper overflow-hidden">
            <HistoricalReferencePanel questionnaire_item_id={args.question.id} entity_id={args.assignment?.entityId} currentValue={entry.effectiveValue} />
          </div>
        </PanelBoundary>
        <PanelBoundary>
          <LinkedDataPanel questionnaireItemId={args.question.id} onPeerClick={onPeerClick} />
        </PanelBoundary>
        {entry.assignment && (
          <CommentThread assignmentId={entry.assignment.id} />
        )}
      </aside>
    </div>
  )
}

/* ── Pieces ────────────────────────────────────────────────────────────── */

function FullPageLink({ href }: { href: string }) {
  const { t } = useTranslation()
  return (
    <Link to={href} className="inline-flex items-center gap-1 h-8 text-caption font-semibold text-[var(--color-brand-strong)] hover:underline underline-offset-2">
      {t('entry.openFullPage')} <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
    </Link>
  )
}

function StatusBanner({ entry, entities, members, variant }: { entry: ValueEntryState; entities?: OrgEntity[]; members?: OrgMember[]; variant: ValueEntryVariant }) {
  const { t } = useTranslation()
  if (entry.status === 'rejected') {
    return (
      <div role="status" className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--status-danger-line)] bg-[var(--status-danger-soft)] px-3.5 py-2.5">
        <CornerUpLeft className="w-4 h-4 mt-0.5 text-[var(--status-danger)] flex-shrink-0" aria-hidden />
        <div className="min-w-0">
          <div className="text-small font-semibold text-[var(--text-primary)]">{t('entry.banner.sentBack')}</div>
          <p className="text-caption text-[var(--text-secondary)]">{t('entry.banner.sentBackBody')}</p>
        </div>
      </div>
    )
  }
  if (!entry.locked || !entry.assignment) return null
  if (entry.status !== 'submitted' && entry.status !== 'reviewed' && entry.status !== 'approved') return null
  const base = handoffFor(entry.status, entry.assignment.entityId, entities, members)
  const h = base.stage === 'review' ? { ...base, name: base.name ?? reviewerFor(entry.assignment, entities, members) } : base
  const title = h.stage === 'review'
    ? (h.name ? t('entry.banner.withReviewer', { name: h.name }) : t('entry.banner.withReviewerGeneric'))
    : h.stage === 'approval'
      ? (h.name ? t('entry.banner.withApprover', { name: h.name }) : t('entry.banner.withApproverGeneric'))
      : t('entry.banner.approved')
  return (
    <motion.div
      role="status"
      initial={entry.justSubmitted ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={transition.base}
      className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--status-success-line)] bg-[var(--status-success-soft)] px-3.5 py-2.5"
    >
      <SealCheck size={variant === 'rail' ? 22 : 26} ripple={entry.justSubmitted} />
      <div className="min-w-0">
        <div className="text-small font-semibold text-[var(--text-primary)]">{title}</div>
        <p className="text-caption text-[var(--text-secondary)]">{h.stage === 'approved' ? t('entry.banner.lockedApproved') : t('entry.banner.locked')}</p>
      </div>
    </motion.div>
  )
}

function NumericField({ entry, onSubmitShortcut }: { entry: ValueEntryState; onSubmitShortcut: () => void }) {
  const { t } = useTranslation()
  const f = useFmt()
  const id = useId()
  const year = useActiveReportingYear()
  const fy = year.kind === 'ready' ? year.year.year : null
  const err = entry.valueError
  const unit = entry.question.unit ? localizeUnit(t, entry.question.unit) : null
  return (
    <div>
      <label htmlFor={id} className="block text-small font-medium text-[var(--text-primary)] mb-1.5">
        {fy ? t('entry.value.labelYear', { year: fy }) : t('entry.value.label')}
      </label>
      <div className={`flex items-stretch rounded-[var(--radius-md)] border bg-[var(--bg-primary)] transition-shadow focus-within:ring-2 ${
        err ? 'border-[var(--status-danger)] focus-within:ring-[var(--status-danger)]/20' : 'border-[var(--border-default)] focus-within:border-[var(--color-brand)] focus-within:ring-[var(--color-brand)]/20'
      } ${entry.locked ? 'bg-[var(--bg-secondary)]' : ''}`}>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={entry.value}
          onChange={e => entry.setValue(e.target.value)}
          onBlur={entry.flush}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSubmitShortcut() }
            else if (e.key === 'Enter') { e.preventDefault(); entry.flush() }
          }}
          readOnly={entry.locked}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `${id}-err` : `${id}-hint`}
          placeholder={t('entry.value.placeholder')}
          className="flex-1 min-w-0 h-12 px-4 bg-transparent outline-none type-figure text-[22px] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] placeholder:font-normal placeholder:text-body read-only:cursor-default"
        />
        {unit && (
          <span className="px-3.5 flex items-center border-l border-[var(--border-subtle)] text-small font-medium text-[var(--text-secondary)] whitespace-nowrap">{unit}</span>
        )}
      </div>
      <div className="mt-1.5 min-h-[20px] flex items-center gap-2 flex-wrap">
        {err ? (
          <p id={`${id}-err`} role="alert" className="text-caption text-[var(--status-danger)] inline-flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" aria-hidden />
            {err === 'required' ? t('entry.value.required') : t('entry.value.invalid')}
          </p>
        ) : (
          <p id={`${id}-hint`} className="text-caption text-[var(--text-tertiary)]">
            {entry.effectiveValue != null ? t('entry.value.reads', { value: f.exact(entry.effectiveValue, entry.question.unit) }) : t('entry.value.hint')}
          </p>
        )}
        {entry.aiSource && <AiLabel meta={entry.aiSource} />}
        {entry.anchor && !entry.anchorStale && (
          <span className="inline-flex items-center gap-1 text-caption text-[var(--text-tertiary)] font-mono" title={entry.anchor.hash}>
            <Hash className="w-3 h-3" aria-hidden />{truncateHash(entry.anchor.hash, 8, 6)}
          </span>
        )}
      </div>
    </div>
  )
}

function CalculatorFields({ entry }: { entry: ValueEntryState }) {
  const { t } = useTranslation()
  const f = useFmt()
  const calc = entry.calculator
  if (!calc) return null
  return (
    <div className="space-y-3">
      <div>
        <div className="text-small font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5"><CalcIcon className="w-3.5 h-3.5 text-[var(--color-brand)]" aria-hidden />{calc.title}</div>
        <p className="text-caption text-[var(--text-secondary)] mt-0.5">{calc.description}</p>
      </div>
      <div className={`grid gap-3 grid-cols-1 ${calc.inputs.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {calc.inputs.map(input => {
          const v = entry.calcValues[input.key] ?? ''
          const opt = input.options?.find(o => o.value === v)
          return (
            <label key={input.key} className="block min-w-0">
              <span className="block text-caption font-medium text-[var(--text-secondary)] mb-1">
                {input.label}{input.unit && <span className="text-[var(--text-tertiary)]"> ({localizeUnit(t, input.unit)})</span>}
              </span>
              {input.options ? (
                <select
                  value={v}
                  disabled={entry.locked}
                  onChange={e => entry.setCalcValue(input.key, e.target.value)}
                  onBlur={entry.flush}
                  className="w-full h-10 px-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none disabled:bg-[var(--bg-secondary)]"
                >
                  <option value="">{t('entry.calc.select')}</option>
                  {input.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  inputMode="decimal"
                  value={v}
                  readOnly={entry.locked}
                  onChange={e => entry.setCalcValue(input.key, e.target.value)}
                  onBlur={entry.flush}
                  placeholder={input.placeholder}
                  className="w-full h-10 px-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small tabular-nums focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none read-only:bg-[var(--bg-secondary)]"
                />
              )}
              {input.hint && <span className="block text-caption text-[var(--text-tertiary)] mt-1">{input.hint}</span>}
              {opt?.note && <span className="block text-caption text-[var(--color-brand-strong)] mt-1">{opt.note}</span>}
            </label>
          )
        })}
      </div>
      <div className="flex items-baseline justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] px-3.5 py-2.5">
        <span className="text-caption font-medium text-[var(--color-brand-strong)]">{t('entry.calc.result')}</span>
        <span className="type-figure text-[20px] leading-7 text-[var(--color-brand-strong)]">
          {entry.calcResult != null ? f.exact(entry.calcResult) : '—'}
          {entry.question.unit && <span className="ml-1 text-caption font-normal">{calc.outputUnitHint ?? localizeUnit(t, entry.question.unit)}</span>}
        </span>
      </div>
      {entry.valueError === 'required' && (
        <p role="alert" data-entry-error="" tabIndex={-1} className="text-caption text-[var(--status-danger)]">{t('entry.calc.incomplete')}</p>
      )}
      {calc.footnotes && calc.footnotes.length > 0 && (
        <p className="text-caption text-[var(--text-tertiary)]">{t('entry.calc.methodology', { notes: calc.footnotes.join(t('entry.listSep')) })}</p>
      )}
    </div>
  )
}

function ConnectorBlock({ entry }: { entry: ValueEntryState }) {
  const { t } = useTranslation()
  const f = useFmt()
  const pulled = entry.anchor?.receiptHash ? entry.anchor : null
  const existing = !pulled && entry.assignment?.value != null && entry.assignment.used_mode === 'Connector' ? entry.assignment.value : null
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--color-brand)] flex-shrink-0">
          <Plug className="w-4 h-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-small font-semibold text-[var(--text-primary)] truncate">{entry.connectorName}</div>
          <div className="text-caption text-[var(--text-tertiary)]">{t('entry.connector.hint')}</div>
        </div>
        {!entry.locked && (
          <button
            type="button"
            onClick={() => void entry.pull()}
            disabled={entry.pulling}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--radius-md)] text-small font-semibold border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--color-brand)] disabled:opacity-60"
          >
            {entry.pulling ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Plug className="w-3.5 h-3.5" aria-hidden />}
            {entry.pulling ? t('entry.connector.pulling') : pulled || existing != null ? t('entry.connector.pullAgain') : t('entry.connector.pull')}
          </button>
        )}
      </div>
      {(pulled || existing != null) && (
        <div className="mt-3 flex items-center gap-2 text-small text-[var(--text-primary)]">
          <CheckCircle2 className="w-4 h-4 text-[var(--status-success)]" aria-hidden />
          <span>{t('entry.connector.pulled')}</span>
          <span className="type-figure">{f.exact(pulled?.value ?? existing, entry.question.unit)}</span>
          {pulled?.receiptHash && <span className="text-caption font-mono text-[var(--text-tertiary)]">{t('entry.connector.receipt', { hash: truncateHash(pulled.receiptHash, 8, 6) })}</span>}
        </div>
      )}
      {entry.pullError && (
        <p role="alert" className="mt-2 text-caption text-[var(--status-danger)]">
          {entry.pullError === 'noYear' ? <>{t('entry.year.noneShort')} <Link to="/admin/periods" className="font-semibold underline underline-offset-2">{t('entry.year.cta')}</Link></> : entry.pullError}
        </p>
      )}
    </div>
  )
}

function NarrativeField({ entry, onSubmitShortcut }: { entry: ValueEntryState; onSubmitShortcut: () => void }) {
  const { t } = useTranslation()
  const id = useId()
  const n = entry.body.trim().length
  const short = n < NARRATIVE_MIN
  const err = entry.bodyError
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <label htmlFor={id} className="text-small font-medium text-[var(--text-primary)]">{t('entry.narrative.label')}</label>
        <span className={`text-caption tabular-nums ${short ? 'text-[var(--text-tertiary)]' : 'text-[var(--status-success)]'}`}>
          {t('entry.narrative.count', { count: n, min: NARRATIVE_MIN })}
        </span>
      </div>
      <p className="text-caption text-[var(--text-secondary)] mb-2">{t('entry.narrative.intro')}</p>
      <textarea
        id={id}
        value={entry.body}
        onChange={e => entry.setBody(e.target.value)}
        onBlur={entry.flush}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSubmitShortcut() } }}
        readOnly={entry.locked}
        rows={10}
        aria-invalid={err ? true : undefined}
        aria-describedby={`${id}-help`}
        placeholder={t('entry.narrative.placeholder')}
        className={`w-full px-3.5 py-3 rounded-[var(--radius-md)] border bg-[var(--bg-primary)] text-body leading-relaxed outline-none resize-y min-h-[200px] focus:ring-2 read-only:bg-[var(--bg-secondary)] ${
          err ? 'border-[var(--status-danger)] focus:ring-[var(--status-danger)]/20' : 'border-[var(--border-default)] focus:border-[var(--color-brand)] focus:ring-[var(--color-brand)]/20'
        }`}
      />
      <p id={`${id}-help`} role={err ? 'alert' : undefined} className={`mt-1.5 text-caption ${err ? 'text-[var(--status-danger)]' : 'text-[var(--text-tertiary)]'}`}>
        {short && !entry.locked ? t('entry.narrative.moreNeeded', { count: NARRATIVE_MIN - n }) : t('entry.narrative.ready')}
      </p>
    </div>
  )
}

function CommentField({ entry }: { entry: ValueEntryState }) {
  const { t } = useTranslation()
  const id = useId()
  if (entry.locked && !entry.comment) return null
  return (
    <div>
      <label htmlFor={id} className="block text-small font-medium text-[var(--text-primary)] mb-1.5">
        {t('entry.comment.label')} <span className="font-normal text-[var(--text-tertiary)]">{t('entry.comment.optional')}</span>
      </label>
      <textarea
        id={id}
        value={entry.comment}
        onChange={e => entry.setComment(e.target.value)}
        onBlur={entry.flush}
        readOnly={entry.locked}
        rows={2}
        maxLength={500}
        placeholder={t('entry.comment.placeholder')}
        className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small outline-none resize-y focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 read-only:bg-[var(--bg-secondary)]"
      />
    </div>
  )
}

function ActionBar({ entry, variant, onSubmit }: { entry: ValueEntryState; variant: ValueEntryVariant; onSubmit: () => void; entities?: OrgEntity[]; members?: OrgMember[] }) {
  const { t } = useTranslation()
  const blockedHint = !entry.locked && entry.needsEvidence && !entry.hasEvidence ? t('entry.submit.needsEvidence') : null
  return (
    <div className={`flex items-center gap-3 flex-wrap ${variant === 'rail' ? 'justify-between' : 'justify-between'}`}>
      <div className="min-w-0 flex items-center gap-3">
        <SaveStatus state={entry.saveState} savedAt={entry.savedAt} error={entry.saveError} onRetry={() => void entry.save('manual')} />
        {blockedHint && variant !== 'rail' && <span className="hidden md:inline text-caption text-[var(--text-tertiary)] truncate">{blockedHint}</span>}
      </div>
      {!entry.locked ? (
        <div className={`flex items-center gap-2 ${variant === 'rail' ? 'w-full' : ''}`}>
          {!entry.autosave && (
            <button
              type="button"
              onClick={() => void entry.save('manual')}
              disabled={entry.saveState === 'saving'}
              className={`inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[var(--radius-md)] text-small font-semibold border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-60 ${variant === 'rail' ? 'flex-1' : ''}`}
            >
              <Upload className="w-4 h-4" aria-hidden /> {t('entry.actions.saveDraft')}
            </button>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={entry.submitting}
            aria-describedby={undefined}
            className={`inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[var(--radius-md)] text-small font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)] shadow-[var(--btn-primary-shadow)] disabled:opacity-60 whitespace-nowrap ${variant === 'rail' ? 'flex-1' : ''}`}
          >
            {entry.submitting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Send className="w-4 h-4" aria-hidden />}
            {entry.submitting ? t('entry.actions.submitting') : t('entry.actions.submit')}
          </button>
        </div>
      ) : variant === 'page' && entry.status === 'submitted' ? (
        <Link to="/work/review" className="inline-flex items-center gap-1 h-10 px-3 text-small font-semibold text-[var(--color-brand-strong)] hover:underline underline-offset-2">
          {t('entry.actions.viewQueue')} <ArrowUpRight className="w-4 h-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  )
}
