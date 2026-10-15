import { useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, X } from 'lucide-react'

/**
 * ProductTour — a one-time, 4-step onboarding tour that shows the very first
 * time a user lands in the authed shell. Each step is a small "spotlight"
 * card anchored to a `data-tour="…"` target element (or centred for the
 * welcome step). Backdrop is a translucent veil with a punched-out hole
 * around the target so attention naturally tracks there.
 *
 * Persistence: per-user via `localStorage` — once a user completes or
 * skips the tour, it never reappears for them.
 *
 *   localStorage[`aeiforo_tour_completed_${userId}`] = "1"
 *
 * UX contract:
 *   - ESC always closes + marks complete (never traps the user)
 *   - Backdrop click is a no-op (avoid accidental dismiss)
 *   - Navigation is not blocked — pointer events on the page underneath
 *     still work; the backdrop is non-interactive.
 *   - All targets fall back to "centre of screen" if their `data-tour`
 *     anchor isn't present.
 */
const TOUR_KEY_PREFIX = 'aeiforo_tour_completed_'

export type TourStep = {
  /** Optional data-tour selector. Centred modal when omitted. */
  target?: string
  title: string
  body: string
  /** Where the card sits relative to the target. */
  placement?: 'center' | 'bottom' | 'right' | 'top' | 'left'
}

const STEPS: TourStep[] = [
  {
    title: 'Welcome to Nexus',
    body: 'Your single workspace for collecting ESG data, drafting framework reports, and publishing assured disclosures. Take a quick tour to see where everything lives.',
    placement: 'center',
  },
  {
    target: 'sidebar-home',
    title: 'This is your day',
    body: 'Open assignments, review queue, and the next best action — all on one screen. Start here every morning.',
    placement: 'right',
  },
  {
    target: 'sidebar-templates',
    title: 'Frameworks become documents',
    body: "Pick a framework, open the editor, and fill it in like a document. Values link automatically across every report.",
    placement: 'right',
  },
  {
    target: 'topbar-search',
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
  const storageKey = TOUR_KEY_PREFIX + userId
  const [active, setActive] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  // On mount, decide whether to show the tour for this user.
  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) setActive(true)
    } catch {
      /* localStorage unavailable — silently no-op */
    }
  }, [storageKey])

  const complete = useCallback(() => {
    try { localStorage.setItem(storageKey, '1') } catch { /* ignore */ }
    setActive(false)
  }, [storageKey])

  // ESC always exits the tour (with completion stamped).
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') complete()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, complete])

  // Resolve the target rect for the current step. We recompute on resize
  // and on step change so the spotlight tracks the element accurately.
  const step = steps[stepIdx]
  useLayoutEffect(() => {
    if (!active) { setRect(null); return }
    const resolve = () => {
      if (!step?.target) { setRect(null); return }
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
      setRect(el ? el.getBoundingClientRect() : null)
    }
    resolve()
    window.addEventListener('resize', resolve)
    window.addEventListener('scroll', resolve, true)
    return () => {
      window.removeEventListener('resize', resolve)
      window.removeEventListener('scroll', resolve, true)
    }
  }, [active, stepIdx, step])

  if (!active || typeof document === 'undefined') return null

  const isLast = stepIdx === steps.length - 1
  const next = () => {
    if (isLast) complete()
    else setStepIdx(i => Math.min(i + 1, steps.length - 1))
  }

  const cardPos = computeCardPosition(rect, step?.placement ?? 'center')

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="product-tour"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[2000] pointer-events-none"
        aria-modal="true"
        role="dialog"
        aria-label={step.title}
      >
        {/* Backdrop — translucent veil. Pointer events stay off so the
            page underneath remains usable; only the card itself is
            interactive. */}
        <div className="absolute inset-0 bg-black/55" aria-hidden />

        {/* Spotlight ring around the target element (when one is set) */}
        {rect && (
          <motion.div
            key={`spot-${stepIdx}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            className="absolute pointer-events-none rounded-2xl"
            style={{
              left: rect.left - 8,
              top: rect.top - 8,
              width: rect.width + 16,
              height: rect.height + 16,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55), 0 0 0 2px rgba(15,123,111,0.75), 0 8px 24px rgba(15,123,111,0.35)',
              background: 'transparent',
            }}
          />
        )}

        {/* Step card */}
        <motion.div
          key={`card-${stepIdx}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="absolute pointer-events-auto w-[360px] max-w-[88vw] rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-default)] shadow-2xl p-5"
          style={cardPos}
          data-testid="product-tour-card"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 text-[var(--color-brand)]">
              <Sparkles className="w-4 h-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Quick tour</span>
            </div>
            <button
              type="button"
              onClick={complete}
              aria-label="Skip tour"
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <h3 className="font-display text-[var(--text-lg)] font-semibold text-[var(--text-primary)] leading-snug">
            {step.title}
          </h3>
          <p className="mt-2 text-[var(--text-sm)] text-[var(--text-secondary)] leading-relaxed">
            {step.body}
          </p>
          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={complete}
              className="text-[var(--text-xs)] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-3">
              <span className="text-[var(--text-xs)] text-[var(--text-tertiary)] tabular-nums">
                {stepIdx + 1} / {steps.length}
              </span>
              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-[var(--radius-md)] bg-[var(--color-brand)] text-white text-[var(--text-sm)] font-semibold hover:bg-[var(--color-brand-strong)] transition-colors"
              >
                {isLast ? 'Start using Nexus' : 'Next'}
                {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
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
 * Pick a card position next to the target (or centre when no target).
 * Falls back to centred when the rect would land off-screen.
 */
function computeCardPosition(
  rect: DOMRect | null,
  placement: NonNullable<TourStep['placement']>,
): React.CSSProperties {
  const PADDING = 16
  const CARD_W = 360
  const CARD_H = 220
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800

  if (!rect || placement === 'center') {
    return {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    }
  }

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
