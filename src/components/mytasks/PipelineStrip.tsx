import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Check, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { StageStatus } from '../../lib/journey'
import { spring } from '../../motion/tokens'

/**
 * PipelineStrip — the six-stage reporting pipeline as a slim stepper.
 *
 * Replaces the tall PipelineJourney panel on My Tasks. One row of dots joined
 * by a hairline; the current stage carries a sliding ring (`layoutId`).
 * Labels sit under the dots from `sm` up and never wrap (CJK-safe). On phones
 * only the current stage is named, under the strip, so nothing collides at
 * 390 px.
 */
export default function PipelineStrip({ stages, className = '' }: { stages: StageStatus[]; className?: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const activeIdx = Math.max(0, stages.findIndex(s => s.state === 'active'))
  const active = stages[activeIdx]
  if (stages.length === 0) return null

  return (
    <nav aria-label={t('tasks.next.pipelineAria')} className={className}>
      <ol className="grid grid-cols-6">
        {stages.map((s, i) => {
          const done = s.state === 'done'
          const isActive = i === activeIdx && s.state === 'active'
          const locked = s.state === 'locked'
          const leftDone = i > 0 && stages[i - 1].state === 'done'
          return (
            <li key={s.stage.key} className="relative flex flex-col items-center min-w-0">
              {/* Connectors: left half and right half, centred on the dot. */}
              {i > 0 && (
                <span
                  aria-hidden
                  className="absolute top-[13px] left-0 right-1/2 h-px"
                  style={{ background: leftDone ? 'var(--color-brand)' : 'var(--border-default)' }}
                />
              )}
              {i < stages.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-[13px] left-1/2 right-0 h-px"
                  style={{ background: done ? 'var(--color-brand)' : 'var(--border-default)' }}
                />
              )}
              <button
                type="button"
                disabled={locked}
                onClick={() => !locked && navigate(s.stage.route)}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`${s.stage.label}: ${s.headline}`}
                title={`${s.stage.label} · ${s.headline}`}
                className="relative z-[1] w-10 h-10 -my-[7px] flex items-center justify-center rounded-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] disabled:cursor-not-allowed"
              >
                {isActive && (
                  <motion.span
                    layoutId="pipeline-active-ring"
                    transition={spring.snappy}
                    aria-hidden
                    className="absolute inset-[7px] rounded-full"
                    style={{ boxShadow: '0 0 0 3px var(--color-brand-soft), 0 0 0 1.5px var(--color-brand) inset' }}
                  />
                )}
                <span
                  className={`relative w-[18px] h-[18px] rounded-full flex items-center justify-center transition-colors duration-150 ${
                    done
                      ? 'bg-[var(--color-brand)] text-[var(--btn-primary-fg)]'
                      : isActive
                        ? 'bg-[var(--bg-primary)]'
                        : 'bg-[var(--bg-primary)] border border-[var(--border-strong)] group-hover:border-[var(--color-brand)]'
                  }`}
                >
                  {done ? (
                    <Check className="w-3 h-3" strokeWidth={3} aria-hidden />
                  ) : locked ? (
                    <Lock className="w-2.5 h-2.5 text-[var(--text-quaternary)]" aria-hidden />
                  ) : isActive ? (
                    <span className="w-2 h-2 rounded-full bg-[var(--color-brand)]" aria-hidden />
                  ) : null}
                </span>
              </button>
              <span
                className={`hidden sm:flex items-center gap-1 mt-2 max-w-full px-1 text-caption whitespace-nowrap ${
                  isActive ? 'text-[var(--text-primary)] font-semibold' : done ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'
                }`}
              >
                <span className="truncate">{s.stage.label}</span>
                {s.isMine && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand)] flex-shrink-0" aria-label={t('tasks.next.yourStage')} />
                )}
              </span>
            </li>
          )
        })}
      </ol>
      {active && (
        <p className="mt-3 text-caption text-[var(--text-tertiary)] flex items-baseline gap-1.5 min-w-0">
          <span className="font-semibold text-[var(--text-secondary)] whitespace-nowrap">
            {t('tasks.next.stageOf', { n: activeIdx + 1, total: stages.length, label: active.stage.label })}
          </span>
          <span aria-hidden>·</span>
          <span className="truncate">{active.headline}</span>
        </p>
      )}
    </nav>
  )
}
