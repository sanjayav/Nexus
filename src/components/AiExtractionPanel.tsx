/**
 * AiExtractionPanel — asks the AI provider to read one uploaded evidence file
 * and propose the primary numeric value, then offers "Use this value".
 *
 * Composition contract: the parent owns the entry form. On accept we hand it
 * the structured result plus the API's AI-content label (`ai_generated`,
 * `ai_label`), so the value can carry the label until a person edits it.
 * The audit-trail link (/ai/accept-extraction) is made by the entry pipeline
 * once a data_value exists.
 *
 * States: idle → reading → result | error | AI disabled for this organisation
 * (403 `ai_disabled`) | not configured (503).
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Sparkles, AlertCircle, CheckCircle2, Lock, RotateCcw } from 'lucide-react'
import { ai, isAiDisabledError, isUnconfiguredError, type AiExtractionResult, type AiGeneratedLabel } from '../lib/api'
import { useIntegrationStatus, integrationMissing } from '../lib/integrations'
import { useTranslation } from 'react-i18next'
import { useFmt } from '../lib/fmt'
import { AiLabel, AiDisabledNotice } from './entry/AiLabel'
import { transition } from '../motion/tokens'

interface Props {
  evidenceId: string
  /** Filename shown in the panel header — purely cosmetic. */
  filename?: string
  /** Optional hints forwarded to the model to anchor the extraction. */
  questionnaireItemId?: string
  expectedUnit?: string
  expectedPeriod?: string
  lineItemHint?: string
  /** Invoked when the user clicks "Use this value". */
  onAccept: (extraction: AiExtractionResult, meta: AiGeneratedLabel | null) => void
  /** Disables the extract button (e.g. parent has already locked the form). */
  disabled?: boolean
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'disabled' }
  | { kind: 'error'; message: string }
  | { kind: 'result'; extraction: AiExtractionResult; meta: AiGeneratedLabel }

function ConfidenceBadge({ value }: { value: number }) {
  const { t } = useTranslation()
  const pct = Math.round(value * 100)
  const tone = value >= 0.8 ? 'success' : value >= 0.5 ? 'warning' : 'danger'
  const label = value >= 0.8 ? t('entry.aiExtract.high') : value >= 0.5 ? t('entry.aiExtract.medium') : t('entry.aiExtract.low')
  return (
    <span className="nx-pill" data-tone={tone} data-size="sm">
      {t('entry.aiExtract.confidence', { level: label, pct })}
    </span>
  )
}

