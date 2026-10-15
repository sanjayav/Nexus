import type { QuestionAssignment } from '../../lib/orgStore'

export function StatusPill({ status }: { status: QuestionAssignment['status'] }) {
  const map = {
    not_started: { label: 'To do',     bg: 'var(--bg-tertiary)',         fg: 'var(--text-tertiary)',  dot: false },
    in_progress: { label: 'Draft',     bg: 'var(--accent-amber-light)',  fg: 'var(--status-draft)',   dot: false },
    submitted:   { label: 'Submitted', bg: 'var(--accent-blue-light)',   fg: 'var(--status-pending)', dot: true  },
    reviewed:    { label: 'Reviewed',  bg: 'var(--accent-blue-light)',   fg: 'var(--status-pending)', dot: true  },
    approved:    { label: 'Approved',  bg: 'var(--accent-green-light)',  fg: 'var(--status-ok)',      dot: false },
    rejected:    { label: 'Rejected',  bg: 'var(--accent-red-light)',    fg: 'var(--status-reject)',  dot: false },
  }[status]
  return (
    <span
      className="px-2 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 inline-flex items-center gap-1.5"
      style={{ background: map.bg, color: map.fg }}
    >
      {map.dot && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: map.fg }} />}
      {map.label}
    </span>
  )
}

export default StatusPill
