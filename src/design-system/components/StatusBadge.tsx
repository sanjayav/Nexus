import StatusPill from '../../components/ui/StatusPill'

type Status = 'draft' | 'pending' | 'in_progress' | 'approved' | 'overdue' | 'returned'

interface StatusBadgeProps {
  status: Status
  className?: string
}

/** Legacy DS status badge — now renders the one `StatusPill`. */
export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return <StatusPill status={status} dot className={className} />
}
