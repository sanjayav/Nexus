import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, Compass, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ease, spring, staggerDelay, transition } from '../../motion/tokens'
import { SkeletonLines } from '../Skeleton'
import type { SetupStep } from './useSetupProgress'
import type useSetupProgress from './useSetupProgress'
import { startTour } from './tour'

type Progress = ReturnType<typeof useSetupProgress>

/**
 * SetupChecklist — renders the guided-setup model in three densities:
 *
 *   card      My Day / the /welcome hub: next step first, completed steps
 *             folded away, tour + sample-data actions in the footer
 *   sidebar   the ink sidebar widget (expandable)
 *   collapsed the 68 px rail: a progress ring that links to the next step
 */
export interface SetupChecklistProps {
  progress: Progress
  variant?: 'card' | 'sidebar' | 'collapsed'
  onDismiss?: () => void
  /** Extra footer actions on the card (e.g. "Load sample data"). */
  footer?: React.ReactNode
  /** Hide the ring + title (when a hero above already shows progress). */
  hideHeader?: boolean
  className?: string
}

export default function SetupChecklist({ progress, variant = 'card', onDismiss, footer, hideHeader = false, className = '' }: SetupChecklistProps) {
  if (variant === 'collapsed') return <Collapsed progress={progress} />
  if (variant === 'sidebar') return <SidebarWidget progress={progress} onDismiss={onDismiss} />
  return <Card progress={progress} onDismiss={onDismiss} footer={footer} hideHeader={hideHeader} className={className} />
}

/* ── Progress ring ───────────────────────────────────────── */

export function SetupRing({ pct, size = 44, stroke = 4, track = 'var(--bg-tertiary)', color = 'var(--chart-s2)', label }: { pct: number; size?: number; stroke?: number; track?: string; color?: string; label?: React.ReactNode }) {
  const reduce = useReducedMotion()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <span className="relative inline-flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (pct / 100) * c }}
          transition={{ duration: 0.9, ease: ease.out }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {label != null && <span className="absolute inset-0 flex items-center justify-center">{label}</span>}
    </span>
  )
}

/* ── Card ────────────────────────────────────────────────── */

