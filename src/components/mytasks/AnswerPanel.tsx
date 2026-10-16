import type { QuestionAssignment, OrgEntity, OrgMember } from '../../lib/orgStore'
import type { NexusQuestionnaireItem } from '../../lib/api'
import ValueEntry from '../entry/ValueEntry'
import { reviewerFor } from '../entry/handoff'

/**
 * My Tasks inline answer panel — embeds the shared <ValueEntry> so entry,
 * validation, autosave, evidence and submit behave exactly as on
 * /data/entry/:id and in the disclosure editor. Numeric and narrative
 * assignments both route through it.
 *
 * Errors: `onUpdate` throws on failure; ValueEntry owns the user-facing
 * feedback (inline save state for autosave, one toast for explicit saves
 * and submit), so this wrapper adds none of its own.
 */
export function AnswerPanel({
  assignment, question, onUpdate, entities, members,
}: {
  assignment: QuestionAssignment
  question: NexusQuestionnaireItem
  onUpdate: (patch: Partial<QuestionAssignment>) => Promise<void> | void
  entities: OrgEntity[]
  members: OrgMember[]
}) {
  return (
    <ValueEntry
      variant="panel"
      question={question}
      assignment={assignment}
      onAssignmentPatch={onUpdate}
      entities={entities}
      members={members}
      reviewerName={reviewerFor(assignment, entities, members)}
      fullPageHref={`/data/entry/${encodeURIComponent(assignment.questionId)}?assignment=${encodeURIComponent(assignment.id)}`}
    />
  )
}

export default AnswerPanel
