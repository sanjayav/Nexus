import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Sparkles, Settings2, PowerOff, ServerCog } from 'lucide-react'
import { dur, ease } from '../../../motion/tokens'
import { useFmt } from '../../../lib/fmt'
import { Skeleton } from '../../Skeleton'

/* ── AI-generated label ──────────────────────────────────────────────────
 * Regulatory labelling (CAC 《人工智能生成合成内容标识办法》): every piece of
 * AI-generated text carries an explicit, visible label. Server-provided
 * `ai_label` wins (it is localised to the caller); otherwise the i18n copy.
 */
export function AiLabel({ label, className = '' }: { label?: string | null; className?: string }) {
  const { t } = useTranslation()
  return (
    <span className={`nx-pill ${className}`} data-tone="info" role="note">
      <Sparkles className="w-3 h-3" aria-hidden />
      {label || t('aiReport.label.generated')}
    </span>
  )
}

/* ── Generation progress ─────────────────────────────────────────────────
 * The draft endpoint returns one response, so steps advance on a calm clock
 * and none is ever marked done — only the active one moves. Elapsed seconds
 * keep the wait honest.
 */
export function DraftProgress({ section, provider }: { section: string; provider: string }) {
  const { t } = useTranslation()
  const f = useFmt()
  const reduce = useReducedMotion()
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const started = Date.now()
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500)
    return () => window.clearInterval(id)
  }, [])
  const steps = [
    t('aiReport.progress.gather', { section }),
    t('aiReport.progress.draft', { provider }),
    t('aiReport.progress.check'),
  ]
  const active = elapsed < 2 ? 0 : elapsed < 6 ? 1 : 2

  return (
    <div role="status" aria-live="polite" aria-busy="true" className="px-5 py-6 sm:px-10 sm:py-9">
      <ol className="space-y-2.5">
        {steps.map((s, i) => {
          const state = i < active ? 'past' : i === active ? 'active' : 'next'
          return (
            <li key={i} className="flex items-center gap-3 min-w-0">
              <span className="relative w-4 h-4 flex items-center justify-center flex-shrink-0" aria-hidden>
                {state === 'active' ? (
                  <>
                    {!reduce && (
                      <motion.span
                        className="absolute inset-0 rounded-full bg-[var(--color-brand)]"
                        initial={{ opacity: 0.35, scale: 0.6 }}
                        animate={{ opacity: 0, scale: 1.6 }}
                        transition={{ duration: 1.4, ease: ease.out, repeat: Infinity }}
                      />
                    )}
                    <span className="w-2 h-2 rounded-full bg-[var(--color-brand)]" />
                  </>
                ) : (
                  <span className={`w-1.5 h-1.5 rounded-full ${state === 'past' ? 'bg-[var(--text-tertiary)]' : 'bg-[var(--border-strong)]'}`} />
                )}
              </span>
              <span
                className={`text-small min-w-0 ${
                  state === 'active' ? 'text-[var(--text-primary)] font-medium' : state === 'past' ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-quaternary)]'
                }`}
              >
                {s}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="mt-3 pl-7 text-caption text-[var(--text-tertiary)] tabular-nums">
        {t('aiReport.progress.elapsed', { s: f.number(elapsed) })}
      </p>
      <div className="mt-8 space-y-3 max-w-[68ch]" aria-hidden>
        <Skeleton className="h-5 w-1/2" rounded="md" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-11/12" />
        <Skeleton className="h-3.5 w-4/5" />
        <div className="h-2" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>
    </div>
  )
}

/* ── Draft body ──────────────────────────────────────────────────────────
 * Sanitised HTML rendered as a readable document column. On first render
 * each block rises in 70 ms apart — the one authored moment on the screen —
 * so the draft reads as if it is being set onto the page.
 */
const PROSE =
  'max-w-[68ch] text-body text-[var(--text-secondary)] ' +
  '[&>*:first-child]:mt-0 ' +
  '[&_h1]:type-h2 [&_h1]:text-[var(--text-primary)] [&_h1]:mt-8 ' +
  '[&_h2]:text-h2 [&_h2]:font-display [&_h2]:text-[var(--text-primary)] [&_h2]:mt-8 [&_h2]:mb-1 ' +
  '[&_h3]:text-h3 [&_h3]:font-display [&_h3]:text-[var(--text-primary)] [&_h3]:mt-7 [&_h3]:mb-1 ' +
  '[&_p]:mt-3 [&_p]:text-pretty ' +
  '[&_ul]:mt-3 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:mt-3 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:mt-1.5 [&_li]:pl-1 ' +
  '[&_li::marker]:text-[var(--text-quaternary)] ' +
  '[&_strong]:text-[var(--text-primary)] [&_strong]:font-semibold [&_strong]:tabular-nums ' +
  '[&_table]:mt-4 [&_table]:w-full [&_td]:border-b [&_td]:border-[var(--border-subtle)] [&_td]:py-1.5 [&_th]:text-left [&_th]:py-1.5 ' +
  '[&_blockquote]:mt-4 [&_blockquote]:pl-4 [&_blockquote]:border-l [&_blockquote]:border-[var(--border-strong)] [&_blockquote]:text-[var(--text-tertiary)]'

export function DraftBody({ html, revealKey }: { html: string; revealKey: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || reduce || typeof el.animate !== 'function') return
    const kids = Array.from(el.children) as HTMLElement[]
    const anims = kids.map((k, i) =>
      k.animate(
        [
          { opacity: 0, transform: 'translateY(6px)', filter: 'blur(3px)' },
          { opacity: 1, transform: 'none', filter: 'none' },
        ],
        { duration: 420, delay: Math.min(i, 14) * 70, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' },
      ),
    )
    return () => anims.forEach(a => a.cancel())
    // Replay only when a new draft arrives, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey, reduce])
  return <div ref={ref} className={PROSE} dangerouslySetInnerHTML={{ __html: html }} />
}

/* ── Disabled state ──────────────────────────────────────────────────────
 * Truthful: says why AI is off and who can turn it on. Never a fake draft.
 */
export function AiDisabledPanel({
  reason,
  canManage,
  editorTo,
}: {
  reason: 'organisation' | 'deployment'
  canManage: boolean
  /** Where to write the narrative by hand instead. */
  editorTo: string
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const Icon = reason === 'organisation' ? PowerOff : ServerCog
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.base, ease: ease.out }}
      className="px-5 py-10 sm:px-10 sm:py-14"
      role="status"
    >
      <div className="max-w-[56ch]">
        <span className="inline-flex w-10 h-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--status-neutral-soft)] text-[var(--text-secondary)] border border-[var(--status-neutral-line)]">
          <Icon className="w-5 h-5" strokeWidth={1.75} aria-hidden />
        </span>
        <h3 className="type-h2 text-[var(--text-primary)] mt-5 text-balance">{t(`aiReport.disabled.${reason}.title`)}</h3>
        <p className="type-body text-[var(--text-secondary)] mt-2 text-pretty">{t(`aiReport.disabled.${reason}.body`)}</p>
        <dl className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr] text-small">
          <dt className="text-[var(--text-tertiary)]">{t('aiReport.disabled.whoLabel')}</dt>
          <dd className="text-[var(--text-primary)]">{t(`aiReport.disabled.${reason}.who`)}</dd>
          <dt className="text-[var(--text-tertiary)]">{t('aiReport.disabled.whereLabel')}</dt>
          <dd className="text-[var(--text-primary)]">{t(`aiReport.disabled.${reason}.where`)}</dd>
          <dt className="text-[var(--text-tertiary)]">{t('aiReport.disabled.meanwhileLabel')}</dt>
          <dd className="text-[var(--text-primary)]">{t('aiReport.disabled.meanwhile')}</dd>
        </dl>
        <div className="mt-7 flex flex-wrap items-center gap-2">
          {reason === 'organisation' && canManage ? (
            <Link to="/settings" className="btn-primary">
              <Settings2 className="w-4 h-4" aria-hidden />
              {t('aiReport.disabled.openSettings')}
            </Link>
          ) : null}
          <Link to={editorTo} className="btn-secondary">
            {t('aiReport.disabled.writeManually')}
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

/** Crossfade wrapper for the document body states. */
export function StageSwap({ k, children }: { k: string; children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={k}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduce ? undefined : { opacity: 0 }}
        transition={{ duration: dur.fast, ease: ease.out }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
