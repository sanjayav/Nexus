import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, type LucideIcon } from 'lucide-react'
import { dur, ease, staggerDelay } from '../../../motion/tokens'

/**
 * ProcessFlow — a numbered pipeline (ingest → validate → … → store).
 *
 * Horizontal from `md`, a vertical rail on phones. The connecting rail is the
 * screen's one authored moment: it draws in once, left → right (top → down on
 * phones), as the flow scrolls into view. Reduced motion shows it static.
 *
 *   <ProcessFlow steps={[{ id: 'ingest', icon: Upload, title: t('…'), desc: t('…') }]} />
 *
 * `state` per step: done (filled check), current (emerald ring), todo (muted),
 * or omitted (neutral — a description of the process, not progress).
 */
export interface FlowStep {
  id: string
  icon: LucideIcon
  title: ReactNode
  desc?: ReactNode
  /** Extra line(s) under the description: a rate, a count, a pill. */
  meta?: ReactNode
  state?: 'done' | 'current' | 'todo'
}

export interface ProcessFlowProps {
  steps: FlowStep[]
  className?: string
  'aria-label'?: string
}

export default function ProcessFlow({ steps, className = '', 'aria-label': ariaLabel }: ProcessFlowProps) {
  const reduce = useReducedMotion()
  return (
    <ol aria-label={ariaLabel} className={`flex flex-col md:flex-row ${className}`}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1
        const Icon = s.icon
        const lit = s.state === 'done'
        const marker =
          s.state === 'done'
            ? 'bg-[var(--color-brand-strong)] text-[var(--btn-primary-fg)] border-transparent'
            : s.state === 'current'
              ? 'bg-[var(--bg-primary)] text-[var(--color-brand)] border-[var(--color-brand)] ring-4 ring-[var(--color-brand-soft)]'
              : s.state === 'todo'
                ? 'bg-[var(--bg-secondary)] text-[var(--text-quaternary)] border-[var(--border-default)]'
                : 'bg-[var(--color-brand-soft)] text-[var(--color-brand)] border-[var(--status-success-line)]'
        return (
          <li key={s.id} className="flex md:flex-col flex-1 min-w-0 gap-3 md:gap-3">
            <div className="flex flex-col md:flex-row items-center md:pr-0 self-stretch md:self-auto">
              <span
                className={`relative z-[1] w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors duration-fast ${marker}`}
                aria-hidden
              >
                {s.state === 'done' ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Icon className="w-4 h-4" />}
              </span>
              {!last && (
                <motion.span
                  aria-hidden
                  className={`block flex-1 w-px md:w-auto md:h-px min-h-[16px] md:min-h-0 my-1 md:my-0 md:mx-2 ${lit ? 'bg-[var(--color-brand)]' : 'bg-[var(--border-default)]'}`}
                  initial={reduce ? false : { clipPath: 'inset(0 100% 100% 0)' }}
                  whileInView={{ clipPath: 'inset(0 0% 0% 0)' }}
                  viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                  transition={{ duration: dur.slow, ease: ease.out, delay: 0.1 + staggerDelay(i, 0.09) }}
                />
              )}
            </div>
            <div className={`min-w-0 ${last ? '' : 'pb-5 md:pb-0'} md:pr-5`}>
              <div className="text-small font-semibold text-[var(--text-primary)] text-balance">{s.title}</div>
              {s.desc && <p className="text-caption text-[var(--text-tertiary)] mt-0.5 text-pretty">{s.desc}</p>}
              {s.meta && <div className="mt-2">{s.meta}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
