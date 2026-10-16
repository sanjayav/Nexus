import { orgStore, type OrgEntity, type OrgMember, type QuestionAssignment } from '../../lib/orgStore'

/**
 * Who a submission goes to next: the subsidiary lead above the entity for
 * review, then the group sustainability officer for approval.
 */
export function handoffFor(
  status: QuestionAssignment['status'],
  entityId: string | undefined,
  entities: OrgEntity[] = [],
  members: OrgMember[] = [],
): { stage: 'review' | 'approval' | 'approved' | null; name: string | null } {
  const path = entityId ? orgStore.pathOf(entities, entityId) : []
  const subsidiaryId = path.find(p => p.type === 'subsidiary')?.id
  const reviewer = subsidiaryId ? members.find(m => m.entityId === subsidiaryId && m.role === 'subsidiary_lead') : undefined
  const approver = members.find(m => m.role === 'group_sustainability_officer')
  if (status === 'submitted') return { stage: 'review', name: reviewer?.name ?? null }
  if (status === 'reviewed') return { stage: 'approval', name: approver?.name ?? null }
  if (status === 'approved') return { stage: 'approved', name: null }
  return { stage: null, name: reviewer?.name ?? null }
}

/**
 * Name for the "Submitted to … for review" message. QuestionAssignment
 * carries no reviewer field, so it is derived from the org tree: the
 * subsidiary lead above the entity, else the group sustainability officer
 * (who reviews directly when there is no subsidiary layer).
 */
export function reviewerFor(
  assignment: Pick<QuestionAssignment, 'entityId'> | null | undefined,
  entities: OrgEntity[] = [],
  members: OrgMember[] = [],
): string | null {
  if (!assignment) return null
  return handoffFor('submitted', assignment.entityId, entities, members).name
    ?? members.find(m => m.role === 'group_sustainability_officer')?.name
    ?? null
}
