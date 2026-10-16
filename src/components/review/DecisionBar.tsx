import { AnimatePresence, motion } from 'framer-motion'
import { forwardRef, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, ChevronUp, CornerUpLeft, Loader2, XCircle } from 'lucide-react'
import SealCheck from '../ui/SealCheck'
import { iconSwapVariants } from '../../motion/tokens'

export type DecisionAction = 'pass' | 'return' | 'reject'

export interface DecisionPhase {
  id: string
  action: DecisionAction
  stage: 'busy' | 'sealed'
}

/**
 * Sticky decision bar for the review / approval queues. It sits at the bottom
 * of the scroll viewport for as long as the detail pane is on screen, so the
 * decision is never a scroll away from the evidence.
 *
 *   A — pass / approve     R — return with comment     J / K — next / previous
 *
 * A return or reject needs a comment: the check runs inline (the field turns
 * red and says why) instead of a browser alert.
 */
export interface DecisionBarProps {
  passLabel: string
  returnLabel: string
  /** Optional third action (approval queue: reject back to the contributor). */
  rejectLabel?: string
  comment: string
  onComment: (v: string) => void
  commentError: string | null
  commentPlaceholder: string
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  phase: DecisionPhase | null
  onPass: () => void
  onReturn: () => void
  onReject?: () => void
}

const DecisionBar = forwardRef<HTMLTextAreaElement, DecisionBarProps>(function DecisionBar(
  {
    passLabel, returnLabel, rejectLabel, comment, onComment, commentError, commentPlaceholder,
    index, total, onPrev, onNext, phase, onPass, onReturn, onReject,
  },
  ref,
) {
  const { t } = useTranslation()
  const fieldId = useId()
  const errId = useId()
  const busy = !!phase
  const sealed = phase?.stage === 'sealed' && phase.action === 'pass'
  const working = (a: DecisionAction) => phase?.action === a && phase.stage === 'busy'

  return (
    <>
    {/* Mobile: the bar is fixed to the viewport bottom; this spacer keeps the last content reachable. */}
    <div className="h-[248px] lg:hidden" aria-hidden />
    <div
      className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(8px,env(safe-area-inset-bottom))] lg:px-0 lg:pb-0 lg:sticky lg:inset-x-auto lg:z-20 lg:-mx-px lg:mt-6"
      role="region"
      aria-label={t('reviewUi.decision.region')}
    >
      {/* Fade so content scrolling under the bar doesn't hard-cut. */}
      <div className="h-4 bg-gradient-to-b from-transparent to-[var(--bg-app)] pointer-events-none" aria-hidden />
      <div className="rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[var(--shadow-raised)] p-3 sm:p-4 lg:mb-1">
        <label htmlFor={fieldId} className="sr-only">{t('reviewUi.decision.commentLabel')}</label>
        <textarea
          id={fieldId}
          ref={ref}
          value={comment}
          onChange={(e) => onComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur()
          }}
          rows={1}
          placeholder={commentPlaceholder}
          aria-invalid={!!commentError}
          aria-describedby={commentError ? errId : undefined}
          disabled={busy}
          className={`block w-full min-h-[40px] max-h-40 px-3 py-2 rounded-[var(--radius-md)] border bg-[var(--bg-primary)] type-small text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none resize-none transition-[border-color,box-shadow,height] duration-fast focus:h-20 ${
            commentError
              ? 'border-[var(--status-danger)] shadow-[0_0_0_3px_var(--status-danger-soft)]'
              : 'border-[var(--border-default)] focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--status-success-soft)]'
          } ${comment ? 'h-20' : ''}`}
        />
        <AnimatePresence initial={false}>
          {commentError && (
            <motion.p
              id={errId}
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-caption text-[var(--status-danger)] mt-1.5 overflow-hidden"
            >
              {commentError}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Position + navigation */}
          <div className="flex items-center gap-1.5 text-caption text-[var(--text-tertiary)]">
            <NavBtn onClick={onPrev} disabled={busy || index <= 0} label={t('reviewUi.decision.prev')} kbd="K">
              <ChevronUp className="w-4 h-4" />
            </NavBtn>
            <NavBtn onClick={onNext} disabled={busy || index >= total - 1} label={t('reviewUi.decision.next')} kbd="J">
              <ChevronDown className="w-4 h-4" />
            </NavBtn>
            <span className="ml-1 tabular-nums whitespace-nowrap">{t('reviewUi.decision.position', { index: index + 1, total })}</span>
            <span className="hidden xl:inline-flex items-center gap-1 ml-3 whitespace-nowrap">
              <kbd className="kbd">J</kbd><kbd className="kbd">K</kbd> {t('reviewUi.decision.navHint')}
            </span>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center">
            {onReject && rejectLabel && (
              <button
                type="button"
                onClick={onReject}
                disabled={busy}
                className="h-10 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] text-small font-semibold whitespace-nowrap text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)] disabled:opacity-50 transition-colors duration-micro"
              >
                {working('reject') ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {rejectLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onReturn}
              disabled={busy}
              aria-keyshortcuts="R"
              className={`h-10 px-3.5 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-small font-semibold whitespace-nowrap text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] hover:border-[var(--border-strong)] disabled:opacity-50 transition-colors duration-micro ${onReject ? '' : 'col-span-1'}`}
            >
              {working('return') ? <Loader2 className="w-4 h-4 animate-spin" /> : <CornerUpLeft className="w-4 h-4" />}
              {returnLabel}
              <kbd className="kbd hidden lg:inline-flex ml-0.5">R</kbd>
            </button>
            <button
              type="button"
              onClick={onPass}
              disabled={busy}
              aria-keyshortcuts="A"
              className={`h-10 px-4 inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] text-small font-semibold whitespace-nowrap bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)] shadow-[var(--btn-primary-shadow)] transition-colors duration-micro lg:min-w-[160px] ${
                onReject ? 'col-span-2 lg:col-span-1' : 'col-span-1'
              } ${busy && !sealed ? 'opacity-80' : ''}`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {sealed ? (
                  <motion.span key="seal" variants={iconSwapVariants} initial="initial" animate="enter" exit="exit" className="inline-flex">
                    <SealCheck size={18} tone="ink" filled={false} />
                  </motion.span>
                ) : working('pass') ? (
                  <motion.span key="busy" variants={iconSwapVariants} initial="initial" animate="enter" exit="exit" className="inline-flex">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </motion.span>
                ) : (
                  <motion.span key="idle" variants={iconSwapVariants} initial="initial" animate="enter" exit="exit" className="inline-flex">
                    <Check className="w-4 h-4" />
                  </motion.span>
                )}
              </AnimatePresence>
              {sealed ? t('reviewUi.decision.done') : passLabel}
              {!sealed && (
                <kbd className="hidden lg:inline-flex items-center justify-center ml-0.5 min-w-[18px] h-[18px] px-1 rounded-[4px] border border-[color:var(--btn-primary-fg)] font-mono text-[11px] leading-none opacity-60">
                  A
                </kbd>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  )
})

export default DecisionBar

function NavBtn({ onClick, disabled, label, kbd, children }: { onClick: () => void; disabled?: boolean; label: string; kbd: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-keyshortcuts={kbd}
      title={`${label} (${kbd})`}
      className="w-10 h-10 lg:w-8 lg:h-8 inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-40 disabled:pointer-events-none transition-colors duration-micro"
    >
      {children}
    </button>
  )
}
