import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PencilLine, Calculator as CalcIcon, Plug, Send, Upload,
  CheckCircle2, Loader2,
} from 'lucide-react'
import type { QuestionAssignment, OrgEntity, OrgMember } from '../../lib/orgStore'
import type { NexusQuestionnaireItem } from '../../lib/api'
import { findCalculator, type CalcDescriptor, type CalcInputValues } from '../../calculators/registry'
import { localizeCalc, localizeUnit } from '../../calculators/labels'
import CommentThread from '../CommentThread'
import NarrativeAnswerPanel from './NarrativeAnswerPanel'
import { EvidencePanel, HandoffHint } from './EvidencePanel'
import { pickConnector } from './shared'
import { itemLabel } from '../../lib/itemLabel'

export function AnswerPanel({
  assignment, question, onUpdate, entities, members,
}: {
  assignment: QuestionAssignment
  question: NexusQuestionnaireItem
  onUpdate: (patch: Partial<QuestionAssignment>) => Promise<void> | void
  entities: OrgEntity[]
  members: OrgMember[]
}) {
  const { t, i18n } = useTranslation()
  if (assignment.response_type === 'narrative') {
    return <NarrativeAnswerPanel assignment={assignment} question={question} onUpdate={onUpdate} entities={entities} members={members} />
  }
  const allowedModes = assignment.entry_modes ?? ['Manual']
  const calculator: CalcDescriptor | null = useMemo(() => localizeCalc(t, findCalculator(question)), [question, t])
  const availableModes = useMemo(
    () => allowedModes.filter(m => m !== 'Calculator' || calculator != null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allowedModes.join(','), calculator]
  )

  const [activeMode, setActiveMode] = useState<'Manual' | 'Calculator' | 'Connector'>(
    (assignment.used_mode && availableModes.includes(assignment.used_mode as any))
      ? assignment.used_mode as any
      : availableModes[0] ?? 'Manual'
  )

  const [value, setValue] = useState<string>(assignment.value != null ? String(assignment.value) : '')
  const [comment, setComment] = useState(assignment.comment || '')
  const [evidence, setEvidence] = useState<string[]>(assignment.evidence_ids || [])
  const [busy, setBusy] = useState(false)
  const [calcValues, setCalcValues] = useState<CalcInputValues>({})

  const calcResult = useMemo(() => {
    if (!calculator) return null
    return calculator.compute(calcValues, question)
  }, [calculator, calcValues, question])

  const locked = assignment.status === 'submitted' || assignment.status === 'approved' || assignment.status === 'reviewed'

  const effectiveValue = useMemo(() => {
    if (activeMode === 'Calculator' && calculator) return calcResult
    if (activeMode === 'Manual') {
      const v = parseFloat(value)
      return Number.isNaN(v) ? null : v
    }
    if (activeMode === 'Connector') return assignment.value ?? null
    return null
  }, [activeMode, calcResult, calculator, value, assignment.value])

  const handleSaveDraft = async () => {
    if (effectiveValue == null) return
    setBusy(true)
    onUpdate({ value: effectiveValue, unit: question.unit, comment, status: 'in_progress', used_mode: activeMode })
    setBusy(false)
  }

  const handleSubmit = async () => {
    if (effectiveValue == null) return
    if (evidence.length === 0 && activeMode !== 'Connector') {
      alert(t('tasks.answer.needEvidence'))
      return
    }
    setBusy(true)
    onUpdate({ value: effectiveValue, unit: question.unit, comment, status: 'submitted', evidence_ids: evidence, used_mode: activeMode })
    setBusy(false)
  }

  const handleConnectorPull = async () => {
    setBusy(true)
    const fabricated = question.target_fy2026
      ? question.target_fy2026 * (0.9 + Math.random() * 0.2)
      : Math.round(1000 + Math.random() * 9000)
    onUpdate({
      value: Number(fabricated.toFixed(2)),
      unit: question.unit,
      status: 'in_progress',
      evidence_ids: [`connector:${pickConnector(question)}:${Date.now().toString(36)}`],
      used_mode: 'Connector',
    })
    setBusy(false)
  }

  const handleAddEvidence = (name: string) => {
    const id = `ev_${Date.now().toString(36)}_${name.slice(0, 20)}`
    setEvidence(e => [...e, id])
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 mt-3">
      <div className="space-y-4">
        <div className="text-[length:var(--text-xs)] text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">{t('tasks.answer.question')}</strong> {itemLabel(question, i18n.language)}
          {question.unit && <span className="ml-2 text-[var(--text-tertiary)]">· {t('tasks.answer.unit', { unit: question.unit })}</span>}
          {question.scope_split && <span className="ml-2 text-[var(--text-tertiary)]">· {question.scope_split}</span>}
        </div>

        {availableModes.length > 1 && (
          <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
            <div
              className="grid divide-x divide-[var(--border-subtle)]"
              style={{ gridTemplateColumns: `repeat(${availableModes.length}, minmax(0, 1fr))` }}
            >
              {availableModes.map(m => {
                const Icon = m === 'Manual' ? PencilLine : m === 'Calculator' ? CalcIcon : Plug
                const active = activeMode === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => !locked && setActiveMode(m)}
                    disabled={locked}
                    className={`px-3 py-2 text-[length:var(--text-xs)] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      active ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {t(`tasks.mode.${m}`, { defaultValue: m })}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {activeMode === 'Manual' && (
          <div>
            <label className="block text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] mb-1">
              {t('tasks.answer.enterValue')} {question.unit ? `(${question.unit})` : ''}
            </label>
            <input
              type="number"
              step="any"
              value={value}
              onChange={e => setValue(e.target.value)}
              disabled={locked}
              placeholder={t('tasks.answer.valuePlaceholder')}
              className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-base)] tabular-nums focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none disabled:bg-[var(--bg-secondary)]"
            />
          </div>
        )}

        {activeMode === 'Calculator' && calculator && (
          <div>
            <div className="text-micro uppercase tracking-[0.06em] font-semibold text-[var(--color-brand)] mb-1">{calculator.title}</div>
            <p className="text-[length:var(--text-xs)] text-[var(--text-secondary)] mb-3">{calculator.description}</p>
            <div className={`grid gap-2 ${calculator.inputs.length >= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {calculator.inputs.map(input => (
                <label key={input.key} className="block">
                  <span className="block text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] mb-1">
                    {input.label} {input.unit && <span className="opacity-70">({localizeUnit(t, input.unit)})</span>}
                  </span>
                  {input.options ? (
                    <select
                      value={calcValues[input.key] ?? ''}
                      onChange={e => setCalcValues(s => ({ ...s, [input.key]: e.target.value }))}
                      className="w-full px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-xs)]"
                    >
                      <option value="">{t('tasks.answer.select')}</option>
                      {input.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input
                      type="number" step="any"
                      value={calcValues[input.key] ?? ''}
                      onChange={e => setCalcValues(s => ({ ...s, [input.key]: e.target.value }))}
                      placeholder={input.placeholder}
                      className="w-full px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-xs)] tabular-nums"
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="mt-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] border border-[var(--color-brand)]/20 flex items-baseline justify-between">
              <span className="text-micro uppercase tracking-[0.06em] font-semibold text-[var(--color-brand-strong)]">{t('tasks.answer.computed')}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-[length:var(--text-xl)] font-bold tabular-nums text-[var(--color-brand-strong)]">
                  {calcResult != null ? calcResult.toFixed(2) : '—'}
                </span>
                {question.unit && <span className="text-caption text-[var(--color-brand-strong)]">{calculator.outputUnitHint ?? question.unit}</span>}
              </div>
            </div>
          </div>
        )}

        {activeMode === 'Connector' && (
          <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <div className="flex items-center gap-3 mb-3">
              <Plug className="w-5 h-5 text-[var(--color-brand)]" />
              <div>
                <div className="text-[length:var(--text-sm)] font-semibold text-[var(--text-primary)]">{pickConnector(question)}</div>
                <div className="text-caption text-[var(--text-tertiary)]">{t('tasks.answer.autoPull')}</div>
              </div>
            </div>
            {assignment.value != null ? (
              <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--accent-green-light)] border border-[var(--status-ok)]/20">
                <div className="flex items-center gap-2 text-micro font-semibold text-[var(--status-ok)] uppercase tracking-[0.06em] mb-1">
                  <CheckCircle2 className="w-3 h-3" /> {t('tasks.answer.pulled')}
                </div>
                <div className="text-[length:var(--text-xs)] text-[var(--text-secondary)]">
                  {t('tasks.answer.value')} <strong className="text-[var(--text-primary)] tabular-nums">{assignment.value}</strong> {question.unit ?? ''}
                </div>
              </div>
            ) : (
              <button
                onClick={handleConnectorPull}
                disabled={locked || busy}
                className="w-full px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[length:var(--text-sm)] font-semibold hover:bg-[var(--btn-primary-bg-hover)] disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('tasks.answer.pulling')}</> : <><Plug className="w-4 h-4" /> {t('tasks.answer.pull')}</>}
              </button>
            )}
          </div>
        )}

        <div>
          <label className="block text-micro uppercase tracking-[0.06em] font-semibold text-[var(--text-tertiary)] mb-1">
            {t('tasks.answer.commentLabel')}
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            disabled={locked}
            placeholder={t('tasks.answer.commentPlaceholder')}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-xs)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 outline-none disabled:bg-[var(--bg-secondary)] resize-none"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          {!locked && activeMode !== 'Connector' && (
            <button
              onClick={handleSaveDraft}
              disabled={effectiveValue == null || busy}
              className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[length:var(--text-sm)] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> {t('tasks.answer.saveDraft')}
            </button>
          )}
          {!locked && (
            <button
              onClick={handleSubmit}
              disabled={effectiveValue == null || busy}
              className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-[length:var(--text-sm)] font-semibold hover:bg-[var(--btn-primary-bg-hover)] disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> {t('tasks.answer.submitForReview')}
            </button>
          )}
          {locked && <HandoffHint status={assignment.status} entityId={assignment.entityId} entities={entities} members={members} />}
        </div>
      </div>

      <div className="space-y-4">
        <EvidencePanel evidence={evidence} locked={locked} onAdd={handleAddEvidence} onRemove={i => setEvidence(e => e.filter((_, idx) => idx !== i))} />
        <CommentThread assignmentId={assignment.id} />
      </div>
    </div>
  )
}

export default AnswerPanel