function Card({ progress, onDismiss, footer, hideHeader, className }: { progress: Progress; onDismiss?: () => void; footer?: React.ReactNode; hideHeader?: boolean; className: string }) {
  const { t } = useTranslation()
  const [showDone, setShowDone] = useState(progress.isDone)
  const { steps, completed, total, pct, next, loading } = progress
  const open = steps.filter(s => !s.done)
  const done = steps.filter(s => s.done)

  return (
    <section className={`surface-paper overflow-hidden ${className}`} aria-labelledby="setup-card-h">
      {hideHeader ? <h2 id="setup-card-h" className="sr-only">{t('onboarding.setup.title')}</h2> : (
      <header className="relative px-5 sm:px-6 pt-5 pb-4 flex items-start gap-4">
        <SetupRing pct={pct} size={52} stroke={5} label={<span className="text-caption font-semibold tabular-nums text-[var(--text-primary)]">{pct}%</span>} />
        <div className="min-w-0 flex-1">
          <h2 id="setup-card-h" className="type-h3 text-[var(--text-primary)]">{t('onboarding.setup.title')}</h2>
          <p className="text-small text-[var(--text-secondary)] mt-0.5">
            {loading ? t('onboarding.setup.checking') : progress.isDone ? t('onboarding.setup.allDone') : t('onboarding.setup.progress', { completed, total })}
          </p>
          {progress.cn && (
            <p className="text-caption text-[var(--text-tertiary)] mt-1">{t('onboarding.setup.cnNote')}</p>
          )}
        </div>
        {onDismiss && (
          <button type="button" onClick={onDismiss} aria-label={t('onboarding.setup.dismiss')} title={t('onboarding.setup.dismiss')}
            className="w-10 h-10 -mr-2 -mt-1 rounded-[var(--radius-md)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
            <X className="w-4 h-4" aria-hidden />
          </button>
        )}
      </header>
      )}

      {loading ? (
        <div className="px-6 pb-6"><SkeletonLines lines={4} /></div>
      ) : (
        <ol className={`${hideHeader ? '' : 'border-t border-[var(--border-subtle)]'} divide-y divide-[var(--border-subtle)]`}>
          {open.map((s, i) => <StepRow key={s.key} step={s} isNext={s === next} index={i} />)}
          <AnimatePresence initial={false}>
            {showDone && done.map((s, i) => (
              <motion.li key={s.key} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ ...transition.base, delay: staggerDelay(i) }} className="overflow-hidden">
                <StepBody step={s} isNext={false} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}

      <footer className="px-5 sm:px-6 py-3 border-t border-[var(--border-subtle)] flex items-center gap-x-4 gap-y-2 flex-wrap">
        {done.length > 0 && (
          <button type="button" onClick={() => setShowDone(v => !v)} aria-expanded={showDone}
            className="min-h-[36px] inline-flex items-center gap-1.5 text-caption font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-fast ${showDone ? 'rotate-180' : ''}`} aria-hidden />
            {showDone ? t('onboarding.setup.hideDone') : t('onboarding.setup.showDone', { count: done.length })}
          </button>
        )}
        <button type="button" onClick={startTour} className="min-h-[36px] inline-flex items-center gap-1.5 text-caption font-medium text-[var(--text-secondary)] hover:text-[var(--color-brand)]">
          <Compass className="w-3.5 h-3.5" aria-hidden /> {t('onboarding.setup.takeTour')}
        </button>
        {footer}
      </footer>
    </section>
  )
}

function StepRow({ step, isNext, index }: { step: SetupStep; isNext: boolean; index: number }) {
  return (
    <motion.li initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ ...transition.base, delay: staggerDelay(index) }}>
      <StepBody step={step} isNext={isNext} />
    </motion.li>
  )
}

function StepBody({ step, isNext }: { step: SetupStep; isNext: boolean }) {
  const { t } = useTranslation()
  return (
    <Link
      to={step.route}
      className={`group relative flex items-start gap-3.5 px-5 sm:px-6 py-3.5 transition-colors duration-micro hover:bg-[var(--bg-hover)] ${isNext ? 'bg-[var(--bg-hover)]' : ''}`}
    >
      {isNext && <motion.span layoutId="setup-next-rail" className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[var(--color-brand)]" transition={spring.snappy} aria-hidden />}
      <StepDot done={step.done} next={isNext} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 flex-wrap">
          <span className={`text-small font-medium ${step.done ? 'text-[var(--text-tertiary)] line-through decoration-[var(--border-strong)]' : 'text-[var(--text-primary)]'}`}>
            {t(`onboarding.setup.steps.${step.key}.title`)}
          </span>
          {step.cn && <span className="nx-pill" data-tone="brand" data-size="sm">{t('onboarding.setup.cnBadge')}</span>}
        </span>
        {!step.done && <span className="block text-caption text-[var(--text-tertiary)] mt-0.5">{t(`onboarding.setup.steps.${step.key}.helper`)}</span>}
      </span>
      {!step.done && (
        <span className={`self-center inline-flex items-center gap-1 text-caption font-medium whitespace-nowrap ${isNext ? 'text-[var(--color-brand)]' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]'}`}>
          {isNext ? t('onboarding.setup.start') : null}
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden />
        </span>
      )}
    </Link>
  )
}

function StepDot({ done, next, ink = false }: { done: boolean; next: boolean; ink?: boolean }) {
  if (done) {
    return (
      <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: ink ? 'var(--sidebar-accent)' : 'var(--status-success)' }}>
        <Check className="w-3 h-3" style={{ color: ink ? 'var(--bg-inverse)' : 'var(--bg-primary)' }} aria-hidden />
      </span>
    )
  }
  return (
    <span
      className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border"
      style={{ borderColor: next ? (ink ? 'var(--sidebar-accent)' : 'var(--color-brand)') : ink ? 'var(--sidebar-fg-subtle)' : 'var(--border-strong)', borderStyle: next ? 'solid' : 'dashed' }}
    >
      {next && <span className="w-1.5 h-1.5 rounded-full" style={{ background: ink ? 'var(--sidebar-accent)' : 'var(--color-brand)' }} />}
    </span>
  )
}

