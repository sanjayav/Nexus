import { useTranslation } from 'react-i18next'
import type { QuestionAssignment } from '../../lib/orgStore'

export function StatusPill({ status }: { status: QuestionAssignment['status'] }) {
  const { t } = useTranslation()
  const map = {
    not_started: { label: 'tasks.pill.todo',     bg: 'var(--bg-tertiary)',         fg: 'var(--text-tertiary)',  dot: false },
    in_progress: { label: 'tasks.pill.draft',     bg: 'var(--accent-amber-light)',  fg: 'var(--status-draft)',   dot: false },
    submitted:   { label: 'tasks.pill.submitted', bg: 'var(--accent-blue-light)',   fg: 'var(--status-pending)', dot: true  },
    reviewed:    { label: 'tasks.pill.reviewed',  bg: 'var(--accent-blue-light)',   fg: 'var(--status-pending)', dot: true  },
    approved:    { label: 'tasks.pill.approved',  bg: 'var(--accent-green-light)',  fg: 'var(--status-ok)',      dot: false },
    rejected:    { label: 'tasks.pill.rejected',  bg: 'var(--accent-red-light)',    fg: 'var(--status-reject)',  dot: false },
  }[status]
  return (
    <span
      className="px-2 py-0.5 rounded-[var(--radius-sm)] text-micro font-semibold uppercase tracking-[0.06em] flex-shrink-0 inline-flex items-center gap-1.5"
      style={{ background: map.bg, color: map.fg }}
    >
      {map.dot && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: map.fg }} />}
      {t(map.label)}
    </span>
  )
}

export default StatusPill
