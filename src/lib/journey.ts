import type { OrgEntity, OrgMember, QuestionAssignment } from './orgStore'
import { resolveRole, type PlatformRole } from './rbac'
import type { User } from '../auth/AuthContext'

export type StageKey = 'onboard' | 'assign' | 'collect' | 'review' | 'approve' | 'publish'

export interface Stage {
  key: StageKey
  label: string
  description: string
  route: string
  owners: PlatformRole[]
  cta: string
}

export const PIPELINE: Stage[] = [
  { key: 'onboard', label: 'Set up org',
    description: 'Build the reporting tree and add members',
    route: '/onboarding', owners: ['platform_admin'],
    cta: 'Start with your group' },
  { key: 'assign', label: 'Assign',
    description: 'Pick GRI line items and hand them to people',
    route: '/admin/assignments',
    owners: ['platform_admin', 'group_sustainability_officer', 'subsidiary_lead'],
    cta: 'Create first assignment' },
  { key: 'collect', label: 'Collect',
    description: 'Plants answer questions and attach evidence',
    route: '/my-tasks', owners: ['plant_manager', 'data_contributor'],
    cta: 'Open my tasks' },
  { key: 'review', label: 'Review',
    description: 'Subsidiary lead checks plant submissions',
    route: '/workflow/review', owners: ['subsidiary_lead', 'plant_manager'],
    cta: 'Review submissions' },
  { key: 'approve', label: 'Approve',
    description: 'Sustainability officer signs off the rollup',
    route: '/workflow/approval',
    owners: ['group_sustainability_officer', 'platform_admin'],
    cta: 'Approve rollups' },
  { key: 'publish', label: 'Publish',
    description: 'Lock the year and generate the GRI report',
    route: '/reports',
    owners: ['group_sustainability_officer', 'platform_admin'],
    cta: 'Publish report' },
]

export interface StageStatus {
  stage: Stage
  state: 'locked' | 'todo' | 'active' | 'done'
  total: number
  done: number
  headline: string
  isMine: boolean
}

export interface PipelineInput {
  entities: OrgEntity[]
  members: OrgMember[]
  assignments: QuestionAssignment[]
}

/**
 * Compute the live status of each pipeline stage. Caller passes in the
 * current entities/members/assignments — we don't hit the network here.
 * `null` data = still loading; return an empty-ish pipeline so the bar
 * renders without flashing.
 */
export function computePipeline(user: User | null, data: PipelineInput | null): StageStatus[] {
  const role = resolveRole(user)

  const entities = data?.entities ?? []
  const members = data?.members ?? []
  const assignments = data?.assignments ?? []

  const hasGroup = entities.some(e => e.type === 'group')
  const hasPlants = entities.some(e => e.type === 'plant' || e.type === 'office')
  const hasMembers = members.length > 0

  const assigned = assignments.length
  const inProgress = assignments.filter(a => a.status === 'in_progress').length
  const submitted = assignments.filter(a => a.status === 'submitted').length
  const reviewed = assignments.filter(a => a.status === 'reviewed').length
  const approved = assignments.filter(a => a.status === 'approved').length
  const notStarted = assignments.filter(a => a.status === 'not_started').length

  const onboardDone = hasGroup && hasPlants && hasMembers
  const assignDone = assigned > 0
  const collectDone = assigned > 0 && notStarted + inProgress === 0
  const reviewDone = assigned > 0 && submitted === 0 && collectDone
  const approveDone = assigned > 0 && approved === assigned
  const publishDone = false

  const entityCount = entities.length

  const stages: Array<Omit<StageStatus, 'state' | 'isMine'> & { _unlocked: boolean; _done: boolean }> = [
    {
      stage: PIPELINE[0],
      _unlocked: true, _done: onboardDone,
      total: 0, done: entityCount,
      headline: entityCount === 0
        ? 'Start by adding your parent group'
        : onboardDone
          ? `${entityCount} entities, ${members.length} members`
          : !hasPlants
            ? `${entityCount} entities — add plants under subsidiaries`
            : `${entityCount} entities — invite members to begin`,
    },
    {
      stage: PIPELINE[1],
      _unlocked: onboardDone, _done: assignDone,
      total: 0, done: assigned,
      headline: !onboardDone
        ? 'Finish org setup first'
        : assigned === 0
          ? 'No questions assigned yet'
          : `${assigned} questions assigned across ${new Set(assignments.map(a => a.entityId)).size} plants`,
    },
    {
      stage: PIPELINE[2],
      _unlocked: assignDone, _done: collectDone,
      total: assigned, done: assigned - notStarted - inProgress,
      headline: !assignDone
        ? 'Nothing to collect yet'
        : notStarted + inProgress === 0
          ? 'All plants have submitted'
          : `${notStarted + inProgress} still outstanding · ${submitted + reviewed + approved} submitted`,
    },
    {
      stage: PIPELINE[3],
      _unlocked: submitted + reviewed + approved > 0, _done: reviewDone,
      total: submitted + reviewed + approved, done: reviewed + approved,
      headline: submitted === 0
        ? (reviewed + approved > 0 ? 'All reviewed' : 'Nothing to review')
        : `${submitted} waiting for subsidiary lead`,
    },
    {
      stage: PIPELINE[4],
      _unlocked: reviewed + approved > 0, _done: approveDone,
      total: reviewed + approved, done: approved,
      headline: reviewed === 0
        ? (approved > 0 ? `${approved} approved` : 'Nothing to approve')
        : `${reviewed} awaiting sustainability officer`,
    },
    {
      stage: PIPELINE[5],
      _unlocked: approveDone, _done: publishDone,
      total: assigned, done: approved,
      headline: !approveDone
        ? approved === 0
          ? 'Approvals required before publish'
          : `${approved}/${assigned} approved — waiting on rest`
        : 'Ready to publish the group report',
    },
  ]

  const activeIdx = stages.findIndex(s => s._unlocked && !s._done)

  return stages.map((s, i) => {
    let state: StageStatus['state']
    if (!s._unlocked) state = 'locked'
    else if (s._done) state = 'done'
    else if (i === activeIdx) state = 'active'
    else state = 'todo'
    const isMine = s.stage.owners.includes(role) && (state === 'active' || state === 'todo')
    return { stage: s.stage, state, total: s.total, done: s.done, headline: s.headline, isMine }
  })
}

export function focusStage(user: User | null, data: PipelineInput | null): StageStatus | null {
  const stages = computePipeline(user, data)
  const mineActive = stages.find(s => s.isMine && s.state === 'active')
  if (mineActive) return mineActive
  const mineTodo = stages.find(s => s.isMine)
  if (mineTodo) return mineTodo
  return stages.find(s => s.state === 'active') ?? stages[0]
}
