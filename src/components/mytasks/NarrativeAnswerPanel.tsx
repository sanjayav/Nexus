import type { QuestionAssignment, OrgEntity, OrgMember } from '../../lib/orgStore'
import type { NexusQuestionnaireItem } from '../../lib/api'
import AnswerPanel from './AnswerPanel'

/**
 * NarrativeAnswerPanel — kept for existing imports. Narrative answers are
 * handled by the shared <ValueEntry> (response_type='narrative'), so this
 * simply forwards to AnswerPanel.
 */
export function NarrativeAnswerPanel(props: {
  assignment: QuestionAssignment
  question: NexusQuestionnaireItem
  onUpdate: (patch: Partial<QuestionAssignment>) => Promise<void> | void
  entities: OrgEntity[]
  members: OrgMember[]
}) {
  return <AnswerPanel {...props} />
}

export default NarrativeAnswerPanel
