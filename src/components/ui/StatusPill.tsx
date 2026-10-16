import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { spring } from '../../motion/tokens'

/**
 * StatusPill — the one status encoding. Sentence case, 12 px, never wraps
 * (CJK-safe: `nowrap` + `keep-all`), tone from semantic status tokens.
 *
 *   <StatusPill status="submitted" />
 *   <StatusPill status="approved" layoutId={`pill-${row.id}`} />   // morphs in place
 *   <StatusPill tone="warning" dot>Due in 3 days</StatusPill>
 */
export type PillStatus =
  | 'not_started'
  | 'draft'
  | 'in_progress'
  | 'submitted'
  | 'pending'
  | 'reviewed'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'overdue'
  | 'due_soon'
  | 'published'
  | 'archived'
  | 'blocked'

export type PillTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand'

const STATUS: Record<PillStatus, { tone: PillTone; dot?: boolean; fallback: string }> = {
  not_started: { tone: 'neutral', fallback: 'Not started' },
  draft: { tone: 'neutral', fallback: 'Draft' },
  in_progress: { tone: 'warning', dot: true, fallback: 'In progress' },
  submitted: { tone: 'info', dot: true, fallback: 'Submitted' },
  pending: { tone: 'info', dot: true, fallback: 'Pending review' },
  reviewed: { tone: 'info', dot: true, fallback: 'Reviewed' },
  approved: { tone: 'success', fallback: 'Approved' },
  rejected: { tone: 'danger', fallback: 'Sent back' },
  returned: { tone: 'danger', fallback: 'Returned' },
  overdue: { tone: 'danger', dot: true, fallback: 'Overdue' },
  due_soon: { tone: 'warning', fallback: 'Due soon' },
  published: { tone: 'brand', fallback: 'Published' },
  archived: { tone: 'neutral', fallback: 'Archived' },
  blocked: { tone: 'danger', fallback: 'Blocked' },
}

export interface StatusPillProps {
  /** Canonical status — supplies tone and translated label. */
  status?: PillStatus | string
  /** Override tone (or set it when using free `children`). */
  tone?: PillTone
  /** Custom label (overrides the translated status label). */
  children?: ReactNode
  /** Leading dot. Defaults per status (true for "in flight" states). */
  dot?: boolean
  icon?: ReactNode
  size?: 'sm' | 'md'
  /** Shared-layout id so a pill can morph between states/rows. */
  layoutId?: string
  className?: string
  title?: string
}

export default function StatusPill({
  status,
  tone,
  children,
  dot,
  icon,
  size = 'md',
  layoutId,
  className = '',
  title,
}: StatusPillProps) {
  const { t } = useTranslation()
  const meta = status ? STATUS[status as PillStatus] : undefined
  const resolvedTone: PillTone = tone ?? meta?.tone ?? 'neutral'
  const showDot = dot ?? meta?.dot ?? false
  const label = children ?? (status ? t(`ui.status.${status}`, { defaultValue: meta?.fallback ?? status }) : null)

  const content = (
    <>
      {icon ? <span className="inline-flex flex-shrink-0 [&>svg]:w-3 [&>svg]:h-3">{icon}</span> : showDot ? <span className="nx-pill-dot" /> : null}
      <span>{label}</span>
    </>
  )

  if (layoutId) {
    return (
      <motion.span
        layout
        layoutId={layoutId}
        transition={spring.snappy}
        className={`nx-pill ${className}`}
        data-tone={resolvedTone}
        data-size={size}
        data-status={status}
        title={title}
      >
        {content}
      </motion.span>
    )
  }
  return (
    <span className={`nx-pill ${className}`} data-tone={resolvedTone} data-size={size} data-status={status} title={title}>
      {content}
    </span>
  )
}

export function toneForStatus(status: string): PillTone {
  return STATUS[status as PillStatus]?.tone ?? 'neutral'
}
