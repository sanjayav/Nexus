import { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Compass, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { TOUR_EVENT, TOUR_KEY_PREFIX } from './onboarding/tour'
import { spring, transition } from '../motion/tokens'

/**
 * ProductTour — the one optional product tour (four steps). It shows once on
 * a user's first visit to the authed shell and can be replayed any time from
 * the guided setup (`startTour()` in components/onboarding/tour). Each step
 * is a paper card anchored to a `data-tour="…"` element (or centred), with
 * an emerald spotlight that glides between targets.
 *
 * Persistence: per-user via `localStorage` — once a user completes or skips
 * the tour it never auto-starts again for them.
 *
 *   localStorage[`aeiforo_tour_completed_${userId}`] = "1"
 *
 * UX contract:
 *   - ESC always closes + marks complete (never traps the user)
 *   - The page underneath stays usable; only the card is interactive
 *   - Targets that aren't on screen (e.g. sidebar on mobile) fall back to a
 *     centred card
 */
export type TourStep = {
  /** Optional i18n id — title/body resolve from `onboarding.tour.steps.<key>.*`. */
  key?: string
  /** Optional data-tour selector. Centred card when omitted. */
  target?: string
  title: string
  body: string
  /** Where the card sits relative to the target. */
  placement?: 'center' | 'bottom' | 'right' | 'top' | 'left'
}

const STEPS: TourStep[] = [
  {
    key: 'welcome',
    title: 'Welcome to Nexus',
    body: 'Your single workspace for collecting ESG data, drafting framework reports, and publishing assured disclosures. Take a quick tour to see where everything lives.',
    placement: 'center',
  },
  {
    target: 'sidebar-home',
    key: 'day',
    title: 'This is your day',
    body: 'Open assignments, review queue, and the next best action — all on one screen. Start here every morning.',
    placement: 'right',
  },
  {
    target: 'sidebar-templates',
    key: 'frameworks',
    title: 'Frameworks become documents',
    body: 'Pick a framework, open the editor, and fill it in like a document. Values link automatically across every report.',
    placement: 'right',
  },
  {
    target: 'topbar-search',
    key: 'search',
    title: 'Cmd+K opens anything',
    body: 'Press ⌘K to jump to any page, run an action, or find a framework. ⌘N adds something new.',
    placement: 'bottom',
  },
]

interface ProductTourProps {
  /** User identifier — used to scope the "completed" flag per user. */
  userId: string
  /** Optional override for the steps. Defaults to the canonical 4. */
  steps?: TourStep[]
}

export default function ProductTour({ userId, steps = STEPS }: ProductTourProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const storageKey = TOUR_KEY_PREFIX + userId
  const [active, setActive] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)

  // First run: decide whether to show the tour for this user.
  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) setActive(true)
    } catch {
      /* localStorage unavailable — silently no-op */
    }
  }, [storageKey])

  // Replay from the guided setup.
  useEffect(() => {
    const start = () => { setStepIdx(0); setActive(true) }
    window.addEventListener(TOUR_EVENT, start)
    return () => window.removeEventListener(TOUR_EVENT, start)
  }, [])

  const complete = useCallback(() => {
    try { localStorage.setItem(storageKey, '1') } catch { /* ignore */ }
    setActive(false)
  }, [storageKey])

  // ESC always exits the tour (with completion stamped); arrows step.
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') complete()
      else if (e.key === 'ArrowRight') setStepIdx(i => Math.min(i + 1, steps.length - 1))
      else if (e.key === 'ArrowLeft') setStepIdx(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, complete, steps.length])

  useEffect(() => { if (active) primaryRef.current?.focus() }, [active, stepIdx])

  // Resolve the target rect for the current step; track resize/scroll.
  const step = steps[stepIdx]
  useLayoutEffect(() => {
    if (!active) { setRect(null); return }
    const resolve = () => {
      if (!step?.target) { setRect(null); return }
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
      const r = el?.getBoundingClientRect()
      // Hidden targets (collapsed mobile sidebar) have no size — centre instead.
      setRect(r && r.width > 0 && r.height > 0 ? r : null)
    }
    resolve()
    window.addEventListener('resize', resolve)
    window.addEventListener('scroll', resolve, true)
    return () => {
      window.removeEventListener('resize', resolve)
      window.removeEventListener('scroll', resolve, true)
    }
  }, [active, stepIdx, step])

  if (!active || typeof document === 'undefined' || !step) return null

  const isLast = stepIdx === steps.length - 1
  const next = () => (isLast ? complete() : setStepIdx(i => Math.min(i + 1, steps.length - 1)))
  const cardPos = computeCardPosition(rect, step.placement ?? 'center')
  const title = step.key ? t(`onboarding.tour.steps.${step.key}.title`, { defaultValue: step.title }) : step.title
  const body = step.key ? t(`onboarding.tour.steps.${step.key}.body`, { defaultValue: step.body }) : step.body

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="product-tour"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={transition.fast}
        className="fixed inset-0 z-[2000] pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-tour-title"
        aria-describedby="product-tour-body"
      >
        {/* Veil — non-interactive so the page underneath stays usable. */}
        {!rect && <div className="absolute inset-0" style={{ background: 'var(--bg-overlay)' }} aria-hidden />}

        {/* Spotlight: glides between targets (layout spring). */}
        {rect && (
          <motion.div
            className="absolute pointer-events-none rounded-[var(--radius-xl)]"
            initial={false}
            animate={{ left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16 }}
            transition={reduce ? { duration: 0 } : spring.gentle}
            style={{ boxShadow: '0 0 0 9999px var(--bg-overlay), 0 0 0 2px var(--sidebar-accent), 0 0 24px 2px rgba(52, 211, 153, 0.35)' }}
            aria-hidden
          />
        )}

        <motion.div
          key={`card-${stepIdx}`}
          initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={spring.gentle}
          className="absolute pointer-events-auto w-[360px] max-w-[calc(100vw-32px)] rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[var(--shadow-overlay)] p-5"
          style={cardPos}
          data-testid="product-tour-card"
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="inline-flex items-center gap-1.5 text-caption font-medium text-[var(--color-brand)]">
              <Compass className="w-3.5 h-3.5" aria-hidden /> {t('onboarding.tour.quickTour', { defaultValue: 'Quick tour' })}
            </span>
            <button
              type="button"
              onClick={complete}
              aria-label={t('onboarding.tour.close', { defaultValue: 'Close tour' })}
              className="w-9 h-9 -mr-2 -mt-1 rounded-[var(--radius-md)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>
          <h3 id="product-tour-title" className="type-h3 text-[var(--text-primary)]">{title}</h3>
          <p id="product-tour-body" className="mt-1.5 text-small text-[var(--text-secondary)]">{body}</p>

          {/* progress dots */}
          <div className="mt-4 flex items-center gap-1.5" aria-hidden>
            {steps.map((_, i) => (
              <span key={i} className="relative h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden" style={{ width: i === stepIdx ? 20 : 6 }}>
                {i <= stepIdx && <motion.span layoutId={i === stepIdx ? 'tour-dot' : undefined} className="absolute inset-0 rounded-full bg-[var(--color-brand)]" transition={spring.snappy} />}
              </span>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={complete}
              className="min-h-[36px] px-1 text-caption font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            >
              {t('onboarding.tour.skip', { defaultValue: 'Skip tour' })}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-caption text-[var(--text-tertiary)] tabular-nums">
                {stepIdx + 1} / {steps.length}
              </span>
              {stepIdx > 0 && (
                <button
                  type="button"
                  onClick={() => setStepIdx(i => Math.max(0, i - 1))}
                  aria-label={t('common.back')}
                  className="w-9 h-9 rounded-[var(--radius-md)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden />
                </button>
              )}
              <button
                ref={primaryRef}
                type="button"
                onClick={next}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 rounded-[var(--radius-md)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] text-small font-semibold hover:bg-[var(--btn-primary-bg-hover)] transition-colors duration-micro"
              >
                {isLast ? t('onboarding.tour.start', { defaultValue: 'Start using Nexus' }) : t('common.next')}
                {!isLast && <ArrowRight className="w-3.5 h-3.5" aria-hidden />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

/**
 * Card position next to the target (or centred when there is none / it
 * would land off-screen). On narrow screens the card docks to the bottom.
 */
function computeCardPosition(
  rect: DOMRect | null,
  placement: NonNullable<TourStep['placement']>,
): React.CSSProperties {
  const PADDING = 16
  const CARD_W = 360
  const CARD_H = 230
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800

  if (vw < 640) return { left: PADDING, right: PADDING, bottom: PADDING, width: 'auto' }
  if (!rect || placement === 'center') return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }

  let left = rect.left
  let top = rect.bottom + PADDING
  switch (placement) {
    case 'bottom':
      left = Math.min(Math.max(rect.left, PADDING), vw - CARD_W - PADDING)
      top = rect.bottom + PADDING
      break
    case 'top':
      left = Math.min(Math.max(rect.left, PADDING), vw - CARD_W - PADDING)
      top = Math.max(PADDING, rect.top - CARD_H - PADDING)
      break
    case 'right':
      left = Math.min(rect.right + PADDING, vw - CARD_W - PADDING)
      top = Math.min(Math.max(rect.top, PADDING), vh - CARD_H - PADDING)
      break
    case 'left':
      left = Math.max(PADDING, rect.left - CARD_W - PADDING)
      top = Math.min(Math.max(rect.top, PADDING), vh - CARD_H - PADDING)
      break
  }
  return { left, top }
}
