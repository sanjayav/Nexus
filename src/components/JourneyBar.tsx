import { useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Lock, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { computePipeline, nextAction, type StageKey, type StageStatus } from '../lib/journey'
import { useOrgData } from '../lib/useOrgData'
import { FrameworkContext } from '../lib/frameworks'
import { spring } from '../motion/tokens'

/**
 * Horizontal pipeline strip — Onboard → Assign → Collect → Review → Approve → Publish.
 *
 * Exactly ONE stage is "current": the stage of the user's next action from
 * `lib/journey.nextAction()` — the same model My Day and My Tasks use, so the
 * three surfaces never disagree. `highlight` (the page you are on) is a
 * quieter "you are here" underline, never a second filled chip.
 *
 * Variants:
 *   - 'full'    — tall, shows headlines under each stage (use on Dashboard)
 *   - 'compact' — single line, just dots + labels (use on sub-pages)
 */
export function useCurrentStage(): { stages: StageStatus[]; current: StageKey | null } {
  const { i18n } = useTranslation()
  const { user } = useAuth()
  const { data } = useOrgData()
  // Read the context directly so the bar also renders outside FrameworkProvider (tests, isolated pages).
  const fwId = useContext(FrameworkContext)?.active.id ?? null
  return useMemo(() => {
    const stages = computePipeline(user, data)
    if (!data) return { stages, current: null }
    const all = fwId ? data.assignments.filter(a => a.framework_id === fwId) : data.assignments
    const email = user?.email?.toLowerCase()
    const mine = all.filter(a => (user?.id && a.assigneeId === user.id) || (email && a.assigneeEmail?.toLowerCase() === email))
    const na = nextAction(user, { mine, all, org: data })
    return { stages, current: na.stage }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, data, fwId, i18n.language])
}

export default function JourneyBar({
  variant = 'full',
  highlight,
}: {
  variant?: 'full' | 'compact'
  highlight?: StageKey
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { stages, current } = useCurrentStage()

  if (variant === 'compact') {
    return (
      <nav aria-label={t('components.journey.pipeline')} className="flex items-center gap-1 text-caption overflow-x-auto [scrollbar-width:none] -mx-1 px-1">
        {stages.map((s, i) => {
          const isCurrent = s.stage.key === current
          const here = s.stage.key === highlight
          const done = s.state === 'done'
          const locked = s.state === 'locked'
          return (
            <div key={s.stage.key} className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                disabled={locked}
                onClick={() => !locked && navigate(s.stage.route)}
                aria-current={here ? 'page' : isCurrent ? 'step' : undefined}
                title={isCurrent ? t('components.journey.yourTurn') : undefined}
                className={`relative inline-flex items-center gap-1.5 min-h-[28px] px-2.5 rounded-full whitespace-nowrap transition-colors duration-micro ${
                  isCurrent ? 'text-[var(--btn-primary-fg)] font-semibold'
                  : done ? 'text-[var(--status-success)] font-medium hover:bg-[var(--bg-hover)]'
                  : locked ? 'text-[var(--text-quaternary)] cursor-not-allowed'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {isCurrent && <motion.span layoutId="journey-current" className="absolute inset-0 rounded-full bg-[var(--btn-primary-bg)]" transition={spring.snappy} />}
                <span className="relative inline-flex items-center">
                  {done ? <Check className="w-3 h-3" aria-hidden />
                    : locked ? <Lock className="w-3 h-3" aria-hidden />
                    : <span className="w-2 h-2 rounded-full border-[1.5px]" style={{ borderColor: 'currentColor', background: isCurrent ? 'currentColor' : 'transparent' }} aria-hidden />}
                </span>
                <span className="relative">{s.stage.label}</span>
                {here && !isCurrent && <span className="absolute left-2.5 right-2.5 -bottom-0.5 h-0.5 rounded-full bg-[var(--color-brand)]" aria-hidden />}
              </button>
              {i < stages.length - 1 && <ChevronRight className="w-3 h-3 text-[var(--text-quaternary)] flex-shrink-0" aria-hidden />}
            </div>
          )
        })}
      </nav>
    )
  }

  const currentStage = stages.find(s => s.stage.key === current) ?? null
  return (
    <section className="surface-paper overflow-hidden" aria-label={t('components.journey.pipeline')}>
      <header className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-caption font-medium text-[var(--text-tertiary)]">{t('components.journey.pipeline')}</div>
          <h3 className="text-small font-semibold text-[var(--text-primary)] mt-0.5">
            {currentStage?.stage.label ?? t('components.journey.allComplete')}
            <span className="text-[var(--text-tertiary)] font-normal"> · {currentStage?.headline ?? t('components.journey.publishGroup')}</span>
          </h3>
        </div>
        <ProgressMini stages={stages} />
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[var(--border-subtle)]">
        {stages.map((s, i) => {
          const isCurrent = s.stage.key === current
          const here = s.stage.key === highlight
          const done = s.state === 'done'
          const locked = s.state === 'locked'
          return (
            <button
              key={s.stage.key}
              type="button"
              disabled={locked}
              onClick={() => !locked && navigate(s.stage.route)}
              aria-current={here ? 'page' : isCurrent ? 'step' : undefined}
              className={`relative text-left p-3.5 bg-[var(--bg-primary)] transition-colors duration-micro ${
                locked ? 'cursor-not-allowed' : 'hover:bg-[var(--bg-hover)]'
              }`}
            >
              {isCurrent && <motion.span layoutId="journey-current-full" className="absolute inset-x-0 top-0 h-0.5 bg-[var(--color-brand)]" transition={spring.snappy} aria-hidden />}
              <div className="flex items-center gap-2 mb-1.5">
                <StepIcon state={done ? 'done' : locked ? 'locked' : isCurrent ? 'current' : 'todo'} idx={i + 1} />
                <span className={`text-caption font-semibold whitespace-nowrap ${
                  isCurrent ? 'text-[var(--text-primary)]' : done ? 'text-[var(--status-success)]' : locked ? 'text-[var(--text-quaternary)]' : 'text-[var(--text-secondary)]'
                }`}>
                  {s.stage.label}
                </span>
                {isCurrent && s.isMine && <span className="nx-pill ml-auto" data-tone="brand" data-size="sm">{t('components.journey.yourTurn')}</span>}
              </div>
              <div className="text-caption text-[var(--text-tertiary)] line-clamp-2 min-h-[32px]">{s.headline}</div>
              {s.total > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-caption">
                  <div className="flex-1 h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-slow"
                      style={{ width: `${(s.done / Math.max(s.total, 1)) * 100}%`, background: done ? 'var(--status-success)' : 'var(--chart-s2)' }}
                    />
                  </div>
                  <span className="tabular-nums font-medium text-[var(--text-tertiary)]">{s.done}/{s.total}</span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function StepIcon({ state, idx }: { state: 'locked' | 'todo' | 'current' | 'done'; idx: number }) {
  const base = 'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-caption font-semibold tabular-nums'
  if (state === 'done') return <span className={`${base} bg-[var(--status-success)] text-[var(--bg-primary)]`}><Check className="w-3 h-3" aria-hidden /></span>
  if (state === 'current') return <span className={`${base} bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] ring-4 ring-[var(--color-brand)]/15`}>{idx}</span>
  if (state === 'locked') return <span className={`${base} bg-[var(--bg-tertiary)] text-[var(--text-quaternary)]`}><Lock className="w-2.5 h-2.5" aria-hidden /></span>
  return <span className={`${base} bg-[var(--bg-tertiary)] text-[var(--text-secondary)]`}>{idx}</span>
}

function ProgressMini({ stages }: { stages: StageStatus[] }) {
  const { t } = useTranslation()
  const done = stages.filter(s => s.state === 'done').length
  return (
    <div className="flex items-center gap-2 text-caption text-[var(--text-tertiary)]">
      <span className="font-semibold text-[var(--text-primary)] tabular-nums">{done}/{stages.length}</span>
      <span>{t('components.journey.stagesComplete')}</span>
      <div className="flex items-center gap-0.5" aria-hidden>
        {stages.map((s, i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: s.state === 'done' ? 'var(--status-success)' : 'var(--border-default)' }} />
        ))}
      </div>
    </div>
  )
}