/* ── Sidebar (ink) ───────────────────────────────────────── */

function SidebarWidget({ progress, onDismiss }: { progress: Progress; onDismiss?: () => void }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const { steps, completed, total, pct, next } = progress
  return (
    <div className="mx-3 my-2 rounded-[var(--radius-lg)] border relative" style={{ background: 'var(--sidebar-hover-bg)', borderColor: 'var(--sidebar-divider)' }}>
      <button type="button" onClick={() => setExpanded(e => !e)} aria-expanded={expanded}
        className="w-full flex items-center gap-2.5 pl-3 pr-9 py-2.5 text-left">
        <SetupRing pct={pct} size={28} stroke={3} track="var(--sidebar-divider)" color="var(--sidebar-accent)" />
        <span className="min-w-0 flex-1">
          <span className="block text-caption font-semibold" style={{ color: 'var(--sidebar-fg)' }}>{t('onboarding.setup.sidebarTitle')}</span>
          <span className="block text-caption truncate" style={{ color: 'var(--sidebar-fg-muted)' }}>
            {next ? t('onboarding.setup.nextShort', { step: t(`onboarding.setup.steps.${next.key}.title`) }) : t('onboarding.setup.progress', { completed, total })}
          </span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-fast flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} style={{ color: 'var(--sidebar-fg-subtle)' }} aria-hidden />
      </button>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label={t('onboarding.setup.dismiss')} title={t('onboarding.setup.dismiss')}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center hover:bg-[var(--sidebar-hover-bg)]" style={{ color: 'var(--sidebar-fg-subtle)' }}>
          <X className="w-3.5 h-3.5" aria-hidden />
        </button>
      )}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ol initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={transition.base} className="overflow-hidden pb-1.5">
            {steps.map(s => (
              <li key={s.key}>
                <Link to={s.route} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-[var(--sidebar-hover-bg)]">
                  <StepDot done={s.done} next={s === next} ink />
                  <span className="text-caption truncate" style={{ color: s.done ? 'var(--sidebar-fg-subtle)' : s === next ? 'var(--sidebar-fg)' : 'var(--sidebar-fg-muted)', textDecoration: s.done ? 'line-through' : undefined }}>
                    {t(`onboarding.setup.steps.${s.key}.title`)}
                  </span>
                </Link>
              </li>
            ))}
            <li>
              <Link to="/welcome" className="flex items-center gap-1.5 px-3 py-2 text-caption font-medium hover:underline" style={{ color: 'var(--sidebar-accent)' }}>
                {t('onboarding.setup.openHub')} <ArrowRight className="w-3 h-3" aria-hidden />
              </Link>
            </li>
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  )
}

function Collapsed({ progress }: { progress: Progress }) {
  const { t } = useTranslation()
  const { completed, total, pct, next } = progress
  return (
    <Link
      to={next?.route ?? '/welcome'}
      title={t('onboarding.setup.collapsedTitle', { completed, total })}
      aria-label={t('onboarding.setup.collapsedTitle', { completed, total })}
      className="mx-auto my-3 w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center border"
      style={{ background: 'var(--sidebar-hover-bg)', borderColor: 'var(--sidebar-divider)' }}
    >
      <SetupRing pct={pct} size={28} stroke={3} track="var(--sidebar-divider)" color="var(--sidebar-accent)" />
    </Link>
  )
}
