import { orgStore, type OrgEntity, type QuestionAssignment } from './orgStore'

export interface RollupNode {
  entity: OrgEntity
  children: RollupNode[]
  plantValue: number | null
  cumulative: number | null
  assigned: number
  approved: number
  submitted: number
  notStarted: number
  unit: string | null
}

/**
 * Aggregate plant-level answers up the org tree for a single GRI question.
 * Callers must pre-load entities and assignments and pass them in.
 */
export function buildRollup(
  questionId: string,
  entities: OrgEntity[],
  assignments: QuestionAssignment[],
): RollupNode | null {
  if (entities.length === 0) return null
  const byParent = new Map<string | null, OrgEntity[]>()
  for (const e of entities) {
    const arr = byParent.get(e.parentId) || []
    arr.push(e)
    byParent.set(e.parentId, arr)
  }
  const mine = assignments.filter(a => a.questionId === questionId)
  const byEntity = new Map<string, QuestionAssignment[]>()
  for (const a of mine) {
    const arr = byEntity.get(a.entityId) || []
    arr.push(a)
    byEntity.set(a.entityId, arr)
  }

  function build(entity: OrgEntity): RollupNode {
    const kids = (byParent.get(entity.id) || []).map(build)
    const own = byEntity.get(entity.id) || []
    const plantAsg = own[0]
    const plantValue = plantAsg?.status === 'approved' || plantAsg?.status === 'reviewed' || plantAsg?.status === 'submitted'
      ? (plantAsg.value ?? null)
      : null
    let cumulative: number | null = plantValue
    for (const k of kids) {
      if (k.cumulative != null) {
        cumulative = (cumulative ?? 0) + k.cumulative
      }
    }
    if (entity.type === 'subsidiary' && entity.equity != null && cumulative != null) {
      cumulative = cumulative * (entity.equity / 100)
    }

    const childCounts = kids.reduce((acc, k) => ({
      assigned: acc.assigned + k.assigned,
      approved: acc.approved + k.approved,
      submitted: acc.submitted + k.submitted,
      notStarted: acc.notStarted + k.notStarted,
    }), { assigned: 0, approved: 0, submitted: 0, notStarted: 0 })

    const ownCounts = own.reduce((acc, a) => ({
      assigned: acc.assigned + 1,
      approved: acc.approved + (a.status === 'approved' ? 1 : 0),
      submitted: acc.submitted + (a.status === 'submitted' || a.status === 'reviewed' ? 1 : 0),
      notStarted: acc.notStarted + (a.status === 'not_started' || a.status === 'in_progress' ? 1 : 0),
    }), { assigned: 0, approved: 0, submitted: 0, notStarted: 0 })

    const unit = plantAsg?.unit ?? kids.find(k => k.unit)?.unit ?? null

    return {
      entity, children: kids, plantValue, cumulative,
      assigned: childCounts.assigned + ownCounts.assigned,
      approved: childCounts.approved + ownCounts.approved,
      submitted: childCounts.submitted + ownCounts.submitted,
      notStarted: childCounts.notStarted + ownCounts.notStarted,
      unit,
    }
  }

  const roots = byParent.get(null) || []
  if (roots.length === 0) return null
  return build(roots[0])
}

export function groupCumulativeFor(
  questionId: string,
  entities: OrgEntity[],
  assignments: QuestionAssignment[],
): { value: number | null; unit: string | null; approved: number; total: number } {
  const root = buildRollup(questionId, entities, assignments)
  if (!root) return { value: null, unit: null, approved: 0, total: 0 }
  return { value: root.cumulative, unit: root.unit, approved: root.approved, total: root.assigned }
}

export interface ReportReadyRow {
  questionId: string
  gri_code: string
  line_item: string
  unit: string | null
  value: number | null
  approvedRatio: string
  ready: boolean
}

export function buildReportRows(
  questions: { id: string; gri_code: string; line_item: string; unit: string | null }[],
  entities: OrgEntity[],
  assignments: QuestionAssignment[],
): ReportReadyRow[] {
  return questions.map(q => {
    const r = groupCumulativeFor(q.id, entities, assignments)
    return {
      questionId: q.id,
      gri_code: q.gri_code,
      line_item: q.line_item,
      unit: r.unit || q.unit,
      value: r.value,
      approvedRatio: r.total === 0 ? '0 / 0' : `${r.approved} / ${r.total}`,
      ready: r.total > 0 && r.approved === r.total,
    }
  })
}

// kept to avoid breaking old imports that used default export
export { orgStore }