export default function AiExtractionPanel({
  evidenceId, filename, questionnaireItemId, expectedUnit, expectedPeriod, lineItemHint, onAccept, disabled,
}: Props) {
  const { t } = useTranslation()
  const f = useFmt()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const integrations = useIntegrationStatus()
  const aiUnavailable = integrationMissing(integrations, 'ai')

  const runExtraction = async () => {
    setStatus({ kind: 'loading' })
    try {
      const res = await ai.extractEvidence({ evidenceId, questionnaireItemId, expectedUnit, expectedPeriod, lineItemHint })
      const { extraction, ai_generated, ai_label, ai_provider, ai_model, locale } = res
      setStatus({ kind: 'result', extraction, meta: { ai_generated, ai_label, ai_provider, ai_model, locale } })
    } catch (e) {
      if (isAiDisabledError(e)) { setStatus({ kind: 'disabled' }); return }
      const message = isUnconfiguredError(e)
        ? t('entry.aiExtract.notConfigured')
        : e instanceof Error ? e.message : t('entry.aiExtract.failed')
      setStatus({ kind: 'error', message })
    }
  }

  if (status.kind === 'disabled') return <AiDisabledNotice compact />

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 min-h-[32px]">
        <div className="flex items-center gap-1.5 text-caption font-medium text-[var(--text-secondary)] min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-[var(--color-brand)] flex-shrink-0" aria-hidden />
          <span className="truncate">{t('entry.aiExtract.title')}</span>
        </div>
        {status.kind === 'idle' && (
          <button
            type="button"
            onClick={runExtraction}
            disabled={disabled || aiUnavailable || integrations.loading}
            aria-label={aiUnavailable ? t('entry.aiExtract.notConfigured') : t('entry.aiExtract.extractFrom', { file: filename ?? '' })}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-sm)] text-caption font-semibold border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand-strong)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {aiUnavailable ? <Lock className="w-3 h-3" aria-hidden /> : <Sparkles className="w-3 h-3" aria-hidden />}
            {aiUnavailable ? t('entry.aiExtract.unavailable') : t('entry.aiExtract.extract')}
          </button>
        )}
      </div>

      {status.kind === 'idle' && aiUnavailable && (
        <p className="mt-1.5 text-caption text-[var(--text-tertiary)]">{t('entry.aiExtract.notConfiguredHint')}</p>
      )}

      <AnimatePresence initial={false} mode="wait">
        {status.kind === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition.fast}
            className="flex items-center gap-2 mt-2 text-caption text-[var(--text-secondary)]" role="status">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-brand)]" aria-hidden />
            {t('entry.aiExtract.reading')}
          </motion.div>
        )}

        {status.kind === 'error' && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition.fast}
            className="mt-2 flex items-start gap-2 p-2 rounded-[var(--radius-sm)] bg-[var(--status-danger-soft)] text-caption text-[var(--status-danger)]" role="alert">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden />
            <div className="min-w-0">
              <div className="font-semibold">{t('entry.aiExtract.failed')}</div>
              <div className="break-words text-[var(--text-secondary)]">{status.message}</div>
              <button type="button" onClick={() => setStatus({ kind: 'idle' })} className="mt-1 inline-flex items-center gap-1 font-semibold text-[var(--color-brand-strong)] hover:underline">
                <RotateCcw className="w-3 h-3" aria-hidden /> {t('entry.aiExtract.tryAgain')}
              </button>
            </div>
          </motion.div>
        )}

        {status.kind === 'result' && (
          <motion.div key="result" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={transition.base}
            className="mt-2 space-y-2">
            <AiLabel meta={status.meta} />
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div className="type-figure text-[20px] leading-7 text-[var(--text-primary)]">
                {f.exact(status.extraction.value)}
                {status.extraction.unit && <span className="ml-1 text-caption font-normal text-[var(--text-tertiary)]">{status.extraction.unit}</span>}
              </div>
              <ConfidenceBadge value={status.extraction.confidence} />
            </div>
            {(status.extraction.period || status.extraction.supplier) && (
              <dl className="grid grid-cols-2 gap-2 text-caption">
                {status.extraction.period && (
                  <div><dt className="text-[var(--text-tertiary)]">{t('entry.aiExtract.period')}</dt><dd className="text-[var(--text-primary)]">{status.extraction.period}</dd></div>
                )}
                {status.extraction.supplier && (
                  <div><dt className="text-[var(--text-tertiary)]">{t('entry.aiExtract.supplier')}</dt><dd className="text-[var(--text-primary)]">{status.extraction.supplier}</dd></div>
                )}
              </dl>
            )}
            <p className="text-caption text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-tertiary)]">{t('entry.aiExtract.reasoning')} </span>
              {status.extraction.reasoning}
            </p>
            {status.extraction.additionalNotes && (
              <p className="text-caption text-[var(--text-tertiary)]">{status.extraction.additionalNotes}</p>
            )}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => onAccept(status.extraction, status.meta)}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-sm)] text-caption font-semibold text-[var(--btn-primary-fg)] bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-bg-hover)] disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden /> {t('entry.aiExtract.useValue')}
              </button>
              <button type="button" onClick={() => setStatus({ kind: 'idle' })} className="h-8 px-2 text-caption font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                {t('entry.aiExtract.reExtract')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
