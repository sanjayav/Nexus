import UiStatusPill from '../ui/StatusPill'
import type { QuestionAssignment } from '../../lib/orgStore'

/**
 * Task status pill — thin wrapper over the one shared `ui/StatusPill` so the
 * task list, board and calendar speak the same status vocabulary as review,
 * approval and the assignment manager. Pass `layoutId` to let the pill morph
 * in place when the status changes (e.g. Draft → Submitted).
 */
export function StatusPill({ status, layoutId, size }: { status: QuestionAssignment['status']; layoutId?: string; size?: 'sm' | 'md' }) {
  return <UiStatusPill status={status} layoutId={layoutId} size={size} />
}

export default StatusPill
