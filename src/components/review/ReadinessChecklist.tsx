import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, ArrowRight, CircleDashed, CircleSlash, CheckCircle2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { staggerDelay, transition } from '../../motion/tokens'

export type CheckState = 'pass' | 'warn' | 'block' | 'unknown'

export interface ReadinessCheck {
  id: string
  state: CheckState
  label: string
  /** The measured value, e.g. "4 / 28". */
  value: ReactNode
  detail?: ReactNode
  action?: { label: string; to?: string; onClick?: () => void }
}

const ICON = { pass: CheckCircle2, warn: AlertTriangle, block: CircleSlash, unknown: CircleDashed }
const COLOR = {
  pass: 'var(--status-success)',
  warn: 'var(--status-warning)',
  block: 'var(--status-danger)',
  unknown: 'var(--text-tertiary)',
}

/**
 * Pre-publish checklist: one row per gate (approval coverage, anomalies,
 * assurance, evidence). Each row states what was measured and, when it isn't
 * a pass, the one action that fixes it.
 */
export default function ReadinessChecklist({
  checks,
  compact = false,
  'aria-label': ariaLabel,
}: {
  checks: ReadinessCheck[]
  compact?: boolean
  'aria-label'?: string
}) {
  const reduce = useReducedMotion()
  return (
    <ul aria-label={ariaLabel} className="divide-y divide-[var(--border-subtle)]">
      {checks.map((c, i) => {
        const Icon = ICON[c.state]
        return (
          <motion.li
            key={c.id}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition.base, delay: staggerDelay(i, 0.05) }}
            className={`flex items-start gap-3 ${compact ? 'py-2.5' : 'py-3.5'}`}
          >
            <Icon className="w-[18px] h-[18px] mt-0.5 flex-shrink-0" style={{ color: COLOR[c.state] }} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="type-small font-semibold text-[var(--text-primary)]">{c.label}</span>
                <span className="type-small tabular-nums font-semibold whitespace-nowrap" style={{ color: c.state === 'pass' ? 'var(--text-primary)' : COLOR[c.state] }}>
                  {c.value}
                </span>
              </div>
              {c.detail && !compact && <div className="text-caption text-[var(--text-tertiary)] mt-0.5">{c.detail}</div>}
              {c.action && !compact && (
                c.action.to ? (
                  <Link to={c.action.to} className="mt-1.5 inline-flex items-center gap-1 text-caption font-semibold text-[var(--color-brand-strong)] hover:underline">
                    {c.action.label} <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : (
                  <button type="button" onClick={c.action.onClick} className="mt-1.5 inline-flex items-center gap-1 text-caption font-semibold text-[var(--color-brand-strong)] hover:underline">
                    {c.action.label} <ArrowRight className="w-3 h-3" />
                  </button>
                )
              )}
            </div>
          </motion.li>
        )
      })}
    </ul>
  )
}
