import Badge from './Badge'

type Status = 'draft' | 'pending' | 'in_progress' | 'approved' | 'overdue' | 'returned'

interface StatusBadgeProps {
  status: Status
  className?: string
}

const statusConfig: Record<Status, { label: string; variant: 'gray' | 'amber' | 'blue' | 'green' | 'red' }> = {
  draft: { label: 'Draft', variant: 'gray' },
  pending: { label: 'Pending review', variant: 'amber' },
  in_progress: { label: 'In progress', variant: 'blue' },
  approved: { label: 'Approved', variant: 'green' },
  overdue: { label: 'Overdue', variant: 'red' },
  returned: { label: 'Returned', variant: 'red' },
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} dot className={className}>
      {config.label}
    </Badge>
  )
}
